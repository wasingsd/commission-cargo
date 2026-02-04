import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { firestore } from '@/lib/firestore';
import { computeCost, computeCommission } from '@/lib/calc';
import { logActivity } from '@/lib/audit';
import { AuditAction } from '@/lib/enums';

export async function POST() {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        // Get active rate card
        const activeRateCard = await firestore.rateCards.findActive();
        if (!activeRateCard) {
            return NextResponse.json({ error: 'ไม่พบเรทราคาที่เปิดใช้งานอยู่' }, { status: 400 });
        }

        const activeRateCardWithRows = await firestore.rateCards.findById(activeRateCard.id, true);
        if (!activeRateCardWithRows || !activeRateCardWithRows.rows) {
            return NextResponse.json({ error: 'เรทราคาไม่มีข้อมูลอัตรา' }, { status: 400 });
        }

        // Fetch all shipments
        const allShipments = await firestore.shipments.findAll();

        const updates: { id: string; data: any }[] = [];
        let count = 0;

        for (const shipment of allShipments) {
            // Only recalculate if it's using AUTO cost mode (which is default)
            if (shipment.costMode === 'MANUAL') continue;

            const transport = shipment.transport;
            const productType = shipment.productType || 'GENERAL';
            const weightKg = shipment.weightKg || 0;
            const cbm = shipment.cbm || 0;

            let rateCbm = 0;
            let rateKg = 0;

            const rateRow = (activeRateCardWithRows.rows as any[]).find(r => r.productType === productType);
            if (rateRow) {
                if (transport === 'SHIP') {
                    rateCbm = Number(rateRow.shipCbm);
                    rateKg = Number(rateRow.shipKg);
                } else {
                    rateCbm = Number(rateRow.truckCbm);
                    rateKg = Number(rateRow.truckKg);
                }
            }

            const costResult = computeCost({ weightKg, cbm, rateCbm, rateKg });
            const commResult = computeCommission(shipment.sellBase, costResult.costFinal);

            // Check if values actually changed to avoid unnecessary updates?
            // For simplicity, we just update all.

            updates.push({
                id: shipment.id,
                data: {
                    rateCardUsedId: activeRateCard.id,
                    costCbm: costResult.costCbm,
                    costKg: costResult.costKg,
                    costFinal: costResult.costFinal,
                    costRule: costResult.costRule,
                    commissionMethod: commResult.commissionMethod,
                    commissionValue: commResult.commissionValue,
                }
            });
            count++;
        }

        // Bulk update in batches of 500 (Firestore limit)
        if (updates.length > 0) {
            for (let i = 0; i < updates.length; i += 500) {
                const batch = updates.slice(i, i + 500);
                await firestore.shipments.bulkUpdate(batch);
            }
        }

        await logActivity({
            action: AuditAction.UPDATE,
            entityType: 'SHIPMENT',
            entityId: 'ALL_RECALCULATE',
            message: `สั่งคำนวณต้นทุนใหม่ทั้งหมด ${count} รายการ ตามเรท: ${activeRateCard.name}`,
            afterJson: { rateCardId: activeRateCard.id, count }
        });

        return NextResponse.json({ success: true, count });
    } catch (error: any) {
        console.error('Recalculate error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
