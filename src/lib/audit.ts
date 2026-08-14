import { prisma } from '@/lib/prisma';

interface AuditLogData {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: any;
  ip?: string;
}

export async function createAuditLog(data: AuditLogData) {
  return prisma.auditLog.create({
    data: {
      userId: data.userId,
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId,
      metadata: data.metadata,
      ip: data.ip,
    },
  });
}
