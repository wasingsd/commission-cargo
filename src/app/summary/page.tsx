import { MainLayout } from '@/components/MainLayout';

export default function SummaryPage() {
    return (
        <MainLayout>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800">Summary Report</h1>
                <div className="flex gap-2">
                    <select className="border border-slate-300 rounded-lg px-3 py-2 bg-white">
                        <option>Select Month...</option>
                    </select>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                        Download PDF
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Summary Stats */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <div className="text-sm text-slate-500 uppercase font-medium">Total Revenue</div>
                    <div className="text-2xl font-bold mt-2">฿0.00</div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <div className="text-sm text-slate-500 uppercase font-medium">Total Cost</div>
                    <div className="text-2xl font-bold mt-2 text-red-600">฿0.00</div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <div className="text-sm text-slate-500 uppercase font-medium">Gross Profit</div>
                    <div className="text-2xl font-bold mt-2 text-green-600">฿0.00</div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <div className="text-sm text-slate-500 uppercase font-medium">Commission Paid</div>
                    <div className="text-2xl font-bold mt-2 text-orange-600">฿0.00</div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="font-bold mb-4">Breakdown by Salesperson</h3>
                <div className="h-64 flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-lg">
                    Chart Placeholder
                </div>
            </div>

        </MainLayout>
    );
}
