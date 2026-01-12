import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CreateRateCardSchema } from '@/lib/validators';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
    try {
        const list = await prisma.rateCard.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { rows: true }
                }
            }
        });
        return NextResponse.json({ success: true, data: list });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const parsed = CreateRateCardSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error }, { status: 400 });
        }

        const { name, effectiveFrom, rows } = parsed.data;

        const card = await prisma.rateCard.create({
            data: {
                name,
                effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : null,
                createdById: session.user.id,
                status: 'DRAFT',
                rows: rows && rows.length > 0 ? {
                    create: rows.map(r => ({
                        productType: r.productType,
                        truckCbm: r.truckCbm,
                        truckKg: r.truckKg,
                        shipCbm: r.shipCbm,
                        shipKg: r.shipKg
                    }))
                } : undefined
            },
            include: {
                rows: true
            }
        });

        // Audit Log
        await prisma.auditLog.create({
            data: {
                actorUserId: session.user.id,
                entityType: 'RATE_CARD',
                entityId: card.id,
                action: 'CREATE',
                afterJson: card as any
            }
        });

        return NextResponse.json({ success: true, data: card });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
