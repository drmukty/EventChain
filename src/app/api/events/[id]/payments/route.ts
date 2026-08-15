import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasEventAccess } from "@/lib/eventAccess";
import { createAuditLog } from "@/lib/audit";
import { NETWORKS, DEFAULT_NETWORK } from "@/lib/wallet";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const eventId = params.id;

  const hasAccess = await hasEventAccess(userId, eventId, ["OWNER", "ADMIN"]);
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Rate limit
  const { allowed } = rateLimit(userId, 10, 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 }
    );
  }

  const body = await req.json();
  const { applicationId, amount, networkId = DEFAULT_NETWORK } = body;

  if (!applicationId || !amount) {
    return NextResponse.json(
      { error: "Missing required fields: applicationId, amount" },
      { status: 400 }
    );
  }

  // Validate amount
  if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    return NextResponse.json(
      { error: "Amount must be a positive number" },
      { status: 400 }
    );
  }

  // Validate network
  if (!NETWORKS[networkId as keyof typeof NETWORKS]) {
    return NextResponse.json(
      { error: `Network ${networkId} not supported` },
      { status: 400 }
    );
  }

  // Get user's default wallet (sender)
  const senderWallet = await prisma.wallet.findFirst({
    where: { userId, isDefault: true },
  });

  if (!senderWallet) {
    return NextResponse.json(
      { error: "No default wallet found. Please set a default wallet first." },
      { status: 400 }
    );
  }

  // Get application and user with default wallet
  const application = await prisma.application.findUnique({
    where: { id: applicationId, eventId },
    include: {
      user: {
        include: {
          wallets: {
            where: { isDefault: true },
            take: 1,
          },
        },
      },
    },
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  if (application.status !== "APPROVED") {
    return NextResponse.json(
      { error: "Application is not approved" },
      { status: 400 }
    );
  }

  // Get the recipient's default wallet address
  const recipientWallet = application.user.wallets[0]?.address || application.user.walletAddress;

  if (!recipientWallet) {
    return NextResponse.json(
      { error: "Attendee has no wallet connected" },
      { status: 400 }
    );
  }

  // Check for existing pending payment
  const existingPending = await prisma.payment.findFirst({
    where: {
      applicationId,
      status: { in: ["PENDING", "PROCESSING"] },
    },
  });

  if (existingPending) {
    return NextResponse.json(
      { error: "A payment is already pending for this attendee" },
      { status: 400 }
    );
  }

  // Create payment record
  const payment = await prisma.payment.create({
    data: {
      eventId,
      applicationId,
      senderWalletId: senderWallet.id,
      recipient: recipientWallet,
      token: "ETH",
      amount: String(amount),
      status: "PENDING",
      networkId,
    },
  });

  // Audit log
  await createAuditLog({
    userId,
    action: "PAYMENT_INITIATED",
    resource: "payment",
    resourceId: payment.id,
    metadata: {
      eventId,
      applicationId,
      amount,
      recipient: recipientWallet,
      networkId,
    },
  });

  return NextResponse.json({
    success: true,
    payment: {
      id: payment.id,
      amount: payment.amount,
      token: payment.token,
      recipient: payment.recipient,
      status: payment.status,
      networkId: payment.networkId,
      createdAt: payment.createdAt,
    },
    message: "Payment initiated. Enter your master password to confirm.",
    requiresConfirmation: true,
  });
}
