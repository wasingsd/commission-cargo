import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

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
        const salesperson = await prisma.salesperson.findUnique({
            where: { id },
            include: {
                customers: {
                    orderBy: { code: 'asc' }
                },
                _count: {
                    select: {
                        shipments: true
                    }
                }
            }
        });

        if (!salesperson) {
            return NextResponse.json({ error: 'ไม่พบข้อมูลเซลล์' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: salesperson });
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
    const user = await prisma.user.findUnique({
        where: { email: session.user?.email ?? '' }
    });

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
            const existing = await prisma.salesperson.findFirst({
                where: {
                    code,
                    NOT: { id }
                }
            });

            if (existing) {
                return NextResponse.json(
                    { error: 'รหัสเซลล์นี้มีอยู่ในระบบแล้ว' },
                    { status: 400 }
                );
            }
        }

        const salesperson = await prisma.salesperson.update({
            where: { id },
            data: {
                ...(code && { code }),
                ...(name && { name }),
                ...(phone !== undefined && { phone: phone || null }),
                ...(email !== undefined && { email: email || null }),
                ...(active !== undefined && { active })
            }
        });

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
    const user = await prisma.user.findUnique({
        where: { email: session.user?.email ?? '' }
    });

    if (!user || !['MANAGER', 'ADMIN'].includes(user.role)) {
        return NextResponse.json(
            { error: 'Permission denied. Only MANAGER or ADMIN can delete salespersons.' },
            { status: 403 }
        );
    }

    try {
        // Check if has shipments
        const shipmentCount = await prisma.shipment.count({
            where: { salespersonId: id }
        });

        if (shipmentCount > 0) {
            // Soft delete by deactivating instead
            await prisma.salesperson.update({
                where: { id },
                data: { active: false }
            });
            return NextResponse.json({
                success: true,
                message: 'ปิดใช้งานเซลล์แล้ว (มีรายการขนส่งที่เกี่ยวข้อง)'
            });
        }

        await prisma.salesperson.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: 'ลบข้อมูลเซลล์แล้ว' });
    } catch (error: any) {
        console.error('Error deleting salesperson:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
