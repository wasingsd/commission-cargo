'use client';

import { useState, useEffect } from 'react';
import { formatCurrency, formatNumber } from '@/lib/calc';
import Link from 'next/link';
import { DollarSign, Package, TrendingUp, CreditCard, Plus, Settings } from 'lucide-react';

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white rounded-2xl h-40 border border-slate-100 shadow-sm" />
                ))}
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Commission */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <DollarSign className="w-24 h-24 text-green-600 transform translate-x-4 -translate-y-4" />
                    </div>
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mb-4 text-green-600">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Total Commission</p>
                        <p className="text-3xl font-bold text-slate-900 mt-1">{formatCurrency(stats.totalCommission)}</p>
                        <div className="mt-3 flex items-center gap-2 text-sm text-green-700 bg-green-50 w-fit px-2 py-1 rounded-full">
                            <TrendingUp className="w-3 h-3" />
                            <span className="font-medium">{formatNumber(stats.avgMarginPercent)}% Margin</span>
                        </div>
                    </div>
                </div>

                {/* Total Sales */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <CreditCard className="w-24 h-24 text-blue-600 transform translate-x-4 -translate-y-4" />
                    </div>
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4 text-blue-600">
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Sales Value</p>
                        <p className="text-3xl font-bold text-slate-900 mt-1">{formatCurrency(stats.totalSellBase)}</p>
                        <p className="mt-2 text-xs text-slate-400">Total revenue form shipments</p>
                    </div>
                </div>

                {/* Total Shipments */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Package className="w-24 h-24 text-orange-600 transform translate-x-4 -translate-y-4" />
                    </div>
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center mb-4 text-orange-600">
                            <Package className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Total Shipments</p>
                        <p className="text-3xl font-bold text-slate-900 mt-1">{formatNumber(stats.totalShipments, 0)}</p>
                        <p className="mt-2 text-xs text-slate-400">Processed tracking items</p>
                    </div>
                </div>

                {/* Avg Cost */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-4 text-slate-600">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Total Cost</p>
                        <p className="text-3xl font-bold text-slate-900 mt-1">{formatCurrency(stats.totalCostFinal)}</p>
                        <p className="mt-2 text-xs text-slate-400">Calculated base costs</p>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                    href="/shipments"
                    className="group bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-2xl shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all flex items-center justify-between"
                >
                    <div>
                        <h3 className="text-lg font-bold">New Shipment</h3>
                        <p className="text-blue-100 text-sm opacity-90">Create a new shipment record</p>
                    </div>
                    <div className="bg-white/20 p-3 rounded-xl group-hover:scale-110 transition-transform">
                        <Plus className="w-6 h-6" />
                    </div>
                </Link>

                <Link
                    href="/rates"
                    className="group bg-white border border-slate-200 text-slate-700 p-6 rounded-2xl hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-between"
                >
                    <div>
                        <h3 className="text-lg font-bold">Manage Rates</h3>
                        <p className="text-slate-500 text-sm">Update shipping costs</p>
                    </div>
                    <div className="bg-slate-100 p-3 rounded-xl group-hover:scale-110 transition-transform text-slate-600">
                        <Settings className="w-6 h-6" />
                    </div>
                </Link>
            </div>
        </div>
    );
}
