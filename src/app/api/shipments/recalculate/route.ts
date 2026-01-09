import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { computeCommission, computeCost } from '@/lib/calc';
import { parseTracking } from '@/lib/tracking';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const { filters, newRateCardId } = body;

        if (!newRateCardId) {
            return NextResponse.json({ error: "New Rate Card ID is required" }, { status: 400 });
        }

        // Build where clause
        const where: any = {};
        if (filters?.monthKey) where.monthKey = filters.monthKey;
        if (filters?.customerId) where.customerId = filters.customerId;
        if (filters?.salespersonId) where.salespersonId = filters.salespersonId;

        // Safety: prevent updating all if no filters provided?
        // User might want to update all, but usually risky.
        if (Object.keys(where).length === 0) {
            // return NextResponse.json({ error: "At least one filter is required" }, { status: 400 });
        }

        // Fetch shipments
        const shipments = await prisma.shipment.findMany({ where });
        if (shipments.length === 0) {
            return NextResponse.json({ message: "No shipments found matching filters", count: 0 });
        }

        // Fetch new rate card rows
        const rateRows = await prisma.rateRow.findMany({
            where: { rateCardId: newRateCardId }
        });

        let count = 0;
        let totalDiff = 0;

        // Calculate stats for Audit
        const beforeState = {
            count: shipments.length,
            sumCost: shipments.reduce((s, x) => s + Number(x.costFinal), 0),
            sumCommission: shipments.reduce((s, x) => s + Number(x.commissionValue), 0)
        };

        // We can use a transaction, but for many rows it might lock.
        // Loop update.
        for (const sh of shipments) {
            // Find relevant rows for this shipment properties
            // Note: productType logic must match enum values in DB.
            const subRows = rateRows.filter(r =>
                r.productType === sh.productType &&
                r.transport === sh.transport
            );

            const rateCbmVal = subRows.find(r => r.unit === 'CBM')?.rateValue || 0;
            const rateKgVal = subRows.find(r => r.unit === 'KG')?.rateValue || 0;

            const costRes = computeCost({
                weightKg: Number(sh.weightKg),
                cbm: Number(sh.cbm),
                rateCbm: Number(rateCbmVal),
                rateKg: Number(rateKgVal)
            });

            // Assuming sellBase doesn't change
            const commRes = computeCommission(Number(sh.sellBase), costRes.costFinal);

            await prisma.shipment.update({
                where: { id: sh.id },
                data: {
                    rateCardUsedId: newRateCardId,
                    costCbm: costRes.costCbm,
                    costKg: costRes.costKg,
                    costFinal: costRes.costFinal,
                    costRule: costRes.costRule,
                    commissionMethod: commRes.commissionMethod,
                    commissionValue: commRes.commissionValue
                }
            });
            count++;
        }

        // After stats (approximate, since we didn't re-fetch, but we know new values)
        // To be accurate, we could sum inside the loop.

        await prisma.auditLog.create({
            data: {
                actorUserId: session.user.id,
                entityType: 'SHIPMENT',
                entityId: 'BULK', // or use a composite ID or just generic
                action: 'RECALC',
                message: `Recalculated ${count} shipments. Filter: ${JSON.stringify(filters)}. RateCard: ${newRateCardId}`,
                beforeJson: beforeState as any
            }
        });

        return NextResponse.json({ success: true, count });

    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
