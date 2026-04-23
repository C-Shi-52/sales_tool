import { requireAdmin } from '@/lib/auth';
import { parseJsonString } from '@/lib/json';
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
    return NextResponse.json(logs.map((l) => ({ ...l, detail: parseJsonString(l.detail, null) })));
  } catch {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }
}
