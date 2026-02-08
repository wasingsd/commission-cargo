import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { firestore, Shipment, RateCard } from '@/lib/firestore';
import { computeCost, computeCommission } from '@/lib/calc';
import { format } from 'date-fns';
import { ProductType, Transport, AuditAction } from '@/lib/enums';
import { parseTracking } from '@/lib/tracking';
import { logActivity } from '@/lib/audit';

interface BulkShipmentRow {
    trackingNo: string;
    customerCode: string; // Required for new shipments, optional-ish for updates but frontend sends it
    sellBase?: number;
    sellUnit?: 'CBM' | 'KG';
    productType?: 'GENERAL' | 'TISI' | 'FDA' | 'SPECIAL';
    transport?: 'TRUCK' | 'SHIP';
    dateIn?: string;
    dateOut?: string;
    dateArrived?: string;
    weightKg?: number;
    cbm?: number;
    poNo?: string;
    lotNo?: string;
    quantity?: number;
    dimensions?: string;
    status?: string;
    note?: string;
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

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
        let activeRateCardWithRows: RateCard | null = null;
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
                // Validate required tracking number
                if (!row.trackingNo) {
                    results.failed++;
                    results.errors.push({
                        row: i + 1,
                        tracking: 'N/A',
                        error: 'ขาดเลขพัสดุ'
                    });
                    continue;
                }

                // Check for existing shipment FIRST to determine merge base
                const existingShipment: Shipment | null = await firestore.shipments.findByTrackingNo(row.trackingNo);

                // Customer Handling
                // If existing, we can keep existing customer if row.customerCode is missing?
                // But frontend usually sends customerCode. IF it is missing/empty, we try to keep existing.
                // If new shipment, customerCode is required.

                let customerId = existingShipment?.customerId;
                let salespersonId = existingShipment?.salespersonId;

                if (row.customerCode) {
                    // If code provided, lookup/create customer
                    let customer = await firestore.customers.findByCode(row.customerCode.trim());
                    if (!customer) {
                        customer = await firestore.customers.create({ code: row.customerCode.trim() });
                    }
                    customerId = customer.id;
                    // Update salesperson logic: If customer changed or new, check default salesperson
                    // If keep existing customer, keep existing salesperson (unless implicitly changed? logic is complex, keeping simple: use customer's default if changing customer)
                    if (!existingShipment || existingShipment.customerId !== customerId) {
                        salespersonId = customer.assignedSalespersonId || undefined;
                    }
                } else if (!existingShipment) {
                    results.failed++;
                    results.errors.push({
                        row: i + 1,
                        tracking: row.trackingNo,
                        error: 'สินค้าใหม่ต้องระบุรหัสลูกค้า'
                    });
                    continue;
                }

                // Parse dates (only if provided)
                let dateIn: Date | undefined;
                if (row.dateIn) {
                    const parts = row.dateIn.split(/[\/\-]/);
                    if (parts.length === 3) {
                        // Simple heuristic for YYYY-MM-DD vs DD/MM/YYYY
                        if (parts[0].length === 4) dateIn = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
                        else dateIn = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                    }
                }

                // Effective Values for Calculation (Merge New ?? Old ?? Default)
                const efTransport = row.transport ?? existingShipment?.transport ?? 'TRUCK';
                const efProductType = row.productType ?? existingShipment?.productType ?? 'GENERAL';
                const efWeightKg = row.weightKg ?? existingShipment?.weightKg ?? 0;
                const efCbm = row.cbm ?? existingShipment?.cbm ?? 0;
                const efSellBase = row.sellBase ?? existingShipment?.sellBase ?? 0;

                // Calculate rates based on effective types
                let rateCbm = 0;
                let rateKg = 0;
                if (activeRateCardWithRows && activeRateCardWithRows.rows) {
                    const rateRow = activeRateCardWithRows.rows.find(
                        r => r.productType === efProductType
                    );
                    if (rateRow) {
                        if (efTransport === 'SHIP') {
                            rateCbm = Number(rateRow.shipCbm);
                            rateKg = Number(rateRow.shipKg);
                        } else { // TRUCK
                            rateCbm = Number(rateRow.truckCbm);
                            rateKg = Number(rateRow.truckKg);
                        }
                    }
                }

                const costResult = computeCost({
                    weightKg: efWeightKg,
                    cbm: efCbm,
                    rateCbm,
                    rateKg
                });

                const commResult = computeCommission(
                    efSellBase,
                    costResult.costFinal
                );

                // Prepare final data object
                // If row field is undefined, we generally want to KEEP existing (if update) or IGNORE (if create - defaults apply)
                // But since we have "effective" values for the important stuff, we can use them.

                const trackingParsed = parseTracking(row.trackingNo);

