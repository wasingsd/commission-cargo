import { MainLayout } from '@/components/MainLayout';

export default function ShipmentsPage() {
    return (
        <MainLayout>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800">Shipments</h1>
                <div className="flex gap-2">
                    <button className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition">
                        Import CSV
                    </button>
                    <button className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition">
                        Export
                    </button>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                        + New Shipment
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6 flex gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Month</label>
                    <input type="month" className="border border-slate-300 rounded-lg px-3 py-2" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Customer</label>
                    <input type="text" placeholder="Search customer..." className="border border-slate-300 rounded-lg px-3 py-2" />
                </div>
                <button className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 transition mb-[1px]">
                    Filter
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-slate-700">Date In</th>
                            <th className="px-6 py-4 font-semibold text-slate-700">Tracking No</th>
                            <th className="px-6 py-4 font-semibold text-slate-700">Customer</th>
                            <th className="px-6 py-4 font-semibold text-slate-700">Product</th>
                            <th className="px-6 py-4 font-semibold text-slate-700">Weight/CBM</th>
                            <th className="px-6 py-4 font-semibold text-slate-700">Cost</th>
                            <th className="px-6 py-4 font-semibold text-slate-700">Sell</th>
                            <th className="px-6 py-4 font-semibold text-slate-700">Commission</th>
                            <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        <tr className="hover:bg-slate-50 transition">
                            <td className="px-6 py-4">2024-01-15</td>
                            <td className="px-6 py-4 font-mono">7100123-1</td>
                            <td className="px-6 py-4">PR-014</td>
                            <td className="px-6 py-4">GENERAL</td>
                            <td className="px-6 py-4">100kg / 0.5cbm</td>
                            <td className="px-6 py-4">฿5,000</td>
                            <td className="px-6 py-4">฿6,500</td>
                            <td className="px-6 py-4 text-green-600 font-semibold">+฿1,500</td>
                            <td className="px-6 py-4">
                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-semibold">PENDING</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </MainLayout>
    );
}
