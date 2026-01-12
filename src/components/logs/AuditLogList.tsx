'use client';

import { useState, useEffect } from 'react';
import {
    ClipboardList,
    Search,
    User,
    Calendar,
    ArrowUpRight,
    Tag,
    History,
    Search as SearchIcon,
    Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface AuditLog {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    details: any;
    user: {
        email: string;
    } | null;
    createdAt: string;
}

export function AuditLogList() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await fetch('/api/logs');
                const data = await res.json();
                if (data.success) {
                    setLogs(data.data);
                }
            } catch (error) {
                console.error('Failed to fetch logs:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, []);

    const filteredLogs = logs.filter(log =>
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entityType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user?.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getActionColor = (action: string) => {
        switch (action) {
            case 'CREATE': return 'bg-green-50 text-green-700 border-green-100';
            case 'UPDATE': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'DELETE': return 'bg-red-50 text-red-700 border-red-100';
            case 'ACTIVATE': return 'bg-purple-50 text-purple-700 border-purple-100';
            default: return 'bg-slate-50 text-slate-700 border-slate-100';
        }
    };

    const translateAction = (action: string) => {
        const trans: Record<string, string> = {
            'CREATE': 'สร้าง',
            'UPDATE': 'แก้ไข',
            'DELETE': 'ลบ',
            'ACTIVATE': 'เปิดใช้งาน',
            'LOGIN': 'เข้าสู่ระบบ'
        };
        return trans[action] || action;
    };

    const translateEntity = (entity: string) => {
        const trans: Record<string, string> = {
            'SHIPMENT': 'รายการขนส่ง',
            'RATE_CARD': 'เรทราคาทุน',
            'USER': 'ผู้ใช้งาน'
        };
        return trans[entity] || entity;
    };

    return (
        <div className="space-y-8 animate-premium">
            {/* Header Content */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">ประวัติการ <span className="text-slate-400">ใช้งานระบบ</span></h1>
                    <p className="text-sm text-slate-400 mt-1">ตรวจสอบกิจกรรมที่เกิดขึ้นในระบบทั้งหมดอย่างละเอียด</p>
                </div>
                <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-100">
                    <button className="px-5 py-2.5 bg-slate-100 text-slate-900 rounded-lg text-xs font-bold transition">ทั้งหมด</button>
                    <button className="px-5 py-2.5 text-slate-400 hover:text-slate-600 rounded-lg text-xs font-bold transition">วันนี้</button>
                    <button className="px-5 py-2.5 text-slate-400 hover:text-slate-600 rounded-lg text-xs font-bold transition">สัปดาห์นี้</button>
                </div>
            </div>

            {/* Filter Shelf */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="ค้นหาตามเหตุการณ์, ประเภทข้อมูล หรือ ผู้ใช้งาน..."
                        className="w-full bg-slate-50/50 border border-slate-100 rounded-xl py-3 pl-11 pr-4 text-sm focus:ring-0 focus:border-accent-500 transition-all outline-none font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all flex items-center gap-2 px-6">
                    <Filter className="w-4 h-4" />
                    <span className="text-xs font-bold">ตัวกรองเพิ่มเติม</span>
                </button>
            </div>

            {/* Logs Timeline */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-premium overflow-hidden">
                {loading ? (
                    <div className="py-24 flex flex-col items-center gap-4">
                        <div className="w-8 h-8 border-4 border-slate-100 border-t-accent-500 rounded-full animate-spin" />
                        <p className="text-xs font-bold text-slate-400">กำลังประมวลผลประวัติ...</p>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="py-32 flex flex-col items-center grayscale opacity-50">
                        <History className="w-16 h-16 text-slate-200 mb-4" />
                        <p className="text-sm font-bold text-slate-400">ไม่พบบันทึกที่ตรงกับการค้นหา</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {filteredLogs.map((log) => (
                            <div key={log.id} className="p-6 hover:bg-slate-50/50 transition-all group">
                                <div className="flex flex-col md:flex-row md:items-center gap-6">
                                    {/* Time and User */}
                                    <div className="w-44 shrink-0">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm', { locale: th })}
                                        </div>
                                        <div className="flex items-center gap-2 mt-2 text-sm font-bold text-slate-900 group-hover:text-accent-600 transition-colors">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-accent-50 transition-colors">
                                                <User className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="truncate">{log.user?.email || 'System'}</span>
                                        </div>
                                    </div>

                                    {/* Action Badge */}
                                    <div className="flex items-center gap-3">
                                        <div className={`px-4 py-1.5 rounded-full border text-[11px] font-bold shadow-sm ${getActionColor(log.action)}`}>
                                            {translateAction(log.action)}
                                        </div>
                                        <ArrowUpRight className="w-4 h-4 text-slate-200" />
                                        <div className="flex items-center gap-2 text-slate-900">
                                            <Tag className="w-4 h-4 text-slate-300" />
                                            <span className="text-sm font-bold tracking-tight">{translateEntity(log.entityType)}</span>
                                        </div>
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-slate-500 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100/50 group-hover:bg-white group-hover:border-slate-200 transition-all">
                                            {log.action === 'UPDATE' ? 'แก้ไขข้อมูลในรายการ' : 'ดำเนินการรายการใหม่'} เลขที่: <span className="text-slate-900 font-bold">{log.entityId}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer Section */}
                {!loading && filteredLogs.length > 0 && (
                    <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center">
                        <button className="text-xs font-bold text-slate-400 hover:text-slate-900 px-6 py-2 transition-all">
                            โหลดเพิ่มอีก 50 รายการ
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
