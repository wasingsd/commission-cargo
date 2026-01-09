/**
 * Commission Cargo - Database Seed Script
 * Run with: npx prisma db seed
 */

import { PrismaClient, UserRole, ProductType, TransportType, UnitType, RateCardStatus } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...');

    // Create Users
    const adminPassword = await hash('admin123', 12);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@commission-cargo.com' },
        update: {},
        create: {
            email: 'admin@commission-cargo.com',
            name: 'ผู้ดูแลระบบ',
            passwordHash: adminPassword,
            role: UserRole.ADMIN,
        },
    });
    console.log('✅ Created admin user:', admin.email);

    const managerPassword = await hash('manager123', 12);
    const manager = await prisma.user.upsert({
        where: { email: 'manager@commission-cargo.com' },
        update: {},
        create: {
            email: 'manager@commission-cargo.com',
            name: 'ผู้จัดการ',
            passwordHash: managerPassword,
            role: UserRole.MANAGER,
        },
    });
    console.log('✅ Created manager user:', manager.email);

    // Create Salespeople
    const salespeople = await Promise.all([
        prisma.salesperson.upsert({
            where: { salesCode: 'S-01' },
            update: {},
            create: { salesCode: 'S-01', salesName: 'สมชาย ใจดี' },
        }),
        prisma.salesperson.upsert({
            where: { salesCode: 'S-02' },
            update: {},
            create: { salesCode: 'S-02', salesName: 'สมหญิง รักงาน' },
        }),
        prisma.salesperson.upsert({
            where: { salesCode: 'S-03' },
            update: {},
            create: { salesCode: 'S-03', salesName: 'ประยุทธ์ ขยัน' },
        }),
    ]);
    console.log('✅ Created', salespeople.length, 'salespeople');

    // Create Customers
    const customers = await Promise.all([
        prisma.customer.upsert({
            where: { customerCode: 'PR-001' },
            update: {},
            create: {
                customerCode: 'PR-001',
                customerName: 'บริษัท เพชรรุ่ง จำกัด',
                assignedSalespersonId: salespeople[0].id,
            },
        }),
        prisma.customer.upsert({
            where: { customerCode: 'PR-002' },
            update: {},
            create: {
                customerCode: 'PR-002',
                customerName: 'ห้างหุ้นส่วน เจริญทอง',
                assignedSalespersonId: salespeople[0].id,
            },
        }),
        prisma.customer.upsert({
            where: { customerCode: 'PR-003' },
            update: {},
            create: {
                customerCode: 'PR-003',
                customerName: 'บริษัท สยามสตาร์ จำกัด',
                assignedSalespersonId: salespeople[1].id,
            },
        }),
        prisma.customer.upsert({
            where: { customerCode: 'PR-004' },
            update: {},
            create: {
                customerCode: 'PR-004',
                customerName: 'ร้าน มงคลพาณิชย์',
                assignedSalespersonId: salespeople[1].id,
            },
        }),
        prisma.customer.upsert({
            where: { customerCode: 'PR-005' },
            update: {},
            create: {
                customerCode: 'PR-005',
                customerName: 'บริษัท ไทยเจริญ จำกัด',
                assignedSalespersonId: salespeople[2].id,
            },
        }),
    ]);
    console.log('✅ Created', customers.length, 'customers');

    // Create Rate Card with Rates
    const rateCard = await prisma.rateCard.create({
        data: {
            name: 'เรทมาตรฐาน 2026-01',
            description: 'เรทมาตรฐานสำหรับเดือนมกราคม 2569',
            effectiveFrom: new Date('2026-01-01'),
            status: RateCardStatus.ACTIVE,
            createdById: admin.id,
            rateRows: {
                create: [
                    // GENERAL - TRUCK
                    { productType: ProductType.GENERAL, transport: TransportType.TRUCK, unit: UnitType.CBM, rateValue: 5500 },
                    { productType: ProductType.GENERAL, transport: TransportType.TRUCK, unit: UnitType.KG, rateValue: 55 },
                    // GENERAL - SHIP
                    { productType: ProductType.GENERAL, transport: TransportType.SHIP, unit: UnitType.CBM, rateValue: 4500 },
                    { productType: ProductType.GENERAL, transport: TransportType.SHIP, unit: UnitType.KG, rateValue: 45 },
                    // TIS - TRUCK
                    { productType: ProductType.TIS, transport: TransportType.TRUCK, unit: UnitType.CBM, rateValue: 6500 },
                    { productType: ProductType.TIS, transport: TransportType.TRUCK, unit: UnitType.KG, rateValue: 65 },
                    // TIS - SHIP
                    { productType: ProductType.TIS, transport: TransportType.SHIP, unit: UnitType.CBM, rateValue: 5500 },
                    { productType: ProductType.TIS, transport: TransportType.SHIP, unit: UnitType.KG, rateValue: 55 },
                    // FDA - TRUCK
                    { productType: ProductType.FDA, transport: TransportType.TRUCK, unit: UnitType.CBM, rateValue: 7000 },
                    { productType: ProductType.FDA, transport: TransportType.TRUCK, unit: UnitType.KG, rateValue: 70 },
                    // FDA - SHIP
                    { productType: ProductType.FDA, transport: TransportType.SHIP, unit: UnitType.CBM, rateValue: 6000 },
                    { productType: ProductType.FDA, transport: TransportType.SHIP, unit: UnitType.KG, rateValue: 60 },
                    // SPECIAL - TRUCK
                    { productType: ProductType.SPECIAL, transport: TransportType.TRUCK, unit: UnitType.CBM, rateValue: 8000 },
                    { productType: ProductType.SPECIAL, transport: TransportType.TRUCK, unit: UnitType.KG, rateValue: 80 },
                    // SPECIAL - SHIP
                    { productType: ProductType.SPECIAL, transport: TransportType.SHIP, unit: UnitType.CBM, rateValue: 7000 },
                    { productType: ProductType.SPECIAL, transport: TransportType.SHIP, unit: UnitType.KG, rateValue: 70 },
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
