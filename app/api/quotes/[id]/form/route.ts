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
    appendCustomValidationErrors(formData, errors);

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

function isEmptyValue(value: any) {
  return value === undefined || value === null || value === '' || value === '请选择';
}

function asNumber(value: any) {
  if (value === '' || value === null || value === undefined) return NaN;
  return Number(value);
}

function appendCustomValidationErrors(formData: Record<string, any>, errors: Record<string, string>) {
  // 基础信息
  if (isEmptyValue(formData.project_name)) errors.project_name = '项目名称必填';
  if (isEmptyValue(formData.customer_name)) errors.customer_name = '客户名称必填';
  if (isEmptyValue(formData.owner_user_id)) errors.owner_user_id = '销售负责人必填';
  if (isEmptyValue(formData.project_location)) errors.project_location = '项目实施地点必填';

  // 三维场景
  if (formData.need_3d_scene === '是') {
    if (isEmptyValue(formData.modeling_basis)) errors.modeling_basis = '建模依据的材料来源必填';
    if (formData.modeling_basis === '需要我们自行采集部分或全部材料' && !(asNumber(formData.self_collection_cost) >= 0)) {
      errors.self_collection_cost = '自采成本预估（元）必填且必须大于等于0';
    }
    if (isEmptyValue(formData.visual_effect_level)) errors.visual_effect_level = '美术效果要求必填';
  }

  // 数据对接
  if (formData.need_data_integration === '是') {
    const dataOptions = ['has_unified_platform', 'has_external_platform_data', 'need_file_import', 'need_history_processing'];
    if (!dataOptions.some((k) => formData[k] === '是')) {
      errors.need_data_integration = '对接内容（可多选）至少选择一项';
    }

    if (formData.has_unified_platform === '是') {
      if (!(asNumber(formData.unified_platform_count) > 0)) errors.unified_platform_count = '平台数量必填且必须大于0';
      if (!(asNumber(formData.unified_platform_point_count) > 0)) errors.unified_platform_point_count = '平台内平均数据点位数量必填且必须大于0';
    }
    if (formData.has_external_platform_data === '是') {
      if (formData.need_software_integration === '是') {
        if (!(asNumber(formData.external_software_system_count) > 0)) errors.external_software_system_count = '软件系统数量必填且必须大于0';
        if (!(asNumber(formData.external_software_point_count) > 0)) errors.external_software_point_count = '软件系统平均数据点位数量必填且必须大于0';
      }
      if (formData.need_hardware_integration === '是') {
        if (!(asNumber(formData.external_hardware_system_count) > 0)) errors.external_hardware_system_count = '硬件系统数量必填且必须大于0';
        if (!(asNumber(formData.external_hardware_point_count) > 0)) errors.external_hardware_point_count = '硬件系统平均数据点位数量必填且必须大于0';
      }
    }
  }

  // 视频监控
  if (formData.need_video_monitoring === '是' && !(asNumber(formData.video_point_count) > 0)) {
    errors.video_point_count = '视频监控点位数量必填且必须大于0';
  }

  // 二维看板
  if (formData.need_dashboard === '是' && !(asNumber(formData.dashboard_count) > 0)) {
    errors.dashboard_count = '看板数量必填且必须大于0';
  }

  // 预警功能
  if (formData.need_alerting === '是') {
    const hasRule = ['alert_rule_event', 'alert_rule_threshold', 'alert_rule_trend'].some((k) => formData[k] === '是');
    const hasWay = ['alert_delivery_internal', 'alert_delivery_external', 'alert_delivery_phone_sms'].some((k) => formData[k] === '是');
    if (!hasRule) errors.need_alerting = '预警规则至少选择一项';
    if (!hasWay) errors.alert_delivery_method = '预警方式至少选择一项';
  }

  // 产品授权
  if (formData.need_shengong_suite === '是') {
    if (isEmptyValue(formData.editor_license_type)) errors.editor_license_type = '神工套件授权类型必填';
    if (!(asNumber(formData.editor_license_count) > 0)) errors.editor_license_count = '授权数量必填且必须大于0';
    if (!(asNumber(formData.distribution_license_count) >= 0)) errors.distribution_license_count = '额外购买分发授权数量必须大于等于0';
  }

  // 实施管理
  if (formData.need_onsite_dev === '是' && isEmptyValue(formData.onsite_mode)) {
    errors.onsite_mode = '驻场情况必填';
  }

  // 回款
  ['payment_ratio_1', 'payment_ratio_2', 'payment_ratio_3', 'payment_ratio_4', 'payment_cycle_t', 'warranty_period_b'].forEach((k) => {
    if (isEmptyValue(formData[k])) errors[k] = '该字段必填';
  });

  // 商务支出
  ['travel_expense', 'hospitality_expense', 'procurement_channel_cost'].forEach((k) => {
    if (!(asNumber(formData[k]) >= 0)) errors[k] = '该字段必填且必须大于等于0';
  });
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
