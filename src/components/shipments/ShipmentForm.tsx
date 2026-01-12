'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatNumber, computeCost, parseTrackingNumber } from '@/lib/calc';
import { ProductType, Transport } from '@prisma/client';
import { Info, Calculator, Truck, Ship, AlertTriangle } from 'lucide-react';

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
                throw new Error(err.error || 'Failed to create shipment');
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
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">New Shipment</h2>
                        <p className="text-sm text-slate-500 flex items-center gap-2">
                            {ratesLoaded ? (
                                activeRates.length > 0 ?
                                    <span className="text-green-600 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Active Rates Loaded</span> :
                                    <span className="text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> No Active Rate Card</span>
                            ) : (
                                <span className="animate-pulse">Loading rates...</span>
                            )}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition text-slate-500">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-8">

                    {/* Section 1: Customer & Date */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="md:col-span-1">
                            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5">Date In</label>
                            <input
                                type="date"
                                required
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
                                value={formData.dateIn}
                                onChange={e => setFormData({ ...formData, dateIn: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5">Customer</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. PR-001"
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition font-medium"
                                value={formData.customerCode}
                                onChange={e => setFormData({ ...formData, customerCode: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5">Tracking No.</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    required
                                    placeholder="Enter full tracking..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition font-mono tracking-wide"
                                    value={formData.trackingNo}
                                    onChange={e => setFormData({ ...formData, trackingNo: e.target.value })}
                                />
                                {trackingInfo.suffix !== null && (
                                    <div className="absolute right-2 top-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded font-mono font-bold">
                                        Suffix: -{trackingInfo.suffix}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100" />

                    {/* Section 2: Cargo Details & Type */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Truck className="w-4 h-4 text-slate-400" /> Cargo Details
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-xs text-slate-500 mb-1">Product Type</label>
                                <select
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                                    value={formData.productType}
                                    onChange={e => setFormData({ ...formData, productType: e.target.value as ProductType })}
                                >
                                    <option value="GENERAL">General (ทั่วไป)</option>
                                    <option value="TISI">TISI (มอก.)</option>
                                    <option value="FDA">FDA (อย.)</option>
                                    <option value="SPECIAL">Special (พิเศษ)</option>
                                </select>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-xs text-slate-500 mb-1">Transport</label>
                                <div className="flex bg-slate-100 rounded-lg p-1">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, transport: 'TRUCK' })}
                                        className={`flex-1 py-1.5 rounded-md text-xs font-medium transition flex items-center justify-center gap-1 ${formData.transport === 'TRUCK' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500'}`}
                                    >
                                        <Truck className="w-3 h-3" /> Truck
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, transport: 'SHIP' })}
                                        className={`flex-1 py-1.5 rounded-md text-xs font-medium transition flex items-center justify-center gap-1 ${formData.transport === 'SHIP' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500'}`}
                                    >
                                        <Ship className="w-3 h-3" /> Ship
                                    </button>
                                </div>
                            </div>

                            <div className="md:col-span-1">
                                <label className="block text-xs text-slate-500 mb-1">Weight (KG)</label>
                                <input
                                    type="number"
                                    step="any"
                                    placeholder="0"
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-right font-mono"
                                    value={formData.weightKg}
                                    onChange={e => setFormData({ ...formData, weightKg: e.target.value })}
                                />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-xs text-slate-500 mb-1">Volume (CBM)</label>
                                <input
                                    type="number"
                                    step="any"
                                    placeholder="0"
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-right font-mono"
                                    value={formData.cbm}
                                    onChange={e => setFormData({ ...formData, cbm: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Cost Calculation (The "Wow" Part) */}
                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <Calculator className="w-4 h-4 text-blue-500" /> Cost Calculation
                            </h3>

                            <div className="flex bg-white rounded-lg p-0.5 border border-slate-200 shadow-sm">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, costMode: 'AUTO' })}
                                    className={`px-3 py-1 rounded-md text-xs font-medium transition ${formData.costMode === 'AUTO' ? 'bg-blue-50 text-blue-700' : 'text-slate-500'}`}
                                >
                                    Auto
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, costMode: 'MANUAL' })}
                                    className={`px-3 py-1 rounded-md text-xs font-medium transition ${formData.costMode === 'MANUAL' ? 'bg-amber-50 text-amber-700' : 'text-slate-500'}`}
                                >
                                    Manual
                                </button>
                            </div>
                        </div>

                        {formData.costMode === 'MANUAL' ? (
                            <div>
                                <label className="block text-xs text-slate-500 mb-1">Manual Cost Override</label>
                                <input
                                    type="number"
                                    step="any"
                                    className="w-full bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none text-right font-mono font-bold text-amber-800"
                                    value={formData.costManual}
                                    onChange={e => setFormData({ ...formData, costManual: e.target.value })}
                                    placeholder="Enter cost manually"
                                />
                            </div>
                        ) : (
                            // Auto Preview
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className={`p-3 rounded-lg border ${preview?.rule === 'CBM' ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-100' : 'bg-white border-slate-100 opacity-60'}`}>
                                    <div className="text-[10px] text-slate-400 uppercase font-semibold mb-1">By CBM</div>
                                    <div className="text-lg font-bold text-slate-700">{formatNumber(preview?.costCbm)}</div>
                                    <div className="text-xs text-slate-400 mt-1">Rate: {formatNumber(preview?.rates?.rateCbm)}</div>
                                </div>
                                <div className={`p-3 rounded-lg border ${preview?.rule === 'KG' ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-100' : 'bg-white border-slate-100 opacity-60'}`}>
                                    <div className="text-[10px] text-slate-400 uppercase font-semibold mb-1">By KG</div>
                                    <div className="text-lg font-bold text-slate-700">{formatNumber(preview?.costKg)}</div>
                                    <div className="text-xs text-slate-400 mt-1">Rate: {formatNumber(preview?.rates?.rateKg)}</div>
                                </div>
                                <div className="flex flex-col justify-center items-end p-3">
                                    <div className="text-xs text-slate-500 mb-1">Final Cost</div>
                                    <div className="text-2xl font-bold text-slate-900">{formatNumber(preview?.finalCost)}</div>
                                    <div className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-medium">
                                        Applies: <span className="font-bold">{preview?.rule}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Profit Check */}
                        <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4 items-center">
                            <div>
                                <label className="block text-xs text-slate-500 mb-1">Sell Price (Base)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-slate-400 font-bold">฿</span>
                                    <input
                                        type="number"
                                        step="any"
                                        required
                                        className="w-full pl-7 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 font-bold text-slate-900"
                                        value={formData.sellBase}
                                        onChange={e => setFormData({ ...formData, sellBase: e.target.value })}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            {preview?.isLoss && (
                                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-2 rounded-lg border border-red-100 text-xs font-medium animate-pulse">
                                    <AlertTriangle className="w-4 h-4" />
                                    Warning: Sell Price is lower than Cost!
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5">Note (Optional)</label>
                        <textarea
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
                            rows={2}
                            value={formData.note}
                            onChange={e => setFormData({ ...formData, note: e.target.value })}
                            placeholder="Add notes..."
                        />
                    </div>

                </form>

                <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-8 py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-sm font-bold transition shadow-lg disabled:opacity-70 flex items-center gap-2"
                    >
                        {loading && <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                        {loading ? 'Submitting...' : 'Create Shipment'}
                    </button>
                </div>
            </div>
        </div>
    );
}
