import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { computeCost, computeCommission } from '@/lib/calc';
import { format } from 'date-fns';

interface BulkShipmentRow {
    trackingNo: string;
    customerCode: string;
    sellBase: number;
    productType: 'GENERAL' | 'TISI' | 'FDA' | 'SPECIAL';
    transport: 'TRUCK' | 'SHIP';
    dateIn?: string;
    weightKg?: number;
    cbm?: number;
    note?: string;
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { rows } = body as { rows: BulkShipmentRow[] };

        if (!rows || !Array.isArray(rows) || rows.length === 0) {
            return NextResponse.json(
                { error: 'ไม่มีข้อมูลสำหรับนำเข้า' },
                { status: 400 }
            );
        }

        // Get active rate card
        const activeRateCard = await prisma.rateCard.findFirst({
            where: { status: 'ACTIVE' },
            include: { rows: true }
        });

        const results = {
            success: 0,
            failed: 0,
            errors: [] as { row: number; tracking: string; error: string }[]
        };

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            try {
                // Validate required fields
                if (!row.trackingNo || !row.customerCode) {
                    results.failed++;
                    results.errors.push({
                        row: i + 1,
                        tracking: row.trackingNo || 'N/A',
                        error: 'ขาดข้อมูลจำเป็น (เลขพัสดุ หรือ รหัสลูกค้า)'
                    });
                    continue;
                }

                // Find or create customer
                let customer = await prisma.customer.findUnique({
                    where: { code: row.customerCode }
                });

                if (!customer) {
                    customer = await prisma.customer.create({
                        data: { code: row.customerCode }
                    });
                }

                // Parse tracking
                const trackingBase = row.trackingNo.replace(/[-_]\d+$/, '');
                const suffixMatch = row.trackingNo.match(/[-_](\d+)$/);
                const trackingSuffix = suffixMatch ? parseInt(suffixMatch[1]) : null;

                // Parse date
                let dateIn: Date | null = null;
                if (row.dateIn) {
                    // Support formats: DD/MM/YYYY, YYYY-MM-DD
                    const parts = row.dateIn.split(/[\/\-]/);
                    if (parts.length === 3) {
                        if (parts[0].length === 4) {
                            // YYYY-MM-DD
                            dateIn = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
                        } else {
                            // DD/MM/YYYY
                            dateIn = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                        }
                    }
                }
                if (!dateIn || isNaN(dateIn.getTime())) {
                    dateIn = new Date();
                }

                const monthKey = format(dateIn, 'yyyy-MM');

                // Get salesperson from customer
                const salespersonId = customer.assignedSalespersonId || null;

                // Calculate cost
                let rateCbm = 0;
                let rateKg = 0;

                if (activeRateCard && activeRateCard.rows) {
                    const rateRow = activeRateCard.rows.find(
                        r => r.productType === (row.productType || 'GENERAL')
                    );
                    if (rateRow) {
                        if (row.transport === 'SHIP') {
                            rateCbm = Number(rateRow.shipCbm);
                            rateKg = Number(rateRow.shipKg);
                        } else { // TRUCK
                            rateCbm = Number(rateRow.truckCbm);
                            rateKg = Number(rateRow.truckKg);
                        }
                    }
                }

                const costResult = computeCost({
                    weightKg: row.weightKg,
                    cbm: row.cbm,
                    rateCbm,
                    rateKg
                });

                // Calculate commission
                const commResult = computeCommission(
                    row.sellBase || 0,
                    costResult.costFinal
                );

                // Create shipment
                await prisma.shipment.create({
                    data: {
                        dateIn,
                        monthKey,
                        trackingNo: row.trackingNo,
                        trackingBase,
                        trackingSuffix,
                        customerId: customer.id,
                        salespersonId,
                        productType: row.productType || 'GENERAL',
                        transport: row.transport || 'TRUCK',
                        weightKg: row.weightKg || 0,
                        cbm: row.cbm || 0,
                        sellBase: row.sellBase || 0,
                        costMode: 'AUTO',
                        rateCardUsedId: activeRateCard?.id || null,
                        costCbm: costResult.costCbm,
                        costKg: costResult.costKg,
                        costFinal: costResult.costFinal,
                        costRule: costResult.costRule,
                        commissionMethod: commResult.commissionMethod,
                        commissionValue: commResult.commissionValue,
                        note: row.note || null
                    }
                });

                results.success++;
            } catch (err: any) {
                results.failed++;
                results.errors.push({
                    row: i + 1,
                    tracking: row.trackingNo || 'N/A',
                    error: err.message || 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'
                });
            }
        }

        return NextResponse.json({
            success: true,
            message: `นำเข้าสำเร็จ ${results.success} รายการ, ล้มเหลว ${results.failed} รายการ`,
            results
        });
    } catch (error: any) {
        console.error('Bulk import error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
