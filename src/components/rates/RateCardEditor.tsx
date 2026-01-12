'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Save, ArrowLeft, CheckCircle2, AlertTriangle,
    RotateCw, ShieldCheck, Zap
} from 'lucide-react';
import { ProductType, RateCardStatus } from '@prisma/client';

interface RateRowData {
    id?: string;
    productType: ProductType;
    truckCbm: number;
    truckKg: number;
    shipCbm: number;
    shipKg: number;
}

interface RateCardData {
    id: string;
    name: string;
    status: RateCardStatus;
    effectiveFrom: string | null;
    rows: RateRowData[];
}

const PRODUCT_TYPES: ProductType[] = ['GENERAL', 'TISI', 'FDA', 'SPECIAL'];
const TYPE_LABELS: Record<ProductType, string> = {
    'GENERAL': 'สินค้าทั่วไป (General)',
    'TISI': 'สินค้า มอก. (TISI)',
    'FDA': 'สินค้า อย. (FDA)',
    'SPECIAL': 'สินค้าพิเศษ (Special)'
};

export function RateCardEditor({ id }: { id: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState<RateCardData | null>(null);

    // Initial fetch
    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(`/api/rate-cards/${id}`);
                const json = await res.json();
                if (json.success) {
                    const card = json.data;
                    // Ensure all product types exist in rows
                    const rows = PRODUCT_TYPES.map(type => {
                        const existing = card.rows.find((r: any) => r.productType === type);
                        return existing || {
                            productType: type,
                            truckCbm: 0,
                            truckKg: 0,
                            shipCbm: 0,
                            shipKg: 0
                        };
                    });

                    setData({ ...card, rows });
                } else {
                    alert(json.error);
                    router.push('/rates');
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, router]);

    const handleRateChange = (type: ProductType, field: keyof RateRowData, value: string) => {
        if (!data) return;
        const numValue = parseFloat(value) || 0;

        setData(prev => {
            if (!prev) return null;
            const newRows = prev.rows.map(row => {
                if (row.productType === type) {
                    return { ...row, [field]: numValue };
                }
                return row;
            });
            return { ...prev, rows: newRows };
        });
    };

    const handleSave = async () => {
        if (!data) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/rate-cards/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: data.name,
                    status: data.status,
                    effectiveFrom: data.effectiveFrom,
                    rows: data.rows
                })
            });

            if (res.ok) {
                router.refresh();
            } else {
                alert('บันทึกข้อมูลล้มเหลว');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleActivate = async () => {
        if (!confirm('ยืนยันการตั้งค่าเป็นเรทหลัก? ระบบจะใช้เรทนี้คำนวณรายการขนส่งใหม่ทั้งหมด')) return;

        await handleSave();

        const res = await fetch(`/api/rate-cards/${id}/activate`, { method: 'POST' });
        if (res.ok) {
            router.push('/rates');
        } else {
            alert('เปิดใช้งานล้มเหลว');
        }
    };

    if (loading || !data) return (
        <div className="flex flex-col justify-center items-center h-96 gap-4 opacity-50">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-100 border-t-accent-500"></div>
            <p className="text-sm font-medium text-slate-400">กำลังเข้าถึงฐานข้อมูลเรท...</p>
        </div>
    );

    return (
        <div className="space-y-10 animate-premium">
            {/* Header / Config Bar */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-premium">
                <div className="flex items-center gap-6 flex-1 w-full">
                    <button
                        onClick={() => router.back()}
                        className="w-12 h-12 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-900 border border-slate-100"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1">
                        <input
                            type="text"
                            value={data.name}
                            onChange={e => setData({ ...data, name: e.target.value })}
                            className="text-2xl font-bold text-slate-900 bg-transparent border-none focus:ring-0 p-0 placeholder-slate-200 w-full tracking-tight"
                            placeholder="ระบุชื่อเรียกเรทราคา..."
                        />
                        <div className="flex items-center gap-4 mt-2">
                            <span className={`
                                inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border
                                ${data.status === 'ACTIVE'
                                    ? 'bg-green-50 text-green-700 border-green-100'
                                    : 'bg-slate-50 text-slate-600 border-slate-200'}
                            `}>
                                <div className={`w-1.5 h-1.5 rounded-full ${data.status === 'ACTIVE' ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
                                {data.status === 'ACTIVE' ? 'เปิดใช้งานอยู่' : 'ร่าง/ยกเลิก'}
                            </span>
                            <div className="h-4 w-px bg-slate-200" />
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-slate-400">มีผลตั้งแต่:</span>
                                <input
                                    type="date"
                                    value={data.effectiveFrom ? data.effectiveFrom.substring(0, 10) : ''}
                                    onChange={e => setData({ ...data, effectiveFrom: e.target.value })}
                                    className="bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 focus:ring-0 outline-none cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto">
                    {data.status !== 'ACTIVE' && (
                        <button
                            onClick={handleActivate}
                            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-xl text-sm font-bold transition-all border border-green-100"
                        >
                            <Zap className="w-4 h-4" />
                            ตั้งเป็นเรทหลัก
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-10 py-3.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-sm font-bold transition-all shadow-lg shadow-slate-900/10 disabled:opacity-50"
                    >
                        {saving ? (
                            <RotateCw className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                    </button>
                </div>
            </div>

            {/* Matrix Editor */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-premium overflow-hidden">
                <div className="p-8 border-b border-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 border border-blue-100">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 tracking-tight">ตารางคำนวณต้นทุนสินค้า</h3>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">
                                ระบุค่าระวางต่อหน่วย (กก. หรือ CBM) ระบบจะเลือกใช้ค่าที่สูงกว่าในการคำนวณอัตโนมัติ
                            </p>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th rowSpan={2} className="px-8 py-5 text-sm font-bold text-slate-500 w-80">ประเภทสินค้า</th>
                                <th colSpan={2} className="px-6 py-4 text-center border-l border-slate-100 bg-blue-50/20 text-blue-700 text-xs font-bold">
                                    ขนส่งทางเรือ (SEA)
                                </th>
                                <th colSpan={2} className="px-6 py-4 text-center border-l border-slate-100 bg-indigo-50/20 text-indigo-700 text-xs font-bold">
                                    ขนส่งทางรถ (TRUCK)
                                </th>
                            </tr>
                            <tr className="border-b border-slate-100 bg-slate-50">
                                <th className="px-6 py-4 border-l border-slate-100 text-center text-[11px] font-bold text-slate-400 w-40">฿ / CBM</th>
                                <th className="px-6 py-4 text-center text-[11px] font-bold text-slate-400 w-40">฿ / กก. (KG)</th>
                                <th className="px-6 py-4 border-l border-slate-100 text-center text-[11px] font-bold text-slate-400 w-40">฿ / CBM</th>
                                <th className="px-6 py-4 text-center text-[11px] font-bold text-slate-400 w-40">฿ / กก. (KG)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {PRODUCT_TYPES.map((type) => {
                                const row = data.rows.find(r => r.productType === type)!;
                                return (
                                    <tr key={type} className="hover:bg-slate-50/30 transition-all group/row">
                                        <td className="px-8 py-6 font-semibold text-slate-900 border-r border-slate-50">
                                            {TYPE_LABELS[type]}
                                        </td>

                                        {/* Ship Inputs */}
                                        <td className="px-4 py-4 bg-blue-50/5 border-r border-slate-50">
                                            <input
                                                type="number"
                                                value={row.shipCbm || ''}
                                                onChange={e => handleRateChange(type, 'shipCbm', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-right font-semibold text-slate-800 transition-all shadow-sm"
                                                placeholder="0.00"
                                            />
                                        </td>
                                        <td className="px-4 py-4 bg-blue-50/5 border-r border-slate-50">
                                            <input
                                                type="number"
                                                value={row.shipKg || ''}
                                                onChange={e => handleRateChange(type, 'shipKg', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-right font-semibold text-slate-800 transition-all shadow-sm"
                                                placeholder="0.00"
                                            />
                                        </td>

                                        {/* Truck Inputs */}
                                        <td className="px-4 py-4 bg-indigo-50/5 border-r border-slate-50">
                                            <input
                                                type="number"
                                                value={row.truckCbm || ''}
                                                onChange={e => handleRateChange(type, 'truckCbm', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-right font-semibold text-slate-800 transition-all shadow-sm"
                                                placeholder="0.00"
                                            />
                                        </td>
                                        <td className="px-4 py-4 bg-indigo-50/5">
                                            <input
                                                type="number"
                                                value={row.truckKg || ''}
                                                onChange={e => handleRateChange(type, 'truckKg', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-right font-semibold text-slate-800 transition-all shadow-sm"
                                                placeholder="0.00"
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <p className="text-xs font-semibold text-slate-400">
                        ข้อมูลที่บันทึกจะถูกนำไปใช้ตรวจสอบความถูกต้องก่อนการประมวลผลจริง
                    </p>
                </div>
            </div>
        </div>
    );
}
