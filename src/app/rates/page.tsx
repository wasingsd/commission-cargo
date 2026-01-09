import { MainLayout } from '@/components/MainLayout';
import Link from 'next/link';

export default function RatesPage() {
    return (
        <MainLayout>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800">Rate Cards</h1>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                    + Create New Rate Card
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-slate-700">Name</th>
                            <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                            <th className="px-6 py-4 font-semibold text-slate-700">Effective Date</th>
                            <th className="px-6 py-4 font-semibold text-slate-700">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {/* Placeholder Row */}
                        <tr className="hover:bg-slate-50 transition">
                            <td className="px-6 py-4">Standard Rate 2024</td>
                            <td className="px-6 py-4">
                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">ACTIVE</span>
                            </td>
                            <td className="px-6 py-4">2024-01-01</td>
                            <td className="px-6 py-4">
                                <span className="text-blue-500 cursor-pointer hover:underline">Edit</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </MainLayout>
    );
}
