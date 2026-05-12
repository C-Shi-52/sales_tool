import { requireAdmin } from '@/lib/auth';
import { writeAudit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    return NextResponse.json(await prisma.pricingComboRule.findMany({ orderBy: { ruleKey: 'asc' } }));
  } catch {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAdmin(req);
    const body = await req.json();
    const rule = await prisma.pricingComboRule.update({
      where: { id: body.id },
      data: { ruleName: body.ruleName, expression: body.expression, outputType: body.outputType, outputValue: Number(body.outputValue), enabled: !!body.enabled }
    });
    await writeAudit(user.id, 'ADMIN_RULE_UPDATED', 'COMBO_RULE', rule.id, body);
    return NextResponse.json(rule);
  } catch {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }
}
