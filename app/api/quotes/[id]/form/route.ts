import { canAccessQuote, requireAuth } from '@/lib/auth';
import { writeAudit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { validateDynamicForm } from '@/lib/ruleEngine';
import { NextRequest, NextResponse } from 'next/server';
import { parseJsonString, toJsonString } from '@/lib/json';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    const quote = await canAccessQuote(user, params.id);
    if (!quote) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    const body = await req.json();
    const formData = body.formData || {};

    const rulesRaw = await prisma.formFieldRule.findMany({ orderBy: { orderNo: 'asc' } });
    const rules = rulesRaw.map((r) => ({ ...r, fieldOptions: parseJsonString(r.fieldOptions, null) }));
    const errors = validateDynamicForm(rules as any, formData);
    if (Object.keys(errors).length > 0 && body.strictValidation) {
      return NextResponse.json({ message: 'Validation failed', errors }, { status: 400 });
    }

    const updated = await prisma.quoteForm.upsert({
      where: { quoteId: quote.id },
      update: { formData: toJsonString(formData) },
      create: { quoteId: quote.id, formData: toJsonString(formData) }
    });

    await prisma.quote.update({
      where: { id: quote.id },
      data: {
        projectName: formData.project_name || quote.projectName,
        customerName: formData.customer_name,
        remarks: formData.remarks
      }
    });

    await writeAudit(user.id, 'QUOTE_FORM_UPDATED', 'QUOTE', quote.id, { hasErrors: Object.keys(errors).length > 0, errors });
    return NextResponse.json({ form: { ...updated, formData }, errors });
  } catch {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
}
