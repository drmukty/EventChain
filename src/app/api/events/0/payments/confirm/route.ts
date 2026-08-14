import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decryptPrivateKey } from '@/lib/wallet';
import { processPayment } from '@/lib/payment';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const body = await request.json();
  const { paymentId, masterPassword } = body;

  if (!paymentId || !masterPassword) {
    return NextResponse.json(
      { error: 'Missing required fields: paymentId, masterPassword' },
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

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      senderWallet: true,
    },
  });

  if (!payment) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  }

  if (payment.status === 'COMPLETED') {
    return NextResponse.json(
      { error: 'Payment already completed' },
      { status: 400 }
    );
  }

  let privateKey: string;
  try {
    privateKey = decryptPrivateKey(payment.senderWallet.encryptedKey, masterPassword);
  } catch {
    return NextResponse.json(
      { error: 'Invalid master password' },
      { status: 400 }
    );
  }

  try {
    const result = await processPayment(paymentId, privateKey);
    if (result.success) {
      return NextResponse.json({
        success: true,
        txHash: result.txHash,
        message: 'Payment sent successfully!',
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'Payment failed' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to process payment' },
      { status: 500 }
    );
  }
}
