import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getExplorerUrl } from "@/lib/wallet";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const walletId = params.id;

  // Check wallet belongs to user
  const wallet = await prisma.wallet.findFirst({
    where: { id: walletId, userId },
  });

  if (!wallet) {
    return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
  }

  // Get all payments sent from this wallet
  const payments = await prisma.payment.findMany({
    where: { senderWalletId: walletId },
    include: {
      application: {
        include: {
          user: true,
        },
      },
      event: {
        select: {
          title: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Format transactions
  const transactions = payments.map((p) => {
    // Determine recipient name from application user
    let recipientName = "Unknown";
    if (p.application?.user) {
      recipientName = p.application.user.name || p.application.user.email || "Unknown";
    }

    return {
      id: p.id,
      type: "sent",
      amount: p.amount,
      token: p.token,
      recipient: p.recipient,
      recipientName,
      status: p.status,
      txHash: p.txHash,
      networkId: p.networkId,
      eventTitle: p.event?.title || "N/A",
      attendeeName: recipientName,
      createdAt: p.createdAt,
      explorerUrl: p.txHash ? getExplorerUrl(p.txHash, p.networkId as any) : null,
    };
  });

  return NextResponse.json({ transactions });
}
