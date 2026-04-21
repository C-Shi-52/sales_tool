import { requireAdmin } from '@/lib/auth';
import { writeAudit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    return NextResponse.json(await prisma.formFieldRule.findMany({ orderBy: { orderNo: 'asc' } }));
  } catch {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAdmin(req);
    const body = await req.json();
    const item = await prisma.formFieldRule.update({
      where: { id: body.id },
      data: {
        label: body.label,
        visibleWhen: body.visibleWhen,
        requiredWhen: body.requiredWhen,
        validationRule: body.validationRule,
        editableRoles: body.editableRoles
      }
    });
    await writeAudit(user.id, 'ADMIN_RULE_UPDATED', 'FORM_FIELD_RULE', item.id, body);
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }
}
