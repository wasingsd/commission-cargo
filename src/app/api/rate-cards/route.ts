import { NextResponse } from 'next/server';
import { firestore } from '@/lib/firestore';
import { CreateRateCardSchema } from '@/lib/validators';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ProductType } from '@/lib/enums';

export async function GET() {
    try {
        const list = await firestore.rateCards.findAll();

        // Add row count to each card
        const listWithCount = await Promise.all(
            list.map(async (card) => {
                const cardWithRows = await firestore.rateCards.findById(card.id, true);
                return {
                    ...card,
                    _count: {
                        rows: cardWithRows?.rows?.length || 0
                    }
                };
            })
        );

        return NextResponse.json({ success: true, data: listWithCount });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Ensure user ID is available
    if (!session.user?.id) {
        return NextResponse.json({ error: 'Session invalid. Please re-login.' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const parsed = CreateRateCardSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error }, { status: 400 });
        }

        const { name, effectiveFrom, rows } = parsed.data;

        // Build data object without undefined values (Firestore doesn't accept undefined)
        const createData: {
            name: string;
            createdById: string;
            status: 'DRAFT';
            effectiveFrom?: Date;
        } = {
            name,
            createdById: session.user.id,
            status: 'DRAFT',
        };

        // Only add effectiveFrom if it has a value
        if (effectiveFrom) {
            createData.effectiveFrom = new Date(effectiveFrom);
        }

        const card = await firestore.rateCards.create(
            createData,

            rows?.map(r => ({
                productType: r.productType as ProductType,
                truckCbm: r.truckCbm,
                truckKg: r.truckKg,
                shipCbm: r.shipCbm,
                shipKg: r.shipKg
            }))
        );

        // Audit Log
        await firestore.auditLogs.create({
            actorUserId: session.user.id,
            entityType: 'RATE_CARD',
            entityId: card.id,
            action: 'CREATE',
            afterJson: card as unknown as Record<string, unknown>
        });

        return NextResponse.json({ success: true, data: card });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
