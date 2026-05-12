import { canAccessQuote, requireAuth } from '@/lib/auth';
import { writeAudit } from '@/lib/audit';
import { toJsonString } from '@/lib/json';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    const quote = await canAccessQuote(user, params.id);
    if (!quote) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    const [form, result] = await Promise.all([
      prisma.quoteForm.findUnique({ where: { quoteId: quote.id } }),
      prisma.quoteResult.findUnique({ where: { quoteId: quote.id } })
    ]);
    if (!result) return NextResponse.json({ message: '尚无结果' }, { status: 400 });

    const snap = await prisma.quoteResultSnapshot.create({
      data: {
        quoteId: quote.id,
        createdById: user.id,
        formData: form?.formData || toJsonString({}),
        resultData: toJsonString(result)
      }
    });
    await writeAudit(user.id, 'QUOTE_SNAPSHOT_SAVED', 'QUOTE', quote.id, { snapshotId: snap.id });
    return NextResponse.json(snap);
  } catch {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
}
