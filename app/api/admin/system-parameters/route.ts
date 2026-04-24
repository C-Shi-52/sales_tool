import { requireAdmin } from '@/lib/auth';
import { writeAudit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    return NextResponse.json(await prisma.systemParameter.findMany({ orderBy: { paramKey: 'asc' } }));
  } catch {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAdmin(req);
    const body = await req.json();
    const item = await prisma.systemParameter.update({
      where: { id: body.id },
      data: { paramName: body.paramName, paramValue: Number(body.paramValue) }
    });
    await writeAudit(user.id, 'ADMIN_PARAMETER_UPDATED', 'SYSTEM_PARAMETER', item.id, body);
    return NextResponse.json(item);
  } catch {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }
}
