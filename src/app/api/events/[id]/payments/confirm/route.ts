import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasEventAccess } from '@/lib/eventAccess';
import { decryptPrivateKey } from '@/lib/wallet';
import { processPayment } from '@/lib/payment';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const eventId = params.id;

  const hasAccess = await hasEventAccess(userId, eventId, ['OWNER', 'ADMIN']);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Rate limit
  const { allowed } = rateLimit(userId, 10, 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment.' },
      { status: 429 }
    );
  }

  const body = await req.json();
  const { paymentId, masterPassword } = body;

  if (!paymentId || !masterPassword) {
    return NextResponse.json(
      { error: 'Missing required fields: paymentId, masterPassword' },
      { status: 400 }
    );
  }

  // Get payment
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId, eventId },
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

  // Decrypt private key
  let privateKey: string;
  try {
    privateKey = decryptPrivateKey(payment.senderWallet.encryptedKey, masterPassword);
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid master password' },
      { status: 400 }
    );
  }

  // Process payment
  try {
    const result = await processPayment(paymentId, privateKey
