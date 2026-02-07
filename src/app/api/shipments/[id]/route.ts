/**
 * Commission Cargo - Single Shipment API
 * GET /api/shipments/[id] - Get shipment by ID
 * PATCH /api/shipments/[id] - Update shipment
 * DELETE /api/shipments/[id] - Delete shipment
 */

import { NextRequest, NextResponse } from 'next/server';
import { firestore, Shipment } from '@/lib/firestore';
import { calculateFull } from '@/lib/calc';
import { parseTracking } from '@/lib/tracking';
import { FieldValue } from 'firebase-admin/firestore';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const shipment = await firestore.shipments.findByIdWithRelations(id);

        if (!shipment) {
            return NextResponse.json(
                { success: false, error: 'Shipment not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: shipment,
        });
    } catch (error) {
        console.error('Error fetching shipment:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch shipment' },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const userId = 'system'; // TODO: Get from session

        // Get current shipment
        const current = await firestore.shipments.findByIdWithRelations(id);

        if (!current) {
            return NextResponse.json(
                { success: false, error: 'Shipment not found' },
                { status: 404 }
            );
        }

        // Build update data
        const updateData: Partial<Shipment> = {};

        if (body.dateIn) {
            updateData.dateIn = new Date(body.dateIn);
            updateData.monthKey = (body.dateIn as string).substring(0, 7);
        }

        // Handle Customer Update via Code or ID
        let newCustomerId: string | undefined = undefined;
        if (body.customerCode) {
            const customer = await firestore.customers.findByCode(body.customerCode);
            if (customer) {
                updateData.customerId = customer.id;
                newCustomerId = customer.id;
            }
        } else if (body.customerId) {
            updateData.customerId = body.customerId;
            newCustomerId = body.customerId;
        }

        // Handle Salesperson Update
        // Logic:
        // 1. If explicit salespersonId provided (string) -> Use it
        // 2. If explicit NULL provided ("Auto") -> Use customer's default
        // 3. If undefined (not provided) -> Keep existing UNLESS customer changed, then use new customer's default

        let shouldUpdateSalesperson = false;
        // Check if salespersonId is in the body (even if null)
        if (body.salespersonId !== undefined) {
            shouldUpdateSalesperson = true;
        } else if (newCustomerId && newCustomerId !== current.customerId) {
            // Customer changed but no salesperson provided -> Force re-eval "Auto"
            shouldUpdateSalesperson = true;
        }

        if (shouldUpdateSalesperson) {
            // If explicit ID provided (and not null/empty), use it
            if (body.salespersonId) {
                updateData.salespersonId = body.salespersonId;
            } else {
                // "Auto" mode (null passed or customer changed)
                // Determine the target customer ID to fetch defaults from
                const targetCustomerId = newCustomerId || current.customerId;
                let targetSalesId = undefined;

                if (targetCustomerId) {
                    const customer = await firestore.customers.findById(targetCustomerId);
                    if (customer?.assignedSalespersonId) {
                        targetSalesId = customer.assignedSalespersonId;
                    }
                }

                if (targetSalesId) {
                    updateData.salespersonId = targetSalesId;
                } else {
                    // Use FieldValue.delete() to remove the field
                    (updateData as any).salespersonId = FieldValue.delete();
                }
            }
        }

        if (body.trackingNo) {
            updateData.trackingNo = body.trackingNo;
            const { base, suffix } = parseTracking(body.trackingNo);
            updateData.trackingBase = base;
            updateData.trackingSuffix = suffix ?? undefined;
        }
        if (body.productType) updateData.productType = body.productType;
        if (body.transport) updateData.transport = body.transport;
        if (body.weightKg !== undefined) updateData.weightKg = parseFloat(body.weightKg) || 0;
        if (body.cbm !== undefined) updateData.cbm = parseFloat(body.cbm) || 0;
        if (body.sellBase !== undefined) updateData.sellBase = parseFloat(body.sellBase) || 0;
        if (body.costMode) updateData.costMode = body.costMode;
        if (body.costManual !== undefined) updateData.costManual = body.costManual ? parseFloat(body.costManual) : undefined;
        if (body.note !== undefined) updateData.note = body.note || undefined;

        // Recalculate if cost-related fields changed
        const needsRecalc = ['weightKg', 'cbm', 'sellBase', 'costMode', 'costManual', 'productType', 'transport'].some(
            (field) => body[field] !== undefined
        );

        if (needsRecalc) {
            // Get active rate card or use the one already assigned
            let rateCard: any = null;
            const currentRateCardId = current.rateCardUsedId;

            // 1. Try to find active rate card first (Standard behavior for edits/recalc)
            const activeCard = await firestore.rateCards.findActive();

            if (activeCard) {
                rateCard = await firestore.rateCards.findById(activeCard.id, true);
            } else if (currentRateCardId) {
                // 2. Fallback to existing rate card if no active one found
                rateCard = await firestore.rateCards.findById(currentRateCardId, true);
            }

            const productType = body.productType || current.productType;
            const transport = body.transport || current.transport;

            // Find rate row for this product type
            let rateRow = null;
            if (rateCard && rateCard.rows) {
                rateRow = rateCard.rows.find((r: any) => r.productType === productType);
            }

            let rateCbm = 0;
            let rateKg = 0;

            if (rateRow) {
                // Select rates based on transport type
                if (transport === 'TRUCK') {
                    rateCbm = Number(rateRow.truckCbm);
                    rateKg = Number(rateRow.truckKg);
                } else if (transport === 'SHIP') {
                    rateCbm = Number(rateRow.shipCbm);
                    rateKg = Number(rateRow.shipKg);
                }
            }

            const calculation = calculateFull(
                {
                    cbm: body.cbm !== undefined ? parseFloat(body.cbm) : Number(current.cbm),
                    weightKg: body.weightKg !== undefined ? parseFloat(body.weightKg) : Number(current.weightKg),
                    sellBase: body.sellBase !== undefined ? parseFloat(body.sellBase) : Number(current.sellBase),
                    costMode: (body.costMode || current.costMode) as any,
                    costManual: body.costManual !== undefined
                        ? (body.costManual ? parseFloat(body.costManual) : undefined)
                        : (current.costManual ? Number(current.costManual) : undefined),
                },
                {
                    rateCbm,
                    rateKg,
                }
            );

            updateData.costCbm = calculation.costCbm;
            updateData.costKg = calculation.costKg;
            updateData.costFinal = calculation.costFinal;
            updateData.costRule = calculation.costRule as any;
            updateData.commissionMethod = calculation.commissionMethod as any;
            updateData.commissionValue = calculation.commissionValue;

            if (rateCard) {
                updateData.rateCardUsedId = rateCard.id;
            }
        }

        // Update shipment
        const updated = await firestore.shipments.update(id, updateData);

        // Populate relations for return
        const updatedWithRelations = await firestore.shipments.findByIdWithRelations(id);

        // Create audit log
        const { logActivity } = await import('@/lib/audit');
        const { AuditAction } = await import('@/lib/enums');
        await logActivity({
            action: AuditAction.UPDATE,
            entityType: 'SHIPMENT',
            entityId: id,
            beforeJson: current,
            afterJson: updated,
            message: `แก้ไขรายการ Tracking: ${updated?.trackingNo}`,
        });

        return NextResponse.json({
            success: true,
            data: updatedWithRelations,
        });
    } catch (error) {
        console.error('Error updating shipment:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update shipment' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const userId = 'system'; // TODO: Get from session

        // Get current shipment for audit log
        const shipment = await firestore.shipments.findById(id);

        if (!shipment) {
            return NextResponse.json(
                { success: false, error: 'Shipment not found' },
                { status: 404 }
            );
        }

        // Delete shipment
        await firestore.shipments.delete(id);

        // Create audit log
        const { logActivity } = await import('@/lib/audit');
        const { AuditAction } = await import('@/lib/enums');
        await logActivity({
            action: AuditAction.DELETE,
            entityType: 'SHIPMENT',
            entityId: id,
            beforeJson: shipment,
            message: `ลบรายการ Tracking: ${shipment.trackingNo}`,
        });

        return NextResponse.json({
            success: true,
            message: 'Shipment deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting shipment:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete shipment' },
            { status: 500 }
        );
    }
}
