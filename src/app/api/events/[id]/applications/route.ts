import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eventId = params.id;
  const isAdmin = (session.user as any).role === "ADMIN";

  if (!isAdmin) {
    const membership = await prisma.teamMember.findUnique({
      where: { eventId_userId: { eventId, userId: (session.user as any).id } },
    });
    // Reviewing applicants is an organizer function, not a volunteer one.
    if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;

  const applications = await prisma.application.findMany({
    where: { eventId, ...(status && { status: status as any }) },
    include: { user: { select: { name: true, email: true, image: true, walletAddress: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ applications });
}
