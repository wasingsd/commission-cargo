/**
 * Commission Cargo - Single Rate Card API
 * GET /api/rate-cards/[id] - Get rate card by ID
 * PATCH /api/rate-cards/[id] - Update rate card
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const rateCard = await prisma.rateCard.findUnique({
            where: { id },
            include: {
                rows: true,
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        if (!rateCard) {
            return NextResponse.json(
                { success: false, error: 'Rate card not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: rateCard,
        });
    } catch (error) {
        console.error('Error fetching rate card:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch rate card' },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || 'system';

    try {
        const { id } = await params;
        const body = await request.json();
        const { name, effectiveFrom, effectiveTo, status, rows } = body;

        // Get current state for audit log
        const current = await prisma.rateCard.findUnique({
            where: { id },
            include: { rows: true },
        });

        if (!current) {
            return NextResponse.json(
                { success: false, error: 'Rate card not found' },
                { status: 404 }
            );
        }

        // Transaction for Rate Card Header + Rows
        await prisma.$transaction(async (tx) => {
            // 1. Update Header
            await tx.rateCard.update({
                where: { id },
                data: {
                    ...(name && { name }),
                    ...(effectiveFrom && { effectiveFrom: new Date(effectiveFrom) }),
                    ...(effectiveTo !== undefined && { effectiveTo: effectiveTo ? new Date(effectiveTo) : null }),
                    ...(status && { status }),
                }
            });

            // 2. Update Rows (if provided)
            if (rows && Array.isArray(rows)) {
                for (const r of rows) {
                    await tx.rateRow.upsert({
                        where: {
                            rateCardId_productType: {
                                rateCardId: id,
                                productType: r.productType
                            }
                        },
                        create: {
                            rateCardId: id,
                            productType: r.productType,
                            truckCbm: Number(r.truckCbm),
                            truckKg: Number(r.truckKg),
                            shipCbm: Number(r.shipCbm),
                            shipKg: Number(r.shipKg)
                        },
                        update: {
                            truckCbm: Number(r.truckCbm),
                            truckKg: Number(r.truckKg),
                            shipCbm: Number(r.shipCbm),
                            shipKg: Number(r.shipKg)
                        }
                    });
                }
            }

            // 3. Audit Log
            await tx.auditLog.create({
                data: {
                    actorUserId: userId,
                    entityType: 'RATE_CARD',
                    entityId: id,
                    action: 'UPDATE',
                    message: `Updated rate card: ${name || current.name}`,
                    beforeJson: current as any
                }
            });
        });

        const updated = await prisma.rateCard.findUnique({
            where: { id },
            include: { rows: true }
        });

        return NextResponse.json({
            success: true,
            data: updated,
        });
    } catch (error) {
        console.error('Error updating rate card:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update rate card' },
            { status: 500 }
        );
    }
}
