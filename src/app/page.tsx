import { MainLayout } from '@/components/MainLayout';
import { DashboardView } from '@/components/dashboard/DashboardView';

export default function DashboardPage() {
  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 mt-1">Overview of commission performance and risks.</p>
      </div>

      <DashboardView />
    </MainLayout>
  );
}
