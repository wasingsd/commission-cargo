'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MainLayout } from '@/components/MainLayout';
import { formatNumber, computeCost, computeCommission } from '@/lib/calc';
import { parseTracking } from '@/lib/tracking';
import { ProductType, Transport } from '@/lib/enums';
import { Calculator, Truck, Ship, AlertTriangle, Package, ArrowLeft, ChevronDown, ChevronUp, Sparkles, Check, Save } from 'lucide-react';

interface RateRowPreview {
    productType: ProductType;
    truckCbm: number;
    truckKg: number;
    shipCbm: number;
    shipKg: number;
}

export default function NewShipmentPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Active Rates for calculation
    const [activeRates, setActiveRates] = useState<RateRowPreview[]>([]);
    const [ratesLoaded, setRatesLoaded] = useState(false);

    const [salespersons, setSalespersons] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        dateIn: new Date().toISOString().split('T')[0],
        customerCode: '',
        salesCode: '',
        salespersonId: '',
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
                const res = await fetch('/api/rate-cards');
                const json = await res.json();
                if (json.success && Array.isArray(json.data)) {
                    const active = json.data.find((c: any) => c.status === 'ACTIVE');
                    if (active) {
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

    // Fetch Salespersons
    useEffect(() => {
        async function loadSalespersons() {
            try {
                const res = await fetch('/api/salespersons');
                const json = await res.json();
                if (json.success) {
                    setSalespersons(json.data.filter((s: any) => s.active));
                }
            } catch (e) {
                console.error("Failed to load salespersons", e);
            }
        }
        loadSalespersons();
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
                isLoss: (parseFloat(formData.sellBase) || 0) < manual,
                commission: computeCommission(parseFloat(formData.sellBase) || 0, manual).commissionValue,
                commissionMethod: computeCommission(parseFloat(formData.sellBase) || 0, manual).commissionMethod,
            };
        }

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
        const finalCost = result.costFinal;

        const commResult = computeCommission(sell, finalCost);

        return {
            costCbm: result.costCbm,
            costKg: result.costKg,
            finalCost: finalCost,
            rule: result.costRule,
            isLoss: sell > 0 && sell < finalCost,
            commission: commResult.commissionValue,
            commissionMethod: commResult.commissionMethod,
            rates: { rateCbm, rateKg }
        };
    };

    const preview = getPreview();

    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

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
                    salespersonId: formData.salespersonId || undefined,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'ล้มเหลวในการบันทึกรายการ');
            }

            router.push('/shipments');
            router.refresh();
        } catch (error: any) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const productTypes = [
        { value: 'GENERAL', label: 'ทั่วไป', color: 'bg-slate-100 text-slate-700 border-slate-200' },
        { value: 'TISI', label: 'มอก.', color: 'bg-blue-50 text-blue-700 border-blue-200' },
        { value: 'FDA', label: 'อย.', color: 'bg-green-50 text-green-700 border-green-200' },
        { value: 'SPECIAL', label: 'พิเศษ', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    ];

    return (
        <MainLayout>
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/shipments"
                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 mb-4 transition"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        กลับไปรายการขนส่ง
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <Package className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">เพิ่มรายการขนส่งใหม่</h1>
                            {ratesLoaded && activeRates.length > 0 && (
                                <span className="text-xs font-medium text-green-600 flex items-center gap-1 mt-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    เรทราคาพร้อมใช้
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        {/* Quick Entry Section */}
                        <div className="space-y-6">
                            {/* Tracking & Customer Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">เลข Tracking *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="ABC123456"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-base focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition font-medium tracking-wide"
                                        value={formData.trackingNo}
                                        onChange={e => setFormData({ ...formData, trackingNo: e.target.value.toUpperCase() })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">รหัสลูกค้า *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="PR-001"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-base focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition font-medium"
                                        value={formData.customerCode}
                                        onChange={e => setFormData({ ...formData, customerCode: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Transport Type Selector */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">ช่องทางขนส่ง</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, transport: 'TRUCK' })}
                                        className={`py-4 rounded-xl text-base font-semibold transition flex items-center justify-center gap-3 border-2 ${formData.transport === 'TRUCK'
                                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                            }`}
                                    >
                                        <Truck className="w-5 h-5" />
                                        ทางบก (รถ)
                                        {formData.transport === 'TRUCK' && <Check className="w-5 h-5" />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, transport: 'SHIP' })}
                                        className={`py-4 rounded-xl text-base font-semibold transition flex items-center justify-center gap-3 border-2 ${formData.transport === 'SHIP'
                                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                            }`}
                                    >
                                        <Ship className="w-5 h-5" />
                                        ทางเรือ
                                        {formData.transport === 'SHIP' && <Check className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Weight & CBM */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">น้ำหนัก (กก.)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        placeholder="0.00"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-base focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition font-medium text-right"
                                        value={formData.weightKg}
                                        onChange={e => setFormData({ ...formData, weightKg: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">ปริมาตร (CBM)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        placeholder="0.00"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-base focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition font-medium text-right"
                                        value={formData.cbm}
                                        onChange={e => setFormData({ ...formData, cbm: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Sell Price */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">ราคาขาย (บาท) *</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-lg">฿</span>
                                    <input
                                        type="number"
                                        step="any"
                                        required
                                        placeholder="0.00"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-4 text-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 focus:bg-white outline-none transition font-bold text-right"
                                        value={formData.sellBase}
                                        onChange={e => setFormData({ ...formData, sellBase: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Preview Card */}
                        {preview && (
                            <div className={`rounded-2xl p-6 border-2 ${preview.isLoss
                                ? 'bg-red-50/50 border-red-200'
                                : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
                                }`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-semibold text-slate-500 mb-1">
                                            {preview.isLoss ? '⚠️ ขาดทุน' : '💰 กำไร (ส่วนต่าง)'}
                                        </div>
                                        <div className={`text-3xl font-bold ${preview.isLoss ? 'text-red-600' : 'text-green-600'}`}>
                                            ฿{formatNumber(preview.commission)}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-medium text-slate-400">ต้นทุน</div>
                                        <div className="text-2xl font-bold text-slate-700">฿{formatNumber(preview.finalCost)}</div>
                                        <div className="text-xs font-medium text-slate-400 mt-1">
                                            คิดตาม{preview.rule === 'CBM' ? 'ปริมาตร' : preview.rule === 'KG' ? 'น้ำหนัก' : 'ที่ระบุ'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Advanced Options Toggle */}
                        <button
                            type="button"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="w-full flex items-center justify-between py-4 px-5 bg-slate-50 hover:bg-slate-100 rounded-xl text-base font-medium text-slate-600 transition"
                        >
                            <span className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-slate-400" />
                                ตั้งค่าเพิ่มเติม
                            </span>
                            {showAdvanced ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>

                        {/* Advanced Options */}
                        {showAdvanced && (
                            <div className="space-y-5 p-6 bg-slate-50/50 rounded-xl border border-slate-100 animate-in slide-in-from-top-2 duration-200">
                                {/* Date */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">วันที่รับเข้า</label>
                                    <input
                                        type="date"
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition font-medium"
                                        value={formData.dateIn}
                                        onChange={e => setFormData({ ...formData, dateIn: e.target.value })}
                                    />
                                </div>

                                {/* Product Type */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">ประเภทสินค้า</label>
                                    <div className="flex flex-wrap gap-2">
                                        {productTypes.map(type => (
                                            <button
                                                key={type.value}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, productType: type.value as ProductType })}
                                                className={`px-5 py-2.5 rounded-lg text-sm font-bold transition border ${formData.productType === type.value
                                                    ? type.color + ' ring-2 ring-offset-1 ring-blue-500/30'
                                                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                                    }`}
                                            >
                                                {type.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Salesperson */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">เซลล์ผู้ดูแล</label>
                                    <select
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition font-medium"
                                        value={formData.salespersonId}
                                        onChange={e => setFormData({ ...formData, salespersonId: e.target.value })}
                                    >
                                        <option value="">อัตโนมัติ (ตามลูกค้า)</option>
                                        {salespersons.map((s: any) => (
                                            <option key={s.id} value={s.id}>
                                                {s.code} - {s.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Cost Mode */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">โหมดคิดต้นทุน</label>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, costMode: 'AUTO' })}
                                            className={`flex-1 py-3 rounded-xl text-sm font-bold transition border ${formData.costMode === 'AUTO'
                                                ? 'bg-blue-50 border-blue-500 text-blue-700'
                                                : 'bg-white border-slate-200 text-slate-500'
                                                }`}
                                        >
                                            <Calculator className="w-4 h-4 inline mr-2" />
                                            คำนวณอัตโนมัติ
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, costMode: 'MANUAL' })}
                                            className={`flex-1 py-3 rounded-xl text-sm font-bold transition border ${formData.costMode === 'MANUAL'
                                                ? 'bg-amber-50 border-amber-500 text-amber-700'
                                                : 'bg-white border-slate-200 text-slate-500'
                                                }`}
                                        >
                                            ระบุเอง
                                        </button>
                                    </div>
                                    {formData.costMode === 'MANUAL' && (
                                        <div className="mt-3">
                                            <input
                                                type="number"
                                                step="any"
                                                placeholder="ระบุต้นทุน..."
                                                className="w-full bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-base font-bold text-amber-800 text-right"
                                                value={formData.costManual}
                                                onChange={e => setFormData({ ...formData, costManual: e.target.value })}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Note */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">หมายเหตุ</label>
                                    <textarea
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition font-medium resize-none"
                                        rows={3}
                                        value={formData.note}
                                        onChange={e => setFormData({ ...formData, note: e.target.value })}
                                        placeholder="รายละเอียดเพิ่มเติม..."
                                    />
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="flex gap-4 pt-4">
                            <Link
                                href="/shipments"
                                className="flex-1 py-4 text-slate-500 hover:bg-slate-100 rounded-xl text-base font-semibold transition text-center"
                            >
                                ยกเลิก
                            </Link>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-[2] py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 rounded-xl text-base font-bold transition shadow-lg shadow-blue-500/30 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        กำลังบันทึก...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        บันทึกรายการ
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </MainLayout>
    );
}
