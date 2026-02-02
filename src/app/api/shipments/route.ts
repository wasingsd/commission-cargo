import { NextResponse } from 'next/server';
import { firestore } from '@/lib/firestore';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { computeCommission, computeCost } from '@/lib/calc';
import { parseTracking } from '@/lib/tracking';
import { ProductType, Transport, CostMode, Role } from '@/lib/enums';

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
            costMode: (body.costMode || 'AUTO') as CostMode,
            costManual: body.costManual,
            rateCardUsedId: body.rateCardUsedId,
            customerId: body.customerId,
            salespersonId: body.salespersonId,
        };

        // Lookup Customer by code if customerId not provided
        if (!data.customerId && body.customerCode) {
            const customer = await firestore.customers.findByCode(body.customerCode);
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
            const salesperson = await firestore.salespersons.findByCode(body.salesCode);
            if (salesperson) {
                data.salespersonId = salesperson.id;
            }
        }

        // 1. Determine Rate Card
        let rateCardId = data.rateCardUsedId;
        if (!rateCardId) {
            const activeCard = await firestore.rateCards.findActive();
            if (!activeCard) {
                return NextResponse.json({ error: "No active rate card found. Please activate one first." }, { status: 400 });
            }
            rateCardId = activeCard.id;
        }

        // 2. Fetch Rates
        let rateCbm = 0;
        let rateKg = 0;

        if (rateCardId) {
            const rateRow = await firestore.rateCards.getRow(rateCardId, data.productType);

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
        let costResult;

        if (data.costMode === 'MANUAL' && data.costManual !== undefined) {
            const autoCalc = computeCost({
                weightKg: data.weightKg,
                cbm: data.cbm,
                rateCbm: rateCbm,
                rateKg: rateKg
            });

            costResult = {
                costCbm: autoCalc.costCbm,
                costKg: autoCalc.costKg,
                costFinal: data.costManual,
                costRule: 'MANUAL' as const
            };
        } else {
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
        const shipment = await firestore.shipments.create({
            dateIn: data.dateIn ? new Date(data.dateIn) : undefined,
            monthKey: data.dateIn ? data.dateIn.substring(0, 7) : undefined,
            trackingNo: data.trackingNo,
            trackingBase: base,
            trackingSuffix: suffix === null ? undefined : suffix,


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

    const filters: {
        monthKey?: string;
        customerId?: string;
        salespersonId?: string;
    } = {};

    if (month) filters.monthKey = month;
    if (customerId) filters.customerId = customerId;
    if (salesId) filters.salespersonId = salesId;

    // Role-based filtering
    if (session.user.role === Role.SALE) {
        const salesperson = await firestore.salespersons.findByEmail(session.user.email!);
        if (!salesperson) {
            // If user is a sale but doesn't have a linked salesperson record, return empty list
            return NextResponse.json({ success: true, data: [] });
        }
        filters.salespersonId = salesperson.id;
    }

    const shipments = await firestore.shipments.findAll(filters);

    // Populate relations
    const populatedShipments = await Promise.all(
        shipments.map(async (shipment) => {
            const customer = shipment.customerId
                ? await firestore.customers.findById(shipment.customerId)
                : null;
            const salesperson = shipment.salespersonId
                ? await firestore.salespersons.findById(shipment.salespersonId)
                : null;
            const rateCardUsed = shipment.rateCardUsedId
                ? await firestore.rateCards.findById(shipment.rateCardUsedId)
                : null;

            return {
                ...shipment,
                customer,
                salesperson,
                rateCardUsed: rateCardUsed ? { name: rateCardUsed.name } : null,
            };
        })
    );

    return NextResponse.json({ success: true, data: populatedShipments });
}
