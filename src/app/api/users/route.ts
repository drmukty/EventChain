import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;

  const users = await prisma.user.findMany({
    where: {
      id: { not: userId },
      wallets: { some: {} },
    },
    select: {
      id: true,
      name: true,
      email: true,
      wallets: {
        where: { isDefault: true },
        select: {
          id: true,
          address: true,
        },
      },
    },
  });

  const formattedUsers = users.map(user => ({
    id: user.id,
    name: user.name || user.email,
    email: user.email,
    walletAddress: user.wallets[0]?.address || null,
    walletId: user.wallets[0]?.id || null,
  })).filter(u => u.walletAddress);

  return NextResponse.json({ users: formattedUsers });
}
