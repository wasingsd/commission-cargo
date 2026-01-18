import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// POST assign customer to salesperson
export async function POST(
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
            { error: 'Permission denied. Only MANAGER or ADMIN can assign customers.' },
            { status: 403 }
        );
    }

    try {
        const body = await req.json();
        const { customerCode, customerId } = body;

        // Either find by code or use provided id
        let customer;
        if (customerId) {
            customer = await prisma.customer.findUnique({
                where: { id: customerId }
            });
        } else if (customerCode) {
            customer = await prisma.customer.findUnique({
                where: { code: customerCode }
            });

            // Create customer if not exists
            if (!customer) {
                customer = await prisma.customer.create({
                    data: {
                        code: customerCode,
                        assignedSalespersonId: id
                    }
                });
                return NextResponse.json({
                    success: true,
                    data: customer,
                    message: 'สร้างลูกค้าและมอบหมายให้เซลล์แล้ว'
                });
            }
        } else {
            return NextResponse.json(
                { error: 'ระบุ customerCode หรือ customerId' },
                { status: 400 }
            );
        }

        if (!customer) {
            return NextResponse.json({ error: 'ไม่พบข้อมูลลูกค้า' }, { status: 404 });
        }

        // Update customer assignment
        const updated = await prisma.customer.update({
            where: { id: customer.id },
            data: { assignedSalespersonId: id }
        });

        return NextResponse.json({
            success: true,
            data: updated,
            message: 'มอบหมายลูกค้าให้เซลล์แล้ว'
        });
    } catch (error: any) {
        console.error('Error assigning customer:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE remove customer from salesperson
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
            { error: 'Permission denied. Only MANAGER or ADMIN can remove customers.' },
            { status: 403 }
        );
    }

    try {
        const { searchParams } = new URL(req.url);
        const customerId = searchParams.get('customerId');

        if (!customerId) {
            return NextResponse.json(
                { error: 'ระบุ customerId' },
                { status: 400 }
            );
        }

        // Check if customer belongs to this salesperson
        const customer = await prisma.customer.findFirst({
            where: {
                id: customerId,
                assignedSalespersonId: id
            }
        });

        if (!customer) {
            return NextResponse.json(
                { error: 'ลูกค้านี้ไม่ได้อยู่ในความดูแลของเซลล์นี้' },
                { status: 400 }
            );
        }

        // Remove assignment
        await prisma.customer.update({
            where: { id: customerId },
            data: { assignedSalespersonId: null }
        });

        return NextResponse.json({
            success: true,
            message: 'ยกเลิกการมอบหมายลูกค้าแล้ว'
        });
    } catch (error: any) {
        console.error('Error removing customer:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
