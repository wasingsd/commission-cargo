/**
 * Commission Cargo - Summary Reports API
 * GET /api/reports/summary - Get commission summaries
 */

import { NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firestore';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month'); // YYYY-MM format
        const groupBy = searchParams.get('groupBy') || 'customer'; // customer, salesperson, monthly
        const customerId = searchParams.get('customerId');
        const salespersonId = searchParams.get('salespersonId');

        const startDateStr = searchParams.get('startDate');
        const endDateStr = searchParams.get('endDate');

        // Build filters
        const filters: {
            monthKey?: string;
            customerId?: string;
            salespersonId?: string;
            startDate?: Date;
            endDate?: Date;
        } = {};

        if (month) filters.monthKey = month;
        if (customerId) filters.customerId = customerId;
        if (salespersonId) filters.salespersonId = salespersonId;
        if (startDateStr) filters.startDate = new Date(startDateStr);
        if (endDateStr) filters.endDate = new Date(endDateStr);

        // Get all shipments matching the filter
        const shipments = await firestore.shipments.findAll(filters);

        // Populate relations
        const shipmentsWithRelations = await Promise.all(
            shipments.map(async (s) => {
                const customer = s.customerId ? await firestore.customers.findById(s.customerId) : null;
                const salesperson = s.salespersonId ? await firestore.salespersons.findById(s.salespersonId) : null;
                return { ...s, customer, salesperson };
            })
        );

        // Calculate summaries based on groupBy
        if (groupBy === 'customer') {
            // Group by customer
            const customerMap = new Map<string, {
                customerId: string;
                customerCode: string;
                customerName: string | null | undefined;
                totalShipments: number;
                totalSellBase: number;
                totalCostFinal: number;
                totalCommission: number;
            }>();

            shipmentsWithRelations.forEach((s) => {
                if (!s.customerId || !s.customer) return; // Skip if no customer
                const key = s.customerId;
                const existing = customerMap.get(key);
                if (existing) {
                    existing.totalShipments += 1;
                    existing.totalSellBase += Number(s.sellBase || 0);
                    existing.totalCostFinal += Number(s.costFinal || 0);
                    existing.totalCommission += Number(s.commissionValue || 0);
                } else {
                    customerMap.set(key, {
                        customerId: s.customerId,
                        customerCode: s.customer.code,
                        customerName: s.customer.name,
                        totalShipments: 1,
                        totalSellBase: Number(s.sellBase || 0),
                        totalCostFinal: Number(s.costFinal || 0),
                        totalCommission: Number(s.commissionValue || 0),
                    });
                }
            });

            const summaries = Array.from(customerMap.values()).map((s) => ({
                ...s,
                avgMarginPercent: s.totalCostFinal > 0
                    ? ((s.totalSellBase - s.totalCostFinal) / s.totalCostFinal) * 100
                    : 0,
            }));

            return NextResponse.json({
                success: true,
                data: summaries.sort((a, b) => b.totalCommission - a.totalCommission),
            });
        }

        if (groupBy === 'salesperson') {
            // Group by salesperson
            const salesMap = new Map<string, {
                salespersonId: string;
                salesCode: string;
                salesName: string;
                totalShipments: number;
                totalSellBase: number;
                totalCostFinal: number;
                totalCommission: number;
            }>();

            shipmentsWithRelations.forEach((s) => {
                if (!s.salespersonId || !s.salesperson) return;
                const key = s.salespersonId;
                const existing = salesMap.get(key);
                if (existing) {
                    existing.totalShipments += 1;
                    existing.totalSellBase += Number(s.sellBase || 0);
                    existing.totalCostFinal += Number(s.costFinal || 0);
                    existing.totalCommission += Number(s.commissionValue || 0);
                } else {
                    salesMap.set(key, {
                        salespersonId: s.salespersonId,
                        salesCode: s.salesperson.code,
                        salesName: s.salesperson.name,
                        totalShipments: 1,
                        totalSellBase: Number(s.sellBase || 0),
                        totalCostFinal: Number(s.costFinal || 0),
                        totalCommission: Number(s.commissionValue || 0),
                    });
                }
            });

            const summaries = Array.from(salesMap.values()).map((s) => ({
                ...s,
                avgMarginPercent: s.totalCostFinal > 0
                    ? ((s.totalSellBase - s.totalCostFinal) / s.totalCostFinal) * 100
                    : 0,
            }));

            return NextResponse.json({
                success: true,
                data: summaries.sort((a, b) => b.totalCommission - a.totalCommission),
            });
        }

        if (groupBy === 'dashboard') {
            // Group by month for trend
            const monthMap = new Map<string, any>();
            // Group by salesperson for share
            const salesMap = new Map<string, any>();

            let totalSellBase = 0;
            let totalCostFinal = 0;
            let totalCommission = 0;

            shipmentsWithRelations.forEach((s) => {
                const sell = Number(s.sellBase || 0);
                const cost = Number(s.costFinal || 0);
                const comm = Number(s.commissionValue || 0);

                totalSellBase += sell;
                totalCostFinal += cost;
                totalCommission += comm;

                // Monthly trend
                if (s.dateIn) {
                    const monthKey = s.dateIn instanceof Date
                        ? s.dateIn.toISOString().substring(0, 7)
                        : String(s.dateIn).substring(0, 7);
                    const mExisting = monthMap.get(monthKey) || {
                        name: monthKey,
                        revenue: 0,
                        cost: 0,
                        profit: 0,
                        commission: 0
                    };
                    mExisting.revenue += sell;
                    mExisting.cost += cost;
                    mExisting.profit += (sell - cost);
                    mExisting.commission += comm;
                    monthMap.set(monthKey, mExisting);
                }

                // Salesperson share
                if (s.salespersonId && s.salesperson) {
                    const sExisting = salesMap.get(s.salespersonId) || {
                        name: s.salesperson.name,
                        value: 0,
                        revenue: 0,
                        commission: 0
                    };
                    sExisting.revenue += sell;
                    sExisting.value += sell; // for pie chart
                    sExisting.commission += comm;
                    salesMap.set(s.salespersonId, sExisting);
                }
            });

            return NextResponse.json({
                success: true,
                data: {
                    metrics: {
                        totalRevenue: totalSellBase,
                        totalCost: totalCostFinal,
                        totalProfit: totalSellBase - totalCostFinal,
                        totalCommission: totalCommission,
                        shipmentCount: shipmentsWithRelations.length,
                    },
                    monthlyTrend: Array.from(monthMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
                    salesShare: Array.from(salesMap.values()).sort((a, b) => b.revenue - a.revenue),
                }
            });
        }

        if (groupBy === 'monthly') {
            // Group by month
            const monthMap = new Map<string, {
                month: string;
                totalShipments: number;
                totalSellBase: number;
                totalCostFinal: number;
                totalCommission: number;
            }>();

            shipmentsWithRelations.forEach((s) => {
                if (!s.dateIn) return; // Skip if no dateIn
                const monthKey = s.dateIn instanceof Date
                    ? s.dateIn.toISOString().substring(0, 7)
                    : String(s.dateIn).substring(0, 7);
                const existing = monthMap.get(monthKey);
                if (existing) {
                    existing.totalShipments += 1;
                    existing.totalSellBase += Number(s.sellBase || 0);
                    existing.totalCostFinal += Number(s.costFinal || 0);
                    existing.totalCommission += Number(s.commissionValue || 0);
                } else {
                    monthMap.set(monthKey, {
                        month: monthKey,
                        totalShipments: 1,
                        totalSellBase: Number(s.sellBase || 0),
                        totalCostFinal: Number(s.costFinal || 0),
                        totalCommission: Number(s.commissionValue || 0),
                    });
                }
            });

            const summaries = Array.from(monthMap.values()).map((s) => ({
                ...s,
                avgMarginPercent: s.totalCostFinal > 0
                    ? ((s.totalSellBase - s.totalCostFinal) / s.totalCostFinal) * 100
                    : 0,
            }));

            return NextResponse.json({
                success: true,
                data: summaries.sort((a, b) => b.month.localeCompare(a.month)),
            });
        }

        // Default: overall summary
        const totalSellBase = shipmentsWithRelations.reduce((sum, s) => sum + Number(s.sellBase || 0), 0);
        const totalCostFinal = shipmentsWithRelations.reduce((sum, s) => sum + Number(s.costFinal || 0), 0);
        const totalCommission = shipmentsWithRelations.reduce((sum, s) => sum + Number(s.commissionValue || 0), 0);

        return NextResponse.json({
            success: true,
            data: {
                totalShipments: shipmentsWithRelations.length,
                totalSellBase,
                totalCostFinal,
                totalCommission,
                avgMarginPercent: totalCostFinal > 0
                    ? ((totalSellBase - totalCostFinal) / totalCostFinal) * 100
                    : 0,
            },
        });
    } catch (error) {
        console.error('Error generating summary:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to generate summary' },
            { status: 500 }
        );
    }
}
