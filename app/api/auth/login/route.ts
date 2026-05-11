import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { signToken, tokenCookieName } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const user = await prisma.user.findUnique({ where: { username: body.username } });
  if (!user) return NextResponse.json({ message: '用户名或密码错误' }, { status: 401 });

  const ok = await bcrypt.compare(body.password || '', user.passwordHash);
  if (!ok) return NextResponse.json({ message: '用户名或密码错误' }, { status: 401 });

  const token = signToken({ id: user.id, username: user.username, role: user.role });
  const res = NextResponse.json({ user: { id: user.id, username: user.username, role: user.role } });
  res.cookies.set(tokenCookieName, token, { httpOnly: true, sameSite: 'lax', path: '/' });
  return res;
}
