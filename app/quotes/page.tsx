'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Quote = { id: string; projectName: string; status: string; updatedAt: string; owner: { username: string } };

export default function QuoteListPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);

  async function load() {
    const res = await fetch('/api/quotes');
    if (res.ok) setQuotes(await res.json());
  }

  async function createQuote() {
    const projectName = prompt('项目名称', '新项目') || '新项目';
    const res = await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectName })
    });
    if (res.ok) {
      const q = await res.json();
      window.location.href = `/quotes/${q.id}/form`;
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="container">
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>报价单列表</h2>
        <button onClick={createQuote}>新建报价单</button>
      </div>
      {quotes.map((q) => (
        <div className="card" key={q.id}>
          <h3>{q.projectName}</h3>
          <p className="small">状态：{q.status} | 所属：{q.owner?.username} | 更新时间：{new Date(q.updatedAt).toLocaleString()}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href={`/quotes/${q.id}/form`}>填写需求</Link>
            <Link href={`/quotes/${q.id}/result`}>查看结果</Link>
          </div>
        </div>
      ))}
    </div>
  );
}
