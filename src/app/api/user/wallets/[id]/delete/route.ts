import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const walletId = params.id;

  const wallet = await prisma.wallet.findFirst({
    where: { id: walletId, userId },
    include: { payments: true },
  });

  if (!wallet) {
    return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
  }

  if (wallet.payments.length > 0) {
    return NextResponse.json(
      { error: 'Cannot delete wallet with transaction history' },
      { status: 400 }
    );
  }

  await prisma.wallet.delete({
    where: { id: walletId },
  });

  if (wallet.isDefault) {
    const nextWallet = await prisma.wallet.findFirst({
      where: { userId },
    });
    if (nextWallet) {
      await prisma.wallet.update({
        where: { id: nextWallet.id },
        data: { isDefault: true },
      });
    }
  }

  return NextResponse.json({ success: true });
}
