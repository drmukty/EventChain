import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { NETWORKS, DEFAULT_NETWORK } from '@/lib/wallet';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const body = await request.json();
  const { recipientId, recipientWallet, amount, networkId = DEFAULT_NETWORK } = body;

  if (!recipientId || !recipientWallet || !amount) {
    return NextResponse.json(
      { error: 'Missing required fields: recipientId, recipientWallet, amount' },
      { status: 400 }
    );
  }

  if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    return NextResponse.json(
      { error: 'Amount must be a positive number' },
      { status: 400 }
    );
  }

  if (!NETWORKS[networkId as keyof typeof NETWORKS]) {
    return NextResponse.json(
      { error: `Network ${networkId} not supported` },
      { status: 400 }
    );
  }

  const { allowed } = rateLimit(userId, 10, 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment.' },
      { status: 429 }
    );
  }

  const senderWallet = await prisma.wallet.findFirst({
    where: { userId, isDefault: true },
  });

  if (!senderWallet) {
    return NextResponse.json(
      { error: 'No default wallet found. Please set a default wallet first.' },
      { status: 400 }
    );
  }

  const recipient = await prisma.user.findFirst({
    where: {
      id: recipientId,
      wallets: {
        some: { address: recipientWallet },
      },
    },
  });

  if (!recipient) {
    return NextResponse.json(
      { error: 'Recipient not found' },
      { status: 404 }
    );
  }

  const payment = await prisma.payment.create({
    data: {
      eventId: '',
      applicationId: '',
      senderWalletId: senderWallet.id,
      recipient: recipientWallet,
      token: 'ETH',
      amount: String(amount),
      status: 'PENDING',
      networkId,
    },
  });

  await createAuditLog({
    userId,
    action: 'PAYMENT_INITIATED',
    resource: 'payment',
    resourceId: payment.id,
    metadata: {
      recipientId,
      amount,
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
    requiresConfirmation: true,
  });
}
