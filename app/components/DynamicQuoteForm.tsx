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
  const sections = Array.from(new Set(rules.map((r) => r.section)));

  const update = (k: string, v: any) => setFormData({ ...formData, [k]: v });

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
      {sections.map((section) => {
        const fields = rules.filter((r) => r.section === section);
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
