import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  const [eventCount, nftCount, certificateCount] = await Promise.all([
    prisma.checkIn.count({ where: { userId } }),
    prisma.nFT.count({ where: { userId, isOnChain: true } }),
    prisma.certificate.count({ where: { userId } }),
  ]);

  return NextResponse.json({
    events: eventCount,
    nfts: nftCount,
    certificates: certificateCount,
  });
}
