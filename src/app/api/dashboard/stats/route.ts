import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const shipments = await prisma.shipment.findMany({
            select: {
                id: true,
                dateIn: true,
                trackingNo: true,
                customer: { select: { code: true } },
                sellBase: true,
                costFinal: true,
                commissionValue: true,
                commissionMethod: true
            }
        });

        // Compute stats locally (can optimize with groupBy/aggregate later if slow)
        let totalComm = 0;
        let totalSales = 0;
        let totalCost = 0;
        let diffComm = 0;
        let onePctComm = 0;

        const monthlyMap = new Map<string, { month: string, diff: number, onePct: number }>();
        const risks = [];

        for (const s of shipments) {
            const comm = Number(s.commissionValue);
            const sell = Number(s.sellBase);
            const cost = Number(s.costFinal);

            totalComm += comm;
            totalSales += sell;
            totalCost += cost;

            if (s.commissionMethod === 'DIFF') diffComm += comm;
            else if (s.commissionMethod === 'ONEPCT') onePctComm += comm;

            // Monthly
            if (s.dateIn) {
                const d = new Date(s.dateIn);
                const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                if (!monthlyMap.has(m)) monthlyMap.set(m, { month: m, diff: 0, onePct: 0 });
                const entry = monthlyMap.get(m)!;
                if (s.commissionMethod === 'DIFF') entry.diff += comm;
                else entry.onePct += comm;
            }

            // Risks: Loss
            if (sell < cost && sell > 0) {
                risks.push({
                    id: s.id,
                    tracking: s.trackingNo,
                    customer: s.customer?.code,
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
