import { requireAdmin } from '@/lib/auth';
import { writeAudit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    return NextResponse.json(await prisma.pricingStepRule.findMany({ orderBy: { ruleKey: 'asc' } }));
  } catch {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAdmin(req);
    const body = await req.json();
    const rule = await prisma.pricingStepRule.update({
      where: { id: body.id },
      data: {
        ruleName: body.ruleName,
        stepSize: Number(body.stepSize),
        freeSteps: Number(body.freeSteps),
        stepPrice: Number(body.stepPrice),
        enabled: !!body.enabled
      }
    });
    await writeAudit(user.id, 'ADMIN_RULE_UPDATED', 'STEP_RULE', rule.id, body);
    return NextResponse.json(rule);
  } catch {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }
}
