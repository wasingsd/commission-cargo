import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { firestore } from './firestore';
import { AuditAction } from './enums';

export async function logActivity({
    action,
    entityType,
    entityId,
    message,
    beforeJson,
    afterJson
}: {
    action: AuditAction;
    entityType: string;
    entityId: string;
    message?: string;
    beforeJson?: any;
    afterJson?: any;
}) {
    try {
        const session = await getServerSession(authOptions);
        const actorUserId = session?.user?.id;

        await firestore.auditLogs.create({
            actorUserId,
            action,
            entityType,
            entityId,
            message,
            beforeJson,
            afterJson,
        });
    } catch (error) {
        console.error('Failed to log activity:', error);
        // We don't want to throw error here to avoid breaking the main process
    }
}