                // Determine Date In: New > Old > Now
                const finalDateIn = dateIn || existingShipment?.dateIn || new Date();
                const monthKey = format(finalDateIn, 'yyyy-MM');

                // Map status
                const mapStatus = (status?: string) => {
                    if (!status) return undefined; // Return undefined if no status provided
                    const s = status.toUpperCase();
                    if (s === 'DELIVERED' || s.includes('ส่งแล้ว')) return 'DELIVERED';
                    if (s === 'ARRIVED' || s.includes('ถึง')) return 'ARRIVED';
                    if (s === 'DEPARTED' || s.includes('ออก')) return 'DEPARTED';
                    if (s === 'IN_WAREHOUSE' || s.includes('โกดัง')) return 'IN_WAREHOUSE';
                    if (s === 'CANCELLED' || s.includes('ยกเลิก')) return 'CANCELLED';
                    return 'PENDING';
                };

                const newStatus = mapStatus(row.status);
                // If new status provided, use it. If not, keep existing. If new shipment, default to PENDING.
                const finalStatus = newStatus ?? existingShipment?.status ?? 'PENDING';

                // Other date fields
                let dateOut: Date | undefined = undefined;
                if (row.dateOut) { /* parse logic */
                    const parts = row.dateOut.split(/[\/\-]/);
                    if (parts.length === 3) dateOut = parts[0].length === 4 ? new Date(`${parts[0]}-${parts[1]}-${parts[2]}`) : new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                }
                const finalDateOut = dateOut ?? existingShipment?.dateOut;

                let dateArrived: Date | undefined = undefined;
                if (row.dateArrived) {
                    const parts = row.dateArrived.split(/[\/\-]/);
                    if (parts.length === 3) dateArrived = parts[0].length === 4 ? new Date(`${parts[0]}-${parts[1]}-${parts[2]}`) : new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                }
                const finalDateArrived = dateArrived ?? existingShipment?.dateArrived;


                const shipmentData: Omit<Shipment, 'id' | 'createdAt' | 'updatedAt'> = {
                    dateIn: finalDateIn,
                    dateOut: finalDateOut,
                    dateArrived: finalDateArrived,
                    monthKey,
                    trackingNo: row.trackingNo,
                    trackingBase: trackingParsed.base,
                    trackingSuffix: trackingParsed.suffix ?? undefined,
                    poNo: row.poNo ?? existingShipment?.poNo,
                    lotNo: row.lotNo ?? existingShipment?.lotNo,
                    customerId: customerId!, // Verified above
                    salespersonId: salespersonId,
                    productType: efProductType,
                    transport: efTransport,
                    quantity: row.quantity ?? existingShipment?.quantity ?? 1,
                    weightKg: efWeightKg,
                    dimensions: row.dimensions ?? existingShipment?.dimensions,
                    cbm: efCbm,
                    sellBase: efSellBase,
                    sellUnit: row.sellUnit ?? existingShipment?.sellUnit ?? 'CBM',
                    costMode: existingShipment?.costMode ?? 'AUTO', // Preserve manual cost override? Or reset? Usually bulk import implies auto recalc. Keeping 'AUTO' or existing if explicit.
                    // Actually, if we just recalculated using 'AUTO' logic (rate card), we should probably ensure it's set to 'AUTO' or respect the calc. 
                    // Let's set to 'AUTO' to be safe for imports, as we just ran auto-calc.
                    rateCardUsedId: activeRateCard?.id,
                    costCbm: costResult.costCbm,
                    costKg: costResult.costKg,
                    costFinal: costResult.costFinal,
                    costRule: costResult.costRule,
                    commissionMethod: commResult.commissionMethod,
                    commissionValue: commResult.commissionValue,
                    status: finalStatus as any,
                    note: row.note || existingShipment?.note, // If row.note is empty string, it overwrites? If row.note is undefined (not in JSON), keep existing. 
                    // Note: ParsedRow (frontend) sets note: '' by default. If we want to support 'keep note', we need frontend change or assume '' means 'keep' (dangerous if user wants to clear). 
                    // Given the constraint "Overwrite data only for columns WHO HAVE DATA", empty string IS data (clearing). undefined is NO data.
                    // Frontend 'note' is currently always empty string if not provided. This might be fine for now, or use || existing. 
                    // User said "Column with no information", which usually means "Cell is empty".
                    // If cell is empty, frontend sends empty string for note.
                    // If we treat empty string as "no info", then `|| existing`.
                };

                if (existingShipment) {
                    await firestore.shipments.update(existingShipment.id, shipmentData);
                } else {
                    await firestore.shipments.create(shipmentData);
                }

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
        let activeRateCardWithRows: RateCard | null = null;
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
