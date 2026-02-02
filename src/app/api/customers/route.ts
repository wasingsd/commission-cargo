import { NextResponse } from 'next/server';
import { firestore } from '@/lib/firestore';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const customers = await firestore.customers.findAll();

        // Populate salesperson info
        const populated = await Promise.all(
            customers.map(async (cust) => {
                if (cust.assignedSalespersonId) {
                    const sp = await firestore.salespersons.findById(cust.assignedSalespersonId);
                    return { ...cust, salesperson: sp };
                }
                return { ...cust, salesperson: null };
            })
        );

        return NextResponse.json({ success: true, data: populated });
    } catch (error: any) {
        console.error('Error fetching customers:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const { code, name, assignedSalespersonId } = body;

        if (!code) {
            return NextResponse.json({ error: 'Customer code is required' }, { status: 400 });
        }

        const existing = await firestore.customers.findByCode(code);
        if (existing) {
            return NextResponse.json({ error: 'Customer code already exists' }, { status: 400 });
        }

        const customer = await firestore.customers.create({
            code,
            name,
            assignedSalespersonId: assignedSalespersonId || null,
        });

        // Audit Log
        await firestore.auditLogs.create({
            actorUserId: session.user.id,
            entityType: 'CUSTOMER',
            entityId: customer.id,
            action: 'CREATE',
            message: `Created customer: ${code} - ${name || ''}`
        });

        return NextResponse.json({ success: true, data: customer });
    } catch (error: any) {
        console.error('Error creating customer:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
