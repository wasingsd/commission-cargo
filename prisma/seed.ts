/**
 * Enhanced Seed Script with More Realistic Data
 * Run: npx prisma db seed
 */

import { PrismaClient, ProductType, Transport, CostMode, CostRule, CommissionMethod } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting enhanced seed...');

    // 1. Create Users
    const hashedPassword = await bcrypt.hash('password123', 10);

    const admin = await prisma.user.upsert({
        where: { email: 'admin@prcargo.com' },
        update: {},
        create: {
            email: 'admin@prcargo.com',
            name: 'Admin User',
            password: hashedPassword,
            role: 'ADMIN'
        }
    });

    const manager = await prisma.user.upsert({
        where: { email: 'manager@prcargo.com' },
        update: {},
        create: {
            email: 'manager@prcargo.com',
            name: 'Manager',
            password: hashedPassword,
            role: 'MANAGER'
        }
    });

    console.log('✅ Users created');

    // 2. Create Salespersons
    const sales = await Promise.all([
        prisma.salesperson.upsert({
            where: { code: 'S-01' },
            update: {},
            create: { code: 'S-01', name: 'Pluy' }
        }),
        prisma.salesperson.upsert({
            where: { code: 'S-02' },
            update: {},
            create: { code: 'S-02', name: 'Knight' }
        }),
        prisma.salesperson.upsert({
            where: { code: 'S-03' },
            update: {},
            create: { code: 'S-03', name: 'Som' }
        })
    ]);

    console.log('✅ Salespersons created');

    // 3. Create Customers
    const customers = await Promise.all([
        prisma.customer.upsert({
            where: { code: 'PR-001' },
            update: {},
            create: { code: 'PR-001', name: 'ABC Trading Co.' }
        }),
        prisma.customer.upsert({
            where: { code: 'PR-014' },
            update: {},
            create: { code: 'PR-014', name: 'XYZ Imports' }
        }),
        prisma.customer.upsert({
            where: { code: 'PR-027' },
            update: {},
            create: { code: 'PR-027', name: 'Global Logistics Ltd.' }
        })
    ]);

    console.log('✅ Customers created');

    // 4. Create Active Rate Card
    const rateCard = await prisma.rateCard.create({
        data: {
            name: 'January 2026 Standard Rates',
            status: 'ACTIVE',
            effectiveFrom: new Date('2026-01-01'),
            createdById: admin.id,
            rows: {
                create: [
                    {
                        productType: 'GENERAL',
                        truckCbm: 5500,
                        truckKg: 25,
                        shipCbm: 3500,
                        shipKg: 17
                    },
                    {
                        productType: 'TISI',
                        truckCbm: 6000,
                        truckKg: 26,
                        shipCbm: 4000,
                        shipKg: 20
                    },
                    {
                        productType: 'FDA',
                        truckCbm: 6200,
                        truckKg: 35,
                        shipCbm: 4500,
                        shipKg: 26
                    },
                    {
                        productType: 'SPECIAL',
                        truckCbm: 7500,
                        truckKg: 75,
                        shipCbm: 6000,
                        shipKg: 60
                    }
                ]
            }
        }
    });

    console.log('✅ Rate card created. Fetching full details...');

    // Fetch full rate card with rows for calculation usage
    const rateCardFull = await prisma.rateCard.findUnique({
        where: { id: rateCard.id },
        include: { rows: true }
    });

    if (!rateCardFull) throw new Error("Failed to retrieve created rate card");

    // 5. Create Sample Shipments (Varied scenarios)
    const shipmentData = [
        // Normal profit scenarios
        {
            dateIn: new Date('2026-01-05'),
            trackingNo: '710062350068',
            customerId: customers[0].id,
            salespersonId: sales[0].id,
            productType: 'GENERAL' as ProductType,
            transport: 'TRUCK' as Transport,
            weightKg: 100,
            cbm: 0.5,
            sellBase: 4000,
            costMode: 'AUTO' as CostMode
        },
        {
            dateIn: new Date('2026-01-08'),
            trackingNo: '73578475778144',
            customerId: customers[1].id,
            salespersonId: sales[1].id,
            productType: 'TISI' as ProductType,
            transport: 'SHIP' as Transport,
            weightKg: 500,
            cbm: 1,
            sellBase: 12000,
            costMode: 'AUTO' as CostMode
        },
        // Loss scenario (Sell < Cost)
        {
            dateIn: new Date('2026-01-10'),
            trackingNo: '88899900011122',
            customerId: customers[2].id,
            salespersonId: sales[2].id,
            productType: 'FDA' as ProductType,
            transport: 'TRUCK' as Transport,
            weightKg: 200,
            cbm: 1.5,
            sellBase: 8000, // Cost will be ~9300 (1.5*6200), so this is a loss
            costMode: 'AUTO' as CostMode
        },
        // 1% scenario (Sell = Cost)
        {
            dateIn: new Date('2026-01-12'),
            trackingNo: '99988877766655',
            customerId: customers[0].id,
            salespersonId: sales[0].id,
            productType: 'GENERAL' as ProductType,
            transport: 'SHIP' as Transport,
            weightKg: 200,
            cbm: 1,
            sellBase: 3500, // Exactly matches cost (1*3500)
            costMode: 'AUTO' as CostMode
        },
        // Manual cost override
        {
            dateIn: new Date('2026-01-15'),
            trackingNo: '11223344556677',
            customerId: customers[1].id,
            salespersonId: sales[1].id,
            productType: 'SPECIAL' as ProductType,
            transport: 'TRUCK' as Transport,
            weightKg: 50,
            cbm: 0.3,
            sellBase: 5000,
            costMode: 'MANUAL' as CostMode,
            costManual: 3000
        }
    ];

    for (const data of shipmentData) {
        // Calculate cost based on rates
        const rateRow = rateCardFull.rows.find(r => r.productType === data.productType);
        if (!rateRow) continue;

        let rateCbm = 0, rateKg = 0;
        if (data.transport === 'TRUCK') {
            rateCbm = Number(rateRow.truckCbm);
            rateKg = Number(rateRow.truckKg);
        } else {
            rateCbm = Number(rateRow.shipCbm);
            rateKg = Number(rateRow.shipKg);
        }

        const costCbm = data.cbm * rateCbm;
        const costKg = data.weightKg * rateKg;
        const costFinal = data.costMode === 'MANUAL' && data.costManual
            ? data.costManual
            : Math.max(costCbm, costKg);

        const costRule = data.costMode === 'MANUAL'
            ? CostRule.MANUAL
            : (costCbm >= costKg ? CostRule.CBM : CostRule.KG);

        // Commission logic
        const commissionMethod = data.sellBase === costFinal ? CommissionMethod.ONEPCT : CommissionMethod.DIFF;
        const commissionValue = commissionMethod === CommissionMethod.ONEPCT
            ? data.sellBase * 0.01
            : data.sellBase - costFinal;

        await prisma.shipment.create({
            data: {
                dateIn: data.dateIn,
                trackingNo: data.trackingNo,
                customerId: data.customerId,
                salespersonId: data.salespersonId,
                productType: data.productType,
                transport: data.transport,
                weightKg: data.weightKg,
                cbm: data.cbm,
                sellBase: data.sellBase,
                costMode: data.costMode,
                costManual: data.costManual,

                costCbm,
                costKg,
                costFinal,
                costRule,
                commissionMethod,
                commissionValue,
                rateCardUsedId: rateCard.id,

                // Helper fields (optional but good for consistency)
                monthKey: data.dateIn.toISOString().substring(0, 7)
            }
        });
    }

    console.log('✅ Sample shipments created');
    console.log('🎉 Seed completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
