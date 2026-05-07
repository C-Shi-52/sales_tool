'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  username: string;
  role: string;
};

export function UserMenu({ username, role }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button className="secondary" onClick={() => setOpen((v) => !v)}>
        {username} ({role})
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 40,
            background: '#fff',
            color: '#111827',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            minWidth: 140,
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            zIndex: 20
          }}
        >
          <button
            onClick={logout}
            style={{
              width: '100%',
              textAlign: 'left',
              background: 'transparent',
              color: '#111827',
              padding: '10px 12px',
              borderRadius: 0
            }}
          >
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}
