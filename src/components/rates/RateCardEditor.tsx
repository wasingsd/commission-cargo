'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Save, ArrowLeft, CheckCircle2, AlertTriangle,
    Trash2, RotateCw, Copy
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
    'GENERAL': 'General (ทั่วไป)',
    'TISI': 'TISI (มอก.)',
    'FDA': 'FDA (อย.)',
    'SPECIAL': 'Special (พิเศษ)'
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
                    // Send rows directly, backend should handle upsert
                    rows: data.rows
                })
            });

            if (res.ok) {
                // Optionally show toast
                router.refresh();
            } else {
                alert('Failed to save');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleActivate = async () => {
        if (!confirm('Are you sure you want to activate this rate card? It will become the default for new shipments.')) return;

        // First save any changes
        await handleSave();

        // Then activate
        const res = await fetch(`/api/rate-cards/${id}/activate`, { method: 'POST' });
        if (res.ok) {
            router.push('/rates'); // Back to list to see status
        } else {
            alert('Failed to activate');
        }
    };

    if (loading || !data) return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-500"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <input
                            type="text"
                            value={data.name}
                            onChange={e => setData({ ...data, name: e.target.value })}
                            className="text-2xl font-bold text-slate-800 bg-transparent border-none focus:ring-0 p-0 placeholder-slate-300 w-full"
                            placeholder="Rate Card Name"
                        />
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                            <span className={`
                                inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium
                                ${data.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}
                            `}>
                                {data.status}
                            </span>
                            <span>•</span>
                            <div className="flex items-center gap-2">
                                <span>Effective:</span>
                                <input
                                    type="date"
                                    value={data.effectiveFrom ? data.effectiveFrom.substring(0, 10) : ''}
                                    onChange={e => setData({ ...data, effectiveFrom: e.target.value })}
                                    className="bg-slate-50 border-none text-sm p-0 focus:ring-0 text-slate-600 cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {data.status !== 'ACTIVE' && (
                        <button
                            onClick={handleActivate}
                            className="px-4 py-2 text-green-700 bg-green-50 hover:bg-green-100 rounded-lg text-sm font-medium transition flex items-center gap-2"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            Set Active
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? (
                            <RotateCw className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Matrix Editor */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800">Rate Matrix</h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Configure shipping rates per unit for each product type. The system will automatically choose the higher cost between CBM and Weight calculation.
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b border-slate-200">
                            <tr>
                                <th rowSpan={2} className="px-6 py-3 font-semibold w-64">Product Type</th>
                                <th colSpan={2} className="px-6 py-2 text-center border-l border-slate-200 bg-blue-50/30 text-blue-700">
                                    Ship Transport (เรือ)
                                </th>
                                <th colSpan={2} className="px-6 py-2 text-center border-l border-slate-200 bg-indigo-50/30 text-indigo-700">
                                    Truck Transport (รถ)
                                </th>
                            </tr>
                            <tr>
                                <th className="px-4 py-2 border-l border-slate-200 bg-blue-50/30 text-center w-40">THB / CBM</th>
                                <th className="px-4 py-2 bg-blue-50/30 text-center w-40">THB / KG</th>
                                <th className="px-4 py-2 border-l border-slate-200 bg-indigo-50/30 text-center w-40">THB / CBM</th>
                                <th className="px-4 py-2 bg-indigo-50/30 text-center w-40">THB / KG</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {PRODUCT_TYPES.map((type) => {
                                const row = data.rows.find(r => r.productType === type)!;
                                return (
                                    <tr key={type} className="hover:bg-slate-50/50 transition">
                                        <td className="px-6 py-4 font-medium text-slate-900 border-r border-slate-100">
                                            {TYPE_LABELS[type]}
                                        </td>

                                        {/* Ship Inputs */}
                                        <td className="px-4 py-3 bg-blue-50/10 border-r border-slate-100">
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={row.shipCbm || ''}
                                                    onChange={e => handleRateChange(type, 'shipCbm', e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-right font-mono"
                                                    placeholder="0.00"
                                                />
                                                <span className="absolute right-8 top-2.5 text-slate-400 text-xs pointer-events-none">฿</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 bg-blue-50/10 border-r border-slate-100">
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={row.shipKg || ''}
                                                    onChange={e => handleRateChange(type, 'shipKg', e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-right font-mono"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </td>

                                        {/* Truck Inputs */}
                                        <td className="px-4 py-3 bg-indigo-50/10 border-r border-slate-100">
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={row.truckCbm || ''}
                                                    onChange={e => handleRateChange(type, 'truckCbm', e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-right font-mono"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 bg-indigo-50/10">
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={row.truckKg || ''}
                                                    onChange={e => handleRateChange(type, 'truckKg', e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-right font-mono"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex justify-end p-4 text-sm text-slate-500 italic">
                * Rates are automatically saved when you click "Save Changes".
            </div>
        </div>
    );
}
