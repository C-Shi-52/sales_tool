import './globals.css';
import Link from 'next/link';
import { getSessionFromCookie } from '@/lib/auth';

export const metadata = {
  title: '内部报价工具',
  description: '销售报价单体系统'
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionFromCookie();
  return (
    <html lang="zh-CN">
      <body>
        {user && (
          <div className="topnav">
            <div>
              <Link href="/quotes" style={{ color: '#fff', marginRight: 16 }}>报价列表</Link>
              {user.role === 'ADMIN' && <Link href="/admin/rules" style={{ color: '#fff' }}>管理员规则</Link>}
            </div>
            <div>{user.username} ({user.role})</div>
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
