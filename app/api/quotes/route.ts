import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { writeAudit } from '@/lib/audit';
import { toJsonString } from '@/lib/json';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const quote = await prisma.quote.create({
      data: {
        ownerUserId: user.id,
        projectName: body.projectName || '未命名项目',
        customerName: body.customerName,
        remarks: body.remarks,
        form: {
          create: {
            formData: toJsonString({
              project_name: body.projectName || '未命名项目'
            })
          }
        }
      }
    });
    await writeAudit(user.id, 'QUOTE_CREATED', 'QUOTE', quote.id, body);
    return NextResponse.json(quote);
  } catch {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const quotes = await prisma.quote.findMany({
      where: user.role === 'ADMIN' ? {} : { ownerUserId: user.id },
      orderBy: { updatedAt: 'desc' },
      include: { owner: true }
    });
    return NextResponse.json(quotes);
  } catch {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
}
