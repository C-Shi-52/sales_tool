import { canAccessQuote, requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    const quote = await canAccessQuote(user, params.id);
    if (!quote) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    const result = await prisma.quoteResult.findUnique({ where: { quoteId: quote.id } });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
}
