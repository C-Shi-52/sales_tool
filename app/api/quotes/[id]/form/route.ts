import { canAccessQuote, requireAuth } from '@/lib/auth';
import { writeAudit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { validateDynamicForm } from '@/lib/ruleEngine';
import { NextRequest, NextResponse } from 'next/server';
import { parseJsonString, toJsonString } from '@/lib/json';

const MODEL_TYPES = [
  '建筑类模型',
  '普通设备',
  '大型复杂设备/普通机组',
  '大型机组',
  '普通装置/普通产线',
  '大型复杂装置/大型复杂产线'
];

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(req);
    const quote = await canAccessQuote(user, params.id);
    if (!quote) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    const body = await req.json();
    const formData = body.formData || {};

    const rulesRaw = await prisma.formFieldRule.findMany({ orderBy: { orderNo: 'asc' } });
    const deprecated3dKeys = new Set([
      'building_model_area',
      'scene_cat_1_enabled', 'scene_cat_1_quantity', 'scene_cat_1_model_condition', 'scene_cat_1_precision',
      'scene_cat_2_enabled', 'scene_cat_2_quantity', 'scene_cat_2_model_condition', 'scene_cat_2_precision',
      'scene_cat_3_enabled', 'scene_cat_3_quantity', 'scene_cat_3_model_condition', 'scene_cat_3_precision',
      'scene_cat_4_enabled', 'scene_cat_4_quantity', 'scene_cat_4_model_condition', 'scene_cat_4_precision',
      'scene_cat_5_enabled', 'scene_cat_5_quantity', 'scene_cat_5_model_condition', 'scene_cat_5_precision'
    ]);

    const rules = rulesRaw
      .filter((r) => !deprecated3dKeys.has(r.fieldKey))
      .map((r) => ({ ...r, fieldOptions: parseJsonString(r.fieldOptions, null) }));

    const errors = validateDynamicForm(rules as any, formData);
    append3dValidationErrors(formData, errors);
    if (!formData.project_location || String(formData.project_location).trim().length === 0) {
      errors.project_location = '项目实施地点必填';
    }

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

function append3dValidationErrors(formData: Record<string, any>, errors: Record<string, string>) {
  if (formData.need_3d_scene !== '是') return;

  const rows = Array.isArray(formData.model_requirements) ? formData.model_requirements : [];
  if (rows.length === 0) {
    errors.model_requirements = '至少添加一组模型需求';
    return;
  }

  const usedTypes = new Set<string>();
  rows.forEach((row: any, idx: number) => {
    if (!row.model_type || !MODEL_TYPES.includes(row.model_type)) {
      errors[`model_requirements.${idx}.model_type`] = '模型类型必填且必须合法';
      return;
    }
    if (usedTypes.has(row.model_type)) {
      errors[`model_requirements.${idx}.model_type`] = '模型类型不能重复';
    }
    usedTypes.add(row.model_type);

    if (row.quantity === '' || row.quantity === null || row.quantity === undefined || Number(row.quantity) < 0) {
      errors[`model_requirements.${idx}.quantity`] = '数量必须为大于等于0的数字';
    }

    if (row.model_type !== '建筑类模型') {
      if (!row.model_condition) errors[`model_requirements.${idx}.model_condition`] = '模型基础条件必填';
      if (!row.precision) errors[`model_requirements.${idx}.precision`] = '建模精细程度必填';
    }
  });

  if (!formData.modeling_basis) errors.modeling_basis = '建模依据的材料来源必填';
  if (formData.modeling_basis === '需要我们自行采集部分或全部材料' && Number(formData.self_collection_cost) < 0) {
    errors.self_collection_cost = '自采成本预估必须为大于等于0的数字';
  }
  if (!formData.visual_effect_level) errors.visual_effect_level = '美术效果要求必填';
  if (!formData.hardware_constraint) errors.hardware_constraint = '模型量大且硬件受限必填';
}
