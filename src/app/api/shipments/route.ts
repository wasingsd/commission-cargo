import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CreateShipmentSchema } from '@/lib/validators';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { computeCommission, computeCost } from '@/lib/calc';
import { parseTracking } from '@/lib/tracking';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const parsed = CreateShipmentSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error }, { status: 400 });
        }

        const data = parsed.data;

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
        const relevantRows = await prisma.rateRow.findMany({
            where: {
                rateCardId: rateCardId,
                productType: data.productType,
                transport: data.transport
            }
        });

        const rateCbmRow = relevantRows.find(r => r.unit === 'CBM');
        const rateKgRow = relevantRows.find(r => r.unit === 'KG');

        // 3. Calculate Cost
        // Note: CostMode. If MANUAL, user provides costManual. 
        // But field default is AUTO. Logic says Cost(AUTO).
        // If user meant manual cost, they should probably send costMode=MANUAL.
        // The schema validator doesn't strictly check costMode but the DB default is AUTO.
        // Let's assume AUTO unless specified?

        // For now, calculate AUTO values anyway as reference? Or just use provided.
        const costResult = computeCost({
            weightKg: data.weightKg,
            cbm: data.cbm,
            rateCbm: Number(rateCbmRow?.rateValue || 0),
            rateKg: Number(rateKgRow?.rateValue || 0)
        });

        let finalCost = costResult.costFinal;
        let finalRule = costResult.costRule;
        let costCbm = costResult.costCbm;
        let costKg = costResult.costKg;

        // If there is a manual cost override logic (not explicitly in blueprint 4.2 but implicitly via CostMode enum)
        // The blueprint says "Cost (AUTO)" section.
        // "costManual" field exists.
        // Let's stick to auto for this endpoint as per blueprint "4.2 Cost (AUTO)"

        // 4. Commission
        const commResult = computeCommission(data.sellBase || 0, finalCost);

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

                costMode: 'AUTO',
                rateCardUsedId: rateCardId,

                costCbm: costCbm,
                costKg: costKg,
                costFinal: finalCost,
                costRule: finalRule,

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

    return NextResponse.json(shipments);
}
