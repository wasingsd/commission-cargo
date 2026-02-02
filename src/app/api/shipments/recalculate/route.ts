import { NextResponse } from 'next/server';
import { firestore } from '@/lib/firestore';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { computeCommission, computeCost } from '@/lib/calc';

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
        const queryFilters: {
            monthKey?: string;
            customerId?: string;
            salespersonId?: string;
        } = {};
        if (filters?.monthKey) queryFilters.monthKey = filters.monthKey;
        if (filters?.customerId) queryFilters.customerId = filters.customerId;
        if (filters?.salespersonId) queryFilters.salespersonId = filters.salespersonId;

        // Fetch shipments
        const shipments = await firestore.shipments.findAll(queryFilters);
        if (shipments.length === 0) {
            return NextResponse.json({ message: "No shipments found matching filters", count: 0 });
        }

        // Fetch new rate card with rows
        const rateCard = await firestore.rateCards.findById(newRateCardId, true);
        const rateRows = rateCard?.rows || [];

        let count = 0;

        // Calculate stats for Audit
        const beforeState = {
            count: shipments.length,
            sumCost: shipments.reduce((s, x) => s + Number(x.costFinal || 0), 0),
            sumCommission: shipments.reduce((s, x) => s + Number(x.commissionValue || 0), 0)
        };

        // Prepare bulk updates
        const updates: { id: string; data: Record<string, unknown> }[] = [];

        for (const sh of shipments) {
            // Find rate row for this product type
            const rateRow = rateRows.find(r => r.productType === sh.productType);

            let rateCbm = 0;
            let rateKg = 0;

            if (rateRow) {
                // Select rates based on transport type
                if (sh.transport === 'TRUCK') {
                    rateCbm = Number(rateRow.truckCbm);
                    rateKg = Number(rateRow.truckKg);
                } else if (sh.transport === 'SHIP') {
                    rateCbm = Number(rateRow.shipCbm);
                    rateKg = Number(rateRow.shipKg);
                }
            }

            const costRes = computeCost({
                weightKg: Number(sh.weightKg),
                cbm: Number(sh.cbm),
                rateCbm,
                rateKg
            });

            // Assuming sellBase doesn't change
            const commRes = computeCommission(Number(sh.sellBase), costRes.costFinal);

            updates.push({
                id: sh.id,
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

        // Perform bulk update
        await firestore.shipments.bulkUpdate(updates);

        // Create audit log
        await firestore.auditLogs.create({
            actorUserId: session.user.id,
            entityType: 'SHIPMENT',
            entityId: 'BULK',
            action: 'RECALC',
            message: `Recalculated ${count} shipments. Filter: ${JSON.stringify(filters)}. RateCard: ${newRateCardId}`,
            beforeJson: beforeState as Record<string, unknown>
        });

        return NextResponse.json({ success: true, count });

    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
