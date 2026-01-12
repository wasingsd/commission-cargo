'use client';

import { useState, useEffect } from 'react';
import { Activity, ShieldAlert, TrendingUp, Package, Calendar, ChevronRight, ArrowUpRight, ArrowDownRight, FileBarChart, Clock } from 'lucide-react';
import { DashboardStats } from './DashboardStats';
import { RiskPanel } from './RiskPanel';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';

export function DashboardView() {
    const [stats, setStats] = useState<any>(null);
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, activityRes] = await Promise.all([
                    fetch('/api/dashboard/stats'),
                    fetch('/api/audit-logs?limit=5')
                ]);

                const statsJson = await statsRes.json();
                const activityJson = await activityRes.json();

                if (statsJson.success) setStats(statsJson.data);
                if (activityJson.success) setActivities(activityJson.data);
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Prepare chart data from stats.monthly
    const chartData = stats?.monthly?.slice(-6) || [];
    const maxVal = Math.max(...chartData.map((m: any) => m.diff + m.onePct), 100);

    return (
        <div className="space-y-10 animate-premium">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">สรุปภาพรวม <span className="text-slate-400">การดำเนินงาน</span></h1>
                    <p className="text-sm text-slate-400 mt-1">ยินดีต้อนรับกลับสู่ระบบจัดการ PR Cargo</p>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                        <Calendar className="w-4 h-4" />
                        ตัวกรองวันที่
                    </button>
                    <button className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-95">
                        <FileBarChart className="w-4 h-4" />
                        ส่งออกรายงาน
                    </button>
                </div>
            </div>

            {/* Top Row: Mission Critical Stats */}
            <DashboardStats data={stats?.summary} mix={stats?.mix} loading={loading} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Insight Chart Area */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-premium overflow-hidden group">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="text-lg font-bold text-slate-900">แนวโน้มผลกำไร (6 เดือนย้อนหลัง)</h3>
                                    <p className="text-xs text-slate-400">ข้อมูลเปรียบเทียบระหว่างต้นทุนและราคาขาย</p>
                                </div>
                            </div>
                            <button className="text-xs font-bold text-blue-600 hover:text-blue-700 underline underline-offset-4">
                                ดูข้อมูลเชิงลึก
                            </button>
                        </div>

                        {/* Chart Area */}
                        <div className="relative h-64 w-full flex items-end justify-between px-2 pt-4">
                            {chartData.length > 0 ? (
                                chartData.map((m: any, i: number) => {
                                    const total = m.diff + m.onePct;
                                    const height = (total / maxVal) * 100;
                                    return (
                                        <div key={i} className="relative flex flex-col items-center group/bar w-[12%]">
                                            <div className="absolute -top-8 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity mb-2">
                                                ฿{(total / 1000).toFixed(1)}k
                                            </div>
                                            <div
                                                className="w-full bg-blue-500/10 group-hover/bar:bg-blue-600/20 rounded-t-xl transition-all duration-700"
                                                style={{ height: `${height}%` }}
                                            >
                                                <div
                                                    className="w-full bg-blue-500 rounded-t-xl absolute bottom-0 transition-all duration-1000 delay-100 group-hover/bar:bg-blue-600"
                                                    style={{ height: `85%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-semibold text-slate-400 mt-4 uppercase text-center">
                                                {m.month.split('-')[1]}/{m.month.split('-')[0].slice(2)}
                                            </span>
                                        </div>
                                    );
                                })
                            ) : (
                                [1, 2, 3, 4, 5, 6].map((_, i) => (
                                    <div key={i} className="relative flex flex-col items-center group/bar w-[12%] h-full">
                                        <div className="w-full bg-slate-50 rounded-t-xl h-[40%]" />
                                        <div className="w-8 h-2 bg-slate-50 mt-4 rounded" />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Active Operations Card */}
                        <div className="bg-blue-600 rounded-[2rem] p-8 text-white shadow-xl shadow-blue-600/20 relative overflow-hidden group">
                            <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-white/20 transition-all" />
                            <div className="relative z-10">
                                <Activity className="w-8 h-8 mb-6 text-blue-200" />
                                <h3 className="text-xl font-bold mb-2">ข้อมูลเรียลไทม์</h3>
                                <p className="text-blue-100 text-sm leading-relaxed mb-6 opacity-80">ระบบกำลังประมวลผลการคำนวณต้นทุน และตรวจสอบความเสี่ยงแบบวินาทีต่อวินาที</p>
                                <div className="flex items-center gap-2 text-xs font-bold text-white bg-white/20 w-fit px-4 py-2 rounded-full backdrop-blur-md">
                                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                                    เชื่อมต่อฐานข้อมูลแล้ว
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity Card */}
                        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-premium">
                            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-slate-400" />
                                กิจกรรมล่าสุด
                            </h3>
                            <div className="space-y-6">
                                {loading ? (
                                    [1, 2, 3].map(i => (
                                        <div key={i} className="flex items-center gap-4 animate-pulse">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100" />
                                            <div className="flex-1 space-y-2">
                                                <div className="h-3 bg-slate-100 rounded w-1/2" />
                                                <div className="h-2 bg-slate-100 rounded w-1/3" />
                                            </div>
                                        </div>
                                    ))
                                ) : activities.length > 0 ? (
                                    activities.map((log) => (
                                        <div key={log.id} className="flex items-start gap-4 group/activity">
                                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 group-hover/activity:bg-blue-50 group-hover/activity:border-blue-100 group-hover/activity:text-blue-500 transition-colors">
                                                <Package className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-900 truncate">
                                                    {log.action} {log.entityType}
                                                </p>
                                                <p className="text-[11px] text-slate-400 font-medium">
                                                    เมื่อ {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: th })} • โดย {log.actorUser?.name || 'System'}
                                                </p>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover/activity:translate-x-1 transition-transform" />
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-slate-400 text-center py-4">ไม่พบกิจกรรมล่าสุด</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Risk & Compliance */}
                <div className="space-y-8">
                    <RiskPanel risks={stats?.risks || []} loading={loading} />

                    {/* Insights Card */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-accent-500/20 blur-[50px] rounded-full group-hover:bg-accent-500/30 transition-all" />
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 border border-white/10">
                                <ShieldAlert className="w-6 h-6 text-accent-500" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">วิเคราะห์ความเสี่ยง</h3>
                            <p className="text-slate-400 text-sm leading-relaxed mb-6">ระบบตรวจพบจุดเสี่ยงในกระบวนการตั้งเรทราคาที่อาจส่งผลต่อกำไรสุทธิ</p>
                            <button className="w-full py-4 bg-accent-500 hover:bg-accent-600 rounded-2xl text-xs font-bold transition-all transform active:scale-95 shadow-lg shadow-accent-500/20">
                                จัดการปัญหาทั้งหมด
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
