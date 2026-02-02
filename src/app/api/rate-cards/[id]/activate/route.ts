import { NextResponse } from 'next/server';
import { firestore } from '@/lib/firestore';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    try {
        // Get the rate card to activate
        const rateCard = await firestore.rateCards.findById(id);
        if (!rateCard) {
            return NextResponse.json({ error: 'Rate card not found' }, { status: 404 });
        }

        // Activate the rate card (this function handles archiving current active)
        await firestore.rateCards.activate(id);

        // Log
        await firestore.auditLogs.create({
            actorUserId: session.user.id,
            entityType: 'RATE_CARD',
            entityId: id,
            action: 'ACTIVATE',
            message: `Activated rate card ${rateCard.name}`
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
