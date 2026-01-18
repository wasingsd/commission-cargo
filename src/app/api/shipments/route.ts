import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { computeCommission, computeCost } from '@/lib/calc';
import { parseTracking } from '@/lib/tracking';
import { ProductType, Transport } from '@prisma/client';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();

        // Extract and validate basic fields
        const data = {
            dateIn: body.dateIn,
            trackingNo: body.trackingNo,
            productType: body.productType as ProductType,
            transport: body.transport as Transport,
            weightKg: body.weightKg || 0,
            cbm: body.cbm || 0,
            sellBase: body.sellBase || 0,
            costMode: body.costMode || 'AUTO',
            costManual: body.costManual,
            rateCardUsedId: body.rateCardUsedId,
            customerId: body.customerId,
            salespersonId: body.salespersonId,
        };

        // Lookup Customer by code if customerId not provided
        if (!data.customerId && body.customerCode) {
            const customer = await prisma.customer.findFirst({
                where: { code: body.customerCode }
            });
            if (customer) {
                data.customerId = customer.id;
                // Auto-assign salesperson from customer if not specified
                if (!data.salespersonId && customer.assignedSalespersonId) {
                    data.salespersonId = customer.assignedSalespersonId;
                }
            }
        }

        // Lookup Salesperson by code if salespersonId not provided
        if (!data.salespersonId && body.salesCode) {
            const salesperson = await prisma.salesperson.findFirst({
                where: { code: body.salesCode }
            });
            if (salesperson) {
                data.salespersonId = salesperson.id;
            }
        }

        // 1. Determine Rate Card
        let rateCardId = data.rateCardUsedId;
        if (!rateCardId) {
            const activeCard = await prisma.rateCard.findFirst({
                where: { status: 'ACTIVE' }
            });
            // If no active card, we can't auto-calc cost properly unless we assume 0 or error.
            // User blueprint implies system must have one ACTIVE.
            if (!activeCard) {
                return NextResponse.json({ error: "No active rate card found. Please activate one first." }, { status: 400 });
            }
            rateCardId = activeCard.id;
        }

        // 2. Fetch Rates
        // 2. Fetch Rates (Only if AUTO or just for reference)
        let rateCbm = 0;
        let rateKg = 0;
        let rateRow = null;

        if (rateCardId) {
            rateRow = await prisma.rateRow.findFirst({
                where: {
                    rateCardId: rateCardId,
                    productType: data.productType
                }
            });

            if (rateRow) {
                // Select rates based on Transport
                if (data.transport === 'TRUCK') {
                    rateCbm = Number(rateRow.truckCbm);
                    rateKg = Number(rateRow.truckKg);
                } else if (data.transport === 'SHIP') {
                    rateCbm = Number(rateRow.shipCbm);
                    rateKg = Number(rateRow.shipKg);
                }
            }
        }

        // 3. Calculate Cost
        // Logic from MASTER_LOGIC.md 5.2.A & 5.2.B
        let costResult;

        // If Manual mode is requested AND manual cost is provided
        if (data.costMode === 'MANUAL' && data.costManual !== undefined) {
            // We can use computeCost for manual too if we adapt it, but simpler to just set values
            // Or better, let's keep the logic consistent.
            // Wait, computeCost in calc.ts is purely for AUTO calculation.
            // We handle MANUAL selection here.

            // Still calculate auto cost for reference if rates available? 
            // Logic doesn't mandate it, but it's good practice.
            const autoCalc = computeCost({
                weightKg: data.weightKg,
                cbm: data.cbm,
                rateCbm: rateCbm,
                rateKg: rateKg
            });

            costResult = {
                costCbm: autoCalc.costCbm, // Keep reference
                costKg: autoCalc.costKg,   // Keep reference
                costFinal: data.costManual,
                costRule: 'MANUAL' as const
            };

        } else {
            // AUTO Mode
            costResult = computeCost({
                weightKg: data.weightKg,
                cbm: data.cbm,
                rateCbm: rateCbm,
                rateKg: rateKg
            });
        }

        const { costFinal, costRule, costCbm, costKg } = costResult;

        // 4. Commission
        const commResult = computeCommission(data.sellBase || 0, costFinal);

        // 5. Tracking
        const { base, suffix } = parseTracking(data.trackingNo);

        // 6. DB Create
        const shipment = await prisma.shipment.create({
            data: {
                dateIn: data.dateIn ? new Date(data.dateIn) : undefined,
                monthKey: data.dateIn ? data.dateIn.substring(0, 7) : null, // YYYY-MM
                trackingNo: data.trackingNo,
                trackingBase: base,
                trackingSuffix: suffix,

                customerId: data.customerId,
                salespersonId: data.salespersonId,

                productType: data.productType,
                transport: data.transport,

                weightKg: data.weightKg,
                cbm: data.cbm,

                sellBase: data.sellBase,

                costMode: data.costMode || 'AUTO',
                costManual: data.costManual,

                rateCardUsedId: rateCardId,

                costCbm: costCbm,
                costKg: costKg,
                costFinal: costFinal,
                costRule: costRule,

                commissionMethod: commResult.commissionMethod,
                commissionValue: commResult.commissionValue,
            }
        });

        return NextResponse.json(shipment);

    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');
    const customerId = searchParams.get('customerId');
    const salesId = searchParams.get('salesId');

    const where: any = {};
    if (month) where.monthKey = month;
    if (customerId) where.customerId = customerId;
    if (salesId) where.salespersonId = salesId;

    const shipments = await prisma.shipment.findMany({
        where,
        include: {
            customer: true,
            salesperson: true,
            rateCardUsed: {
                select: { name: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, data: shipments });
}
