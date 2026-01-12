'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatNumber, computeCost, parseTrackingNumber } from '@/lib/calc';
import { ProductType, Transport } from '@prisma/client';
import { Calculator, Truck, Ship, AlertTriangle } from 'lucide-react';

interface RateRowPreview {
    productType: ProductType;
    truckCbm: number;
    truckKg: number;
    shipCbm: number;
    shipKg: number;
}

interface ShipmentFormProps {
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
}

export function ShipmentForm({ onClose, onSuccess, initialData }: ShipmentFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Active Rates for calculation
    const [activeRates, setActiveRates] = useState<RateRowPreview[]>([]);
    const [ratesLoaded, setRatesLoaded] = useState(false);

    const [formData, setFormData] = useState({
        dateIn: new Date().toISOString().split('T')[0],
        customerCode: '',
        salesCode: '',
        trackingNo: '',
        productType: 'GENERAL' as ProductType,
        transport: 'TRUCK' as Transport,
        weightKg: '',
        cbm: '',
        sellBase: '',
        costMode: 'AUTO',
        costManual: '',
        note: ''
    });

    // Fetch Rates on Mount
    useEffect(() => {
        async function loadRates() {
            try {
                // Fetch all and find Active
                const res = await fetch('/api/rate-cards');
                const json = await res.json();
                if (json.success && Array.isArray(json.data)) {
                    const active = json.data.find((c: any) => c.status === 'ACTIVE');
                    if (active) {
                        // Fetch details of active card
                        const detailRes = await fetch(`/api/rate-cards/${active.id}`);
                        const detailJson = await detailRes.json();
                        if (detailJson.success) {
                            setActiveRates(detailJson.data.rows);
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to load active rates", e);
            } finally {
                setRatesLoaded(true);
            }
        }
        loadRates();
    }, []);

    // Real-time Preview Calculation
    const getPreview = () => {
        const w = parseFloat(formData.weightKg) || 0;
        const v = parseFloat(formData.cbm) || 0;

        if (formData.costMode === 'MANUAL') {
            const manual = parseFloat(formData.costManual) || 0;
            return {
                costCbm: 0,
                costKg: 0,
                finalCost: manual,
                rule: 'MANUAL',
                isLoss: (parseFloat(formData.sellBase) || 0) < manual
            };
        }

        // Find rate
        const rateRow = activeRates.find(r => r.productType === formData.productType);
        if (!rateRow) return null;

        let rateCbm = 0;
        let rateKg = 0;
        if (formData.transport === 'TRUCK') {
            rateCbm = Number(rateRow.truckCbm);
            rateKg = Number(rateRow.truckKg);
        } else {
            rateCbm = Number(rateRow.shipCbm);
            rateKg = Number(rateRow.shipKg);
        }

        const result = computeCost({
            weightKg: w,
            cbm: v,
            rateCbm,
            rateKg
        });

        const sell = parseFloat(formData.sellBase) || 0;

        return {
            costCbm: result.costCbm,
            costKg: result.costKg,
            finalCost: result.costFinal,
            rule: result.costRule,
            isLoss: sell > 0 && sell < result.costFinal,
            rates: { rateCbm, rateKg } // for debug/info
        };
    };

    const preview = getPreview();
    const trackingInfo = parseTrackingNumber(formData.trackingNo);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/shipments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    weightKg: parseFloat(formData.weightKg) || 0,
                    cbm: parseFloat(formData.cbm) || 0,
                    sellBase: parseFloat(formData.sellBase) || 0,
                    costManual: parseFloat(formData.costManual) || 0,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'ล้มเหลวในการบันทึกรายการ');
            }

            onSuccess();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[95vh] border border-slate-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">เพิ่มรายการขนส่งใหม่</h2>
                        <div className="flex items-center gap-2 mt-1">
                            {ratesLoaded ? (
                                activeRates.length > 0 ?
                                    <span className="text-xs font-semibold text-green-600 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> เชื่อมต่อเรทราคาทุนปัจจุบันแล้ว</span> :
                                    <span className="text-xs font-semibold text-amber-600 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> ไม่พบเรทราคาทุนที่เปิดใช้งาน</span>
                            ) : (
                                <span className="text-xs font-semibold text-slate-400 animate-pulse">กำลังโหลดเรทราคา...</span>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition text-slate-500">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 overflow-y-auto flex-1 space-y-8">

                    {/* Section 1: Customer & Date */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-slate-500 mb-2">วันที่รับเข้า</label>
                            <input
                                type="date"
                                required
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition font-semibold"
                                value={formData.dateIn}
                                onChange={e => setFormData({ ...formData, dateIn: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-slate-500 mb-2">รหัสลูกค้า</label>
                            <input
                                type="text"
                                required
                                placeholder="ตย. PR-001"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition font-semibold"
                                value={formData.customerCode}
                                onChange={e => setFormData({ ...formData, customerCode: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-slate-500 mb-2">หมายเลขพัสดุ (Tracking)</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    required
                                    placeholder="ใส่เลข Tracking..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition font-semibold tracking-wide"
                                    value={formData.trackingNo}
                                    onChange={e => setFormData({ ...formData, trackingNo: e.target.value })}
                                />
                                {trackingInfo.suffix !== null && (
                                    <div className="absolute right-3 top-3 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded font-bold">
                                        -{trackingInfo.suffix}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100" />

                    {/* Section 2: Cargo Details & Type */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 mb-5 flex items-center gap-2">
                            <Truck className="w-4 h-4 text-slate-400" /> รายละเอียดสินค้า
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-[11px] font-bold text-slate-400 mb-1.5">ประเภทสินค้า</label>
                                <select
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none bg-white font-semibold"
                                    value={formData.productType}
                                    onChange={e => setFormData({ ...formData, productType: e.target.value as ProductType })}
                                >
                                    <option value="GENERAL">ทั่วไป (General)</option>
                                    <option value="TISI">มอก. (TISI)</option>
                                    <option value="FDA">อย. (FDA)</option>
                                    <option value="SPECIAL">พิเศษ (Special)</option>
                                </select>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-[11px] font-bold text-slate-400 mb-1.5">ช่องทางขนส่ง</label>
                                <div className="flex bg-slate-100 rounded-xl p-1">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, transport: 'TRUCK' })}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${formData.transport === 'TRUCK' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
                                    >
                                        <Truck className="w-3.5 h-3.5" /> ทางบก
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, transport: 'SHIP' })}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${formData.transport === 'SHIP' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
                                    >
                                        <Ship className="w-3.5 h-3.5" /> ทางเรือ
                                    </button>
                                </div>
                            </div>

                            <div className="md:col-span-1">
                                <label className="block text-[11px] font-bold text-slate-400 mb-1.5">น้ำหนัก (กิโลกรัม)</label>
                                <input
                                    type="number"
                                    step="any"
                                    placeholder="0"
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-right font-semibold"
                                    value={formData.weightKg}
                                    onChange={e => setFormData({ ...formData, weightKg: e.target.value })}
                                />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-[11px] font-bold text-slate-400 mb-1.5">ปริมาตร (CBM)</label>
                                <input
                                    type="number"
                                    step="any"
                                    placeholder="0"
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-right font-semibold"
                                    value={formData.cbm}
                                    onChange={e => setFormData({ ...formData, cbm: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Cost Calculation */}
                    <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-200">
                        <div className="flex justify-between items-start mb-5">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Calculator className="w-4 h-4 text-blue-500" /> การคํานวณต้นทุน
                            </h3>

                            <div className="flex bg-white rounded-lg p-0.5 border border-slate-200 shadow-sm">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, costMode: 'AUTO' })}
                                    className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition ${formData.costMode === 'AUTO' ? 'bg-blue-50 text-blue-700' : 'text-slate-500'}`}
                                >
                                    อัตโนมัติ
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, costMode: 'MANUAL' })}
                                    className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition ${formData.costMode === 'MANUAL' ? 'bg-amber-50 text-amber-700' : 'text-slate-500'}`}
                                >
                                    ระบุเอง
                                </button>
                            </div>
                        </div>

                        {formData.costMode === 'MANUAL' ? (
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 mb-1.5">ต้นทุนที่ระบุเอง</label>
                                <input
                                    type="number"
                                    step="any"
                                    className="w-full bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm focus:ring-0 outline-none text-right font-bold text-amber-800"
                                    value={formData.costManual}
                                    onChange={e => setFormData({ ...formData, costManual: e.target.value })}
                                    placeholder="0.00"
                                />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className={`p-4 rounded-xl border ${preview?.rule === 'CBM' ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-slate-100 opacity-60'}`}>
                                    <div className="text-[10px] text-slate-400 font-bold mb-1">คิดตาม CBM</div>
                                    <div className="text-lg font-bold text-slate-900">{formatNumber(preview?.costCbm)}</div>
                                    <div className="text-[10px] text-slate-400 mt-1">เรท: {formatNumber(preview?.rates?.rateCbm)}</div>
                                </div>
                                <div className={`p-4 rounded-xl border ${preview?.rule === 'KG' ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-slate-100 opacity-60'}`}>
                                    <div className="text-[10px] text-slate-400 font-bold mb-1">คิดตาม กก.</div>
                                    <div className="text-lg font-bold text-slate-900">{formatNumber(preview?.costKg)}</div>
                                    <div className="text-[10px] text-slate-400 mt-1">เรท: {formatNumber(preview?.rates?.rateKg)}</div>
                                </div>
                                <div className="flex flex-col justify-center items-end p-2">
                                    <div className="text-[11px] font-bold text-slate-400 mb-1">ต้นทุนสุทธิ</div>
                                    <div className="text-2xl font-bold text-slate-900">{formatNumber(preview?.finalCost)}</div>
                                    <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded mt-1">
                                        เงื่อนไข: {preview?.rule === 'CBM' ? 'ปริมาตร' : 'น้ำหนัก'}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-5 pt-5 border-t border-slate-200 grid grid-cols-2 gap-6 items-center">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 mb-1.5">ราคาขาย (Sell Price)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-3.5 text-slate-400 font-bold text-sm">฿</span>
                                    <input
                                        type="number"
                                        step="any"
                                        required
                                        className="w-full pl-8 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:ring-4 focus:ring-green-500/10 focus:border-green-500 font-bold text-slate-900"
                                        value={formData.sellBase}
                                        onChange={e => setFormData({ ...formData, sellBase: e.target.value })}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            {preview?.isLoss && (
                                <div className="flex items-center gap-2.5 text-red-600 bg-red-50 p-4 rounded-xl border border-red-100 text-[11px] font-bold animate-pulse">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    คําเตือน: ราคาขายต่ำกว่าต้นทุนที่คำนวณได้!
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2">หมายเหตุ</label>
                        <textarea
                            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition font-medium"
                            rows={2}
                            value={formData.note}
                            onChange={e => setFormData({ ...formData, note: e.target.value })}
                            placeholder="ระบุรายละเอียดเพิ่มเติม..."
                        />
                    </div>

                </form>

                <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-slate-500 hover:bg-slate-200 rounded-xl text-sm font-bold transition"
                        disabled={loading}
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-10 py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-sm font-bold transition shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? 'กำลังบันทึก...' : 'บันทึกรายการ'}
                    </button>
                </div>
            </div>
        </div>
    );
}
