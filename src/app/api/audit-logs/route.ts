/**
 * Commission Cargo - Audit Logs API
 * GET /api/audit-logs - List audit logs with filters
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const entityType = searchParams.get('entityType');
        const action = searchParams.get('action');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');

        // Build where clause
        const where: Record<string, unknown> = {};

        if (entityType) where.entityType = entityType;
        if (action) where.action = action;

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                (where.createdAt as Record<string, Date>).gte = new Date(startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setDate(end.getDate() + 1);
                (where.createdAt as Record<string, Date>).lt = end;
            }
        }

        // Get total count
        const total = await prisma.auditLog.count({ where });

        // Get logs with pagination
        const logs = await prisma.auditLog.findMany({
            where,
            include: {
                actorUser: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            skip: (page - 1) * limit,
            take: limit,
        });

        return NextResponse.json({
            success: true,
            data: logs,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch audit logs' },
            { status: 500 }
        );
    }
}
