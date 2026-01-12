/**
 * Commission Cargo - Database Seed Script
 * Run with: npx prisma db seed
 */

import { PrismaClient, Role, ProductType, Transport, Unit, RateCardStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...');

    // Create Users (without password for now - use NextAuth for auth)
    const admin = await prisma.user.upsert({
        where: { email: 'admin@commission-cargo.com' },
        update: {},
        create: {
            email: 'admin@commission-cargo.com',
            name: 'ผู้ดูแลระบบ',
            role: Role.ADMIN,
        },
    });
    console.log('✅ Created admin user:', admin.email);

    const manager = await prisma.user.upsert({
        where: { email: 'manager@commission-cargo.com' },
        update: {},
        create: {
            email: 'manager@commission-cargo.com',
            name: 'ผู้จัดการ',
            role: Role.MANAGER,
        },
    });
    console.log('✅ Created manager user:', manager.email);

    // Create Salespeople
    const salespeople = await Promise.all([
        prisma.salesperson.upsert({
            where: { code: 'S-01' },
            update: {},
            create: { code: 'S-01', name: 'สมชาย ใจดี' },
        }),
        prisma.salesperson.upsert({
            where: { code: 'S-02' },
            update: {},
            create: { code: 'S-02', name: 'สมหญิง รักงาน' },
        }),
        prisma.salesperson.upsert({
            where: { code: 'S-03' },
            update: {},
            create: { code: 'S-03', name: 'ประยุทธ์ ขยัน' },
        }),
    ]);
    console.log('✅ Created', salespeople.length, 'salespeople');

    // Create Customers
    const customers = await Promise.all([
        prisma.customer.upsert({
            where: { code: 'PR-001' },
            update: {},
            create: {
                code: 'PR-001',
                name: 'บริษัท เพชรรุ่ง จำกัด',
                assignedSalespersonId: salespeople[0].id,
            },
        }),
        prisma.customer.upsert({
            where: { code: 'PR-002' },
            update: {},
            create: {
                code: 'PR-002',
                name: 'ห้างหุ้นส่วน เจริญทอง',
                assignedSalespersonId: salespeople[0].id,
            },
        }),
        prisma.customer.upsert({
            where: { code: 'PR-003' },
            update: {},
            create: {
                code: 'PR-003',
                name: 'บริษัท สยามสตาร์ จำกัด',
                assignedSalespersonId: salespeople[1].id,
            },
        }),
        prisma.customer.upsert({
            where: { code: 'PR-004' },
            update: {},
            create: {
                code: 'PR-004',
                name: 'ร้าน มงคลพาณิชย์',
                assignedSalespersonId: salespeople[1].id,
            },
        }),
        prisma.customer.upsert({
            where: { code: 'PR-005' },
            update: {},
            create: {
                code: 'PR-005',
                name: 'บริษัท ไทยเจริญ จำกัด',
                assignedSalespersonId: salespeople[2].id,
            },
        }),
    ]);
    console.log('✅ Created', customers.length, 'customers');

    // Create Rate Card with Rates
    const rateCard = await prisma.rateCard.create({
        data: {
            name: 'เรทมาตรฐาน 2026-01',
            effectiveFrom: new Date('2026-01-01'),
            status: RateCardStatus.ACTIVE,
            createdById: admin.id,
            rows: {
                create: [
                    // GENERAL - TRUCK
                    { productType: ProductType.GENERAL, transport: Transport.TRUCK, unit: Unit.CBM, rateValue: 5500 },
                    { productType: ProductType.GENERAL, transport: Transport.TRUCK, unit: Unit.KG, rateValue: 55 },
                    // GENERAL - SHIP
                    { productType: ProductType.GENERAL, transport: Transport.SHIP, unit: Unit.CBM, rateValue: 4500 },
                    { productType: ProductType.GENERAL, transport: Transport.SHIP, unit: Unit.KG, rateValue: 45 },
                    // TISI - TRUCK
                    { productType: ProductType.TISI, transport: Transport.TRUCK, unit: Unit.CBM, rateValue: 6500 },
                    { productType: ProductType.TISI, transport: Transport.TRUCK, unit: Unit.KG, rateValue: 65 },
                    // TISI - SHIP
                    { productType: ProductType.TISI, transport: Transport.SHIP, unit: Unit.CBM, rateValue: 5500 },
                    { productType: ProductType.TISI, transport: Transport.SHIP, unit: Unit.KG, rateValue: 55 },
                    // FDA - TRUCK
                    { productType: ProductType.FDA, transport: Transport.TRUCK, unit: Unit.CBM, rateValue: 7000 },
                    { productType: ProductType.FDA, transport: Transport.TRUCK, unit: Unit.KG, rateValue: 70 },
                    // FDA - SHIP
                    { productType: ProductType.FDA, transport: Transport.SHIP, unit: Unit.CBM, rateValue: 6000 },
                    { productType: ProductType.FDA, transport: Transport.SHIP, unit: Unit.KG, rateValue: 60 },
                    // SPECIAL - TRUCK
                    { productType: ProductType.SPECIAL, transport: Transport.TRUCK, unit: Unit.CBM, rateValue: 8000 },
                    { productType: ProductType.SPECIAL, transport: Transport.TRUCK, unit: Unit.KG, rateValue: 80 },
                    // SPECIAL - SHIP
                    { productType: ProductType.SPECIAL, transport: Transport.SHIP, unit: Unit.CBM, rateValue: 7000 },
                    { productType: ProductType.SPECIAL, transport: Transport.SHIP, unit: Unit.KG, rateValue: 70 },
                ],
            },
        },
    });
    console.log('✅ Created rate card:', rateCard.name);

    // Create Audit Log for Rate Card creation
    await prisma.auditLog.create({
        data: {
            actorUserId: admin.id,
            entityType: 'RATE_CARD',
            entityId: rateCard.id,
            action: 'CREATE',
            message: `สร้างชุดเรทใหม่: ${rateCard.name}`,
        },
    });

    console.log('🎉 Database seeding completed!');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
