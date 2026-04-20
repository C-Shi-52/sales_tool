'use client';

import { useEffect, useState } from 'react';

type RuleRow = any;

function EditableTable({ title, rows, columns, onSave }: { title: string; rows: RuleRow[]; columns: string[]; onSave: (row: any) => Promise<void> }) {
  const [data, setData] = useState(rows);
  useEffect(() => setData(rows), [rows]);

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
            <button onClick={() => onSave(row)}>保存</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminRulePage() {
  const [direct, setDirect] = useState<any[]>([]);
  const [step, setStep] = useState<any[]>([]);
  const [combo, setCombo] = useState<any[]>([]);
  const [params, setParams] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  async function load() {
    const [d, s, c, p, f, l] = await Promise.all([
      fetch('/api/admin/direct-rules').then((x) => x.json()),
      fetch('/api/admin/step-rules').then((x) => x.json()),
      fetch('/api/admin/combo-rules').then((x) => x.json()),
      fetch('/api/admin/system-parameters').then((x) => x.json()),
      fetch('/api/admin/form-field-rules').then((x) => x.json()),
      fetch('/api/admin/audit-logs').then((x) => x.json())
    ]);
    setDirect(d); setStep(s); setCombo(c); setParams(p); setFields(f.slice(0, 20)); setLogs(l);
  }

  useEffect(() => { load(); }, []);

  const save = (url: string) => async (row: any) => {
    await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(row) });
    load();
  };

  return (
    <div className="container">
      <div className="card"><h2>管理员规则管理</h2></div>
      <EditableTable title="直接取值规则" rows={direct} columns={['ruleName', 'value', 'enabled']} onSave={save('/api/admin/direct-rules')} />
      <EditableTable title="步长规则" rows={step} columns={['ruleName', 'stepSize', 'freeSteps', 'stepPrice', 'enabled']} onSave={save('/api/admin/step-rules')} />
      <EditableTable title="组合规则" rows={combo} columns={['ruleName', 'expression', 'outputType', 'outputValue', 'enabled']} onSave={save('/api/admin/combo-rules')} />
      <EditableTable title="系统参数" rows={params} columns={['paramName', 'paramValue']} onSave={save('/api/admin/system-parameters')} />
      <EditableTable title="动态字段规则（节选20条）" rows={fields} columns={['label', 'visibleWhen', 'requiredWhen', 'validationRule', 'editableRoles']} onSave={save('/api/admin/form-field-rules')} />

      <div className="card">
        <h3>审计日志</h3>
        {logs.map((log: any) => (
          <p key={log.id} className="small">[{new Date(log.createdAt).toLocaleString()}] {log.user?.username} - {log.action} - {log.entityType}({log.entityId || '-'})</p>
        ))}
      </div>
    </div>
  );
}
