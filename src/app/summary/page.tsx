'use client';

import { MainLayout } from '@/components/MainLayout';
import {
    FileText,
    Download,
    TrendingUp,
    ArrowUpRight,
    Users,
    Briefcase,
    PieChart,
    Calendar
} from 'lucide-react';

export default function SummaryPage() {
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
                                <option>มกราคม 2026</option>
                                <option>ธันวาคม 2025</option>
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
                        </div>
                        <div className="text-[11px] font-bold text-slate-400 mb-1">รายได้รวมทั้งหมด</div>
                        <div className="text-2xl font-bold text-slate-900 tracking-tight">฿0.00</div>
                    </div>

                    <div className="bg-white p-8 rounded-[2rem] shadow-premium border border-slate-100 group">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 group-hover:bg-red-600 group-hover:text-white transition-all duration-300">
                                <Briefcase className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="text-[11px] font-bold text-slate-400 mb-1">ต้นทุนเชื้อเพลิง/ขนส่ง</div>
                        <div className="text-2xl font-bold text-red-600 tracking-tight">฿0.00</div>
                    </div>

                    <div className="bg-white p-8 rounded-[2rem] shadow-premium border border-slate-100 group">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-all duration-300">
                                <ArrowUpRight className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="text-[11px] font-bold text-slate-400 mb-1">กำไรขั้นต้น (GP)</div>
                        <div className="text-2xl font-bold text-green-600 tracking-tight">฿0.00</div>
                    </div>

                    <div className="bg-white p-8 rounded-[2rem] shadow-premium border border-slate-100 group">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-all duration-300">
                                <Users className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="text-[11px] font-bold text-slate-400 mb-1">ค่าคอมมิชชั่นสะสม</div>
                        <div className="text-2xl font-bold text-orange-600 tracking-tight">฿0.00</div>
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
                                <p className="text-xs font-semibold text-slate-400 mt-1">ยอดขายและค่าคอมมิชชั่นแยกตามฝ่ายขาย</p>
                            </div>
                        </div>

                        <div className="h-80 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/50">
                            <PieChart className="w-12 h-12 mb-4 opacity-20" />
                            <p className="text-xs font-semibold">กำลังประมวลผลกราฟวิเคราะห์...</p>
                        </div>
                    </div>

                    <div className="bg-white p-10 rounded-[2.5rem] shadow-premium border border-slate-100">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 tracking-tight">แนวโน้มย้อนหลัง</h3>
                                <p className="text-xs font-semibold text-slate-400 mt-1">เปรียบเทียบผลประกอบการรายไตรมาส</p>
                            </div>
                        </div>

                        <div className="h-80 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/50">
                            <TrendingUp className="w-12 h-12 mb-4 opacity-20" />
                            <p className="text-xs font-semibold">รอข้อมูลเพิ่มเติมสำหรับการเปรียบเทียบ</p>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
