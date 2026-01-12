import { formatCurrency, formatNumber } from '@/lib/calc';
import { Wallet, TrendingUp, Package, Percent, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatsProps {
    data: {
        totalComm: number;
        totalSales: number;
        totalCost: number;
        count: number;
    } | null;
    mix?: {
        diff: number;
        onePct: number;
    } | null;
    loading: boolean;
}

export function DashboardStats({ data, loading, mix }: StatsProps) {
    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-32 bg-slate-100 rounded-3xl animate-pulse"></div>
                ))}
            </div>
        );
    }

    if (!data) return null;

    const profit = data.totalSales - data.totalCost;
    const margin = data.totalSales > 0 ? (profit / data.totalSales) * 100 : 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
            {/* Total Commission - Primary Action Card */}
            <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl shadow-slate-900/20 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover:bg-accent-500/10 transition-colors" />

                <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10 group-hover:bg-accent-500 group-hover:border-accent-500 transition-all duration-500">
                        <Wallet className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-[11px] font-bold text-accent-500 bg-accent-500/10 px-3 py-1 rounded-full">รายรับสุทธิ</span>
                </div>

                <div className="flex flex-col">
                    <span className="text-3xl font-bold tracking-tight mb-1">{formatCurrency(data.totalComm)}</span>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-slate-500">ค่าคอมมิชชั่นรวม</span>
                        {mix && (
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                                <span>(D: {formatNumber(mix.diff)})</span>
                                <span>(1%: {formatNumber(mix.onePct)})</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Total Profit */}
            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-premium relative overflow-hidden group hover:border-accent-500/20 transition-all duration-300">
                <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center group-hover:bg-green-100 transition-colors">
                        <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex items-center gap-1 text-green-600 font-bold text-xs bg-green-50 px-2.5 py-1 rounded-full">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        {formatNumber(margin)}%
                    </div>
                </div>

                <div className="flex flex-col">
                    <span className="text-3xl font-bold text-slate-900 tracking-tight mb-1">{formatCurrency(profit)}</span>
                    <span className="text-xs font-semibold text-slate-400">กำไรจากการดำเนินงาน</span>
                </div>
            </div>

            {/* Total Sales */}
            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-premium relative overflow-hidden group hover:border-accent-500/20 transition-all duration-300">
                <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <Percent className="w-6 h-6 text-blue-600" />
                    </div>
                </div>

                <div className="flex flex-col">
                    <span className="text-3xl font-bold text-slate-900 tracking-tight mb-1">{formatCurrency(data.totalSales)}</span>
                    <span className="text-xs font-semibold text-slate-400">ยอดขายรวม</span>
                </div>
            </div>

            {/* Total Shipments */}
            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-premium relative overflow-hidden group hover:border-accent-500/20 transition-all duration-300">
                <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                        <Package className="w-6 h-6 text-purple-600" />
                    </div>
                </div>

                <div className="flex flex-col">
                    <span className="text-3xl font-bold text-slate-900 tracking-tight mb-1">{formatNumber(data.count)}</span>
                    <span className="text-xs font-semibold text-slate-400">ปริมาณขนส่งรวม (กล่อง)</span>
                </div>
            </div>
        </div>
    );
}
