import { prisma } from './prisma';
import { toJsonString } from './json';

export async function writeAudit(userId: string, action: string, entityType: string, entityId?: string, detail?: any) {
  await prisma.auditLog.create({
    data: { userId, action, entityType, entityId, detail: detail === undefined ? null : toJsonString(detail) }
  });
}
