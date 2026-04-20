'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('sales1');
  const [password, setPassword] = useState('sales123');
  const [error, setError] = useState('');
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.message || '登录失败');
      return;
    }
    router.push('/quotes');
    router.refresh();
  }

  return (
    <div className="container" style={{ maxWidth: 420, marginTop: 80 }}>
      <div className="card">
        <h2>内部报价系统登录</h2>
        <form onSubmit={onSubmit}>
          <label className="label">用户名</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} />
          <label className="label">密码</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="error">{error}</p>}
          <button type="submit" style={{ marginTop: 12 }}>登录</button>
          <p className="small">测试账号：admin/admin123 或 sales1/sales123</p>
        </form>
      </div>
    </div>
  );
}
