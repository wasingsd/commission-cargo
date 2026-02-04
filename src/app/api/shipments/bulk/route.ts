import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { firestore } from '@/lib/firestore';
import { computeCost, computeCommission } from '@/lib/calc';
import { format } from 'date-fns';
import { ProductType, Transport, AuditAction } from '@/lib/enums';
import { parseTracking } from '@/lib/tracking';
import { logActivity } from '@/lib/audit';

interface BulkShipmentRow {
    trackingNo: string;
    customerCode: string;
    sellBase: number;
    productType: 'GENERAL' | 'TISI' | 'FDA' | 'SPECIAL';
    transport: 'TRUCK' | 'SHIP';
    dateIn?: string;
    weightKg?: number;
    cbm?: number;
    note?: string;
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { rows } = body as { rows: BulkShipmentRow[] };

        if (!rows || !Array.isArray(rows) || rows.length === 0) {
            return NextResponse.json(
                { error: 'ไม่มีข้อมูลสำหรับนำเข้า' },
                { status: 400 }
            );
        }

        // Get active rate card
        const activeRateCard = await firestore.rateCards.findActive();
        let activeRateCardWithRows = null;
        if (activeRateCard) {
            activeRateCardWithRows = await firestore.rateCards.findById(activeRateCard.id, true);
        }

