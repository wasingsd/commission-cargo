import { MainLayout } from '@/components/MainLayout';
import { AuditLogList } from '@/components/logs/AuditLogList';

export default function LogsPage() {
    return (
        <MainLayout>
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-800">System Logs</h1>
                <p className="text-slate-500 mt-1">Audit trail of system activities and data changes.</p>
            </div>

            <AuditLogList />
        </MainLayout>
    );
}
