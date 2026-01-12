'use client';

import { useState, useEffect } from 'react';
import { formatCurrency, formatNumber } from '@/lib/calc';
import Link from 'next/link';

interface DashboardStats {
    totalShipments: number;
    totalSellBase: number;
    totalCostFinal: number;
    totalCommission: number;
    avgMarginPercent: number;
}

export function DashboardMetrics() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                // Fetch overall summary
                const res = await fetch('/api/reports/summary');
                if (res.ok) {
                    const json = await res.json();
                    if (json.success) {
                        setStats(json.data);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch stats', error);
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white rounded-xl h-32 border border-slate-100 shadow-sm" />
                ))}
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Commission */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Total Commission</p>
                    <p className="text-3xl font-bold text-slate-800 mt-2">{formatCurrency(stats.totalCommission)}</p>
                    <div className="mt-4 flex items-center text-sm">
                        <span className="text-green-600 bg-green-50 px-2 py-1 rounded-full font-medium">
                            Avg {formatNumber(stats.avgMarginPercent)}% Margin
                        </span>
                    </div>
                </div>

                {/* Total Sales */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Total Sales Value</p>
                    <p className="text-3xl font-bold text-slate-800 mt-2">{formatCurrency(stats.totalSellBase)}</p>
                    <div className="mt-4 text-sm text-slate-400">
                        Based on sell_base
                    </div>
                </div>

                {/* Total Shipments */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Shipments</p>
                    <p className="text-3xl font-bold text-slate-800 mt-2">{formatNumber(stats.totalShipments, 0)}</p>
                    <div className="mt-4 text-sm text-slate-400">
                        Total processed items
                    </div>
                </div>

                {/* Total Cost */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Total Cost</p>
                    <p className="text-3xl font-bold text-slate-800 mt-2">{formatCurrency(stats.totalCostFinal)}</p>
                    <div className="mt-4 text-sm text-slate-400">
                        Calculated cost
                    </div>
                </div>
            </div>

            {/* Quick Links / Actions */}
            <div className="flex gap-4">
                <Link
                    href="/shipments"
                    className="flex-1 bg-blue-600 text-white p-4 rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition flex items-center justify-center gap-2 font-medium"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add New Shipment
                </Link>
                <Link
                    href="/rates"
                    className="flex-1 bg-white border border-slate-200 text-slate-700 p-4 rounded-xl hover:bg-slate-50 transition flex items-center justify-center gap-2 font-medium"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Manage Rates
                </Link>
            </div>
        </div>
    );
}
