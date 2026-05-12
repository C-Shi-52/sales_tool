import { PricingComboRule, PricingDirectRule, PricingStepRule, SystemParameter } from '@prisma/client';

export function getParam(params: SystemParameter[], key: string, fallback: number) {
  return params.find((p) => p.paramKey === key)?.paramValue ?? fallback;
}

function getDirect(directRules: PricingDirectRule[], key: string, fallback = 0) {
  return directRules.find((r) => r.ruleKey === key && r.enabled)?.value ?? fallback;
}

function stepCost(stepRules: PricingStepRule[], key: string, x: number) {
  const r = stepRules.find((s) => s.ruleKey === key && s.enabled);
  if (!r) return 0;
  const stepCount = Math.ceil((x || 0) / r.stepSize);
  const chargeable = Math.max(stepCount - r.freeSteps, 0);
  return chargeable * r.stepPrice;
}

function comboValue(comboRules: PricingComboRule[], key: string, formData: Record<string, any>, fallback = 0) {
  const r = comboRules.find((c) => c.ruleKey === key && c.enabled);
  if (!r) return fallback;
  try {
    const fn = new Function('data', `with(data){ return (${r.expression}); }`);
    const ok = !!fn(formData);
    return ok ? r.outputValue : fallback;
  } catch {
    return fallback;
  }
}

