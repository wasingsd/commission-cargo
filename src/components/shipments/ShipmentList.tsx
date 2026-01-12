'use client';

import { useState, useEffect } from 'react';
import { formatCurrency, formatNumber } from '@/lib/calc';
import { ShipmentForm } from './ShipmentForm'; // We just created this
import { format } from 'date-fns';

interface Shipment {
    id: string;
    dateIn: string;
    trackingNo: string;
    customer: { code: string; name: string | null };
    salesperson: { code: string; name: string } | null;
    productType: string;
    transport: string;
    weightKg: string;
    cbm: string;
    costFinal: string;
    sellBase: string;
    commissionValue: string;
    commissionMethod: string;
    costRule: string;
    // We compute status flag on frontend or use from API
}

export function ShipmentList() {
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [filters, setFilters] = useState({
        month: '',
        customer: '',
        sales: ''
    });

    const fetchShipments = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.month) params.append('month', filters.month);
            if (filters.customer) params.append('customerId', filters.customer); // Backend expects customerId actually, but let's assume filtering by string locally or exact match later

            // Ideally we pass customerCode to API or fetch customer ID first. 
            // For simplicity/demo with current API:
            const res = await fetch(`/api/shipments?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setShipments(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchShipments();
    }, [filters.month]); // Refresh when month changes. Others might want a "Filter" button.

    // Filter logic on client for code/sales search (if API doesn't support fuzzy search yet)
    const filteredShipments = shipments.filter(s => {
        const matchCustomer = !filters.customer ||
            (s.customer?.code?.toLowerCase().includes(filters.customer.toLowerCase())) ||
            (s.customer?.name?.toLowerCase().includes(filters.customer.toLowerCase()));

        const matchSales = !filters.sales ||
            (s.salesperson?.code?.toLowerCase().includes(filters.sales.toLowerCase())) ||
            (s.salesperson?.name?.toLowerCase().includes(filters.sales.toLowerCase()));

        return matchCustomer && matchSales;
    });

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex justify-between items-center">
                <div className="flex gap-4 items-center bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                    <input
                        type="month"
                        className="border-none bg-transparent px-3 py-2 text-sm focus:ring-0 text-slate-600 font-medium"
                        value={filters.month}
                        onChange={e => setFilters({ ...filters, month: e.target.value })}
                    />
                    <div className="w-px h-6 bg-slate-200" />
                    <input
                        type="text"
                        placeholder="Filter Customer..."
                        className="border-none bg-transparent px-3 py-2 text-sm focus:ring-0 w-40"
                        value={filters.customer}
                        onChange={e => setFilters({ ...filters, customer: e.target.value })}
                    />
                </div>

                <div className="flex gap-3">
                    <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition shadow-sm">
                        Export CSV
                    </button>
                    <button
                        onClick={() => setShowForm(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        New Shipment
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-medium">
                                <th className="px-6 py-4">Date / Tracking</th>
                                <th className="px-6 py-4">Customer / Sales</th>
                                <th className="px-6 py-4">Details</th>
                                <th className="px-6 py-4 text-right">Cost</th>
                                <th className="px-6 py-4 text-right">Sell</th>
                                <th className="px-6 py-4 text-right">Commission</th>
                                <th className="px-6 py-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                        Loading shipments...
                                    </td>
                                </tr>
                            ) : filteredShipments.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                        No shipments found.
                                    </td>
                                </tr>
                            ) : (
                                filteredShipments.map((item) => {
                                    const sell = Number(item.sellBase);
                                    const cost = Number(item.costFinal);
                                    const comm = Number(item.commissionValue);
                                    const isLoss = sell < cost;
                                    const isOnePct = item.commissionMethod === 'ONEPCT';

                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50/80 transition group cursor-default">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-800">
                                                    {item.dateIn ? format(new Date(item.dateIn), 'dd MMM yyyy') : '-'}
                                                </div>
                                                <div className="text-xs font-mono text-slate-500 mt-0.5 group-hover:text-blue-600 transition">
                                                    {item.trackingNo}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-slate-800">{item.customer?.code}</div>
                                                <div className="text-xs text-slate-500">
                                                    Sales: {item.salesperson?.code || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs font-semibold text-slate-600 uppercase tracking-tight">
                                                    {item.productType} • {item.transport}
                                                </div>
                                                <div className="text-xs text-slate-400 mt-1">
                                                    {formatNumber(Number(item.weightKg))} kg / {formatNumber(Number(item.cbm))} cbm
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="font-medium text-slate-700">
                                                    {formatCurrency(cost)}
                                                </div>
                                                <div className="text-[10px] text-slate-400 uppercase">
                                                    {item.costRule}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-slate-700">
                                                {formatCurrency(sell)}
                                            </td>
                                            <td className={`px-6 py-4 text-right font-bold ${comm < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                                {comm > 0 ? '+' : ''}{formatCurrency(comm)}
                                                <div className="text-[10px] font-normal text-slate-400 uppercase">
                                                    {item.commissionMethod === 'ONEPCT' ? '1%' : 'DIFF'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {isLoss ? (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                                        LOSS
                                                    </span>
                                                ) : isOnePct ? (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                                        1% MODE
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                        OK
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showForm && (
                <ShipmentForm
                    onClose={() => setShowForm(false)}
                    onSuccess={() => {
                        setShowForm(false);
                        fetchShipments();
                    }}
                />
            )}
        </div>
    );
}
