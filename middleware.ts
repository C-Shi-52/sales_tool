import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, tokenCookieName } from './lib/auth';

const publicPaths = ['/login', '/api/auth/login', '/_next', '/favicon.ico'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (publicPaths.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const token = req.cookies.get(tokenCookieName)?.value;
  const user = verifyToken(token);
  if (!user) {
    if (pathname.startsWith('/api')) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return NextResponse.redirect(new URL('/login', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)']
};
