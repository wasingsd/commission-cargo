import { NextResponse } from 'next/server';
import { firestore, Shipment, Customer, Salesperson, RateCard } from '@/lib/firestore';
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
            monthKey: (data.dateIn as string)?.substring(0, 7) || undefined,
            trackingNo: data.trackingNo,
            trackingBase: base,
            trackingSuffix: suffix === null ? undefined : suffix,


            customerId: data.customerId || undefined,
            salespersonId: data.salespersonId || undefined,

            productType: data.productType,
            transport: data.transport,

            weightKg: data.weightKg,
            cbm: data.cbm,

            sellBase: data.sellBase,

            costMode: data.costMode || 'AUTO',
            costManual: data.costManual || undefined,

            rateCardUsedId: rateCardId || undefined,

            costCbm: costCbm,
            costKg: costKg,
            costFinal: costFinal,
            costRule: costRule as any,

            commissionMethod: commResult.commissionMethod as any,
            commissionValue: commResult.commissionValue,
            note: body.note || undefined,
            isConfirmed: false,
        });

        // Log Activity
        const { logActivity } = await import('@/lib/audit');
        const { AuditAction } = await import('@/lib/enums');
        await logActivity({
            action: AuditAction.CREATE,
            entityType: 'SHIPMENT',
            entityId: shipment.id,
            message: `Created shipment ${shipment.trackingNo}`,
            afterJson: shipment
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
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const isConfirmedStr = searchParams.get('isConfirmed');

    // Pagination params
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20'); // Default 20 as requested

    const filters: {
        monthKey?: string;
        customerId?: string;
        salespersonId?: string;
        status?: string;
        startDate?: Date;
        endDate?: Date;
        isConfirmed?: boolean;
    } = {};

    if (month) filters.monthKey = month;
    if (customerId) filters.customerId = customerId;
    if (salesId) filters.salespersonId = salesId;
    if (status) filters.status = status;
    if (startDateStr) filters.startDate = new Date(startDateStr);
    if (endDateStr) filters.endDate = new Date(endDateStr);
    if (isConfirmedStr === 'true') filters.isConfirmed = true;
    if (isConfirmedStr === 'false') filters.isConfirmed = false;

    // Role-based filtering
    if (session.user.role === Role.SALE) {
        const salesperson = await firestore.salespersons.findByEmail(session.user.email!);
        if (!salesperson) {
            return NextResponse.json({ success: true, data: [], pagination: { total: 0, page, limit, totalPages: 0 } });
        }
        filters.salespersonId = salesperson.id;
    }

    const shipments: Shipment[] = await firestore.shipments.findAll(filters);

    // 1. Collect all unique IDs needed for population
    const customerIds = Array.from(new Set(shipments.map(s => s.customerId).filter(Boolean))) as string[];
    const salespersonIds = Array.from(new Set(shipments.map(s => s.salespersonId).filter(Boolean))) as string[];
    const rateCardIds = Array.from(new Set(shipments.map(s => s.rateCardUsedId).filter(Boolean))) as string[];

    // 2. Fetch all required relations in parallel
    const [customers, salespersons, rateCards] = await Promise.all([
        customerIds.length > 0 ? firestore.customers.findByIds(customerIds) : Promise.resolve([]),
        salespersonIds.length > 0 ? firestore.salespersons.findByIds(salespersonIds) : Promise.resolve([]),
        rateCardIds.length > 0 ? firestore.rateCards.findByIds(rateCardIds) : Promise.resolve([]),
    ]) as [Customer[], Salesperson[], RateCard[]];

    // 3. Create maps for O(1) lookup
    const customerMap = new Map(customers.map((c) => [c.id, c]));
    const salespersonMap = new Map(salespersons.map((s) => [s.id, s]));
    const rateCardMap = new Map(rateCards.map((r) => [r.id, r]));

    // 4. Populate shipments
    const populatedShipments = shipments.map((shipment) => {
        const customer = shipment.customerId ? customerMap.get(shipment.customerId) : null;
        const salesperson = shipment.salespersonId ? salespersonMap.get(shipment.salespersonId) : null;
        const rateCardUsed = shipment.rateCardUsedId ? rateCardMap.get(shipment.rateCardUsedId) : null;

        return {
            ...shipment,
            customer: customer || null,
            salesperson: salesperson || null,
            rateCardUsed: rateCardUsed ? { name: rateCardUsed.name } : null,
        };
    });

    // Derived Status Filtering
    let finalData = populatedShipments;
    if (status) {
        finalData = populatedShipments.filter(item => {
            const cost = item.costFinal || 0;
            const sell = item.sellBase || 0;
            const derivedStatus = cost > sell ? 'LOSS' :
                (cost === 0) ? 'MISSING' : 'NORMAL';
            return derivedStatus === status;
        });
    }

    // Search filter
    if (search) {
        const lowerSearch = search.toLowerCase();
        finalData = finalData.filter(item =>
            item.trackingNo?.toLowerCase().includes(lowerSearch) ||
            item.customer?.code?.toLowerCase().includes(lowerSearch)
        );
    }

    const totalCount = finalData.length;

    // Apply slicing
    const startIndex = (page - 1) * limit;
    const paginatedData = finalData.slice(startIndex, startIndex + limit);

    return NextResponse.json({
        success: true,
        data: paginatedData,
        pagination: {
            total: totalCount,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit)
        }
    });
}
