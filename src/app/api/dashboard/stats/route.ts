import { NextResponse } from 'next/server';
import { firestore, Shipment } from '@/lib/firestore';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const shipments: Shipment[] = await firestore.shipments.findAll();

        // Compute stats locally
        let totalComm = 0;
        let totalSales = 0;
        let totalCost = 0;
        let diffComm = 0;
        let onePctComm = 0;

        const monthlyMap = new Map<string, { month: string, diff: number, onePct: number }>();
        const risks: {
            id: string;
            tracking: string;
            customer: string | undefined;
            type: string;
            detail: string;
        }[] = [];

        // Get customer codes for shipments
        const customerCache = new Map<string, string>();

        for (const s of shipments) {
            const comm = Number(s.commissionValue || 0);
            const sell = Number(s.sellBase || 0);
            const cost = Number(s.costFinal || 0);

            totalComm += comm;
            totalSales += sell;
            totalCost += cost;

            if (s.commissionMethod === 'DIFF') diffComm += comm;
            else if (s.commissionMethod === 'ONEPCT') onePctComm += comm;

            // Monthly
            if (s.dateIn) {
                const d = s.dateIn instanceof Date ? s.dateIn : new Date(s.dateIn);
                const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                if (!monthlyMap.has(m)) monthlyMap.set(m, { month: m, diff: 0, onePct: 0 });
                const entry = monthlyMap.get(m)!;
                if (s.commissionMethod === 'DIFF') entry.diff += comm;
                else entry.onePct += comm;
            }

            // Get customer code for risk display
            let customerCode: string | undefined;
            if (s.customerId) {
                if (customerCache.has(s.customerId)) {
                    customerCode = customerCache.get(s.customerId);
                } else {
                    const customer = await firestore.customers.findById(s.customerId);
                    customerCode = customer?.code;
                    if (customerCode) customerCache.set(s.customerId, customerCode);
                }
            }

            // Risks: Loss
            if (sell < cost && sell > 0) {
                risks.push({
                    id: s.id,
                    tracking: s.trackingNo,
                    customer: customerCode,
                    type: 'LOSS',
                    detail: `Sell ${sell} < Cost ${cost}`
                });
            }
        }

        // Risks: Duplicate Base Tracking Check
        const baseMap = new Map<string, string[]>();
        shipments.forEach(s => {
            if (!s.trackingNo) return;
            const base = s.trackingNo.split('-')[0];
            if (!baseMap.has(base)) baseMap.set(base, []);
            baseMap.get(base)!.push(s.trackingNo);
        });

        for (const [base, trackers] of baseMap.entries()) {
            if (trackers.length > 1) {
                // Potential duplicates or combined shipments
                risks.push({
                    id: `dup-${base}`,
                    tracking: base,
                    customer: 'Multiple',
                    type: 'DUP',
                    detail: `${trackers.length} รายการ (Suffix Check)`
                });
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                summary: {
                    totalComm,
                    totalSales,
                    totalCost,
                    count: shipments.length
                },
                mix: {
                    diff: diffComm,
                    onePct: onePctComm
                },
                monthly: Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month)),
                risks: risks.slice(0, 50) // limit
            }
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
