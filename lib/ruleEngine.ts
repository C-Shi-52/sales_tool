import { FormFieldRule } from '@prisma/client';

export function evalExpr(expression: string | null | undefined, formData: Record<string, any>, defaultValue = true) {
  if (!expression) return defaultValue;
  try {
    const fn = new Function('data', `with(data){ return (${expression}); }`);
    return !!fn(formData);
  } catch {
    return false;
  }
}

export function validateDynamicForm(rules: FormFieldRule[], formData: Record<string, any>) {
  const errors: Record<string, string> = {};

  for (const rule of rules) {
    const visible = evalExpr(rule.visibleWhen, formData);
    const required = visible && evalExpr(rule.requiredWhen, formData, false);
    const value = formData[rule.fieldKey];

    if (required && (value === undefined || value === null || value === '')) {
      errors[rule.fieldKey] = `${rule.label}为必填`;
      continue;
    }

    if (visible && value !== undefined && value !== null && value !== '' && rule.validationRule) {
      const passed = evalExpr(rule.validationRule.replaceAll('value', 'data.__value__'), {
        ...formData,
        __value__: value
      });
      if (!passed) errors[rule.fieldKey] = `${rule.label}校验失败`;
    }
  }

  const ratios = ['payment_ratio_1', 'payment_ratio_2', 'payment_ratio_3', 'payment_ratio_4'].map(
    (k) => Number(formData[k] ?? 0)
  );
  const sum = ratios.reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 1) > 0.0001) errors.payment_ratios = '四笔回款比例之和必须等于100%';

  return errors;
}
