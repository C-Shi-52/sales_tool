import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: true },
      take: 200
    });
    return NextResponse.json(logs);
  } catch {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }
}
