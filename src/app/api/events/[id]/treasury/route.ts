import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasEventAccess } from '@/lib/eventAccess';
import { getWalletBalances, DEFAULT_NETWORK, NetworkId } from '@/lib/wallet';
import { createAuditLog } from '@/lib/audit';

export async function GET(
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

  // Get user's default wallet, or first wallet if none set as default
  let wallet = await prisma.wallet.findFirst({
    where: { userId, isDefault: true },
  });

  if (!wallet) {
    wallet = await prisma.wallet.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  if (!wallet) {
    return NextResponse.json({
      wallet: null,
      balances: {},
      payments: [],
      summary: { totalPaid: 0, pendingPayments: 0, failedPayments: 0, totalPayments: 0 },
    });
  }

  // Get balances for all networks
  const balances = await getWalletBalances(wallet.address);

  // Get payments for this event
  const payments = await prisma.payment.findMany({
    where: { eventId },
    include: {
      application: {
        include: {
          user: true,
        },
      },
      senderWallet: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  // Summary
  const totalPayments = payments.length;
  const completedPayments = payments.filter(p => p.status === 'COMPLETED');
  const pendingPayments = payments.filter(p => p.status === 'PENDING' || p.status === 'PROCESSING');
  const failedPayments = payments.filter(p => p.status === 'FAILED');
  const totalPaid = completedPayments.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);

  // Audit log
  await createAuditLog({
    userId,
    action: 'VIEW_TREASURY',
    resource: 'event',
    resourceId: eventId,
    metadata: { view: 'treasury_overview' },
  });

  return NextResponse.json({
    wallet: {
      id: wallet.id,
      address: wallet.address,
    },
    balances,
    payments,
    summary: {
      totalPaid,
      pendingPayments: pendingPayments.length,
      failedPayments: failedPayments.length,
      totalPayments,
    },
  });
}
