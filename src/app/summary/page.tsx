'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import {
    FileText,
    Download,
    TrendingUp,
    ArrowUpRight,
    Users,
    Briefcase,
    PieChart,
    Calendar,
    ArrowDownRight,
    Loader2
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    PieChart as RechartsPieChart,
    Pie,
    Cell
} from 'recharts';

interface DashboardData {
    metrics: {
        totalRevenue: number;
        totalCost: number;
        totalProfit: number;
        totalCommission: number;
        shipmentCount: number;
    };
    monthlyTrend: Array<{
        name: string;
        revenue: number;
        cost: number;
        profit: number;
        commission: number;
    }>;
    salesShare: Array<{
        name: string;
        value: number;
        revenue: number;
        commission: number;
    }>;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function SummaryPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/reports/summary?groupBy=dashboard');
                const json = await res.json();
                if (json.success) {
                    setData(json.data);
                }
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('th-TH', {
            style: 'currency',
            currency: 'THB',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(val);
    };

    if (loading) {
        return (
            <MainLayout>
                <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-12 h-12 text-slate-200 animate-spin" />
                    <p className="text-slate-400 font-bold text-sm">กำลังคำนวณสรุปผลประกอบการ...</p>
                </div>
            </MainLayout>
        );
    }

    const { metrics, monthlyTrend, salesShare } = data || {
        metrics: { totalRevenue: 0, totalCost: 0, totalProfit: 0, totalCommission: 0, shipmentCount: 0 },
        monthlyTrend: [],
        salesShare: []
    };

    return (
        <MainLayout>
            <div className="space-y-10 animate-premium">
                {/* Header Area */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                            <span className="text-xs font-semibold text-slate-400">ตัวชี้วัดความสำเร็จ</span>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">รายงาน <span className="text-slate-400">สรุปผลประกอบการ</span></h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="bg-white border border-slate-200 rounded-xl p-1.5 flex items-center gap-2 shadow-sm">
                            <div className="pl-3 text-[11px] font-bold text-slate-400 border-r border-slate-200 pr-3">เลือกช่วงเวลา</div>
                            <select className="bg-transparent border-none py-2 px-4 text-xs font-bold text-slate-600 focus:ring-0 cursor-pointer outline-none">
                                <option>ทั้งหมด</option>
                                <option>ปี 2026</option>
                                <option>ปี 2025</option>
                            </select>
                        </div>
                        <button className="flex items-center gap-2 px-8 py-3.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 active:scale-95 group">
                            <Download className="w-4 h-4" />
                            ดาวน์โหลด PDF
                        </button>
                    </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-8 rounded-[2rem] shadow-premium border border-slate-100 group">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold">
                                {metrics.shipmentCount} รายการ
                            </div>
                        </div>
                        <div className="text-[11px] font-bold text-slate-400 mb-1">รายได้รวมทั้งหมด</div>
                        <div className="text-2xl font-bold text-slate-900 tracking-tight">{formatCurrency(metrics.totalRevenue)}</div>
                    </div>

                    <div className="bg-white p-8 rounded-[2rem] shadow-premium border border-slate-100 group">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 group-hover:bg-red-600 group-hover:text-white transition-all duration-300">
                                <Briefcase className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="text-[11px] font-bold text-slate-400 mb-1">ต้นทุนขนส่งรวม</div>
                        <div className="text-2xl font-bold text-red-600 tracking-tight">{formatCurrency(metrics.totalCost)}</div>
                    </div>

                    <div className="bg-white p-8 rounded-[2rem] shadow-premium border border-slate-100 group">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-all duration-300">
                                <ArrowUpRight className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="text-[11px] font-bold text-slate-400 mb-1">กำไรขั้นต้น (GP)</div>
                        <div className="text-2xl font-bold text-green-600 tracking-tight">{formatCurrency(metrics.totalProfit)}</div>
                    </div>

                    <div className="bg-white p-8 rounded-[2rem] shadow-premium border border-slate-100 group">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-all duration-300">
                                <Users className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="text-[11px] font-bold text-slate-400 mb-1">ค่าคอมมิชชั่นสะสม</div>
                        <div className="text-2xl font-bold text-orange-600 tracking-tight">{formatCurrency(metrics.totalCommission)}</div>
                    </div>
                </div>

                {/* Detailed Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white p-10 rounded-[2.5rem] shadow-premium border border-slate-100">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                                <PieChart className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 tracking-tight">สัดส่วนตามรายบุคคล</h3>
                                <p className="text-xs font-semibold text-slate-400 mt-1">ยอดขายแยกตามฝ่ายขาย (Revenue Share)</p>
                            </div>
                        </div>

                        <div className="h-80 w-full">
                            {salesShare.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <RechartsPieChart>
                                        <Pie
                                            data={salesShare}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="value"
                                            label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                        >
                                            {salesShare.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value: any) => formatCurrency(Number(value || 0))}
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}
                                        />
                                    </RechartsPieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/50">
                                    <PieChart className="w-12 h-12 mb-4 opacity-20" />
                                    <p className="text-xs font-semibold">ไม่มีข้อมูลพนักงานขาย</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white p-10 rounded-[2.5rem] shadow-premium border border-slate-100">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 tracking-tight">แนวโน้มรายได้และกำไร</h3>
                                <p className="text-xs font-semibold text-slate-400 mt-1">เปรียบเทียบ Revenue vs Profit รายเดือน</p>
                            </div>
                        </div>

                        <div className="h-80 w-full">
                            {monthlyTrend.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={monthlyTrend}>
                                        <defs>
                                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
                                            tickFormatter={(val) => `${val / 1000}k`}
                                        />
                                        <Tooltip
                                            formatter={(value: any) => formatCurrency(Number(value || 0))}
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', fontSize: '12px' }}
                                        />
                                        <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                                        <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/50">
                                    <TrendingUp className="w-12 h-12 mb-4 opacity-20" />
                                    <p className="text-xs font-semibold">รอข้อมูลเพิ่มเติมสำหรับแสดงแนวโน้ม</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Performance Table / Rankings */}
                <div className="bg-white p-10 rounded-[2.5rem] shadow-premium border border-slate-100">
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 tracking-tight">อันดับผลงานรายบุคคล</h3>
                                <p className="text-xs font-semibold text-slate-400 mt-1">วิเคราะห์ประสิทธิภาพพนักงานขาย</p>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-50">
                                    <th className="pb-5 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">พนักงานขาย</th>
                                    <th className="pb-5 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">ยอดขายรวม</th>
                                    <th className="pb-5 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">ค่าคอมมิชชั่น</th>
                                    <th className="pb-5 px-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">สัดส่วน</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {salesShare.map((sale, idx) => (
                                    <tr key={sale.name} className="group hover:bg-slate-50/50 transition-all">
                                        <td className="py-5 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600'}`}>
                                                    {idx + 1}
                                                </div>
                                                <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{sale.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-5 px-4 text-right font-bold text-slate-900">{formatCurrency(sale.revenue)}</td>
                                        <td className="py-5 px-4 text-right font-bold text-orange-600">{formatCurrency(sale.commission)}</td>
                                        <td className="py-5 px-4 text-right">
                                            <div className="flex flex-col items-end gap-1.5">
                                                <span className="text-[10px] font-bold text-slate-400 tracking-tight">{((sale.revenue / metrics.totalRevenue) * 100).toFixed(1)}%</span>
                                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {salesShare.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="py-20 text-center text-slate-400 font-bold text-sm">ไม่พบข้อมูลผลประกอบการของพนักงานขาย</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
