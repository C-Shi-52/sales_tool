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

function evalExpr(expression: string | null | undefined, data: Record<string, any>) {
  if (!expression) return true;
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

  const genericRules = rules.filter((r) => !custom3dKeys.has(r.fieldKey));
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

  const renderField = (field: FieldRule) => {
    const visible = evalExpr(field.visibleWhen, formData);
    if (!visible) return null;

    const required = evalExpr(field.requiredWhen, formData);
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
          <h3>{baseSectionName}</h3>
          <div className="grid-2">
            {baseSectionFields.map((f) => renderField(f))}
          </div>
        </div>
      )}

      <div className="card">
        <h3>三维场景</h3>
        <div>
          <label className="label">是否需要三维场景 *</label>
          <div className="switch-row">
            <button
              type="button"
              className={`switch ${formData.need_3d_scene === '是' ? 'on' : ''}`}
              aria-pressed={formData.need_3d_scene === '是'}
              onClick={() => update('need_3d_scene', formData.need_3d_scene === '是' ? '否' : '是')}
            >
              <span className="switch-knob" />
            </button>
            <span className="switch-label">{formData.need_3d_scene === '是' ? '是' : '否'}</span>
          </div>
        </div>

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

      {otherSections.map((section) => {
        const fields = genericRules.filter((r) => r.section === section);
        return (
          <div className="card" key={section}>
            <h3>{section}</h3>
            <div className="grid-2">
              {fields.map((f) => renderField(f))}
            </div>
          </div>
        );
      })}
    </>
  );
}
