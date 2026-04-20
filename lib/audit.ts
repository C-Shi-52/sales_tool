import { prisma } from './prisma';

export async function writeAudit(userId: string, action: string, entityType: string, entityId?: string, detail?: any) {
  await prisma.auditLog.create({
    data: { userId, action, entityType, entityId, detail }
  });
}
