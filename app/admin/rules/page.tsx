'use client';

import { useEffect, useMemo, useState } from 'react';

type RuleRow = any;

const MODULES = ['三维场景', '数据对接', '视频监控', '二维看板', '预警功能', '产品授权', '实施管理', '其他'] as const;

function EditableTable({ title, rows, columns, onSave }: { title: string; rows: RuleRow[]; columns: string[]; onSave: (row: any) => Promise<void> }) {
  const [data, setData] = useState(rows);
  useEffect(() => setData(rows), [rows]);

  if (!rows.length) return null;

  return (
    <div className="card">
      <h3>{title}</h3>
      {data.map((row, idx) => (
        <div key={row.id} className="grid-3" style={{ marginBottom: 8 }}>
          {columns.map((col) => (
            <div key={col}>
              <label className="label">{col}</label>
              <input
                value={String(row[col] ?? '')}
                onChange={(e) => {
                  const next = [...data];
                  next[idx] = { ...next[idx], [col]: e.target.value };
                  setData(next);
                }}
              />
            </div>
          ))}
          <div style={{ alignSelf: 'end' }}>
            <button onClick={() => onSave(data[idx])}>保存</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function matchModule(moduleName: string, row: any) {
  const key = String(row.ruleKey || row.paramKey || '').toLowerCase();
  switch (moduleName) {
    case '三维场景': return /model|precision|visual|hardware/.test(key);
    case '数据对接': return /unified_platform|external_hardware|external_software/.test(key);
    case '视频监控': return /video/.test(key);
    case '二维看板': return /dashboard/.test(key);
    case '预警功能': return /alert/.test(key);
    case '产品授权': return /distribution|editor/.test(key);
    case '实施管理': return /onsite|day_rate/.test(key);
    case '其他': return true;
    default: return false;
  }
}

export default function AdminRulePage() {
  const [direct, setDirect] = useState<any[]>([]);
  const [step, setStep] = useState<any[]>([]);
  const [combo, setCombo] = useState<any[]>([]);
  const [params, setParams] = useState<any[]>([]);
  const [forbidden, setForbidden] = useState(false);

  async function load() {
    const me = await fetch('/api/auth/me');
    if (!me.ok) return setForbidden(true);
    const user = await me.json();
    if (user.role !== 'ADMIN') return setForbidden(true);

    const [d, s, c, p] = await Promise.all([
      fetch('/api/admin/direct-rules').then((x) => x.json()),
      fetch('/api/admin/step-rules').then((x) => x.json()),
      fetch('/api/admin/combo-rules').then((x) => x.json()),
      fetch('/api/admin/system-parameters').then((x) => x.json())
    ]);
    setDirect(d); setStep(s); setCombo(c); setParams(p);
  }

  useEffect(() => { load(); }, []);

  const save = (url: string) => async (row: any) => {
    await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(row) });
    load();
  };

  const grouped = useMemo(() => {
    return Object.fromEntries(MODULES.map((m) => [
      m,
      {
        direct: direct.filter((r) => matchModule(m, r)),
        step: step.filter((r) => matchModule(m, r)),
        combo: combo.filter((r) => matchModule(m, r)),
        params: params.filter((r) => matchModule(m, r))
      }
    ]));
  }, [direct, step, combo, params]);

  if (forbidden) {
    return (
      <div className="container">
        <div className="card">
          <h2>无权限访问</h2>
          <p>仅管理员可查看报价规则页。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <h2 style={{ marginBottom: 6 }}>报价规则</h2>
        <p className="small" style={{ marginTop: 0 }}>配置各模块的报价规则，报价结果将根据规则自动计算</p>
        <button className="secondary-outline" onClick={() => window.history.back()}>&lt; 返回</button>
      </div>

      <div className="card" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {MODULES.map((m) => (
          <button key={m} className="secondary-outline" onClick={() => document.getElementById(`module-${m}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            {m}
          </button>
        ))}
      </div>

      {MODULES.map((m) => (
        <section id={`module-${m}`} key={m}>
          <div className="card">
            <h2>{m}</h2>
          </div>
          <EditableTable title={`${m} - 直接规则`} rows={grouped[m].direct} columns={['ruleName', 'value', 'enabled']} onSave={save('/api/admin/direct-rules')} />
          <EditableTable title={`${m} - 步长规则`} rows={grouped[m].step} columns={['ruleName', 'stepSize', 'freeSteps', 'stepPrice', 'enabled']} onSave={save('/api/admin/step-rules')} />
          <EditableTable title={`${m} - 组合规则`} rows={grouped[m].combo} columns={['ruleName', 'expression', 'outputType', 'outputValue', 'enabled']} onSave={save('/api/admin/combo-rules')} />
          <EditableTable title={`${m} - 系统参数`} rows={grouped[m].params} columns={['paramName', 'paramValue']} onSave={save('/api/admin/system-parameters')} />
          {!grouped[m].direct.length && !grouped[m].step.length && !grouped[m].combo.length && !grouped[m].params.length && (
            <div className="card"><p className="small">暂无可配置规则</p></div>
          )}
        </section>
      ))}
    </div>
  );
}
