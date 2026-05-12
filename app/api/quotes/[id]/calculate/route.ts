import { canAccessQuote, requireAuth } from '@/lib/auth';
import { writeAudit } from '@/lib/audit';
import { calculateQuote } from '@/lib/calc';
import { parseJsonString, toJsonString } from '@/lib/json';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    const quote = await canAccessQuote(user, params.id);
    if (!quote) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const form = await prisma.quoteForm.findUnique({ where: { quoteId: quote.id } });
    if (!form) return NextResponse.json({ message: '请先填写需求' }, { status: 400 });

    const directRules = await prisma.pricingDirectRule.findMany();
    const stepRules = await prisma.pricingStepRule.findMany();
    const comboRules = await prisma.pricingComboRule.findMany();
    const paramsList = await prisma.systemParameter.findMany();

    const formData = parseJsonString<Record<string, any>>(form.formData, {});
    const sceneRuleKeys = [
      'scene_price_building','scene_price_device_normal','scene_price_device_complex','scene_price_unit_large','scene_price_line_normal','scene_price_line_complex',
      'scene_cond_full_clean','scene_cond_full_messy','scene_cond_partial','scene_cond_all_self',
      'scene_precision_low','scene_precision_mid','scene_precision_high',
      'scene_visual_high','scene_visual_mid','scene_visual_low',
      'scene_hardware_yes','scene_hardware_no'
    ];
    const paramMap = new Map(paramsList.map((p) => [p.paramKey, p.paramValue]));
    for (const key of sceneRuleKeys) formData[`__rule_${key}`] = Number(paramMap.get(key) ?? 0);
    const oldResult = await prisma.quoteResult.findUnique({ where: { quoteId: quote.id } });

    const result = calculateQuote({
      formData,
      directRules,
      stepRules,
      comboRules,
      params: paramsList,
      profitRate: body.profitRate,
      taxRate: body.taxRate,
      procurementRate: body.procurementRate
    });

    const dbPayload = {
      ...result,
      moduleCosts: toJsonString(result.moduleCosts),
      calcContext: toJsonString(result.calcContext)
    };

    await prisma.quoteResult.upsert({
      where: { quoteId: quote.id },
      update: dbPayload,
      create: { quoteId: quote.id, ...dbPayload }
    });

    await prisma.quote.update({ where: { id: quote.id }, data: { status: 'CALCULATED' } });

    const changed: any = {};
    if (oldResult) {
      if (oldResult.profitRate !== result.profitRate) changed.profitRate = [oldResult.profitRate, result.profitRate];
      if (oldResult.taxRate !== result.taxRate) changed.taxRate = [oldResult.taxRate, result.taxRate];
      if (oldResult.procurementRate !== result.procurementRate) changed.procurementRate = [oldResult.procurementRate, result.procurementRate];
    }

    await writeAudit(user.id, 'QUOTE_CALCULATED', 'QUOTE', quote.id, { changed, inputs: body });
    if (changed.profitRate) await writeAudit(user.id, 'PROFIT_RATE_UPDATED', 'QUOTE', quote.id, changed.profitRate);
    if (changed.taxRate) await writeAudit(user.id, 'TAX_RATE_UPDATED', 'QUOTE', quote.id, changed.taxRate);
    if (changed.procurementRate) await writeAudit(user.id, 'PROCUREMENT_RATE_UPDATED', 'QUOTE', quote.id, changed.procurementRate);

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
}
