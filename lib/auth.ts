import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { prisma } from './prisma';

const TOKEN_NAME = 'sales_tool_token';

export type SessionUser = { id: string; username: string; role: string };

export function signToken(user: SessionUser) {
  const secret = process.env.JWT_SECRET || 'dev-secret';
  return jwt.sign(user, secret, { expiresIn: '7d' });
}

export function verifyToken(token?: string): SessionUser | null {
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as SessionUser;
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(TOKEN_NAME)?.value;
  return verifyToken(token);
}

export async function getSessionFromCookie(): Promise<SessionUser | null> {
  const token = cookies().get(TOKEN_NAME)?.value;
  return verifyToken(token);
}

export async function requireAuth(req: NextRequest) {
  const user = await getSessionFromRequest(req);
  if (!user) throw new Error('UNAUTHORIZED');
  return user;
}

export async function requireAdmin(req: NextRequest) {
  const user = await requireAuth(req);
  if (user.role !== 'ADMIN') throw new Error('FORBIDDEN');
  return user;
}

export async function canAccessQuote(user: SessionUser, quoteId: string) {
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) return null;
  if (user.role !== 'ADMIN' && quote.ownerUserId !== user.id) return null;
  return quote;
}

export const tokenCookieName = TOKEN_NAME;
