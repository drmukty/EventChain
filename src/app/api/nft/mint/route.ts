import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    return NextResponse.json(
      { error: "Connect your wallet first" },
      { status: 400 }
    );
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

  // ✅ Use NEXT_PUBLIC_APP_URL for metadata
  const metadataUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/nft/metadata/${nft.eventId}`;

  // ✅ Contract address from environment
  const contractAddress = process.env.NEXT_PUBLIC_POAP_CONTRACT_ADDRESS!;

  return NextResponse.json({
    metadataUrl,
    contractAddress,
    chainId: 84532, // Base Sepolia
    nftId: nft.id,
  });
}
