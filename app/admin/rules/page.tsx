'use client';

import { useEffect, useMemo, useState } from 'react';

const MODULES = [
  { key: '三维场景', sectionIcon: '🧊' },
  { key: '数据对接', sectionIcon: '🔗' },
  { key: '视频监控', sectionIcon: '🎥' },
  { key: '二维看板', sectionIcon: '📊' },
  { key: '预警功能', sectionIcon: '🚨' },
  { key: '产品授权', sectionIcon: '🔐' },
  { key: '实施管理', sectionIcon: '🛠️' },
  { key: '其他', sectionIcon: '🧩' }
] as const;

export default function AdminRulePage() {
  const [forbidden, setForbidden] = useState(false);
  const [active, setActive] = useState<string>(MODULES[0].key);

  async function load() {
    const me = await fetch('/api/auth/me');
    if (!me.ok) return setForbidden(true);
    const user = await me.json();
    if (user.role !== 'ADMIN') return setForbidden(true);
  }

  useEffect(() => { load(); }, []);

  const observerIds = useMemo(() => MODULES.map((m) => `module-${m.key}`), []);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible[0]) {
        const id = visible[0].target.id.replace('module-', '');
        setActive(id);
      }
    }, { threshold: [0.2, 0.5, 0.8] });

    observerIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [observerIds]);

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

      <div className="card rule-tabs-sticky">
        <div className="rule-tabs">
          {MODULES.map((m) => (
            <button
              key={m.key}
              className={`rule-tab ${active === m.key ? 'active' : ''}`}
              onClick={() => {
                setActive(m.key);
                document.getElementById(`module-${m.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              {m.key}
            </button>
          ))}
        </div>
      </div>

      {MODULES.map((m) => (
        <section id={`module-${m.key}`} key={m.key} className="card">
          <h2 className="section-title"><span className="section-icon">{m.sectionIcon}</span>{m.key}</h2>
          {m.key === '三维场景' ? <ThreeDSceneRulePanel /> : <div className="small">该模块规则正在重构设计中，后续版本将补充详细规则配置项。</div>}
        </section>
      ))}
    </div>
  );
}

function NumberTable({
  title,
  subtitle,
  headers,
  rows,
  valueKey,
  editable,
  badge
}: {
  title: string;
  subtitle: string;
  headers: string[];
  rows: Array<Record<string, any>>;
  valueKey: string;
  editable: boolean;
  badge: string;
}) {
  const [data, setData] = useState(rows);
  return (
    <div className="subsection-card" style={{ marginTop: 12 }}>
      <h4 className="subsection-title"><span className="rule-badge">{badge}</span>{title}</h4>
      <div className="small" style={{ marginBottom: 8 }}>{subtitle}</div>
      <table className="result-table">
        <thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row.label}>
              {Object.keys(row).filter((k) => k !== valueKey).map((k) => <td key={k}>{row[k]}</td>)}
              <td>
                <input
                  type="number"
                  value={row[valueKey]}
                  disabled={!editable}
                  onChange={(e) => {
                    const next = [...data];
                    next[i] = { ...next[i], [valueKey]: Number(e.target.value) };
                    setData(next);
                  }}
                  style={{ maxWidth: 140 }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ThreeDSceneRulePanel() {
  const [editing, setEditing] = useState(false);
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="small">配置三维场景建设相关的基础单价与系数规则</div>
        <button className="secondary-outline" onClick={() => setEditing((v) => !v)}>{editing ? '完成' : '编辑'}</button>
      </div>
      <NumberTable
        title="模型基础价格"
        subtitle="用于配置不同模型类型的基础单价"
        headers={['模型类型', '计量单位', '基础单价（元）']}
        valueKey="price"
        editable={editing}
        badge="1"
        rows={[
          { label: '建筑类模型', unit: '万平', price: 3800 },
          { label: '普通设备', unit: '个', price: 2850 },
          { label: '大型复杂设备 / 普通机组', unit: '个', price: 11880 },
          { label: '大型机组', unit: '个', price: 16650 },
          { label: '普通装置 / 普通产线', unit: '个', price: 19000 },
          { label: '大型复杂装置 / 大型复杂产线', unit: '个', price: 41350 }
        ]}
      />
      <NumberTable
        title="模型基础条件系数"
        subtitle="根据客户提供的模型资料完整度设置系数"
        headers={['条件选项', '系数']}
        valueKey="factor"
        editable={editing}
        badge="2"
        rows={[
          { label: '有完整的较规范的模型，我们只需要做模型处理', factor: 0.25 },
          { label: '客户可以提供完整模型，但较为杂乱', factor: 0.4 },
          { label: '部分由客户提供，我们仍需要进行部分建模', factor: 0.7 },
          { label: '全部由我们自行建模', factor: 1 }
        ]}
      />
      <NumberTable
        title="建模精细程度系数"
        subtitle="根据建模细节深度设置系数"
        headers={['条件选项', '系数']}
        valueKey="factor"
        editable={editing}
        badge="3"
        rows={[
          { label: '仅需要外观，不需要内部结构', factor: 1 },
          { label: '外观 + 粗略内部结构', factor: 1.7 },
          { label: '外观 + 精细内部结构，或者对建模精度有要求', factor: 2.3 }
        ]}
      />
      <NumberTable
        title="美术效果要求系数"
        subtitle="根据最终展示效果要求设置系数"
        headers={['条件选项', '系数']}
        valueKey="factor"
        editable={editing}
        badge="4"
        rows={[
          { label: '高要求（类似邯郸厂项目）', factor: 1.5 },
          { label: '中等要求（类似昆仑运营项目）', factor: 1.2 },
          { label: '低要求（弱于昆仑运营项目效果）', factor: 1 }
        ]}
      />
      <NumberTable
        title="模型量大且硬件受限系数"
        subtitle="当项目存在大量模型、硬件性能不足或特殊运行环境限制时，设置额外系数"
        headers={['选项', '系数']}
        valueKey="factor"
        editable={editing}
        badge="5"
        rows={[
          { label: '是', factor: 1.5 },
          { label: '否', factor: 1 }
        ]}
      />
      <div className="subsection-card" style={{ marginTop: 12 }}>
        <h4 className="subsection-title"><span className="rule-icon">📘</span>规则说明</h4>
        <div className="rule-tip-box">
          <p>三维场景建设价格 =</p>
          <p>sum（基础价格 * 数量 * 模型基础条件系数 * 建模精细程度系数）</p>
          <p>* 美术效果要求系数 * 硬件受限系数</p>
          <p>+ 自采成本预估</p>
        </div>
        <p className="small" style={{ marginTop: 8 }}>各项系数均为相对值，1 表示基准，大于 1 表示增加成本，小于 1 表示降低成本。</p>
      </div>
    </>
  );
}
