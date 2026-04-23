'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function QuoteResultPage({ params }: { params: { id: string } }) {
  const [result, setResult] = useState<any>(null);
  const [quote, setQuote] = useState<any>(null);
  const [profitRate, setProfitRate] = useState<number>(0.2);
  const [taxRate, setTaxRate] = useState<number>(0.06);
  const [procurementRate, setProcurementRate] = useState<number>(0.05);

  async function load() {
    const [r, q] = await Promise.all([
      fetch(`/api/quotes/${params.id}/result`).then((x) => x.json()),
      fetch(`/api/quotes/${params.id}`).then((x) => x.json())
    ]);
    setResult(r);
    setQuote(q);
    if (r) {
      setProfitRate(r.profitRate);
      setTaxRate(r.taxRate);
      setProcurementRate(r.procurementRate);
    }
  }

  async function recalc() {
    const res = await fetch(`/api/quotes/${params.id}/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profitRate, taxRate, procurementRate })
    });
    if (res.ok) load();
  }

  async function saveSnapshot() {
    const res = await fetch(`/api/quotes/${params.id}/snapshot`, { method: 'POST' });
    if (res.ok) alert('快照已保存');
  }

  useEffect(() => {
    load();
  }, []);

  if (!result) {
    return (
      <div className="container">
        <div className="card">
          <h2>报价结果</h2>
          <p>尚未计算报价，请先在需求页执行“重新计算报价”。</p>
          <Link href={`/quotes/${params.id}/form`}>去填写需求</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h2>报价结果：{quote?.projectName}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href={`/quotes/${params.id}/form`}>返回需求页</Link>
          <button className="secondary" onClick={saveSnapshot}>保存快照</button>
        </div>
      </div>

      <div className="card">
        <h3>参数调整（销售可改）</h3>
        <div className="grid-3">
          <div><label className="label">利润率</label><input type="number" step="0.01" value={profitRate} onChange={(e) => setProfitRate(Number(e.target.value))} /></div>
          <div><label className="label">税率</label><input type="number" step="0.01" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} /></div>
          <div><label className="label">招采比例</label><input type="number" step="0.01" value={procurementRate} onChange={(e) => setProcurementRate(Number(e.target.value))} /></div>
        </div>
        <button onClick={recalc} style={{ marginTop: 10 }}>重新计算</button>
      </div>

      <div className="card">
        <h3>各模块成本</h3>
        {Object.entries(result.moduleCosts || {}).map(([k, v]) => <p key={k}>{k}: ¥{Number(v).toLocaleString()}</p>)}
        <p>项目实施管理成本: ¥{result.implMgmtCost.toLocaleString()}</p>
        <p>商务支出: ¥{result.businessExpense.toLocaleString()}</p>
        <p>其他摊销: ¥{result.otherAmortization.toLocaleString()}</p>
        <p>资金成本: ¥{result.financeCost.toLocaleString()}</p>
      </div>

      <div className="card">
        <h3>汇总</h3>
        <p>总成本: ¥{result.totalCost.toLocaleString()}</p>
        <p>预估实施自然日: {result.implNaturalDays}</p>
        <p>回款加权平均到账时间: {result.weightedPaymentArrival}</p>
        <p>最终报价: ¥{result.finalQuote.toLocaleString()}</p>
        <p>税额: ¥{result.taxAmount.toLocaleString()} | 招采金额: ¥{result.procurementAmount.toLocaleString()}</p>
      </div>

      <div className="card">
        <h3>历史快照</h3>
        {(quote?.snapshots || []).map((s: any) => (
          <details key={s.id}>
            <summary>{new Date(s.createdAt).toLocaleString()} - {s.id}</summary>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(s.resultData, null, 2)}</pre>
          </details>
        ))}
      </div>
    </div>
  );
}
