'use client';

import { MainLayout } from '@/components/MainLayout';
import { DashboardMetrics } from '@/components/dashboard/DashboardMetrics';

export default function Home() {
  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 mt-1">Overview of your commission status and shipment performance.</p>
      </div>

      <DashboardMetrics />

      {/* Future: Add Recent Activity / Chart components here */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-8 text-center text-slate-400">
          <p className="font-medium">Monthly Commission Trend</p>
          <p className="text-xs mt-1">Chart visualization coming soon</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-8 text-center text-slate-400">
          <p className="font-medium">Recent Activity</p>
          <p className="text-xs mt-1">Last 5 shipments</p>
        </div>
      </div>
    </MainLayout>
  );
}
