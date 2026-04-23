'use client';

import { DynamicQuoteForm } from '@/app/components/DynamicQuoteForm';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function QuoteFormPage({ params }: { params: { id: string } }) {
  const [rules, setRules] = useState<any[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const initializedRef = useRef(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  async function load() {
    const [q, r] = await Promise.all([
      fetch(`/api/quotes/${params.id}`).then((x) => x.json()),
      fetch('/api/form-field-rules').then((x) => (x.ok ? x.json() : []))
    ]);
    setFormData(q?.form?.formData || {});
    setRules(r || []);
    initializedRef.current = true;
  }

  async function saveDraft(strictValidation = false, silent = false) {
    if (!silent) setSaveState('saving');
    const res = await fetch(`/api/quotes/${params.id}/form`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formData, strictValidation })
    });
    const data = await res.json();
    if (!res.ok) {
      setSaveState('error');
      return false;
    }
    setErrors(data.errors || {});
    setSaveState('saved');
    return true;
  }

  async function goResultPage() {
    const ok = await saveDraft(true);
    if (!ok) {
      alert('当前有未通过校验的字段，请先修正再查看报价');
      return;
    }
    window.location.href = `/quotes/${params.id}/result`;
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!initializedRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveState('saving');
    saveTimerRef.current = setTimeout(() => {
      saveDraft(false, true);
    }, 800);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [formData]);

  return (
    <div className="container">
      <div className="card form-header-card">
        <h2 style={{ margin: 0, textAlign: 'left' }}>需求填写</h2>
        <div className="form-header-actions">
          <Link href="/quotes"><button className="secondary-outline">← 返回</button></Link>
          <button onClick={goResultPage}>查看报价 →</button>
        </div>
      </div>
      {errors.payment_ratios && <p className="error">{errors.payment_ratios}</p>}
      <DynamicQuoteForm rules={rules} formData={formData} setFormData={setFormData} errors={errors} />
      <p className="small">
        {saveState === 'saving' && '正在自动保存...'}
        {saveState === 'saved' && '已自动保存'}
        {saveState === 'error' && '自动保存失败，请检查网络后重试'}
      </p>
    </div>
  );
}
