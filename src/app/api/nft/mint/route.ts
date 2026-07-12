import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mintAttendanceNFT } from "@/lib/blockchain";
import { notify } from "@/lib/notifications";

/**
 * POST /api/nft/mint — retry an on-chain mint for an existing off-chain badge.
 *
 * Gap this fixes: `/api/checkin` mints inline at scan time, but if minting
 * fails there (RPC down, minter wallet out of gas, attendee hadn't connected
 * a wallet yet) it silently falls back to an off-chain badge with no way to
 * ever retry. The `nft/mint` route directory existed in the project with no
 * route.ts inside it — this was a planned-but-never-built endpoint.
 *
 * Callable by the NFT's owner (the attendee) once they have a wallet linked,
 * or by the event's organizer on the attendee's behalf.
 */
const bodySchema = z.object({ nftId: z.string().min(1) });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const nft = await prisma.nFT.findUnique({
    where: { id: parsed.data.nftId },
    include: { event: true, user: true },
  });
  if (!nft) return NextResponse.json({ error: "NFT record not found" }, { status: 404 });

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  const isOwner = nft.userId === userId;
  const isAdmin = role === "ADMIN";
  let isOrganizer = isAdmin;
  if (!isOwner && !isAdmin) {
    const membership = await prisma.teamMember.findUnique({
      where: { eventId_userId: { eventId: nft.eventId, userId } },
    });
    isOrganizer = !!membership && ["OWNER", "ADMIN"].includes(membership.role);
  }
  if (!isOwner && !isOrganizer) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (nft.isOnChain) {
    return NextResponse.json({ error: "This NFT is already minted on-chain" }, { status: 400 });
  }
  if (!nft.user.walletAddress) {
    return NextResponse.json({ error: "Connect a wallet before minting" }, { status: 400 });
  }

  try {
    const metadataUrl = `${process.env.NEXTAUTH_URL}/api/nft/metadata/${nft.eventId}`;
    const mint = await mintAttendanceNFT({
      attendeeWallet: nft.user.walletAddress,
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

    await notify(nft.userId, {
      type: "NFT_MINTED",
      title: "Your POAP has been minted! 🎨",
      message: `Your on-chain Proof of Attendance for ${nft.event.title} is live on Base Sepolia.`,
      metadata: { eventId: nft.eventId, nftId: nft.id },
    });

    return NextResponse.json({ nft: updated });
  } catch (err) {
    console.error("Retry mint failed:", err);
    return NextResponse.json({ error: "Minting failed — try again shortly" }, { status: 502 });
  }
}
