// scripts/seed-data.ts
// Run with: npx tsx scripts/seed-data.ts

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin
if (getApps().length === 0) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
        }),
    });
}

const db = getFirestore();

async function seedData() {
    console.log('🔥 Seeding data to Firestore...\n');
    const now = new Date();

    // ============================================================
    // 1. USERS
    // ============================================================
    console.log('👤 Creating users...');

    const users = [
        { email: 'admin@commission.com', name: 'Administrator', role: 'ADMIN' },
        { email: 'manager@commission.com', name: 'ผู้จัดการทั่วไป', role: 'MANAGER' },
        { email: 'staff@commission.com', name: 'พนักงานบันทึกข้อมูล', role: 'STAFF' },
        { email: 'sale01@commission.com', name: 'สมชาย ขายดี', role: 'SALE' },
    ];

    const hashedPassword = await bcrypt.hash('password123', 10);

    for (const user of users) {
        const existing = await db.collection('users').where('email', '==', user.email).limit(1).get();
        if (existing.empty) {
            const ref = db.collection('users').doc();
            await ref.set({
                id: ref.id,
                ...user,
                password: hashedPassword,
                createdAt: now,
                updatedAt: now,
            });
            console.log(`   ✅ Created: ${user.email}`);
        } else {
            console.log(`   ⏭️  Exists: ${user.email}`);
        }
    }

    // ============================================================
    // 2. SALESPERSONS
    // ============================================================
    console.log('\n👔 Creating salespersons...');

    const salespersons = [
        { code: 'SP001', name: 'สมชาย ขายดี', phone: '081-234-5678', email: 'somchai@example.com' },
        { code: 'SP002', name: 'สมหญิง จ๋ายาว', phone: '082-345-6789', email: 'somying@example.com' },
        { code: 'SP003', name: 'มานะ ขยันคุง', phone: '083-456-7890', email: 'mana@example.com' },
    ];

    const salespersonIds: Record<string, string> = {};

    for (const sp of salespersons) {
        const existing = await db.collection('salespersons').where('code', '==', sp.code).limit(1).get();
        if (existing.empty) {
            const ref = db.collection('salespersons').doc();
            await ref.set({
                id: ref.id,
                ...sp,
                active: true,
                createdAt: now,
                updatedAt: now,
            });
            salespersonIds[sp.code] = ref.id;
            console.log(`   ✅ Created: ${sp.name} (${sp.code})`);
        } else {
            salespersonIds[sp.code] = existing.docs[0].id;
            console.log(`   ⏭️  Exists: ${sp.name} (${sp.code})`);
        }
    }

    // ============================================================
    // 3. CUSTOMERS
    // ============================================================
    console.log('\n🏢 Creating customers...');

    const customers = [
        { code: 'CUST001', name: 'บริษัท ABC จำกัด', salespersonCode: 'SP001' },
        { code: 'CUST002', name: 'บริษัท XYZ จำกัด', salespersonCode: 'SP001' },
        { code: 'CUST003', name: 'ร้านค้าสมใจ', salespersonCode: 'SP002' },
        { code: 'CUST004', name: 'โรงงานมั่นคง', salespersonCode: 'SP002' },
        { code: 'CUST005', name: 'ห้างหุ้นส่วน สำราญ', salespersonCode: 'SP003' },
    ];

    const customerIds: Record<string, string> = {};

    for (const cust of customers) {
        const existing = await db.collection('customers').where('code', '==', cust.code).limit(1).get();
        if (existing.empty) {
            const ref = db.collection('customers').doc();
            await ref.set({
                id: ref.id,
                code: cust.code,
                name: cust.name,
                assignedSalespersonId: salespersonIds[cust.salespersonCode] || null,
                createdAt: now,
                updatedAt: now,
            });
            customerIds[cust.code] = ref.id;
            console.log(`   ✅ Created: ${cust.name} (${cust.code})`);
        } else {
            customerIds[cust.code] = existing.docs[0].id;
            console.log(`   ⏭️  Exists: ${cust.name} (${cust.code})`);
        }
    }

    // ============================================================
    // 4. RATE CARDS
    // ============================================================
    console.log('\n📊 Creating rate cards...');

    const rateCardExists = await db.collection('rateCards').where('status', '==', 'ACTIVE').limit(1).get();
    let activeRateCardId: string;

    if (rateCardExists.empty) {
        const rateCardRef = db.collection('rateCards').doc();
        activeRateCardId = rateCardRef.id;

        await rateCardRef.set({
            id: rateCardRef.id,
            name: 'เรทมาตรฐาน 2026',
            status: 'ACTIVE',
            effectiveFrom: now,
            effectiveTo: null,
            createdAt: now,
            updatedAt: now,
        });

        // Add rate rows
        const rateRows = [
            { productType: 'GENERAL', truckCbm: 150, truckKg: 3, shipCbm: 120, shipKg: 2.5 },
            { productType: 'TISI', truckCbm: 180, truckKg: 3.5, shipCbm: 150, shipKg: 3 },
            { productType: 'FDA', truckCbm: 200, truckKg: 4, shipCbm: 170, shipKg: 3.5 },
            { productType: 'SPECIAL', truckCbm: 250, truckKg: 5, shipCbm: 200, shipKg: 4 },
        ];

        for (const row of rateRows) {
            const rowRef = rateCardRef.collection('rows').doc();
            await rowRef.set({
                id: rowRef.id,
                rateCardId: rateCardRef.id,
                ...row,
            });
        }

        console.log('   ✅ Created: เรทมาตรฐาน 2026 (ACTIVE) with 4 rate rows');
    } else {
        activeRateCardId = rateCardExists.docs[0].id;
        console.log('   ⏭️  Active rate card already exists');
    }

    // ============================================================
    // 5. SAMPLE SHIPMENTS
    // ============================================================
    console.log('\n📦 Creating sample shipments...');

    const shipmentsCount = await db.collection('shipments').count().get();

    if (shipmentsCount.data().count === 0) {
        const shipments = [
            {
                trackingNo: 'TRK001-1',
                trackingBase: 'TRK001',
                trackingSuffix: 1,
                customerCode: 'CUST001',
                salespersonCode: 'SP001',
                productType: 'GENERAL',
                transport: 'TRUCK',
                weightKg: 150,
                cbm: 2.5,
                sellBase: 500,
                costMode: 'AUTO',
                costCbm: 375,
                costKg: 450,
                costFinal: 450,
                costRule: 'KG',
                commissionMethod: 'DIFF',
                commissionValue: 50,
            },
            {
                trackingNo: 'TRK002-1',
                trackingBase: 'TRK002',
                trackingSuffix: 1,
                customerCode: 'CUST002',
                salespersonCode: 'SP001',
                productType: 'TISI',
                transport: 'SHIP',
                weightKg: 500,
                cbm: 3.0,
                sellBase: 2000,
                costMode: 'AUTO',
                costCbm: 450,
                costKg: 1500,
                costFinal: 1500,
                costRule: 'KG',
                commissionMethod: 'DIFF',
                commissionValue: 500,
            },
            {
                trackingNo: 'TRK003-1',
                trackingBase: 'TRK003',
                trackingSuffix: 1,
                customerCode: 'CUST003',
                salespersonCode: 'SP002',
                productType: 'FDA',
                transport: 'TRUCK',
                weightKg: 80,
                cbm: 1.2,
                sellBase: 350,
                costMode: 'AUTO',
                costCbm: 240,
                costKg: 320,
                costFinal: 320,
                costRule: 'KG',
                commissionMethod: 'ONEPCT',
                commissionValue: 3.5,
            },
        ];

        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        for (const shipment of shipments) {
            const ref = db.collection('shipments').doc();
            await ref.set({
                id: ref.id,
                dateIn: now,
                monthKey,
                trackingNo: shipment.trackingNo,
                trackingBase: shipment.trackingBase,
                trackingSuffix: shipment.trackingSuffix,
                customerId: customerIds[shipment.customerCode] || null,
                salespersonId: salespersonIds[shipment.salespersonCode] || null,
                productType: shipment.productType,
                transport: shipment.transport,
                weightKg: shipment.weightKg,
                cbm: shipment.cbm,
                sellBase: shipment.sellBase,
                costMode: shipment.costMode,
                costManual: null,
                rateCardUsedId: activeRateCardId,
                costCbm: shipment.costCbm,
                costKg: shipment.costKg,
                costFinal: shipment.costFinal,
                costRule: shipment.costRule,
                commissionMethod: shipment.commissionMethod,
                commissionValue: shipment.commissionValue,
                note: null,
                createdAt: now,
                updatedAt: now,
            });
            console.log(`   ✅ Created: ${shipment.trackingNo}`);
        }
    } else {
        console.log(`   ⏭️  Shipments already exist (${shipmentsCount.data().count} records)`);
    }

    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('\n' + '='.repeat(50));
    console.log('🎉 Database seeding completed!\n');
    console.log('📧 Login credentials:');
    console.log('   Admin:   admin@commission.com / password123');
    console.log('   Manager: manager@commission.com / password123');
    console.log('   Staff:   staff@commission.com / password123');
    console.log('   Sale:    sale01@commission.com / password123');
    console.log('\n🌐 Open http://localhost:3000/login to get started!');
    console.log('='.repeat(50));
}

seedData()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('❌ Error seeding data:', err);
        process.exit(1);
    });
