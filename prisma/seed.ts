import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPwd = await bcrypt.hash('admin123', 10);
  const salesPwd = await bcrypt.hash('sales123', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', passwordHash: adminPwd, role: UserRole.ADMIN }
  });
  await prisma.user.upsert({
    where: { username: 'sales1' },
    update: {},
    create: { username: 'sales1', passwordHash: salesPwd, role: UserRole.SALES }
  });

  const systemParams = [
    ['default_profit_rate', '默认利润率', 0.2],
    ['default_tax_rate', '默认税率', 0.06],
    ['default_procurement_rate', '默认招采比例', 0.05],
    ['finance_annual_rate', '资金年化成本率', 0.05],
    ['workday_to_naturalday_factor', '工作日转自然日系数', 1.4],
    ['default_day_rate', '默认人日单价', 2000]
  ];

  for (const [paramKey, paramName, paramValue] of systemParams) {
    await prisma.systemParameter.upsert({
      where: { paramKey },
      update: { paramName, paramValue },
      create: { paramKey, paramName, paramValue }
    });
  }

  const directRules = [
    ['model_condition_basic', '模型基础条件-基础', 1],
    ['model_condition_medium', '模型基础条件-中等', 1.2],
    ['model_condition_hard', '模型基础条件-复杂', 1.5],
    ['precision_low', '建模精细程度-低', 1],
    ['precision_mid', '建模精细程度-中', 1.3],
    ['precision_high', '建模精细程度-高', 1.6],
    ['visual_effect_normal', '美术效果-标准', 1],
    ['visual_effect_good', '美术效果-良好', 1.2],
    ['visual_effect_best', '美术效果-电影级', 1.5],
    ['alert_sms', '预警方式-短信', 3000],
    ['alert_email', '预警方式-邮件', 1500],
    ['alert_both', '预警方式-短信+邮件', 4000],
    ['distribution_license_unit', '分发授权单价', 1200],
    ['editor_perpetual_unit', '编辑器永久授权单价', 18000],
    ['editor_yearly_unit', '编辑器年度授权单价', 6000],
    ['onsite_factor_yes', '驻场系数-是', 1.15],
    ['onsite_factor_no', '驻场系数-否', 1]
  ];

  for (const [ruleKey, ruleName, value] of directRules) {
    await prisma.pricingDirectRule.upsert({
      where: { ruleKey },
      update: { ruleName, value },
      create: { ruleKey, ruleName, value }
    });
  }

  const stepRules = [
    ['unified_platform_point_count', '统一平台点位', 50, 1, 3500],
    ['external_hardware_point_count', '平台外硬件点位', 50, 1, 4000],
    ['external_software_point_count', '平台外软件点位', 50, 1, 3800],
    ['video_point_count', '视频点位', 25, 0, 2500],
    ['dashboard_count', '看板数量', 1, 2, 5000]
  ];

  for (const [ruleKey, ruleName, stepSize, freeSteps, stepPrice] of stepRules) {
    await prisma.pricingStepRule.upsert({
      where: { ruleKey },
      update: { ruleName, stepSize, freeSteps, stepPrice },
      create: { ruleKey, ruleName, stepSize, freeSteps, stepPrice }
    });
  }

  const comboRules = [
    {
      ruleKey: 'modeling_basis_self_collection_bonus',
      ruleName: '建模依据自采附加',
      expression: 'modeling_basis in ["部分由我方自行采集","完全由我方自行采集"]',
      outputType: 'fixed_cost',
      outputValue: 8000
    },
    {
      ruleKey: 'hardware_constraint_factor',
      ruleName: '硬件约束系数',
      expression: 'hardware_constraint == "是"',
      outputType: 'multiplier',
      outputValue: 1.2
    }
  ];

  for (const row of comboRules) {
    await prisma.pricingComboRule.upsert({
      where: { ruleKey: row.ruleKey },
      update: row,
      create: row
    });
  }

  const yn = ['是', '否'];
  const fields = [
    ['project_name', '项目名称', 'string', null, null, 'value && value.length>0', 'SALES,ADMIN', '基础信息', 10],
    ['customer_name', '客户名称', 'string', null, null, null, 'SALES,ADMIN', '基础信息', 20],
    ['owner_user_id', '销售负责人', 'string', null, null, 'value && value.length>0', 'SALES,ADMIN', '基础信息', 30],
    ['remarks', '备注', 'text', null, null, null, 'SALES,ADMIN', '基础信息', 40],
    ['need_3d_scene', '是否需要三维场景', 'enum', yn, null, 'value==="是"||value==="否"', 'SALES,ADMIN', '三维场景', 100],
    ['building_model_area', '建筑类模型数量', 'number', null, 'need_3d_scene==="是"', 'value>=0', 'SALES,ADMIN', '三维场景', 110],
    ['modeling_basis', '建模依据', 'enum', ['客户提供','部分由我方自行采集','完全由我方自行采集'], 'need_3d_scene==="是"', null, 'SALES,ADMIN', '三维场景', 120],
    ['self_collection_cost', '自采成本预估', 'number', null, 'modeling_basis==="部分由我方自行采集"||modeling_basis==="完全由我方自行采集"', 'value>=0', 'SALES,ADMIN', '三维场景', 130],
    ['visual_effect_level', '美术效果要求', 'enum', ['标准','良好','电影级'], 'need_3d_scene==="是"', null, 'SALES,ADMIN', '三维场景', 140],
    ['hardware_constraint', '硬件受限', 'enum', yn, 'need_3d_scene==="是"', null, 'SALES,ADMIN', '三维场景', 150],
    ['need_data_integration', '是否需要对接数据', 'enum', yn, null, null, 'SALES,ADMIN', '数据对接', 200],
    ['need_file_import', '表格导入', 'enum', yn, 'need_data_integration==="是"', null, 'SALES,ADMIN', '数据对接', 210],
    ['need_software_integration', '软件系统对接', 'enum', yn, 'need_data_integration==="是"', null, 'SALES,ADMIN', '数据对接', 220],
    ['need_hardware_integration', '硬件设备对接', 'enum', yn, 'need_data_integration==="是"', null, 'SALES,ADMIN', '数据对接', 230],
    ['has_unified_platform', '有统一平台', 'enum', yn, 'need_data_integration==="是"', null, 'SALES,ADMIN', '数据对接', 240],
    ['unified_platform_point_count', '统一平台点位数量', 'number', null, 'has_unified_platform==="是"', 'Number.isInteger(value)&&value>=0', 'SALES,ADMIN', '数据对接', 250],
    ['has_external_platform_data', '平台外数据', 'enum', yn, 'need_data_integration==="是"', null, 'SALES,ADMIN', '数据对接', 260],
    ['external_hardware_system_count', '平台外硬件系统数', 'number', null, 'has_external_platform_data==="是"&&need_hardware_integration==="是"', 'Number.isInteger(value)&&value>=0', 'SALES,ADMIN', '数据对接', 270],
    ['external_hardware_point_count', '平台外硬件点位数', 'number', null, 'has_external_platform_data==="是"&&need_hardware_integration==="是"', 'Number.isInteger(value)&&value>=0', 'SALES,ADMIN', '数据对接', 280],
    ['external_software_system_count', '平台外软件系统数', 'number', null, 'has_external_platform_data==="是"&&need_software_integration==="是"', 'Number.isInteger(value)&&value>=0', 'SALES,ADMIN', '数据对接', 290],
    ['external_software_point_count', '平台外软件点位数', 'number', null, 'has_external_platform_data==="是"&&need_software_integration==="是"', 'Number.isInteger(value)&&value>=0', 'SALES,ADMIN', '数据对接', 300],
    ['need_history_processing', '需要历史处理', 'enum', yn, 'need_data_integration==="是"', null, 'SALES,ADMIN', '数据对接', 310],
    ['need_video_monitoring', '需要视频监控', 'enum', yn, null, null, 'SALES,ADMIN', '视频监控', 400],
    ['use_unified_video_platform', '统一视频平台', 'enum', yn, 'need_video_monitoring==="是"', null, 'SALES,ADMIN', '视频监控', 410],
    ['video_point_count', '视频点位数量', 'number', null, 'need_video_monitoring==="是"', 'Number.isInteger(value)&&value>=0', 'SALES,ADMIN', '视频监控', 420],
    ['bind_video_to_3d', '视频绑定3D', 'enum', yn, 'need_video_monitoring==="是"', null, 'SALES,ADMIN', '视频监控', 430],
    ['need_video_extra_data', '视频额外数据', 'enum', yn, 'need_video_monitoring==="是"', null, 'SALES,ADMIN', '视频监控', 440],
    ['need_dashboard', '需要看板', 'enum', yn, null, null, 'SALES,ADMIN', '二维看板', 500],
    ['dashboard_count', '看板数量', 'number', null, 'need_dashboard==="是"', 'Number.isInteger(value)&&value>=0', 'SALES,ADMIN', '二维看板', 510],
    ['need_alerting', '需要预警', 'enum', yn, null, null, 'SALES,ADMIN', '预警功能', 600],
    ['alert_basis', '预警依据', 'enum', ['阈值','算法','人工'], 'need_alerting==="是"', null, 'SALES,ADMIN', '预警功能', 610],
    ['alert_delivery_method', '预警方式', 'enum', ['短信','邮件','短信+邮件'], 'need_alerting==="是"', null, 'SALES,ADMIN', '预警功能', 620],
    ['other_feature_desc', '其他功能描述', 'text', null, null, null, 'SALES,ADMIN', '其他功能', 700],
    ['other_feature_man_days', '其他功能预估人日', 'number', null, null, 'value>=0', 'SALES,ADMIN', '其他功能', 710],
    ['need_shengong_suite', '需要神工套件', 'enum', yn, null, null, 'SALES,ADMIN', '产品授权', 800],
    ['allow_distribution', '允许分发', 'enum', yn, 'need_shengong_suite==="是"', null, 'SALES,ADMIN', '产品授权', 810],
    ['distribution_license_count', '分发授权数量', 'number', null, 'allow_distribution==="是"', 'Number.isInteger(value)&&value>=0', 'SALES,ADMIN', '产品授权', 820],
    ['editor_license_type', '编辑工具授权类型', 'enum', ['永久','年度','不需要编辑工具'], null, null, 'SALES,ADMIN', '产品授权', 830],
    ['editor_license_years', '授权年限', 'number', null, 'editor_license_type==="年度"', 'Number.isInteger(value)&&value>=1&&value<=29', 'SALES,ADMIN', '产品授权', 840],
    ['editor_license_count', '授权数量', 'number', null, 'editor_license_type==="年度"||editor_license_type==="永久"', 'Number.isInteger(value)&&value>=0', 'SALES,ADMIN', '产品授权', 850],
    ['avg_impl_people', '平均实施人数', 'number', null, null, 'value>0', 'SALES,ADMIN', '实施管理', 900],
    ['day_rate', '人日单价', 'number', null, null, 'value>0', 'SALES,ADMIN', '实施管理', 910],
    ['total_labor_cost', '总人力成本', 'number', null, null, 'value>=0', 'SALES,ADMIN', '实施管理', 920],
    ['need_onsite_dev', '需要驻场开发', 'enum', yn, null, null, 'SALES,ADMIN', '实施管理', 930],
    ['business_expense', '商务支出', 'number', null, null, 'value>=0', 'SALES,ADMIN', '实施管理', 940],
    ['other_amortization', '其他摊销', 'number', null, null, 'value>=0', 'SALES,ADMIN', '实施管理', 950],
    ['payment_ratio_1', '第一笔回款比例', 'number', null, null, 'value>=0&&value<=1', 'SALES,ADMIN', '回款', 1000],
    ['payment_ratio_2', '第二笔回款比例', 'number', null, null, 'value>=0&&value<=1', 'SALES,ADMIN', '回款', 1010],
    ['payment_ratio_3', '第三笔回款比例', 'number', null, null, 'value>=0&&value<=1', 'SALES,ADMIN', '回款', 1020],
    ['payment_ratio_4', '第四笔回款比例', 'number', null, null, 'value>=0&&value<=1', 'SALES,ADMIN', '回款', 1030],
    ['payment_cycle_t', '回款周期t', 'number', null, null, 'value>=0', 'SALES,ADMIN', '回款', 1040],
    ['warranty_period_b', '质保运维期b', 'number', null, null, 'value>=0', 'SALES,ADMIN', '回款', 1050]
  ] as const;

  for (let i = 1; i <= 5; i++) {
    fields.push([
      `scene_cat_${i}_enabled`,
      `场景分类${i}-启用`,
      'enum',
      yn,
      'need_3d_scene==="是"',
      null,
      'SALES,ADMIN',
      '三维场景',
      150 + i * 10
    ] as any);
    fields.push([
      `scene_cat_${i}_quantity`,
      `场景分类${i}-数量`,
      'number',
      null,
      `scene_cat_${i}_enabled==="是"`,
      'Number.isInteger(value)&&value>=0',
      'SALES,ADMIN',
      '三维场景',
      151 + i * 10
    ] as any);
    fields.push([
      `scene_cat_${i}_model_condition`,
      `场景分类${i}-模型基础条件`,
      'enum',
      ['基础', '中等', '复杂'],
      `scene_cat_${i}_enabled==="是"`,
      null,
      'SALES,ADMIN',
      '三维场景',
      152 + i * 10
    ] as any);
    fields.push([
      `scene_cat_${i}_precision`,
      `场景分类${i}-精度`,
      'enum',
      ['低', '中', '高'],
      `scene_cat_${i}_enabled==="是"`,
      null,
      'SALES,ADMIN',
      '三维场景',
      153 + i * 10
    ] as any);
  }

  for (const row of fields) {
    await prisma.formFieldRule.upsert({
      where: { fieldKey: row[0] },
      update: {
        label: row[1],
        fieldType: row[2],
        fieldOptions: row[3],
        visibleWhen: row[4],
        requiredWhen: row[4],
        validationRule: row[5],
        editableRoles: row[6],
        section: row[7],
        orderNo: row[8]
      },
      create: {
        fieldKey: row[0],
        label: row[1],
        fieldType: row[2],
        fieldOptions: row[3],
        visibleWhen: row[4],
        requiredWhen: row[4],
        validationRule: row[5],
        editableRoles: row[6],
        section: row[7],
        orderNo: row[8]
      }
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'SEED_INIT',
      entityType: 'SYSTEM',
      detail: { message: 'Seed completed' }
    }
  });
}

main().finally(async () => {
  await prisma.$disconnect();
});
