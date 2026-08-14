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
  const { name } = await req.json();

  if (!name || name.trim().length === 0) {
    return NextResponse.json(
      { error: 'Wallet name is required' },
      { status: 400 }
    );
  }

  const wallet = await prisma.wallet.findFirst({
    where: { id: walletId, userId },
  });

  if (!wallet) {
    return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
  }

  const updated = await prisma.wallet.update({
    where: { id: walletId },
    data: { name: name.trim() },
  });

  return NextResponse.json({ success: true, wallet: updated });
}
