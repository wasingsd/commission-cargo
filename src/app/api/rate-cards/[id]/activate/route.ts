import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> } // In Next.js 16/latest params is async usually but check version.
    // The package.json says "next": "16.1.1".
    // In Next 15+, params is a Promise.
) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    try {
        // Transaction to ensure consistency
        await prisma.$transaction(async (tx) => {
            // 1. Archive current active
            await tx.rateCard.updateMany({
                where: { status: 'ACTIVE' },
                data: { status: 'ARCHIVED' }
            });

            // 2. Activate new one
            const updated = await tx.rateCard.update({
                where: { id },
                data: { status: 'ACTIVE' }
            });

            // 3. Log
            await tx.auditLog.create({
                data: {
                    actorUserId: session.user.id,
                    entityType: 'RATE_CARD',
                    entityId: id,
                    action: 'ACTIVATE',
                    message: `Activated rate card ${updated.name}`
                }
            });
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
