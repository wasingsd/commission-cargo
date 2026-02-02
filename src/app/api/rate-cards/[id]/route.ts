/**
 * Commission Cargo - Single Rate Card API
 * GET /api/rate-cards/[id] - Get rate card by ID
 * PATCH /api/rate-cards/[id] - Update rate card
 */

import { NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firestore';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ProductType } from '@/lib/enums';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const rateCard = await firestore.rateCards.findById(id, true);

        if (!rateCard) {
            return NextResponse.json(
                { success: false, error: 'Rate card not found' },
                { status: 404 }
            );
        }

        // Get creator info if available
        let createdBy = null;
        if (rateCard.createdById) {
            const user = await firestore.users.findById(rateCard.createdById);
            if (user) {
                createdBy = {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                };
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                ...rateCard,
                createdBy,
            },
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
        const current = await firestore.rateCards.findById(id, true);

        if (!current) {
            return NextResponse.json(
                { success: false, error: 'Rate card not found' },
                { status: 404 }
            );
        }

        // Update header
        const updateData: Record<string, unknown> = {};
        if (name) updateData.name = name;
        if (effectiveFrom) updateData.effectiveFrom = new Date(effectiveFrom);
        if (effectiveTo !== undefined) updateData.effectiveTo = effectiveTo ? new Date(effectiveTo) : null;

        if (status === 'ACTIVE') {
            await firestore.rateCards.activate(id);
        } else if (status) {
            updateData.status = status;
        }

        if (Object.keys(updateData).length > 0) {
            await firestore.rateCards.update(id, updateData);
        }

        // Update rows (if provided)
        if (rows && Array.isArray(rows)) {
            await firestore.rateCards.updateRows(
                id,
                rows.map(r => ({
                    productType: r.productType as ProductType,
                    truckCbm: Number(r.truckCbm),
                    truckKg: Number(r.truckKg),
                    shipCbm: Number(r.shipCbm),
                    shipKg: Number(r.shipKg)
                }))
            );
        }

        // Audit Log
        const { logActivity } = await import('@/lib/audit');
        const { AuditAction } = await import('@/lib/enums');
        await logActivity({
            action: AuditAction.UPDATE,
            entityType: 'RATE_CARD',
            entityId: id,
            message: `Updated rate card: ${name || current.name}`,
            beforeJson: current
        });

        const updated = await firestore.rateCards.findById(id, true);

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

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = session.user as any;

    try {
        const { id } = await params;

        // Get existing card for audit
        const existing = await firestore.rateCards.findById(id);
        if (!existing) {
            return NextResponse.json({ success: false, error: 'ไม่พบเรทราคาทุนที่ต้องการลบ' }, { status: 404 });
        }

        // Prevent deleting active rate card
        if (existing.status === 'ACTIVE') {
            return NextResponse.json({
                success: false,
                error: 'ไม่สามารถลบเรทที่กำลังใช้งานอยู่ได้ กรุณาเปิดใช้งานเรทอื่นก่อนเพื่อแทนที่เรทนี้'
            }, { status: 400 });
        }

        await firestore.rateCards.delete(id);

        // Audit Log
        const { logActivity } = await import('@/lib/audit');
        const { AuditAction } = await import('@/lib/enums');
        await logActivity({
            action: AuditAction.DELETE,
            entityType: 'RATE_CARD',
            entityId: id,
            message: `Deleted rate card: ${existing.name}`,
            beforeJson: existing
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting rate card:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to delete rate card' },
            { status: 500 }
        );
    }
}

