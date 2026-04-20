import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    const rows = await prisma.formFieldRule.findMany({ orderBy: { orderNo: 'asc' } });
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
}
