'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatNumber } from '@/lib/calc';
import { ProductType, Transport } from '@prisma/client';

interface RatePreview {
    costCbm: number;
    costKg: number;
    finalCost: number;
    rule: string;
}

interface ShipmentFormProps {
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any; // To be typed properly
}

export function ShipmentForm({ onClose, onSuccess, initialData }: ShipmentFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState<RatePreview | null>(null);

    const [formData, setFormData] = useState({
        dateIn: new Date().toISOString().split('T')[0],
        customerCode: '',
        salesCode: '', // In real app, this might be auto-filled if logged in as sales
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

    // Mock calculation for preview (In real implementation, fetch rates from API)
    // This is simplified. Ideally we fetch active rates on mount.
    useEffect(() => {
        if (formData.costMode === 'MANUAL') {
            setPreview(null);
            return;
        }

        const w = parseFloat(formData.weightKg) || 0;
        const v = parseFloat(formData.cbm) || 0;

        if (w === 0 && v === 0) {
            setPreview(null);
            return;
        }

        // TODO: This should use actual rates from server. 
        // For now, I'll implementing a "fetch preview" effect or just simple placeholders
        // to demonstrate UI structure first.
    }, [formData.weightKg, formData.cbm, formData.productType, formData.transport, formData.costMode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/shipments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">New Shipment</h2>
                        <p className="text-sm text-slate-500">Add a new shipment record</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Date In</label>
                            <input
                                type="date"
                                required
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                value={formData.dateIn}
                                onChange={e => setFormData({ ...formData, dateIn: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tracking No.</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. 7100..."
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-mono"
                                value={formData.trackingNo}
                                onChange={e => setFormData({ ...formData, trackingNo: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Customer Code</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. PR-001"
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                value={formData.customerCode}
                                onChange={e => setFormData({ ...formData, customerCode: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Sales Code</label>
                            <input
                                type="text"
                                placeholder="Optional"
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                value={formData.salesCode}
                                onChange={e => setFormData({ ...formData, salesCode: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="h-px bg-slate-100 my-4" />

                    {/* Cargo Details */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Product Type</label>
                            <select
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                value={formData.productType}
                                onChange={e => setFormData({ ...formData, productType: e.target.value as ProductType })}
                            >
                                <option value="GENERAL">General (ทั่วไป)</option>
                                <option value="TISI">TISI (มอก.)</option>
                                <option value="FDA">FDA (อย.)</option>
                                <option value="SPECIAL">Special (พิเศษ)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Transport</label>
                            <select
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                value={formData.transport}
                                onChange={e => setFormData({ ...formData, transport: e.target.value as Transport })}
                            >
                                <option value="TRUCK">Truck (รถ)</option>
                                <option value="SHIP">Ship (เรือ)</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Weight (KG)</label>
                            <input
                                type="number"
                                step="any"
                                placeholder="0.00"
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                value={formData.weightKg}
                                onChange={e => setFormData({ ...formData, weightKg: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Volume (CBM)</label>
                            <input
                                type="number"
                                step="any"
                                placeholder="0.000"
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                value={formData.cbm}
                                onChange={e => setFormData({ ...formData, cbm: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Cost Preview Section */}
                    {formData.costMode === 'AUTO' && (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-600 flex justify-between items-center">
                            <span>Cost Calculation (Auto):</span>
                            <span className="font-semibold text-slate-800">
                                {Number(formData.weightKg) > 0 || Number(formData.cbm) > 0
                                    ? 'Result provided after submit (or implement realtime)'
                                    : 'Enter Weight or CBM'}
                            </span>
                        </div>
                    )}

                    <div className="h-px bg-slate-100 my-4" />

                    {/* Financials */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Sell Price (Base)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-slate-400">฿</span>
                                <input
                                    type="number"
                                    step="any"
                                    required
                                    className="w-full border border-slate-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-semibold text-slate-900"
                                    value={formData.sellBase}
                                    onChange={e => setFormData({ ...formData, sellBase: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Cost Mode</label>
                            <div className="flex gap-4 mt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="costMode"
                                        checked={formData.costMode === 'AUTO'}
                                        onChange={() => setFormData({ ...formData, costMode: 'AUTO' })}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm">Auto</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="costMode"
                                        checked={formData.costMode === 'MANUAL'}
                                        onChange={() => setFormData({ ...formData, costMode: 'MANUAL' })}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm">Manual</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {formData.costMode === 'MANUAL' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Manual Cost</label>
                            <input
                                type="number"
                                step="any"
                                className="w-full border border-orange-200 bg-orange-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition"
                                value={formData.costManual}
                                onChange={e => setFormData({ ...formData, costManual: e.target.value })}
                                placeholder="Enter cost override"
                            />
                        </div>
                    )}

                    <div className="pt-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Note</label>
                        <textarea
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                            rows={2}
                            value={formData.note}
                            onChange={e => setFormData({ ...formData, note: e.target.value })}
                        />
                    </div>

                </form>

                <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-sm font-medium transition shadow-lg shadow-slate-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading && (
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        {loading ? 'Saving...' : 'Create Shipment'}
                    </button>
                </div>
            </div>
        </div>
    );
}
