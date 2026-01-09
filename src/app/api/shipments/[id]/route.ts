/**
 * Commission Cargo - Single Shipment API
 * GET /api/shipments/[id] - Get shipment by ID
 * PATCH /api/shipments/[id] - Update shipment
 * DELETE /api/shipments/[id] - Delete shipment
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calculateFull, parseTrackingNumber } from '@/lib/calc';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const shipment = await prisma.shipment.findUnique({
            where: { id },
            include: {
                customer: true,
                salesperson: true,
                rateCardUsed: true,
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

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
        const current = await prisma.shipment.findUnique({
            where: { id },
            include: { customer: true, salesperson: true },
        });

        if (!current) {
            return NextResponse.json(
                { success: false, error: 'Shipment not found' },
                { status: 404 }
            );
        }

        // Build update data
        const updateData: Record<string, unknown> = {};

        if (body.dateIn) updateData.dateIn = new Date(body.dateIn);
        if (body.customerId) updateData.customerId = body.customerId;
        if (body.salespersonId !== undefined) updateData.salespersonId = body.salespersonId || null;
        if (body.trackingNo) {
            updateData.trackingNo = body.trackingNo;
            const { base, suffix } = parseTrackingNumber(body.trackingNo);
            updateData.trackingBase = base;
            updateData.trackingSuffix = suffix;
        }
        if (body.productType) updateData.productType = body.productType;
        if (body.transport) updateData.transport = body.transport;
        if (body.weightKg !== undefined) updateData.weightKg = parseFloat(body.weightKg) || 0;
        if (body.cbm !== undefined) updateData.cbm = parseFloat(body.cbm) || 0;
        if (body.sellBase !== undefined) updateData.sellBase = parseFloat(body.sellBase) || 0;
        if (body.costMode) updateData.costMode = body.costMode;
        if (body.costManual !== undefined) updateData.costManual = body.costManual ? parseFloat(body.costManual) : null;
        if (body.status) updateData.status = body.status;
        if (body.note !== undefined) updateData.note = body.note || null;

        // Recalculate if cost-related fields changed
        const needsRecalc = ['weightKg', 'cbm', 'sellBase', 'costMode', 'costManual', 'productType', 'transport'].some(
            (field) => body[field] !== undefined
        );

        if (needsRecalc) {
            // Get active rate card or use the one already assigned
            const rateCard = await prisma.rateCard.findFirst({
                where: { status: 'ACTIVE' },
                include: { rateRows: true },
            });

            if (rateCard) {
                const productType = body.productType || current.productType;
                const transport = body.transport || current.transport;

                const rateCbm = rateCard.rateRows.find(
                    (r) => r.productType === productType && r.transport === transport && r.unit === 'CBM'
                );
                const rateKg = rateCard.rateRows.find(
                    (r) => r.productType === productType && r.transport === transport && r.unit === 'KG'
                );

                const calculation = calculateFull(
                    {
                        cbm: body.cbm !== undefined ? parseFloat(body.cbm) : Number(current.cbm),
                        weightKg: body.weightKg !== undefined ? parseFloat(body.weightKg) : Number(current.weightKg),
                        sellBase: body.sellBase !== undefined ? parseFloat(body.sellBase) : Number(current.sellBase),
                        costMode: body.costMode || current.costMode,
                        costManual: body.costManual !== undefined
                            ? (body.costManual ? parseFloat(body.costManual) : undefined)
                            : (current.costManual ? Number(current.costManual) : undefined),
                    },
                    {
                        rateCbm: rateCbm ? Number(rateCbm.rateValue) : 0,
                        rateKg: rateKg ? Number(rateKg.rateValue) : 0,
                    }
                );

                updateData.costCbm = calculation.costCbm;
                updateData.costKg = calculation.costKg;
                updateData.costFinal = calculation.costFinal;
                updateData.costRule = calculation.costRule;
                updateData.commissionMethod = calculation.commissionMethod;
                updateData.commissionValue = calculation.commissionValue;
                updateData.rateCardIdUsed = rateCard.id;
            }
        }

        // Update shipment
        const updated = await prisma.shipment.update({
            where: { id },
            data: updateData,
            include: {
                customer: true,
                salesperson: true,
            },
        });

        // Create audit log
        await prisma.auditLog.create({
            data: {
                actorUserId: userId,
                entityType: 'SHIPMENT',
                entityId: id,
                action: 'UPDATE',
                beforeJson: current,
                afterJson: updated,
                message: `แก้ไขรายการ Tracking: ${updated.trackingNo}`,
            },
        });

        return NextResponse.json({
            success: true,
            data: updated,
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
        const shipment = await prisma.shipment.findUnique({
            where: { id },
        });

        if (!shipment) {
            return NextResponse.json(
                { success: false, error: 'Shipment not found' },
                { status: 404 }
            );
        }

        // Delete shipment
        await prisma.shipment.delete({
            where: { id },
        });

        // Create audit log
        await prisma.auditLog.create({
            data: {
                actorUserId: userId,
                entityType: 'SHIPMENT',
                entityId: id,
                action: 'DELETE',
                beforeJson: shipment,
                message: `ลบรายการ Tracking: ${shipment.trackingNo}`,
            },
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
