'use client';

import { DynamicQuoteForm } from '@/app/components/DynamicQuoteForm';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function QuoteFormPage({ params }: { params: { id: string } }) {
  const [rules, setRules] = useState<any[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');

  async function load() {
    const [q, r] = await Promise.all([
      fetch(`/api/quotes/${params.id}`).then((x) => x.json()),
      fetch('/api/form-field-rules').then((x) => (x.ok ? x.json() : []))
    ]);
    setFormData(q?.form?.formData || {});
    setRules(r || []);
  }

  async function saveDraft(strictValidation = false) {
    const res = await fetch(`/api/quotes/${params.id}/form`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formData, strictValidation })
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.message || '保存失败');
      return;
    }
    setErrors(data.errors || {});
    setMsg('已保存');
  }

  async function calculate() {
    await saveDraft(true);
    const res = await fetch(`/api/quotes/${params.id}/calculate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    if (res.ok) {
      window.location.href = `/quotes/${params.id}/result`;
    } else {
      const d = await res.json();
      alert(d.message || '计算失败');
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="container">
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h2>需求填写（动态表单）</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="secondary" onClick={() => saveDraft(false)}>保存草稿</button>
          <button onClick={calculate}>重新计算报价</button>
          <Link href={`/quotes/${params.id}/result`}>结果页</Link>
        </div>
      </div>
      {errors.payment_ratios && <p className="error">{errors.payment_ratios}</p>}
      <DynamicQuoteForm rules={rules} formData={formData} setFormData={setFormData} errors={errors} />
      {msg && <p className="small">{msg}</p>}
    </div>
  );
}
