import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eventId = params.id;
  const isAdmin = (session.user as any).role === "ADMIN";
  if (!isAdmin) {
    const membership = await prisma.teamMember.findUnique({
      where: { eventId_userId: { eventId, userId: (session.user as any).id } },
    });
    if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [checkIns, approvedCount] = await Promise.all([
    prisma.checkIn.findMany({
      where: { eventId },
      include: { user: { select: { name: true, email: true } }, nft: true },
      orderBy: { checkedInAt: "desc" },
      take: 100,
    }),
    prisma.application.count({ where: { eventId, status: "APPROVED" } }),
  ]);

  return NextResponse.json({
    checkIns,
    stats: {
      approved: approvedCount,
      checkedIn: checkIns.length,
      noShows: Math.max(0, approvedCount - checkIns.length),
      nftsMinted: checkIns.filter((c) => c.nft?.isOnChain).length,
    },
  });
}
