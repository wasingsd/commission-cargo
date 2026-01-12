import { AlertTriangle, ChevronRight, Info, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/calc';

interface RiskItem {
    id: string;
    tracking: string;
    customer: string;
    type: string;
    detail: string;
}

interface RiskPanelProps {
    risks: RiskItem[];
    loading: boolean;
}

export function RiskPanel({ risks, loading }: RiskPanelProps) {
    if (loading) return <div className="h-full min-h-[500px] bg-slate-50 rounded-[2rem] animate-pulse" />;

    return (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-premium overflow-hidden flex flex-col h-full group hover:border-red-500/10 transition-colors duration-500">
            {/* Header */}
            <div className="p-8 border-b border-slate-50 bg-gradient-to-br from-white to-slate-50/50">
                <div className="flex justify-between items-center mb-1">
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                        </div>
                        ตรวจสอบข้อมูล
                    </h3>
                    <div className="px-3 py-1 bg-red-50 text-red-600 text-[11px] font-bold rounded-full border border-red-100">
                        ตรวจพบรายการผิดปกติ
                    </div>
                </div>
                <p className="text-sm font-semibold text-slate-400 mt-4">รายการที่ควรตรวจสอบทันที ({risks.length})</p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                {risks.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                        <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center text-3xl">
                            🛡️
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-800 tracking-tight">ระบบทำงานปกติ</p>
                            <p className="text-xs font-semibold text-slate-400 mt-1 leading-relaxed px-4">ข้อมูลการขนส่งทั้งหมดเป็นไปตามมาตรฐานกำไรและข้อกำหนด</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {risks.map((item, idx) => (
                            <div key={idx} className="group/item p-4 rounded-2xl bg-slate-50/50 border border-transparent hover:border-red-200 hover:bg-white hover:shadow-xl hover:shadow-red-500/5 transition-all duration-300 cursor-pointer">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-slate-400 mb-1">หมายเลขพัสดุ</span>
                                        <span className="text-xs font-bold text-slate-800 tracking-wider group-hover/item:text-red-600 transition-colors">
                                            {item.tracking}
                                        </span>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${item.type === 'LOSS' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                                        }`}>
                                        {item.type === 'LOSS' ? 'ขาดทุน' : item.type}
                                    </span>
                                </div>
                                <div className="flex justify-between items-end mt-4">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-slate-400">ลูกค้า</span>
                                        <span className="text-xs font-bold text-slate-700">{item.customer || 'ไม่ระบุ'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50/50 px-2 py-1 rounded-lg">
                                        <AlertCircle className="w-3 h-3" />
                                        {item.detail === 'Operating Loss' ? 'ขาดทุนจากการดำเนินงาน' : item.detail}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50/50 border-t border-slate-100">
                <button className="w-full py-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 hover:border-slate-300 hover:shadow-lg transition-all flex items-center justify-center gap-2">
                    จัดการปัญหาทั้งหมด
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
