import { prisma } from './prisma';
import { NETWORKS, NetworkId, sendTransaction, getExplorerUrl } from './wallet';
import { createAuditLog } from './audit';

export async function processPayment(
  paymentId: string,
  privateKey: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      application: true,
      event: true,
      senderWallet: true,
    },
  });

  if (!payment) {
    return { success: false, error: 'Payment not found' };
  }

  if (payment.status === 'COMPLETED') {
    return { success: false, error: 'Payment already completed' };
  }

  try {
    // Update status to PROCESSING
    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'PROCESSING' },
    });

    // Send transaction
    const result = await sendTransaction(
      privateKey,
      payment.recipient,
      payment.amount,
      payment.networkId as NetworkId
    );

    // Update payment with tx hash
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'COMPLETED',
        txHash: result.txHash,
      },
    });

    // Audit log
    await createAuditLog({
      userId: payment.application.userId,
      action: 'PAYMENT_COMPLETED',
      resource: 'payment',
      resourceId: paymentId,
      metadata: {
        txHash: result.txHash,
        amount: payment.amount,
        token: payment.token,
        recipient: payment.recipient,
        network: payment.networkId,
      },
    });

    return { success: true, txHash: result.txHash };
  } catch (error: any) {
    // Update payment with error
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'FAILED',
        error: error.message || 'Transaction failed',
      },
    });

    // Audit log
    await createAuditLog({
      userId: payment.application.userId,
      action: 'PAYMENT_FAILED',
      resource: 'payment',
      resourceId: paymentId,
      metadata: {
        error: error.message,
        amount: payment.amount,
        token: payment.token,
        recipient: payment.recipient,
        network: payment.networkId,
      },
    });

    return { success: false, error: error.message };
  }
}

export function getExplorerLink(txHash: string, networkId: NetworkId): string {
  return getExplorerUrl(txHash, networkId);
}

export function getNetworkName(networkId: string): string {
  return NETWORKS[networkId as NetworkId]?.name || networkId;
}

export function getNetworkSymbol(networkId: string): string {
  return NETWORKS[networkId as NetworkId]?.symbol || 'ETH';
}
