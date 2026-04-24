'use client';

type FieldRule = {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  fieldOptions: string[] | null;
  visibleWhen: string | null;
  requiredWhen: string | null;
  validationRule: string | null;
  section: string;
};

const MODEL_TYPES = [
  '建筑类模型',
  '普通设备',
  '大型复杂设备/普通机组',
  '大型机组',
  '普通装置/普通产线',
  '大型复杂装置/大型复杂产线'
];

const MODEL_CONDITIONS = [
  '有完整的较规范的模型，我们只需要做模型处理',
  '客户可以提供完整模型，但较为杂乱',
  '部分由客户提供，我们仍需要进行部分建模',
  '全部由我们自行建模'
];

const MODEL_PRECISIONS = [
  '仅需要外观，不需要内部结构',
  '外观+粗略内部结构',
  '外观+精细内部结构，或者对建模精度有要求'
];

function evalExpr(expression: string | null | undefined, data: Record<string, any>, defaultValue = true) {
  if (!expression) return defaultValue;
  try {
    const fn = new Function('data', `with(data){ return (${expression}); }`);
    return !!fn(data);
  } catch {
    return false;
  }
}

export function DynamicQuoteForm({
  rules,
  formData,
  setFormData,
  errors
}: {
  rules: FieldRule[];
  formData: Record<string, any>;
  setFormData: (v: Record<string, any>) => void;
  errors: Record<string, string>;
}) {
  const custom3dKeys = new Set([
    'need_3d_scene',
    'building_model_area',
    'modeling_basis',
    'self_collection_cost',
    'visual_effect_level',
    'hardware_constraint',
    'scene_cat_1_enabled', 'scene_cat_1_quantity', 'scene_cat_1_model_condition', 'scene_cat_1_precision',
    'scene_cat_2_enabled', 'scene_cat_2_quantity', 'scene_cat_2_model_condition', 'scene_cat_2_precision',
    'scene_cat_3_enabled', 'scene_cat_3_quantity', 'scene_cat_3_model_condition', 'scene_cat_3_precision',
    'scene_cat_4_enabled', 'scene_cat_4_quantity', 'scene_cat_4_model_condition', 'scene_cat_4_precision',
    'scene_cat_5_enabled', 'scene_cat_5_quantity', 'scene_cat_5_model_condition', 'scene_cat_5_precision'
  ]);
  const customModuleKeys = new Set([
    'need_data_integration',
    'need_file_import',
    'need_software_integration',
    'need_hardware_integration',
    'has_unified_platform',
    'has_external_platform_data',
    'need_history_processing',
    'unified_platform_count',
    'unified_platform_point_count',
    'external_software_system_count',
    'external_software_point_count',
    'external_hardware_system_count',
    'external_hardware_point_count',
    'need_video_monitoring',
    'use_unified_video_platform',
    'bind_video_to_3d',
    'need_video_extra_data',
    'video_point_count',
    'need_dashboard',
    'dashboard_count',
    'need_alerting',
    'alert_basis',
    'alert_delivery_method',
    'alert_rule_event',
    'alert_rule_threshold',
    'alert_rule_trend',
    'trend_algorithm_count',
    'alert_delivery_internal',
    'alert_delivery_external',
    'alert_delivery_phone_sms',
    'need_other_feature',
    'other_feature_desc',
    'other_feature_man_days',
    'need_shengong_suite',
    'allow_distribution',
    'distribution_license_count',
    'editor_license_type',
    'editor_license_years',
    'editor_license_count',
    'avg_impl_people',
    'day_rate',
    'total_labor_cost',
    'need_onsite_dev',
    'business_expense',
    'other_amortization',
    'onsite_mode'
  ]);

  const genericRules = rules.filter((r) => !custom3dKeys.has(r.fieldKey) && !customModuleKeys.has(r.fieldKey));
  const sections = Array.from(new Set(genericRules.map((r) => r.section)));
  const baseSectionName = '基础信息';
  const baseSectionFields = genericRules.filter((r) => r.section === baseSectionName);
  const otherSections = sections.filter((section) => section !== baseSectionName);

  const update = (k: string, v: any) => setFormData({ ...formData, [k]: v });

  const modelRequirements = Array.isArray(formData.model_requirements) ? formData.model_requirements : [];
  const usedTypes = new Set(modelRequirements.map((x: any) => x.model_type).filter(Boolean));

  function updateRequirement(index: number, key: string, value: any) {
    const next = [...modelRequirements];
    next[index] = { ...next[index], [key]: value };
    setFormData({ ...formData, model_requirements: next });
  }

  function addRequirement() {
    setFormData({
      ...formData,
      model_requirements: [...modelRequirements, { model_type: '', quantity: '' }]
    });
  }

  function removeRequirement(index: number) {
    const next = modelRequirements.filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, model_requirements: next });
  }

  function sectionIcon(section: string) {
    const iconMap: Record<string, string> = {
      基础信息: '📋',
      三维场景: '🧊',
      数据对接: '🔗',
      视频监控: '🎥',
      二维看板: '📊',
      预警功能: '🚨',
      其他功能: '🧩',
      产品授权: '🔐',
      实施管理: '🛠️',
      回款: '💰'
    };
    return iconMap[section] || '📌';
  }

  function renderSectionTitle(section: string) {
    return (
      <h3 className="section-title">
        <span className="section-icon" aria-hidden>{sectionIcon(section)}</span>
        {section}
      </h3>
    );
  }

  function isChecked(fieldKey: string) {
    return formData[fieldKey] === '是';
  }

  function renderSwitch(fieldKey: string, label: string) {
    const checked = isChecked(fieldKey);
    return (
      <div>
        <label className="label">{label}</label>
        <div className="switch-row">
          <button
            type="button"
            className={`switch ${checked ? 'on' : ''}`}
            aria-pressed={checked}
            onClick={() => update(fieldKey, checked ? '否' : '是')}
          >
            <span className="switch-knob" />
          </button>
          <span className="switch-label">{checked ? '是' : '否'}</span>
        </div>
        {errors[fieldKey] && <div className="error">{errors[fieldKey]}</div>}
      </div>
    );
  }

  function renderCheckItem(fieldKey: string, label: string) {
    const checked = isChecked(fieldKey);
    return (
      <label className="check-item" key={fieldKey}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => update(fieldKey, e.target.checked ? '是' : '否')}
        />
        <span>{label}</span>
      </label>
    );
  }

  function renderIntInput(fieldKey: string, label: string, required = false, hint?: string, minValue = 0) {
    const rawValue = formData[fieldKey];
    const displayValue = Number.isFinite(Number(rawValue)) ? String(Math.trunc(Number(rawValue))) : '';
    const current = Number.isFinite(Number(rawValue)) ? Math.trunc(Number(rawValue)) : minValue;
    const updateInt = (value: number) => {
      update(fieldKey, Math.max(minValue, Math.trunc(value)));
    };

    return (
      <div>
        <label className="label">{label}{required ? ' *' : ''}</label>
        {hint && <div className="small">{hint}</div>}
        <div className="int-stepper">
          <button type="button" className="secondary-outline" onClick={() => updateInt(Math.max(minValue, current - 1))}>−</button>
          <input
            type="number"
            step={1}
            value={displayValue}
            onChange={(e) => {
              if (e.target.value === '') {
                update(fieldKey, '');
                return;
              }
              updateInt(Number(e.target.value));
            }}
          />
          <button type="button" className="secondary-outline" onClick={() => updateInt(current + 1)}>＋</button>
        </div>
        {errors[fieldKey] && <div className="error">{errors[fieldKey]}</div>}
      </div>
    );
  }

  function updateAlertBasisAndDelivery(nextData: Record<string, any>) {
    const next = { ...nextData };
    if (next.alert_rule_threshold === '是') next.alert_basis = '阈值';
    else if (next.alert_rule_trend === '是') next.alert_basis = '算法';
    else if (next.alert_rule_event === '是') next.alert_basis = '人工';
    else next.alert_basis = '';

    const hasPhone = next.alert_delivery_phone_sms === '是';
    const hasOther = next.alert_delivery_internal === '是' || next.alert_delivery_external === '是';
    if (hasPhone && hasOther) next.alert_delivery_method = '短信+邮件';
    else if (hasPhone) next.alert_delivery_method = '短信';
    else if (hasOther) next.alert_delivery_method = '邮件';
    else next.alert_delivery_method = '';
    setFormData(next);
  }

  const renderField = (field: FieldRule) => {
    const visible = evalExpr(field.visibleWhen, formData);
    if (!visible) return null;

    const required = evalExpr(field.requiredWhen, formData, false);
    const value = formData[field.fieldKey] ?? '';

    return (
      <div key={field.id}>
        <label className="label">{field.label}{required ? ' *' : ''}</label>
        {field.fieldType === 'enum' ? (
          <select value={value} onChange={(e) => update(field.fieldKey, e.target.value)}>
            <option value="">请选择</option>
            {(field.fieldOptions || []).map((it) => <option value={it} key={it}>{it}</option>)}
          </select>
        ) : field.fieldType === 'text' ? (
          <textarea value={value} onChange={(e) => update(field.fieldKey, e.target.value)} />
        ) : (
          <input
            type={field.fieldType === 'number' ? 'number' : 'text'}
            value={value}
            onChange={(e) => update(field.fieldKey, field.fieldType === 'number' ? Number(e.target.value) : e.target.value)}
          />
        )}
        {errors[field.fieldKey] && <div className="error">{errors[field.fieldKey]}</div>}
      </div>
    );
  };

  return (
    <>
      {baseSectionFields.length > 0 && (
        <div className="card" key={baseSectionName}>
          {renderSectionTitle(baseSectionName)}
          <div className="grid-2 wide-gap-grid">
            {baseSectionFields
              .filter((f) => ['project_name', 'customer_name', 'owner_user_id'].includes(f.fieldKey))
              .map((f) => renderField(f))}
            <div>
              <label className="label">项目实施地点</label>
              <input
                type="text"
                value={formData.project_location || ''}
                onChange={(e) => update('project_location', e.target.value)}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="label">备注</label>
              <textarea value={formData.remarks || ''} onChange={(e) => update('remarks', e.target.value)} />
              {errors.remarks && <div className="error">{errors.remarks}</div>}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        {renderSectionTitle('三维场景')}
        {renderSwitch('need_3d_scene', '是否需要三维场景 *')}

        {formData.need_3d_scene === '是' && (
          <>
            <div className="subsection-card" style={{ marginTop: 12 }}>
              <h4 className="subsection-title">模型需求（可添加多个）</h4>
              <p className="small" style={{ marginTop: 0 }}>
                请配置所需的模型类型及数量，支持添加多个模型需求
              </p>
              {errors.model_requirements && <p className="error">{errors.model_requirements}</p>}
              {modelRequirements.map((item: any, idx: number) => {
                const isBuilding = item.model_type === '建筑类模型';
                return (
                  <div key={idx} className="requirement-card">
                    <div className="requirement-header">
                      <h5>模型需求 {idx + 1}</h5>
                      <button className="danger ghost-danger" onClick={() => removeRequirement(idx)} type="button">
                        删除该模型需求
                      </button>
                    </div>
                    <div className="grid-2">
                      <div>
                        <label className="label">模型类型 *</label>
                        <select value={item.model_type || ''} onChange={(e) => updateRequirement(idx, 'model_type', e.target.value)}>
                          <option value="">请选择</option>
                          {MODEL_TYPES.map((t) => (
                            <option key={t} value={t} disabled={usedTypes.has(t) && item.model_type !== t}>{t}</option>
                          ))}
                        </select>
                        {errors[`model_requirements.${idx}.model_type`] && <div className="error">{errors[`model_requirements.${idx}.model_type`]}</div>}
                      </div>
                      <div>
                        <label className="label">数量 *（单位：{isBuilding ? '万平' : '个'}）</label>
                        <input
                          type="number"
                          value={item.quantity ?? ''}
                          onChange={(e) => updateRequirement(idx, 'quantity', e.target.value === '' ? '' : Number(e.target.value))}
                        />
                        {errors[`model_requirements.${idx}.quantity`] && <div className="error">{errors[`model_requirements.${idx}.quantity`]}</div>}
                      </div>

                      {!isBuilding && (
                        <>
                          <div>
                            <label className="label">模型基础条件 *</label>
                            <select value={item.model_condition || ''} onChange={(e) => updateRequirement(idx, 'model_condition', e.target.value)}>
                              <option value="">请选择</option>
                              {MODEL_CONDITIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                            {errors[`model_requirements.${idx}.model_condition`] && <div className="error">{errors[`model_requirements.${idx}.model_condition`]}</div>}
                          </div>
                          <div>
                            <label className="label">建模精细程度 *</label>
                            <select value={item.precision || ''} onChange={(e) => updateRequirement(idx, 'precision', e.target.value)}>
                              <option value="">请选择</option>
                              {MODEL_PRECISIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                            {errors[`model_requirements.${idx}.precision`] && <div className="error">{errors[`model_requirements.${idx}.precision`]}</div>}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              <button type="button" className="add-requirement-btn" onClick={addRequirement}>+ 添加模型需求</button>
            </div>

            <div className="subsection-card" style={{ marginTop: 12 }}>
              <h4 className="subsection-title">数据与资源</h4>
              <div className="grid-2">
                <div>
                  <label className="label">建模依据的材料来源 *</label>
                  <select value={formData.modeling_basis || ''} onChange={(e) => update('modeling_basis', e.target.value)}>
                    <option value="">请选择</option>
                    <option value="客户提供所有材料">客户提供所有材料</option>
                    <option value="需要我们自行采集部分或全部材料">需要我们自行采集部分或全部材料</option>
                  </select>
                  {errors.modeling_basis && <div className="error">{errors.modeling_basis}</div>}
                </div>
                {formData.modeling_basis === '需要我们自行采集部分或全部材料' && (
                  <div>
                    <label className="label">自采成本预估（元）*</label>
                    <input
                      type="number"
                      value={formData.self_collection_cost ?? ''}
                      onChange={(e) => update('self_collection_cost', e.target.value === '' ? '' : Number(e.target.value))}
                    />
                    {errors.self_collection_cost && <div className="error">{errors.self_collection_cost}</div>}
                  </div>
                )}
              </div>
            </div>

            <div className="subsection-card" style={{ marginTop: 12 }}>
              <h4 className="subsection-title">质量与效果</h4>
              <div className="grid-2">
                <div>
                  <label className="label">美术效果要求 *</label>
                  <select value={formData.visual_effect_level || ''} onChange={(e) => update('visual_effect_level', e.target.value)}>
                    <option value="">请选择</option>
                    <option value="高要求（类似邯郸电厂项目）">高要求（类似邯郸电厂项目）</option>
                    <option value="中等要求（类似昆仑运营项目）">中等要求（类似昆仑运营项目）</option>
                    <option value="低要求（弱于昆仑运营项目效果）">低要求（弱于昆仑运营项目效果）</option>
                  </select>
                  {errors.visual_effect_level && <div className="error">{errors.visual_effect_level}</div>}
                </div>
                <div>
                  <label className="label">模型量大且硬件受限 *</label>
                  <div className="small" style={{ marginBottom: 4 }}>
                    例如：在信创环境下运行三维程序、或者涉密环境下的硬件、或者客户硬件条件差且没有购买计划等
                  </div>
                  <select value={formData.hardware_constraint || ''} onChange={(e) => update('hardware_constraint', e.target.value)}>
                    <option value="">请选择</option>
                    <option value="是">是</option>
                    <option value="否">否</option>
                  </select>
                  {errors.hardware_constraint && <div className="error">{errors.hardware_constraint}</div>}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="card">
        {renderSectionTitle('数据对接')}
        {renderSwitch('need_data_integration', '是否需要数据对接')}
        {isChecked('need_data_integration') && (
          <>
            <div className="subsection-card" style={{ marginTop: 12 }}>
              <h4 className="subsection-title">对接内容（可多选）</h4>
              <div className="small">请选择需要对接的内容，所选内容将分别计入工作量</div>
              <div className="check-grid-two">
                {renderCheckItem('has_unified_platform', '统一数据平台对接')}
                <div>
                  {renderCheckItem('has_external_platform_data', '统一平台外的系统对接')}
                  <div className="small" style={{ marginTop: 4 }}>零散对接的系统</div>
                </div>
                <div className="small" style={{ gridColumn: '1 / -1', marginTop: -4 }}>
                  说明：PLC/DCS/物联网/数据中心等归集了好多个系统数据的平台。
                </div>
                {renderCheckItem('need_file_import', '表格数据导入')}
                {renderCheckItem('need_history_processing', '历史数据处理')}
              </div>
            </div>

            {isChecked('has_unified_platform') && (
              <div className="subsection-card" style={{ marginTop: 12 }}>
                <h4 className="subsection-title">统一数据平台配置</h4>
                <div className="section-divider" />
                <div className="grid-2">
                  {renderIntInput('unified_platform_count', '平台数量', true)}
                  {renderIntInput('unified_platform_point_count', '平台内平均数据点位数量', true)}
                </div>
              </div>
            )}

            {isChecked('has_external_platform_data') && (
              <div className="subsection-card" style={{ marginTop: 12 }}>
                <h4 className="subsection-title">统一平台外数据对接配置</h4>
                <div className="section-divider" />
                <div className="external-config-stack">
                  <div className="external-config-row">
                    {renderSwitch('need_software_integration', '对接统一平台外的软件系统')}
                    {isChecked('need_software_integration') && (
                      <div className="grid-2 wide-gap-grid">
                        {renderIntInput('external_software_system_count', '软件系统数量', true)}
                        {renderIntInput('external_software_point_count', '软件系统平均数据点位数量', true)}
                      </div>
                    )}
                  </div>
                  <div className="external-config-row">
                    {renderSwitch('need_hardware_integration', '对接统一平台外的硬件系统')}
                    {isChecked('need_hardware_integration') && (
                      <div className="grid-2 wide-gap-grid">
                        {renderIntInput('external_hardware_system_count', '硬件系统数量', true)}
                        {renderIntInput('external_hardware_point_count', '硬件系统平均数据点位数量', true)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="card">
        {renderSectionTitle('视频监控')}
        {renderSwitch('need_video_monitoring', '是否需要视频监控')}
        {isChecked('need_video_monitoring') && (
          <>
            <div className="subsection-card" style={{ marginTop: 12 }}>
              <h4 className="subsection-title">监控接入内容（可多选）</h4>
              <div className="check-grid">
                {renderCheckItem('use_unified_video_platform', '通过统一监控平台接入')}
                {renderCheckItem('bind_video_to_3d', '监控点与三维模型绑定')}
                {renderCheckItem('need_video_extra_data', '对接除视频画面外的数据')}
              </div>
            </div>
            <div className="subsection-card" style={{ marginTop: 12 }}>
              <h4 className="subsection-title">监控规模</h4>
              <div className="section-divider" />
              {renderIntInput('video_point_count', '视频监控点位数量', true)}
            </div>
          </>
        )}
      </div>

      <div className="card">
        {renderSectionTitle('二维看板')}
        {renderSwitch('need_dashboard', '是否需要二维看板')}
        {isChecked('need_dashboard') && (
          <div className="subsection-card" style={{ marginTop: 12 }}>
            <h4 className="subsection-title">看板规模</h4>
            <div className="section-divider" />
            {renderIntInput('dashboard_count', '看板数量', true)}
            <div className="small">根据以往经验，一个页面上大约8个看板。</div>
          </div>
        )}
      </div>

      <div className="card">
        {renderSectionTitle('预警功能')}
        {renderSwitch('need_alerting', '是否需要预警功能')}
        {isChecked('need_alerting') && (
          <>
            <div className="subsection-card" style={{ marginTop: 12 }}>
              <h4 className="subsection-title">预警规则（可多选）</h4>
              <div className="small">请选择客户需要的预警规则，所选内容将分别计入工作量。</div>
              <div className="check-grid-two">
                <label className="check-item">
                  <input
                    type="checkbox"
                    checked={isChecked('alert_rule_event')}
                    onChange={(e) => updateAlertBasisAndDelivery({ ...formData, alert_rule_event: e.target.checked ? '是' : '否' })}
                  />
                  <span>系统监测到某件事情发生时发出预警</span>
                </label>
                <label className="check-item">
                  <input
                    type="checkbox"
                    checked={isChecked('alert_rule_threshold')}
                    onChange={(e) => updateAlertBasisAndDelivery({ ...formData, alert_rule_threshold: e.target.checked ? '是' : '否' })}
                  />
                  <span>采集到的数值超过或低于阈值时发出预警</span>
                </label>
                <label className="check-item">
                  <input
                    type="checkbox"
                    checked={isChecked('alert_rule_trend')}
                    onChange={(e) => updateAlertBasisAndDelivery({ ...formData, alert_rule_trend: e.target.checked ? '是' : '否' })}
                  />
                  <span>通过仿真计算预测到某种趋势时发出预警</span>
                </label>
              </div>
              {isChecked('alert_rule_trend') && (
                <div style={{ marginTop: 10 }}>
                  {renderIntInput('trend_algorithm_count', '仿真计算趋势预测算法个数', true)}
                </div>
              )}
            </div>

            <div className="subsection-card" style={{ marginTop: 12 }}>
              <h4 className="subsection-title">预警方式（可多选）</h4>
              <div className="small">请选择客户需要的预警方式，所选内容将分别计入工作量。</div>
              <div className="check-grid-two">
                <label className="check-item">
                  <input
                    type="checkbox"
                    checked={isChecked('alert_delivery_internal')}
                    onChange={(e) => updateAlertBasisAndDelivery({ ...formData, alert_delivery_internal: e.target.checked ? '是' : '否' })}
                  />
                  <span>系统内进行通知</span>
                </label>
                <label className="check-item">
                  <input
                    type="checkbox"
                    checked={isChecked('alert_delivery_external')}
                    onChange={(e) => updateAlertBasisAndDelivery({ ...formData, alert_delivery_external: e.target.checked ? '是' : '否' })}
                  />
                  <span>通知推送到其他外部系统</span>
                </label>
                <label className="check-item">
                  <input
                    type="checkbox"
                    checked={isChecked('alert_delivery_phone_sms')}
                    onChange={(e) => updateAlertBasisAndDelivery({ ...formData, alert_delivery_phone_sms: e.target.checked ? '是' : '否' })}
                  />
                  <span>电话或短信方式通知</span>
                </label>
              </div>
              <div className="small" style={{ marginTop: 8 }}>客户需购买对应云服务。</div>
            </div>
          </>
        )}
      </div>

      <div className="card">
        {renderSectionTitle('其他功能')}
        {renderSwitch('need_other_feature', '是否存在其他功能需求')}
        {isChecked('need_other_feature') && (
          <div className="subsection-card" style={{ marginTop: 12 }}>
            <div className="grid-2 wide-gap-grid">
              {renderIntInput('other_feature_man_days', '研究院给出的人日成本估算（单位：人/日）', true)}
              <div>
                <label className="label">其他功能描述</label>
                <textarea
                  value={formData.other_feature_desc || ''}
                  onChange={(e) => update('other_feature_desc', e.target.value)}
                />
                {errors.other_feature_desc && <div className="error">{errors.other_feature_desc}</div>}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        {renderSectionTitle('产品授权')}
        {renderSwitch('need_shengong_suite', '是否需要向用户提供神工套件')}
        {isChecked('need_shengong_suite') && (
          <div className="subsection-card" style={{ marginTop: 12 }}>
            <h4 className="subsection-title">授权情况</h4>
            <div className="section-divider" />
            <div className="grid-2 wide-gap-grid">
              <div>
                <label className="label">神工套件授权类型 *</label>
                <select
                  value={formData.editor_license_type || ''}
                  onChange={(e) => update('editor_license_type', e.target.value)}
                >
                  <option value="">请选择</option>
                  <option value="永久">永久</option>
                  <option value="年度">年度</option>
                </select>
                {errors.editor_license_type && <div className="error">{errors.editor_license_type}</div>}
              </div>
              {renderIntInput('editor_license_count', '授权数量', true, undefined, 1)}

              {formData.editor_license_type === '年度' && (
                <>
                  {renderIntInput('editor_license_years', '授权年限', true, undefined, 1)}
                  <div />
                </>
              )}

              <div>
                <label className="label">额外购买分发授权数量 *</label>
                <div className="small">年度授权每套赠送2个分发，永久授权每套赠送8个分发</div>
                <div className="int-stepper">
                  <button
                    type="button"
                    className="secondary-outline"
                    onClick={() => {
                      const current = Number.isFinite(Number(formData.distribution_license_count))
                        ? Math.trunc(Number(formData.distribution_license_count))
                        : 0;
                      const nextValue = Math.max(0, current - 1);
                      setFormData({ ...formData, distribution_license_count: nextValue, allow_distribution: nextValue > 0 ? '是' : '否' });
                    }}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    step={1}
                    value={Number.isFinite(Number(formData.distribution_license_count)) ? String(Math.trunc(Number(formData.distribution_license_count))) : ''}
                    onChange={(e) => {
                      if (e.target.value === '') {
                        setFormData({ ...formData, distribution_license_count: '', allow_distribution: '否' });
                        return;
                      }
                      const nextValue = Math.max(0, Math.trunc(Number(e.target.value)));
                      setFormData({ ...formData, distribution_license_count: nextValue, allow_distribution: nextValue > 0 ? '是' : '否' });
                    }}
                  />
                  <button
                    type="button"
                    className="secondary-outline"
                    onClick={() => {
                      const current = Number.isFinite(Number(formData.distribution_license_count))
                        ? Math.trunc(Number(formData.distribution_license_count))
                        : 0;
                      const nextValue = current + 1;
                      setFormData({ ...formData, distribution_license_count: nextValue, allow_distribution: '是' });
                    }}
                  >
                    ＋
                  </button>
                </div>
                {errors.distribution_license_count && <div className="error">{errors.distribution_license_count}</div>}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        {renderSectionTitle('实施管理')}
        {renderSwitch('need_onsite_dev', '是否需要驻场')}
        {isChecked('need_onsite_dev') && (
          <div className="subsection-card" style={{ marginTop: 12 }}>
            <h4 className="subsection-title">驻场情况</h4>
            <select value={formData.onsite_mode || ''} onChange={(e) => update('onsite_mode', e.target.value)}>
              <option value="">请选择</option>
              <option value="全程所有人员驻场">全程所有人员驻场</option>
              <option value="全程部分人员驻场">全程部分人员驻场</option>
              <option value="半程所有人员驻场">半程所有人员驻场</option>
              <option value="半程部分人员驻场">半程部分人员驻场</option>
              <option value="少量驻场">少量驻场</option>
            </select>
          </div>
        )}
      </div>

      {otherSections.map((section) => {
        const fields = genericRules.filter((r) => r.section === section);
        return (
          <div className="card" key={section}>
            {renderSectionTitle(section)}
            <div className="grid-2">
              {fields.map((f) => renderField(f))}
            </div>
          </div>
        );
      })}
    </>
  );
}