        const results = {
            success: 0,
            failed: 0,
            errors: [] as { row: number; tracking: string; error: string }[]
        };

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            try {
                // Validate required fields
                if (!row.trackingNo || !row.customerCode) {
                    results.failed++;
                    results.errors.push({
                        row: i + 1,
                        tracking: row.trackingNo || 'N/A',
                        error: 'ขาดข้อมูลจำเป็น (เลขพัสดุ หรือ รหัสลูกค้า)'
                    });
                    continue;
                }

                // Find or create customer
                let customer = await firestore.customers.findByCode(row.customerCode.trim());

                if (!customer) {
                    customer = await firestore.customers.create({ code: row.customerCode.trim() });
                }

                // Parse tracking
                const { base: trackingBase, suffix: trackingSuffix } = parseTracking(row.trackingNo);

                // Parse date
                let dateIn: Date | null = null;
                if (row.dateIn) {
                    // Support formats: DD/MM/YYYY, YYYY-MM-DD
                    const parts = row.dateIn.split(/[\/\-]/);
                    if (parts.length === 3) {
                        if (parts[0].length === 4) {
                            // YYYY-MM-DD
                            dateIn = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
                        } else {
                            // DD/MM/YYYY
                            dateIn = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                        }
                    }
                }
                if (!dateIn || isNaN(dateIn.getTime())) {
                    dateIn = new Date();
                }

                const monthKey = format(dateIn, 'yyyy-MM');

                // Get salesperson from customer
                const salespersonId = customer.assignedSalespersonId || undefined;

                // Calculate cost
                let rateCbm = 0;
                let rateKg = 0;

                if (activeRateCardWithRows && activeRateCardWithRows.rows) {
                    const rateRow = activeRateCardWithRows.rows.find(
                        r => r.productType === (row.productType || 'GENERAL')
                    );
                    if (rateRow) {
                        if (row.transport === 'SHIP') {
                            rateCbm = Number(rateRow.shipCbm);
                            rateKg = Number(rateRow.shipKg);
                        } else { // TRUCK
                            rateCbm = Number(rateRow.truckCbm);
                            rateKg = Number(rateRow.truckKg);
                        }
                    }
                }

                const costResult = computeCost({
                    weightKg: row.weightKg,
                    cbm: row.cbm,
                    rateCbm,
                    rateKg
                });

                // Calculate commission
                const commResult = computeCommission(
                    row.sellBase || 0,
                    costResult.costFinal
                );

                // Create shipment
                await firestore.shipments.create({
                    dateIn: dateIn || undefined,
                    monthKey: monthKey || undefined,
                    trackingNo: row.trackingNo,
                    trackingBase,
                    trackingSuffix: trackingSuffix ?? undefined,
                    customerId: customer.id,
                    salespersonId: salespersonId || undefined,
                    productType: (row.productType || 'GENERAL') as ProductType,
                    transport: (row.transport || 'TRUCK') as Transport,
                    weightKg: row.weightKg || 0,
                    cbm: row.cbm || 0,
                    sellBase: row.sellBase || 0,
                    costMode: 'AUTO',
                    rateCardUsedId: activeRateCard?.id,
                    costCbm: costResult.costCbm,
                    costKg: costResult.costKg,
                    costFinal: costResult.costFinal,
                    costRule: costResult.costRule,
                    commissionMethod: commResult.commissionMethod,
                    commissionValue: commResult.commissionValue,
                    note: row.note || undefined,
                });

                results.success++;
            } catch (err: any) {
                results.failed++;
                results.errors.push({
                    row: i + 1,
                    tracking: row.trackingNo || 'N/A',
                    error: err.message || 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
                });
            }
        }

        // Audit Log for Bulk Action
        await logActivity({
            action: AuditAction.CREATE,
            entityType: 'SHIPMENT',
            entityId: 'BULK_IMPORT',
            message: `นำเข้าข้อมูลแบบกลุ่ม ${results.success} รายการ (ล้มเหลว ${results.failed})`,
            afterJson: { results }
        });

        return NextResponse.json({
            success: true,
            message: `นำเข้าสำเร็จ ${results.success} รายการ, ล้มเหลว ${results.failed} รายการ`,
            results
        });
    } catch (error: any) {
        console.error('Bulk import error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const { ids, data } = body as { ids: string[]; data: any };

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
        }

        const activeRateCard = await firestore.rateCards.findActive();
        let activeRateCardWithRows = null;
        if (activeRateCard) {
            activeRateCardWithRows = await firestore.rateCards.findById(activeRateCard.id, true);
        }

        const updates: { id: string; data: any }[] = [];

        for (const id of ids) {
            const shipment = await firestore.shipments.findById(id);
            if (!shipment) continue;

            const updatedData = { ...data };

            // Recalculate if transport or productType or weights change
            if (data.transport || data.productType || data.weightKg !== undefined || data.cbm !== undefined) {
                const transport = data.transport || shipment.transport;
                const productType = data.productType || shipment.productType;
                const weightKg = data.weightKg !== undefined ? data.weightKg : shipment.weightKg;
                const cbm = data.cbm !== undefined ? data.cbm : shipment.cbm;

                let rateCbm = 0;
                let rateKg = 0;

                if (activeRateCardWithRows && activeRateCardWithRows.rows) {
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
                }

                const costResult = computeCost({ weightKg, cbm, rateCbm, rateKg });
                const sellBase = shipment.sellBase ?? 0;
                const commResult = computeCommission(sellBase, costResult.costFinal);

                Object.assign(updatedData, {
                    costCbm: costResult.costCbm,
                    costKg: costResult.costKg,
                    costFinal: costResult.costFinal,
                    costRule: costResult.costRule,
                    commissionValue: commResult.commissionValue,
                });
            }

            updates.push({ id, data: updatedData });
        }

        await firestore.shipments.bulkUpdate(updates);

        await logActivity({
            action: AuditAction.UPDATE,
            entityType: 'SHIPMENT',
            entityId: 'BULK_UPDATE',
            message: `แก้ไขรายการขนส่งแบบกลุ่ม ${updates.length} รายการ`,
            afterJson: { ids, data }
        });

        return NextResponse.json({ success: true, count: updates.length });
    } catch (error: any) {
        console.error('Bulk update error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const { ids } = body as { ids: string[] };

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
        }

        await firestore.shipments.bulkDelete(ids);

        await logActivity({
            action: AuditAction.DELETE,
            entityType: 'SHIPMENT',
            entityId: 'BULK_DELETE',
            message: `ลบรายการขนส่งแบบกลุ่ม ${ids.length} รายการ`,
            afterJson: { ids }
        });

        return NextResponse.json({ success: true, count: ids.length });
    } catch (error: any) {
        console.error('Bulk delete error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
