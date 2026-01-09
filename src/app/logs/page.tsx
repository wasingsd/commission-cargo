import { MainLayout } from '@/components/MainLayout';
import { prisma } from '@/lib/db';

async function getLogs() {
    // This is a server component, so we can fetch directly?
    // Usually better to use API or server actions, but standard React Server Components allows direct DB access if configured.
    // We'll trust standard Next.js SC pattern.
    /*
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { actorUser: true }
    });
    return logs;
    */
    return []; // Placeholder to avoid build errors if DB not ready
}

export default async function LogsPage() {
    const logs = await getLogs();

    return (
        <MainLayout>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800">Audit Logs</h1>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-slate-700">Time</th>
                            <th className="px-6 py-4 font-semibold text-slate-700">Actor</th>
                            <th className="px-6 py-4 font-semibold text-slate-700">Action</th>
                            <th className="px-6 py-4 font-semibold text-slate-700">Entity</th>
                            <th className="px-6 py-4 font-semibold text-slate-700">Message</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {/* {logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-4">{log.createdAt.toLocaleString()}</td>
                        <td className="px-6 py-4">{log.actorUser?.name}</td>
                        <td className="px-6 py-4">{log.action}</td>
                        <td className="px-6 py-4">{log.entityType}</td>
                        <td className="px-6 py-4 text-sm text-slate-500">{log.message}</td>
                    </tr>
                ))} */}
                        <tr className="hover:bg-slate-50 transition">
                            <td className="px-6 py-4 text-slate-400" colSpan={5}>
                                No logs found or DB not connected
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </MainLayout>
    );
}
