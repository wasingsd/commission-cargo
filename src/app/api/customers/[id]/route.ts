import { NextResponse } from 'next/server';
import { firestore } from '@/lib/firestore';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { id } = await params;
        const body = await req.json();
        const { code, name, assignedSalespersonId } = body;

        if (!code) {
            return NextResponse.json({ error: 'Customer code is required' }, { status: 400 });
        }

        // Check if changing code and it already exists
        const existing = await firestore.customers.findByCode(code);
        if (existing && existing.id !== id) {
            return NextResponse.json({ error: 'Customer code already exists' }, { status: 400 });
        }

        const customer = await firestore.customers.update(id, {
            code,
            name: name || undefined,
            assignedSalespersonId: assignedSalespersonId || null as any,
        });

        // Audit Log
        const { logActivity } = await import('@/lib/audit');
        const { AuditAction } = await import('@/lib/enums');
        await logActivity({
            action: AuditAction.UPDATE,
            entityType: 'CUSTOMER',
            entityId: id,
            message: `แก้ไขข้อมูลลูกค้า: ${code} - ${name || ''}`,
            afterJson: customer as any
        });

        return NextResponse.json({ success: true, data: customer });
    } catch (error: any) {
        console.error('Error updating customer:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { id } = await params;

        await firestore.customers.delete(id);

        // Audit Log
        const { logActivity } = await import('@/lib/audit');
        const { AuditAction } = await import('@/lib/enums');
        await logActivity({
            action: AuditAction.DELETE,
            entityType: 'CUSTOMER',
            entityId: id,
            message: `ลบข้อมูลลูกค้าไอดี: ${id}`,
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting customer:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
