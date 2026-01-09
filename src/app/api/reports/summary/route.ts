/**
 * Commission Cargo - Summary Reports API
 * GET /api/reports/summary - Get commission summaries
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month'); // YYYY-MM format
        const groupBy = searchParams.get('groupBy') || 'customer'; // customer, salesperson, monthly
        const customerId = searchParams.get('customerId');
        const salespersonId = searchParams.get('salespersonId');

        // Build where clause
        const where: Record<string, unknown> = {};

        if (month) {
            const startDate = new Date(`${month}-01`);
            const endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + 1);
            where.dateIn = {
                gte: startDate,
                lt: endDate,
            };
        }

        if (customerId) where.customerId = customerId;
        if (salespersonId) where.salespersonId = salespersonId;

        // Get all shipments matching the filter
        const shipments = await prisma.shipment.findMany({
            where,
            include: {
                customer: true,
                salesperson: true,
            },
        });

        // Calculate summaries based on groupBy
        if (groupBy === 'customer') {
            // Group by customer
            const customerMap = new Map<string, {
                customerId: string;
                customerCode: string;
                customerName: string | null;
                totalShipments: number;
                totalSellBase: number;
                totalCostFinal: number;
                totalCommission: number;
            }>();

            shipments.forEach((s) => {
                const key = s.customerId;
                const existing = customerMap.get(key);
                if (existing) {
                    existing.totalShipments += 1;
                    existing.totalSellBase += Number(s.sellBase);
                    existing.totalCostFinal += Number(s.costFinal);
                    existing.totalCommission += Number(s.commissionValue);
                } else {
                    customerMap.set(key, {
                        customerId: s.customerId,
                        customerCode: s.customer.customerCode,
                        customerName: s.customer.customerName,
                        totalShipments: 1,
                        totalSellBase: Number(s.sellBase),
                        totalCostFinal: Number(s.costFinal),
                        totalCommission: Number(s.commissionValue),
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

            shipments.forEach((s) => {
                if (!s.salespersonId || !s.salesperson) return;
                const key = s.salespersonId;
                const existing = salesMap.get(key);
                if (existing) {
                    existing.totalShipments += 1;
                    existing.totalSellBase += Number(s.sellBase);
                    existing.totalCostFinal += Number(s.costFinal);
                    existing.totalCommission += Number(s.commissionValue);
                } else {
                    salesMap.set(key, {
                        salespersonId: s.salespersonId,
                        salesCode: s.salesperson.salesCode,
                        salesName: s.salesperson.salesName,
                        totalShipments: 1,
                        totalSellBase: Number(s.sellBase),
                        totalCostFinal: Number(s.costFinal),
                        totalCommission: Number(s.commissionValue),
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

        if (groupBy === 'monthly') {
            // Group by month
            const monthMap = new Map<string, {
                month: string;
                totalShipments: number;
                totalSellBase: number;
                totalCostFinal: number;
                totalCommission: number;
            }>();

            shipments.forEach((s) => {
                const monthKey = s.dateIn.toISOString().substring(0, 7); // YYYY-MM
                const existing = monthMap.get(monthKey);
                if (existing) {
                    existing.totalShipments += 1;
                    existing.totalSellBase += Number(s.sellBase);
                    existing.totalCostFinal += Number(s.costFinal);
                    existing.totalCommission += Number(s.commissionValue);
                } else {
                    monthMap.set(monthKey, {
                        month: monthKey,
                        totalShipments: 1,
                        totalSellBase: Number(s.sellBase),
                        totalCostFinal: Number(s.costFinal),
                        totalCommission: Number(s.commissionValue),
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
        const totalSellBase = shipments.reduce((sum, s) => sum + Number(s.sellBase), 0);
        const totalCostFinal = shipments.reduce((sum, s) => sum + Number(s.costFinal), 0);
        const totalCommission = shipments.reduce((sum, s) => sum + Number(s.commissionValue), 0);

        return NextResponse.json({
            success: true,
            data: {
                totalShipments: shipments.length,
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
