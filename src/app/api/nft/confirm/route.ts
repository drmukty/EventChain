import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";

const bodySchema = z.object({
  nftId: z.string().min(1),
  txHash: z.string().min(1),
  tokenId: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const { nftId, txHash, tokenId } = parsed.data;

  const nft = await prisma.nFT.findUnique({
    where: { id: nftId },
    include: { event: true },
  });

  if (!nft) {
    return NextResponse.json({ error: "NFT not found" }, { status: 404 });
  }

  if (nft.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (nft.isOnChain) {
    return NextResponse.json({ error: "Already minted" }, { status: 400 });
  }

  const updated = await prisma.nFT.update({
    where: { id: nftId },
    data: {
      isOnChain: true,
      txHash,
      tokenId,
      contractAddr: process.env.NEXT_PUBLIC_POAP_CONTRACT_ADDRESS!,
      chainId: 84532,
    },
  });

  await notify(userId, {
    type: "NFT_MINTED",
    title: "Your POAP has been minted! 🎨",
    message: `Your on-chain Proof of Attendance for ${nft.event.title} is live on Base Sepolia.`,
    metadata: { eventId: nft.eventId, nftId: nft.id },
  });

  return NextResponse.json({ nft: updated });
}
