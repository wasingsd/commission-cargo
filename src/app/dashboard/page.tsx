import { MainLayout } from '@/components/MainLayout';

export default function DashboardPage() {
    return (
        <MainLayout>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                    New Shipment
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-sm font-medium text-slate-500 uppercase">Total Shipments</h3>
                    <p className="text-3xl font-bold text-slate-900 mt-2">0</p>
                    <span className="text-green-500 text-sm mt-1 inline-block">+0% from last month</span>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-sm font-medium text-slate-500 uppercase">Pending Commission</h3>
                    <p className="text-3xl font-bold text-slate-900 mt-2">฿0.00</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-sm font-medium text-slate-500 uppercase">Alerts</h3>
                    <p className="text-3xl font-bold text-slate-900 mt-2">0</p>
                    <span className="text-red-500 text-sm mt-1 inline-block">Items need attention</span>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                <h2 className="text-lg font-bold mb-4">Recent Activity</h2>
                <div className="text-slate-500 text-center py-8">
                    No recent activity
                </div>
            </div>
        </MainLayout>
    );
}
