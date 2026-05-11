import { requireAdmin } from '@/lib/auth';
import { writeAudit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    return NextResponse.json(await prisma.pricingDirectRule.findMany({ orderBy: { ruleKey: 'asc' } }));
  } catch {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAdmin(req);
    const body = await req.json();
    const rule = await prisma.pricingDirectRule.update({
      where: { id: body.id },
      data: { value: Number(body.value), ruleName: body.ruleName, enabled: !!body.enabled }
    });
    await writeAudit(user.id, 'ADMIN_RULE_UPDATED', 'DIRECT_RULE', rule.id, body);
    return NextResponse.json(rule);
  } catch {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }
}
