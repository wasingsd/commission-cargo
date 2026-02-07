
// scripts/seed-mock-data.ts
// Run with: npx tsx scripts/seed-mock-data.ts

import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';

const DB_FILE = path.join(process.cwd(), 'mock-db.json');

const now = new Date();

const initialData = {
    users: [],
    salespersons: [],
    customers: [],
    rateCards: [],
    shipments: [],
    auditLogs: [],
};

const generateId = () => Math.random().toString(36).substring(2, 15);

async function seedMockData() {
    console.log('🌱 Seeding Mock Data to mock-db.json...');

    const hashedPassword = await bcrypt.hash('password123', 10);

    const users = [
        { id: generateId(), email: 'admin@commission.com', name: 'Administrator', role: 'ADMIN', password: hashedPassword, createdAt: now, updatedAt: now },
        { id: generateId(), email: 'manager@commission.com', name: 'ผู้จัดการทั่วไป', role: 'MANAGER', password: hashedPassword, createdAt: now, updatedAt: now },
        { id: generateId(), email: 'staff@commission.com', name: 'พนักงานบันทึกข้อมูล', role: 'STAFF', password: hashedPassword, createdAt: now, updatedAt: now },
        { id: generateId(), email: 'sale01@commission.com', name: 'สมชาย ขายดี', role: 'SALE', password: hashedPassword, createdAt: now, updatedAt: now },
    ];

    const salespersons = [
        { id: generateId(), code: 'SP001', name: 'สมชาย ขายดี', phone: '081-234-5678', email: 'somchai@example.com', active: true, createdAt: now, updatedAt: now },
        { id: generateId(), code: 'SP002', name: 'สมหญิง จ๋ายาว', phone: '082-345-6789', email: 'somying@example.com', active: true, createdAt: now, updatedAt: now },
    ];

    const customers = [
        { id: generateId(), code: 'CUST001', name: 'บริษัท ABC จำกัด', assignedSalespersonId: salespersons[0].id, createdAt: now, updatedAt: now },
        { id: generateId(), code: 'CUST002', name: 'บริษัท XYZ จำกัด', assignedSalespersonId: salespersons[0].id, createdAt: now, updatedAt: now },
        { id: generateId(), code: 'CUST003', name: 'ร้านค้าสมใจ', assignedSalespersonId: salespersons[1].id, createdAt: now, updatedAt: now },
    ];

    const rateCardId = generateId();
    const rateCards = [
        {
            id: rateCardId,
            name: 'เรทมาตรฐาน 2026',
            status: 'ACTIVE',
            effectiveFrom: now,
            effectiveTo: null,
            createdAt: now,
            updatedAt: now,
            rows: [
                { id: generateId(), rateCardId: rateCardId, productType: 'GENERAL', truckCbm: 150, truckKg: 3, shipCbm: 120, shipKg: 2.5 },
                { id: generateId(), rateCardId: rateCardId, productType: 'TISI', truckCbm: 180, truckKg: 3.5, shipCbm: 150, shipKg: 3 },
                { id: generateId(), rateCardId: rateCardId, productType: 'FDA', truckCbm: 200, truckKg: 4, shipCbm: 170, shipKg: 3.5 },
                { id: generateId(), rateCardId: rateCardId, productType: 'SPECIAL', truckCbm: 250, truckKg: 5, shipCbm: 200, shipKg: 4 },
            ]
        }
    ];

    const data = {
        users,
        salespersons,
        customers,
        rateCards,
        shipments: [],
        auditLogs: [],
    };

    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

    console.log('✅ Mock DB created at:', DB_FILE);
    console.log('🔑 Login: admin@commission.com / password123');
}

seedMockData().catch(console.error);