export function calculateQuote(input: {
  formData: Record<string, any>;
  directRules: PricingDirectRule[];
  stepRules: PricingStepRule[];
  comboRules: PricingComboRule[];
  params: SystemParameter[];
  profitRate?: number;
  taxRate?: number;
  procurementRate?: number;
}) {
  const { formData, directRules, stepRules, comboRules, params } = input;
  const defaultProfit = getParam(params, 'default_profit_rate', 0.2);
  const defaultTax = getParam(params, 'default_tax_rate', 0.06);
  const defaultProc = getParam(params, 'default_procurement_rate', 0.05);
  const annualRate = getParam(params, 'finance_annual_rate', 0.05);
  const workdayFactor = getParam(params, 'workday_to_naturalday_factor', 1.4);

  const profitRate = input.profitRate ?? Number(formData.profit_rate ?? defaultProfit);
  const taxRate = input.taxRate ?? Number(formData.tax_rate ?? defaultTax);
  const procurementRate = input.procurementRate ?? Number(formData.procurement_rate ?? defaultProc);

  const moduleCosts: Record<string, number> = {};

  let sceneCost = 0;
  if (formData.need_3d_scene === '是') {
    const rows = Array.isArray(formData.model_requirements) ? formData.model_requirements : [];

    const baseMap: Record<string, string> = {
      '建筑类模型': 'scene_price_building',
      '普通设备': 'scene_price_device_normal',
      '大型复杂设备/普通机组': 'scene_price_device_complex',
      '大型复杂设备 / 普通机组': 'scene_price_device_complex',
      '大型机组': 'scene_price_unit_large',
      '普通装置/普通产线': 'scene_price_line_normal',
      '普通装置 / 普通产线': 'scene_price_line_normal',
      '大型复杂装置/大型复杂产线': 'scene_price_line_complex',
      '大型复杂装置 / 大型复杂产线': 'scene_price_line_complex'
    };
    const condFactorMap: Record<string, string> = {
      '有完整的较规范的模型，我们只需要做模型处理': 'scene_cond_full_clean',
      '客户可以提供完整模型，但较为杂乱': 'scene_cond_full_messy',
      '部分由客户提供，我们仍需要进行部分建模': 'scene_cond_partial',
      '全部由我们自行建模': 'scene_cond_all_self'
    };
    const precisionFactorMap: Record<string, string> = {
      '仅需要外观，不需要内部结构': 'scene_precision_low',
      '外观+粗略内部结构': 'scene_precision_mid',
      '外观 + 粗略内部结构': 'scene_precision_mid',
      '外观+精细内部结构，或者对建模精度有要求': 'scene_precision_high',
      '外观 + 精细内部结构，或者对建模精度有要求': 'scene_precision_high'
    };
    for (const row of rows) {
      const qty = Number(row.quantity || 0);
      const baseKey = baseMap[row.model_type];
      const basePrice = getDirect(directRules, baseKey, sceneRule(formData, baseKey, 0));
      const isBuilding = row.model_type === '建筑类模型';
      const condFactor = isBuilding ? 1 : getDirect(directRules, condFactorMap[row.model_condition], sceneRule(formData, condFactorMap[row.model_condition], 1));
      const precFactor = isBuilding ? 1 : getDirect(directRules, precisionFactorMap[row.precision], sceneRule(formData, precisionFactorMap[row.precision], 1));
      sceneCost += qty * basePrice * condFactor * precFactor;
    }

    const visualMap: Record<string, string> = {
      '高要求（类似邯郸厂项目）': 'scene_visual_high',
      '中等要求（类似昆仑运营项目）': 'scene_visual_mid',
      '低要求（弱于昆仑运营项目效果）': 'scene_visual_low'
    };
    const visualKey = visualMap[formData.visual_effect_level];
    sceneCost *= getDirect(directRules, visualKey, sceneRule(formData, visualKey, 1));
    const hwKey = formData.hardware_constraint === '是' ? 'scene_hardware_yes' : 'scene_hardware_no';
    sceneCost *= getDirect(directRules, hwKey, sceneRule(formData, hwKey, 1));

    const isSelfCollection =
      formData.modeling_basis === '需要我们自行采集部分或全部材料' ||
      formData.modeling_basis === '部分由我方自行采集' ||
      formData.modeling_basis === '完全由我方自行采集';
    sceneCost += isSelfCollection ? comboValue(comboRules, 'modeling_basis_self_collection_bonus', { ...formData, modeling_basis: '部分由我方自行采集' }, 0) : 0;
    sceneCost += formData.modeling_basis === '客户提供所有材料' ? 0 : Number(formData.self_collection_cost || 0);
  }
  moduleCosts.scene_3d = round(sceneCost);

  let dataIntegrationCost = 0;
  if (formData.need_data_integration === '是') {
    dataIntegrationCost += formData.need_file_import === '是' ? 5000 : 0;
    dataIntegrationCost += stepCost(stepRules, 'unified_platform_point_count', Number(formData.unified_platform_point_count || 0));
    dataIntegrationCost += stepCost(stepRules, 'external_hardware_point_count', Number(formData.external_hardware_point_count || 0));
    dataIntegrationCost += stepCost(stepRules, 'external_software_point_count', Number(formData.external_software_point_count || 0));
    dataIntegrationCost += Number(formData.external_hardware_system_count || 0) * 3000;
    dataIntegrationCost += Number(formData.external_software_system_count || 0) * 3500;
    dataIntegrationCost += formData.need_history_processing === '是' ? 6000 : 0;
  }
  moduleCosts.data_integration = round(dataIntegrationCost);

  moduleCosts.video_monitoring =
    formData.need_video_monitoring === '是'
      ? round(stepCost(stepRules, 'video_point_count', Number(formData.video_point_count || 0)) + (formData.need_video_extra_data === '是' ? 5000 : 0))
      : 0;

  moduleCosts.dashboard =
    formData.need_dashboard === '是'
      ? round(stepCost(stepRules, 'dashboard_count', Number(formData.dashboard_count || 0)))
      : 0;

  moduleCosts.alerting =
    formData.need_alerting === '是'
      ? round(
          getDirect(
            directRules,
            `alert_${
              formData.alert_delivery_method === '短信'
                ? 'sms'
                : formData.alert_delivery_method === '邮件'
                  ? 'email'
                  : 'both'
            }`,
            0
          )
        )
      : 0;

  let license = 0;
  if (formData.need_shengong_suite === '是') {
    if (formData.allow_distribution === '是') {
      license += Number(formData.distribution_license_count || 0) * getDirect(directRules, 'distribution_license_unit', 1200);
    }
    if (formData.editor_license_type === '永久') {
      license += Number(formData.editor_license_count || 0) * getDirect(directRules, 'editor_perpetual_unit', 18000);
    } else if (formData.editor_license_type === '年度') {
      license +=
        Number(formData.editor_license_count || 0) *
        Number(formData.editor_license_years || 1) *
        getDirect(directRules, 'editor_yearly_unit', 6000);
    }
  }
  moduleCosts.license = round(license);

  moduleCosts.other_feature = round(Number(formData.other_feature_man_days || 0) * Number(formData.day_rate || 0));

  const allModuleCosts = Object.values(moduleCosts).reduce((a, b) => a + b, 0);

  const onsiteFactor = getDirect(
    directRules,
    formData.need_onsite_dev === '是' ? 'onsite_factor_yes' : 'onsite_factor_no',
    1
  );
  const implMgmtCost = round(Number(formData.total_labor_cost || 0) * onsiteFactor);
  const businessExpense = round(Number(formData.business_expense || 0));
  const otherAmortization = round(Number(formData.other_amortization || 0));

  const avgImplPeople = Math.max(Number(formData.avg_impl_people || 1), 0.0001);
  const dayRate = Math.max(Number(formData.day_rate || getParam(params, 'default_day_rate', 2000)), 0.0001);
  const implWorkDays = Number(formData.total_labor_cost || 0) / dayRate / avgImplPeople;
  const implNaturalDays = round(implWorkDays * workdayFactor);

  const n1 = Number(formData.payment_ratio_1 || 0);
  const n2 = Number(formData.payment_ratio_2 || 0);
  const n3 = Number(formData.payment_ratio_3 || 0);
  const n4 = Number(formData.payment_ratio_4 || 0);
  const t = Number(formData.payment_cycle_t || 0);
  const b = Number(formData.warranty_period_b || 0);
  const d = implNaturalDays;
  const weightedPaymentArrival = round(t + d * (0.7 * n2 + n3 + n4) + b * n4);

  const costBaseWithoutFinance = allModuleCosts + implMgmtCost + businessExpense + otherAmortization;
  const financeCost = round((costBaseWithoutFinance * annualRate * Math.max(weightedPaymentArrival - d / 2, 0)) / 365);
  const totalCost = round(costBaseWithoutFinance + financeCost);

  const targetPreTaxRevenue = round(totalCost * (1 + profitRate));
  const denominator = Math.max(1 - taxRate - procurementRate, 0.0001);
  const finalQuote = round(targetPreTaxRevenue / denominator);
  const procurementAmount = round(finalQuote * procurementRate);
  const taxAmount = round(finalQuote * taxRate);

  return {
    moduleCosts,
    implMgmtCost,
    businessExpense,
    otherAmortization,
    financeCost,
    totalCost,
    profitRate,
    taxRate,
    procurementRate,
    targetPreTaxRevenue,
    finalQuote,
    procurementAmount,
    taxAmount,
    implNaturalDays,
    weightedPaymentArrival,
    calcContext: { annualRate, workdayFactor, allModuleCosts }
  };
}

function round(n: number) {
  return Number(n.toFixed(2));
}

function sceneRule(formData: Record<string, any>, key: string, fallback: number) {
  return Number(formData[`__rule_${key}`] ?? fallback);
}
