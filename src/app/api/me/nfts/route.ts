import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const nfts = await prisma.nFT.findMany({
    where: { userId: (session.user as any).id },
    include: { event: { select: { title: true, bannerUrl: true, venue: true, startsAt: true } } },
    orderBy: { mintedAt: "desc" },
  });

  const explorerBase = "https://sepolia.basescan.org";

  return NextResponse.json({
    nfts: nfts.map((n) => ({
      ...n,
      explorerUrl: n.txHash ? `${explorerBase}/tx/${n.txHash}` : null,
    })),
  });
}
