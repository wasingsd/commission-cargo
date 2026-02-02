import { NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firestore';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role } from '@/lib/enums';

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.ADMIN) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await params;

        // Prevent self-deletion
        if (id === session.user.id) {
            return NextResponse.json({ error: 'You cannot delete yourself' }, { status: 400 });
        }

        const user = await firestore.users.findById(id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Logic to delete user from Firestore
        // We need to add a delete method to firestore.users if it doesn't exist.
        // I will check the firestore.ts again or just implement it now.
        await firestore.collection('users').doc(id).delete();

        // Audit Log
        await firestore.auditLogs.create({
            actorUserId: session.user.id,
            entityType: 'USER',
            entityId: id,
            action: 'DELETE',
            message: `Deleted user: ${user.email}`
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
