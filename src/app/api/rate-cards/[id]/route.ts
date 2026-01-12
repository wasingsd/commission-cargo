/**
 * Commission Cargo - Single Rate Card API
 * GET /api/rate-cards/[id] - Get rate card by ID
 * PATCH /api/rate-cards/[id] - Update rate card
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, description, effectiveFrom, effectiveTo, status } = body;

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

        // Update rate card
        const updated = await prisma.rateCard.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(effectiveFrom && { effectiveFrom: new Date(effectiveFrom) }),
                ...(effectiveTo !== undefined && { effectiveTo: effectiveTo ? new Date(effectiveTo) : null }),
                ...(status && { status }),
            },
            include: {
                rows: true,
            },
        });

        // Create audit log
        const userId = 'system'; // TODO: Get from session
        await prisma.auditLog.create({
            data: {
                actorUserId: userId,
                entityType: 'RATE_CARD',
                entityId: id,
                action: 'UPDATE',
                beforeJson: current,
                afterJson: updated,
                message: `แก้ไขชุดเรท: ${updated.name}`,
            },
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
