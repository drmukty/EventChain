import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mintAttendanceNFT } from "@/lib/blockchain";
import { notify } from "@/lib/notifications";

const bodySchema = z.object({ nftId: z.string().min(1) });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { walletAddress: true },
  });

  if (!user?.walletAddress) {
    return NextResponse.json({ error: "Connect a wallet first" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid NFT ID" }, { status: 400 });
  }

  const nft = await prisma.nFT.findUnique({
    where: { id: parsed.data.nftId },
    include: { event: true },
  });

  if (!nft) {
    return NextResponse.json({ error: "NFT not found" }, { status: 404 });
  }

  if (nft.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (nft.isOnChain) {
    return NextResponse.json({ error: "Already minted on-chain" }, { status: 400 });
  }

  try {
    const metadataUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/nft/metadata/${nft.eventId}`;
    
    const mint = await mintAttendanceNFT({
      attendeeWallet: user.walletAddress,
      eventId: nft.eventId,
      metadataUrl,
    });

    const updated = await prisma.nFT.update({
      where: { id: nft.id },
      data: {
        isOnChain: true,
        txHash: mint.txHash,
        tokenId: mint.tokenId,
        contractAddr: mint.contractAddress,
        chainId: mint.chainId,
      },
    });

    await notify(userId, {
      type: "NFT_MINTED",
      title: "Your POAP has been minted! 🎨",
      message: `Your on-chain Proof of Attendance for ${nft.event.title} is live on Base Sepolia.`,
      metadata: { eventId: nft.eventId, nftId: nft.id },
    });

    return NextResponse.json({ nft: updated });
  } catch (err) {
    console.error("Mint failed:", err);
    return NextResponse.json({ error: "Minting failed — try again shortly" }, { status: 502 });
  }
}
