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

  function formatDateTime(d: Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
  }

  async function exportAsImage() {
    const target = document.getElementById('quote-result-export');
    if (!target) return;
    const cloned = target.cloneNode(true) as HTMLElement;
    cloned.style.width = `${target.clientWidth}px`;
    const serializer = new XMLSerializer();
    const html = serializer.serializeToString(cloned);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${target.clientWidth}" height="${target.clientHeight}">
        <foreignObject width="100%" height="100%">${html}</foreignObject>
      </svg>
    `;
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('导出失败'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = target.clientWidth * 2;
    canvas.height = target.clientHeight * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(2, 2);
    ctx.fillStyle = '#f5f7fb';
    ctx.fillRect(0, 0, target.clientWidth, target.clientHeight);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    const link = document.createElement('a');
    const projectName = quote?.projectName || '未命名项目';
    link.download = `报价结果_${projectName}_${formatDateTime(new Date())}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
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

  const calcAt = result?.calculatedAt ? new Date(result.calculatedAt) : new Date();
  const moduleNames = ['产品授权', '三维场景', '数据对接', '视频监控', '二维看板', '预警功能', '其他功能', '实施管理', '商务支出'];
  const moduleRows = moduleNames.map((name) => ({ name, amount: Number(result.moduleCosts?.[name] || 0) }));
  const moduleTotal = moduleRows.reduce((s, x) => s + x.amount, 0);
  const directCost = moduleTotal + Number(result.implMgmtCost || 0) + Number(result.businessExpense || 0);

  return (
    <div className="container">
      <div className="card">
        <h2 style={{ marginBottom: 6 }}>报价结果</h2>
        <p className="small" style={{ marginTop: 0 }}>报价结果由需求填写内容和报价规则自动计算得出</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href={`/quotes/${params.id}/form`}><button className="secondary-outline">&lt; 返回</button></Link>
          <button onClick={recalc}>刷新计算</button>
          <button className="secondary-outline" onClick={exportAsImage}>↓ 导出报价单</button>
        </div>
      </div>

      <div id="quote-result-export" className="result-layout">
        <div>
          <div className="card">
            <h3>项目基本信息</h3>
            <div className="grid-2 wide-gap-grid">
              <p>项目名称：{quote?.form?.formData?.project_name || quote?.projectName || '-'}</p>
              <p>客户名称：{quote?.form?.formData?.customer_name || quote?.customerName || '-'}</p>
              <p>销售负责人：{quote?.form?.formData?.owner_user_id || '-'}</p>
              <p>项目实施地点：{quote?.form?.formData?.project_location || '-'}</p>
              <p>备注：{quote?.form?.formData?.remarks || '-'}</p>
              <p>报价计算时间：{calcAt.toLocaleString('zh-CN')}</p>
            </div>
          </div>

          <div className="card">
            <h3>模块报价明细</h3>
            <table className="result-table">
              <thead><tr><th>模块名称</th><th>金额（元）</th><th>占比</th></tr></thead>
              <tbody>
                {moduleRows.map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td>{row.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>{moduleTotal > 0 ? `${((row.amount / moduleTotal) * 100).toFixed(2)}%` : '0.00%'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="card">
            <h3>参数设置</h3>
            <div>
              <label className="label">利润率（%）</label>
              <input type="number" step="0.01" value={profitRate * 100} onChange={(e) => setProfitRate(Number(e.target.value) / 100)} />
            </div>
            <div>
              <label className="label">税率（%）</label>
              <input type="number" step="0.01" value={taxRate * 100} onChange={(e) => setTaxRate(Number(e.target.value) / 100)} />
            </div>
            <div>
              <label className="label">招采费用比例（%）</label>
              <input type="number" step="0.01" value={procurementRate * 100} onChange={(e) => setProcurementRate(Number(e.target.value) / 100)} />
            </div>
          </div>

          <div className="card">
            <h3>成本汇总</h3>
            <p>直接成本小计：{directCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p>资金成本：{Number(result.financeCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p>行政经营摊销：{Number(result.otherAmortization || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p>销售摊销：{Number(result.businessExpense || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p>招采成本：{Number(result.procurementAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <hr />
            <p className="result-emphasis">成本合计：{Number(result.totalCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>

          <div className="card">
            <h3>最终结果</h3>
            <p>报价（含税）</p>
            <p className="result-final-price">{Number(result.finalQuote || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 元</p>
            <p>预估实施周期（月）</p>
            <p style={{ fontSize: 40, margin: 0 }}>{(Number(result.implNaturalDays || 0) / 30).toFixed(1)} <span style={{ fontSize: 24 }}>个月</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
