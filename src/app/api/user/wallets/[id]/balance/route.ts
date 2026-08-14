import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getBalance, getWalletBalances, DEFAULT_NETWORK, NetworkId } from '@/lib/wallet';

// GET - Get wallet balance for a specific network
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const walletId = params.id;

  // Get wallet
  const wallet = await prisma.wallet.findUnique({
    where: { id: walletId },
  });

  if (!wallet) {
    return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
  }

  if (wallet.userId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get network from query params
  const searchParams = req.nextUrl.searchParams;
  const networkId = (searchParams.get('network') as NetworkId) || DEFAULT_NETWORK;

  try {
    const balance = await getBalance(wallet.address, networkId);
    return NextResponse.json({
      address: wallet.address,
      network: networkId,
      balance,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch balance' },
      { status: 500 }
    );
  }
}

// POST - Get balances for all networks
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

  const wallet = await prisma.wallet.findUnique({
    where: { id: walletId },
  });

  if (!wallet) {
    return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
  }

  if (wallet.userId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const balances = await getWalletBalances(wallet.address);
    return NextResponse.json({
      address: wallet.address,
      balances,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch balances' },
      { status: 500 }
    );
  }
}
