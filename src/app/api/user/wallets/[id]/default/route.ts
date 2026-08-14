import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const walletId = params.id;

  // Check wallet belongs to user
  const wallet = await prisma.wallet.findFirst({
    where: { id: walletId, userId },
  });

  if (!wallet) {
    return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
  }

  // Set all wallets of this user to isDefault = false
  await prisma.wallet.updateMany({
    where: { userId },
    data: { isDefault: false },
  });

  // Set this wallet as default
  await prisma.wallet.update({
    where: { id: walletId },
    data: { isDefault: true },
  });

  return NextResponse.json({ success: true });
}
