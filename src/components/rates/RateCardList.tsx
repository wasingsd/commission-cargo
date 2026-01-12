'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Settings2,
    Plus,
    Calendar,
    CheckCircle2,
    AlertCircle,
    Copy,
    Edit,
    Loader2,
    ChevronRight,
    TrendingUp,
    Box
} from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface RateCard {
    id: string;
    name: string;
    status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
    effectiveFrom: string | null;
    effectiveTo: string | null;
    createdAt: string;
    _count?: {
        rows: number;
    }
}

export function RateCardList() {
    const router = useRouter();
    const [rateCards, setRateCards] = useState<RateCard[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRateCards();
    }, []);

    const fetchRateCards = async () => {
        try {
            const res = await fetch('/api/rate-cards');
            const data = await res.json();
            if (data.success) {
                setRateCards(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch rate cards:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        try {
            const res = await fetch('/api/rate-cards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: `เรทมาตรฐาน - ${format(new Date(), 'MMM yyyy', { locale: th })}`,
                })
            });
            const json = await res.json();
            if (json.success) {
                router.push(`/rates/${json.data.id}`);
            }
        } catch (error) {
            alert('ไม่สามารถสร้างร่างเรทใหม่ได้');
        }
    };

    return (
        <div className="space-y-10 animate-premium">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span className="text-xs font-medium text-slate-400">ศูนย์รวมตรรกะราคา</span>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900">การจัดการ <span className="text-slate-400">เรทราคาทุน</span></h1>
                </div>

                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-6 py-3.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-95 group"
                >
                    <Plus className="w-4 h-4" />
                    เพิ่มเรทราคาทุนใหม่
                </button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 bg-white rounded-3xl border border-slate-100 animate-pulse shadow-sm" />
                    ))}
                </div>
            ) : rateCards.length === 0 ? (
                <div className="py-32 flex flex-col items-center text-center glass-card border-dashed">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                        <Settings2 className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">ไม่พบข้อมูลเรท</h3>
                    <p className="text-sm text-slate-400 mt-1">ยังไม่มีรายการเรทราคาทุนบันทึกในระบบ</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {rateCards.map((card) => (
                        <div
                            key={card.id}
                            onClick={() => router.push(`/rates/${card.id}`)}
                            className="group relative bg-white rounded-3xl border border-slate-100 p-8 shadow-premium hover:border-accent-500/30 transition-all duration-300 cursor-pointer overflow-hidden"
                        >
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-6">
                                    <div className={`p-2.5 rounded-xl ${card.status === 'ACTIVE' ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400'
                                        }`}>
                                        <TrendingUp className="w-5 h-5" />
                                    </div>
                                    <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${card.status === 'ACTIVE'
                                        ? 'bg-green-50 text-green-700 border-green-100'
                                        : 'bg-slate-50 text-slate-500 border-slate-100'
                                        }`}>
                                        {card.status === 'ACTIVE' ? 'ใช้งานอยู่' : card.status}
                                    </span>
                                </div>

                                <h3 className="text-xl font-bold text-slate-900 mb-6 group-hover:text-accent-500 transition-colors truncate">
                                    {card.name}
                                </h3>

                                <div className="space-y-3 mb-8">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                                            <Calendar className="w-3.5 h-3.5" />
                                            มีผลเมื่อ
                                        </div>
                                        <span className="text-xs font-semibold text-slate-700">
                                            {card.effectiveFrom ? format(new Date(card.effectiveFrom), 'dd MMM yyyy', { locale: th }) : 'ยังไม่ระบุ'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                                            <Box className="w-3.5 h-3.5" />
                                            ประเภทสินค้า
                                        </div>
                                        <span className="text-xs font-semibold text-slate-700">
                                            {card._count?.rows || 0} รายการ
                                        </span>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-slate-50 flex items-center justify-between group/btn">
                                    <span className="text-xs font-bold text-slate-400 group-hover/btn:text-accent-500 transition-colors">จัดการรายละเอียด</span>
                                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover/btn:bg-accent-500 group-hover/btn:text-white transition-all">
                                        <ChevronRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
