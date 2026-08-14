import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createWallet, importWallet, encryptPrivateKey, isValidPrivateKey } from '@/lib/wallet';
import { createAuditLog } from '@/lib/audit';

// GET - Get all wallets for the current user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;

  const wallets = await prisma.wallet.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ wallets });
}

// POST - Create a new wallet
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const body = await request.json();
  const { masterPassword, importPrivateKey } = body;

  if (!masterPassword || masterPassword.length < 6) {
    return NextResponse.json(
      { error: 'Master password is required (minimum 6 characters)' },
      { status: 400 }
    );
  }

  // Check if user already has a wallet
  const existingWallet = await prisma.wallet.findFirst({
    where: { userId },
  });

  if (existingWallet) {
    return NextResponse.json(
      { error: 'You already have a wallet. Only one wallet is supported per user.' },
      { status: 400 }
    );
  }

  let address: string;
  let privateKey: string;

  try {
    if (importPrivateKey) {
      // Import existing wallet
      if (!isValidPrivateKey(importPrivateKey)) {
        return NextResponse.json(
          { error: 'Invalid private key' },
          { status: 400 }
        );
      }
      privateKey = importPrivateKey.trim();
      address = importWallet(privateKey);
    } else {
      // Create new wallet
      const wallet = createWallet();
      address = wallet.address;
      privateKey = wallet.privateKey;
    }

    // Encrypt private key with master password
    const encryptedKey = encryptPrivateKey(privateKey, masterPassword);

    // Save wallet to database
    const wallet = await prisma.wallet.create({
      data: {
        userId,
        address,
        encryptedKey,
        isDefault: true,
      },
    });

    // Audit log
    await createAuditLog({
      userId,
      action: 'WALLET_CREATED',
      resource: 'wallet',
      resourceId: wallet.id,
      metadata: { address, imported: !!importPrivateKey },
    });

    // Return wallet without private key
    return NextResponse.json({
      success: true,
      wallet: {
        id: wallet.id,
        address: wallet.address,
        isDefault: wallet.isDefault,
        createdAt: wallet.createdAt,
      },
      // Show private key only once (for new wallet creation)
      privateKey: importPrivateKey ? undefined : privateKey,
    });
  } catch (error: any) {
    console.error('Wallet creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create wallet' },
      { status: 500 }
    );
  }
}
