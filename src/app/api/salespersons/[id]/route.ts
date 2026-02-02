import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { firestore } from '@/lib/firestore';

// GET single salesperson with customers
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    try {
        const salesperson = await firestore.salespersons.findById(id);

        if (!salesperson) {
            return NextResponse.json({ error: 'ไม่พบข้อมูลเซลล์' }, { status: 404 });
        }

        // Get customers for this salesperson
        const customers = await firestore.customers.findBySalesperson(id);
        const shipmentsCount = await firestore.salespersons.countShipments(id);

        return NextResponse.json({
            success: true,
            data: {
                ...salesperson,
                customers,
                _count: {
                    shipments: shipmentsCount
                }
            }
        });
    } catch (error: any) {
        console.error('Error fetching salesperson:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT update salesperson (MANAGER or ADMIN only)
export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check role
    const user = await firestore.users.findByEmail(session.user?.email ?? '');

    if (!user || !['MANAGER', 'ADMIN'].includes(user.role)) {
        return NextResponse.json(
            { error: 'Permission denied. Only MANAGER or ADMIN can update salespersons.' },
            { status: 403 }
        );
    }

    try {
        const body = await req.json();
        const { code, name, phone, email, active } = body;

        // Check if changing code and it already exists
        if (code) {
            const existing = await firestore.salespersons.findByCode(code);
            if (existing && existing.id !== id) {
                return NextResponse.json(
                    { error: 'รหัสเซลล์นี้มีอยู่ในระบบแล้ว' },
                    { status: 400 }
                );
            }
        }

        const updateData: Record<string, unknown> = {};
        if (code) updateData.code = code;
        if (name) updateData.name = name;
        if (phone !== undefined) updateData.phone = phone || undefined;
        if (email !== undefined) updateData.email = email || undefined;
        if (active !== undefined) updateData.active = active;

        const salesperson = await firestore.salespersons.update(id, updateData);

        return NextResponse.json({ success: true, data: salesperson });
    } catch (error: any) {
        console.error('Error updating salesperson:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE salesperson (MANAGER or ADMIN only)
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check role
    const user = await firestore.users.findByEmail(session.user?.email ?? '');

    if (!user || !['MANAGER', 'ADMIN'].includes(user.role)) {
        return NextResponse.json(
            { error: 'Permission denied. Only MANAGER or ADMIN can delete salespersons.' },
            { status: 403 }
        );
    }

    try {
        // Check if has shipments
        const shipmentCount = await firestore.salespersons.countShipments(id);

        if (shipmentCount > 0) {
            // Soft delete by deactivating instead
            await firestore.salespersons.update(id, { active: false });
            return NextResponse.json({
                success: true,
                message: 'ปิดใช้งานเซลล์แล้ว (มีรายการขนส่งที่เกี่ยวข้อง)'
            });
        }

        await firestore.salespersons.delete(id);

        return NextResponse.json({ success: true, message: 'ลบข้อมูลเซลล์แล้ว' });
    } catch (error: any) {
        console.error('Error deleting salesperson:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
