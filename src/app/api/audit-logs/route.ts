/**
 * Commission Cargo - Audit Logs API
 * GET /api/audit-logs - List audit logs with filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firestore';
import { getDb, Collections } from '@/lib/firebase';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const entityType = searchParams.get('entityType');
        const action = searchParams.get('action');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');

        // Build query
        let query = getDb().collection(Collections.AUDIT_LOGS).orderBy('createdAt', 'desc');

        if (entityType) {
            query = query.where('entityType', '==', entityType);
        }

        if (action) {
            query = query.where('action', '==', action);
        }

        // Note: Firestore doesn't support complex date range queries with multiple where clauses easily
        // For simplicity, we'll filter in memory or use compound queries

        const snapshot = await query.limit(limit * page).get();

        // Filter by date if needed and apply pagination
        let logs: Array<{
            id: string;
            actorUserId?: string;
            entityType?: string;
            entityId?: string;
            action?: string;
            message?: string;
            beforeJson?: unknown;
            afterJson?: unknown;
            createdAt: Date | string;
        }> = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                actorUserId: data.actorUserId,
                entityType: data.entityType,
                entityId: data.entityId,
                action: data.action,
                message: data.message,
                beforeJson: data.beforeJson,
                afterJson: data.afterJson,
                createdAt: data.createdAt?.toDate?.() || data.createdAt,
            };
        });

        // Date filtering in memory
        if (startDate) {
            const start = new Date(startDate);
            logs = logs.filter(log => {
                const logDate = log.createdAt instanceof Date ? log.createdAt : new Date(log.createdAt);
                return logDate >= start;
            });
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setDate(end.getDate() + 1);
            logs = logs.filter(log => {
                const logDate = log.createdAt instanceof Date ? log.createdAt : new Date(log.createdAt);
                return logDate < end;
            });
        }

        // Apply pagination
        const total = logs.length;
        const startIndex = (page - 1) * limit;
        const paginatedLogs = logs.slice(startIndex, startIndex + limit);

        // Get actor user info
        const logsWithActors = await Promise.all(
            paginatedLogs.map(async (log) => {
                let actorUser = null;
                if (log.actorUserId) {
                    const user = await firestore.users.findById(log.actorUserId);
                    if (user) {
                        actorUser = {
                            id: user.id,
                            name: user.name,
                            email: user.email,
                        };
                    }
                }
                return { ...log, actorUser };
            })
        );

        return NextResponse.json({
            success: true,
            data: logsWithActors,
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
