import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET all salespersons
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const salespersons = await prisma.salesperson.findMany({
            include: {
                _count: {
                    select: {
                        customers: true,
                        shipments: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ success: true, data: salespersons });
    } catch (error: any) {
        console.error('Error fetching salespersons:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST create new salesperson (MANAGER or ADMIN only)
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check role - only MANAGER or ADMIN can create salespersons
    const user = await prisma.user.findUnique({
        where: { email: session.user?.email ?? '' }
    });

    if (!user || !['MANAGER', 'ADMIN'].includes(user.role)) {
        return NextResponse.json(
            { error: 'Permission denied. Only MANAGER or ADMIN can add salespersons.' },
            { status: 403 }
        );
    }

    try {
        const body = await req.json();
        const { code, name, phone, email } = body;

        if (!code || !name) {
            return NextResponse.json(
                { error: 'รหัสเซลล์และชื่อเป็นข้อมูลที่จำเป็น' },
                { status: 400 }
            );
        }

        // Check if code already exists
        const existing = await prisma.salesperson.findUnique({
            where: { code }
        });

        if (existing) {
            return NextResponse.json(
                { error: 'รหัสเซลล์นี้มีอยู่ในระบบแล้ว' },
                { status: 400 }
            );
        }

        const salesperson = await prisma.salesperson.create({
            data: {
                code,
                name,
                phone: phone || null,
                email: email || null,
                active: true
            }
        });

        return NextResponse.json({ success: true, data: salesperson });
    } catch (error: any) {
        console.error('Error creating salesperson:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
