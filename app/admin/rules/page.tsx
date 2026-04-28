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
          <div className="small">该模块规则正在重构设计中，后续版本将补充详细规则配置项。</div>
        </section>
      ))}
    </div>
  );
}
