import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyQRCode, consumeQRCode } from "@/lib/qr";
import { mintAttendanceNFT } from "@/lib/blockchain";
import { notify } from "@/lib/notifications";

const REASON_MESSAGES: Record<string, string> = {
  MALFORMED: "This QR code could not be read.",
  TAMPERED: "This QR code failed signature verification and cannot be trusted.",
  EXPIRED: "This QR code has expired.",
  ALREADY_USED: "This QR code has already been used to check in.",
  NOT_FOUND: "This QR code is not recognized.",
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  const { payload, eventId } = await req.json();

  if (!payload || !eventId) {
    return NextResponse.json(
      { error: "Missing QR payload or event ID" },
      { status: 400 }
    );
  }

  // Step 1: Verify the QR code
  const verification = await verifyQRCode(payload);
  if (!verification.ok) {
    return NextResponse.json(
      { error: REASON_MESSAGES[verification.reason] ?? "Invalid QR code" },
      { status: 400 }
    );
  }

  // Step 2: Fetch the application using the ID from verification
  const application = await prisma.application.findUnique({
    where: { id: verification.applicationId },
    include: { event: true, user: true },
  });
  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  // Make sure the QR belongs to the event being scanned
  if (application.eventId !== eventId) {
    return NextResponse.json(
      {
        error: "This QR code belongs to a different event.",
      },
      { status: 400 }
    );
  }

  // Confirm the scanning user is authorized staff for this event.
  const isAdmin = role === "ADMIN";
  if (!isAdmin) {
    const membership = await prisma.teamMember.findUnique({
      where: { eventId_userId: { eventId: application.eventId, userId: (session.user as any).id } },
    });
    if (!membership || !["OWNER", "ADMIN", "VOLUNTEER", "QR_SCANNER"].includes(membership.role)) {
      return NextResponse.json({ error: "You are not authorized to scan for this event" }, { status: 403 });
    }
  }

  // Mark QR as used only after all validations succeed
  const consumeResult = await consumeQRCode(verification.token);
  if (!consumeResult.ok) {
    return NextResponse.json(
      {
        error: REASON_MESSAGES[consumeResult.reason] ?? "QR code already used",
      },
      { status: 400 }
    );
  }

  const checkIn = await prisma.checkIn.create({
    data: {
      eventId: application.eventId,
      applicationId: application.id,
      userId: application.userId,
      scannedById: (session.user as any).id,
    },
  });

  let nftResult: { isOnChain: boolean; txHash?: string; tokenId?: string; contractAddr?: string; chainId?: number } = {
    isOnChain: false,
  };

  if (application.user.walletAddress) {
    try {
      const metadataUrl = `${process.env.NEXTAUTH_URL}/api/nft/metadata/${application.eventId}`;
      const mint = await mintAttendanceNFT({
        attendeeWallet: application.user.walletAddress,
        eventId: application.eventId,
        metadataUrl,
      });
      nftResult = {
        isOnChain: true,
        txHash: mint.txHash,
        tokenId: mint.tokenId,
        contractAddr: mint.contractAddress,
        chainId: mint.chainId,
      };
    } catch (err) {
      // Minting failure shouldn't block a successful check-in — fall back to
      // an off-chain badge and surface the error for the organizer to see.
      console.error("On-chain mint failed, issuing off-chain badge instead:", err);
    }
  }

  const nft = await prisma.nFT.create({
    data: {
      eventId: application.eventId,
      userId: application.userId,
      checkInId: checkIn.id,
      isOnChain: nftResult.isOnChain,
      txHash: nftResult.txHash,
      tokenId: nftResult.tokenId,
      contractAddr: nftResult.contractAddr,
      chainId: nftResult.chainId,
    },
  });

  await notify(application.userId, {
    type: "NFT_MINTED",
    title: nftResult.isOnChain ? "Your POAP has been minted! 🎨" : "Attendance badge issued",
    message: nftResult.isOnChain
      ? `Your on-chain Proof of Attendance for ${application.event.title} is live on Base Sepolia.`
      : `You checked in to ${application.event.title}. Connect a wallet next time to receive an on-chain POAP.`,
    metadata: { eventId: application.eventId, nftId: nft.id },
  });

  return NextResponse.json({
    checkIn,
    nft,
    attendee: { name: application.user.name, email: application.user.email },
  });
}
