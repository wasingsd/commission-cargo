/**
 * Commission Cargo - Database Seed Script
 * Run with: npx prisma db seed
 */

import { PrismaClient, Role, ProductType, RateCardStatus } from '@prisma/client';

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
                    {
                        productType: ProductType.GENERAL,
                        truckCbm: 5500, truckKg: 55,
                        shipCbm: 4500, shipKg: 45
                    },
                    {
                        productType: ProductType.TISI,
                        truckCbm: 6500, truckKg: 65,
                        shipCbm: 5500, shipKg: 55
                    },
                    {
                        productType: ProductType.FDA,
                        truckCbm: 7000, truckKg: 70,
                        shipCbm: 6000, shipKg: 60
                    },
                    {
                        productType: ProductType.SPECIAL,
                        truckCbm: 8000, truckKg: 80,
                        shipCbm: 7000, shipKg: 70
                    },
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
