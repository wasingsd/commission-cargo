'use client';

import { useEffect, useState } from 'react';
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { AlertTriangle, TrendingUp, DollarSign, Package } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/calc';

const COLORS = ['#6D28D9', '#A78BFA']; // Purple theme as requested

export function DashboardView() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/dashboard/stats')
            .then(r => r.json())
            .then(data => {
                if (data.success) setStats(data.data);
            })
            .catch(e => console.error(e))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-10 text-center text-slate-400">Loading dashboard...</div>;
    if (!stats) return <div className="p-10 text-center text-slate-400">Failed to load data</div>;

    const pieData = [
        { name: 'DIFF', value: stats.mix.diff },
        { name: '1%', value: stats.mix.onePct }
    ].filter(d => d.value > 0);

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <div className="text-xs text-slate-500 font-medium uppercase mb-1">Total Commission</div>
                    <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats.summary.totalComm)}</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <div className="text-xs text-slate-500 font-medium uppercase mb-1">Total Sales</div>
                    <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats.summary.totalSales)}</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <div className="text-xs text-slate-500 font-medium uppercase mb-1">Total Cost</div>
                    <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats.summary.totalCost)}</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <div className="text-xs text-slate-500 font-medium uppercase mb-1">Shipments</div>
                    <div className="text-2xl font-bold text-slate-900">{stats.summary.count}</div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Pie Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-1">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Commission Mix</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    dataKey="value"
                                    nameKey="name"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={5}
                                >
                                    {pieData.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Bar Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Monthly Performance</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.monthly}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                                <Legend />
                                <Bar dataKey="diff" name="DIFF" stackId="a" fill={COLORS[0]} radius={[0, 0, 4, 4]} />
                                <Bar dataKey="onePct" name="1%" stackId="a" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Risk Panel */}
            {stats.risks.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
                    <div className="p-4 bg-red-50 border-b border-red-100 flex items-center gap-2 text-red-700 font-bold">
                        <AlertTriangle className="w-5 h-5" />
                        Risk Alerts ({stats.risks.length})
                    </div>
                    <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                        {stats.risks.map((risk: any) => (
                            <div key={risk.id} className="p-3 text-sm flex justify-between items-center hover:bg-slate-50">
                                <div>
                                    <span className="font-mono font-bold text-slate-800 mr-2">{risk.tracking}</span>
                                    <span className="text-slate-500">{risk.customer}</span>
                                </div>
                                <div className="text-red-600 font-medium">
                                    {risk.detail}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
