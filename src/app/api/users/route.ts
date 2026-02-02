import { NextResponse } from 'next/server';
import { firestore } from '@/lib/firestore';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role } from '@/lib/enums';
import bcrypt from 'bcryptjs';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.ADMIN) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const users = await firestore.users.findAll();
        // Remove password from response
        const safeUsers = users.map(({ password, ...user }: any) => user);
        return NextResponse.json({ success: true, data: safeUsers });
    } catch (error: any) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.ADMIN) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { email, name, role, password } = body;

        // Simple validation
        if (!email || !role) {
            return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
        }

        const existingUser = await firestore.users.findByEmail(email);
        if (existingUser) {
            return NextResponse.json({ error: 'User already exists' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password || 'password123', 10);

        const newUser = await firestore.users.create({
            email,
            name,
            role,
            password: hashedPassword,
        });

        // Audit Log
        await firestore.auditLogs.create({
            actorUserId: session.user.id,
            entityType: 'USER',
            entityId: newUser.id,
            action: 'CREATE',
            message: `Created user: ${email} with role ${role}`
        });

        const { password: _, ...safeUser } = newUser as any;
        return NextResponse.json({ success: true, data: safeUser });
    } catch (error: any) {
        console.error('Error creating user:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
