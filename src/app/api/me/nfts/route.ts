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

  const checkIns = await prisma.checkIn.findMany({
    where: { userId },
    include: { event: true },
  });

  const nftPromises = checkIns.map(async (checkIn) => {
    const existing = await prisma.nFT.findFirst({
      where: {
        userId,
        eventId: checkIn.eventId,
      },
    });
    if (existing) return existing;

    return prisma.nFT.create({
      data: {
        userId,
        eventId: checkIn.eventId,
        isOnChain: false,
        mintedAt: new Date(),
      },
      include: { event: true },
    });
  });

  const nfts = await Promise.all(nftPromises);

  const formatted = nfts.map((nft) => ({
    id: nft.id,
    isOnChain: nft.isOnChain,
    tokenId: nft.tokenId,
    txHash: nft.txHash,
    mintedAt: nft.mintedAt.toISOString(),
    explorerUrl: nft.txHash
      ? `https://sepolia.basescan.org/tx/${nft.txHash}`
      : null,
    event: {
      title: nft.event.title,
      bannerUrl: nft.event.bannerUrl,
      venue: nft.event.venue,
      startsAt: nft.event.startsAt.toISOString(),
    },
  }));

  return NextResponse.json({ nfts: formatted });
}
