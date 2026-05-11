import { canAccessQuote, requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { parseJsonString } from '@/lib/json';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    const quote = await canAccessQuote(user, params.id);
    if (!quote) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    const full = await prisma.quote.findUnique({
      where: { id: params.id },
      include: { form: true, result: true, owner: true, snapshots: true }
    });

    if (!full) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    const mapped = {
      ...full,
      form: full.form ? { ...full.form, formData: parseJsonString(full.form.formData, {}) } : null,
      result: full.result
        ? {
            ...full.result,
            moduleCosts: parseJsonString(full.result.moduleCosts, {}),
            calcContext: parseJsonString(full.result.calcContext, {})
          }
        : null,
      snapshots: full.snapshots.map((s) => ({
        ...s,
        formData: parseJsonString(s.formData, {}),
        resultData: parseJsonString(s.resultData, {})
      }))
    };

    return NextResponse.json(mapped);
  } catch {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
}
