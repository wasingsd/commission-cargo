
import * as fs from 'fs';
import * as path from 'path';
import type {
    User, Salesperson, Customer, RateCard, RateRow, Shipment, AuditLog
} from './firestore';
import { Collections } from './firebase';

const DB_FILE = path.join(process.cwd(), 'mock-db.json');

interface MockData {
    [Collections.USERS]: User[];
    [Collections.SALESPERSONS]: Salesperson[];
    [Collections.CUSTOMERS]: Customer[];
    [Collections.RATE_CARDS]: RateCard[];
    [Collections.SHIPMENTS]: Shipment[];
    [Collections.AUDIT_LOGS]: AuditLog[];
}

const initialData: MockData = {
    [Collections.USERS]: [],
    [Collections.SALESPERSONS]: [],
    [Collections.CUSTOMERS]: [],
    [Collections.RATE_CARDS]: [],
    [Collections.SHIPMENTS]: [],
    [Collections.AUDIT_LOGS]: [],
};

// Helper for dates
const serialize = (data: any): any => {
    return JSON.parse(JSON.stringify(data));
};

const deserialize = (data: any): any => {
    // Revive dates
    return JSON.parse(JSON.stringify(data), (key, value) => {
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
            return new Date(value);
        }
        return value;
    });
};

class MockDB {
    private data: MockData;

    constructor() {
        this.data = this.load();
    }

    private load(): MockData {
        if (!fs.existsSync(DB_FILE)) {
            return { ...initialData };
        }
        try {
            const content = fs.readFileSync(DB_FILE, 'utf-8');
            return { ...initialData, ...deserialize(JSON.parse(content)) };
        } catch (err) {
            console.error('Failed to load mock DB:', err);
            return { ...initialData };
        }
    }

    private save() {
        try {
            fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2));
        } catch (err) {
            console.error('Failed to save mock DB:', err);
        }
    }

    // Generic Helpers
    async find<T>(collection: keyof MockData, predicate?: (item: T) => boolean): Promise<T[]> {
        this.data = this.load(); // Reload data
        const items = this.data[collection] as unknown as T[];
        if (!predicate) return items;
        return items.filter(predicate);
    }

    async findOne<T extends { id: string }>(collection: keyof MockData, id: string): Promise<T | null> {
        this.data = this.load(); // Reload data
        const items = this.data[collection] as unknown as T[];
        return items.find(item => item.id === id) || null;
    }

    async create<T extends { id: string }>(collection: keyof MockData, item: T): Promise<T> {
        this.data = this.load(); // Reload data
        (this.data[collection] as unknown as T[]).push(item);
        this.save();
        return item;
    }

    async update<T extends { id: string }>(collection: keyof MockData, id: string, updates: Partial<T>): Promise<T | null> {
        this.data = this.load(); // Reload data
        const items = this.data[collection] as unknown as T[];
        const index = items.findIndex(item => item.id === id);
        if (index === -1) return null;

        items[index] = { ...items[index], ...updates };
        this.save();
        return items[index];
    }

    async delete(collection: keyof MockData, id: string): Promise<void> {
        this.data = this.load(); // Reload data
        const items = this.data[collection] as unknown as any[];
        this.data[collection] = items.filter(item => item.id !== id) as any;
        this.save();
    }
}

const db = new MockDB();
const generateId = () => Math.random().toString(36).substring(2, 15);

// Mock implementation matching src/lib/firestore.ts structure
export const mockFirestore = {
    collection: () => { throw new Error('Direct collection access not supported in mock'); },
    doc: () => { throw new Error('Direct doc access not supported in mock'); },

    users: {
        async findAll() { return db.find<User>(Collections.USERS); },
        async findById(id: string) { return db.findOne<User>(Collections.USERS, id); },
        async findByEmail(email: string) {
            const found = await db.find<User>(Collections.USERS, u => u.email === email);
            return found[0] || null;
        },
        async findByIds(ids: string[]) { return db.find<User>(Collections.USERS, u => ids.includes(u.id)); },
        async create(data: any) { return db.create(Collections.USERS, { ...data, id: generateId(), createdAt: new Date(), updatedAt: new Date() }); },
        async update(id: string, data: any) { return db.update(Collections.USERS, id, { ...data, updatedAt: new Date() }); },
    },

    salespersons: {
        async findAll() { return db.find<Salesperson>(Collections.SALESPERSONS); },
        async findById(id: string) { return db.findOne<Salesperson>(Collections.SALESPERSONS, id); },
        async findByCode(code: string) {
            const found = await db.find<Salesperson>(Collections.SALESPERSONS, s => s.code === code);
            return found[0] || null;
        },
        async findByIds(ids: string[]) { return db.find<Salesperson>(Collections.SALESPERSONS, s => ids.includes(s.id)); },
        async findByEmail(email: string) {
            const found = await db.find<Salesperson>(Collections.SALESPERSONS, s => s.email === email);
            return found[0] || null;
        },
        async create(data: any) { return db.create(Collections.SALESPERSONS, { ...data, id: generateId(), createdAt: new Date(), updatedAt: new Date() }); },
        async update(id: string, data: any) { return db.update(Collections.SALESPERSONS, id, { ...data, updatedAt: new Date() }); },
        async delete(id: string) { return db.delete(Collections.SALESPERSONS, id); },
        async countCustomers(id: string) {
            const customers = await db.find<Customer>(Collections.CUSTOMERS, c => c.assignedSalespersonId === id);
            return customers.length;
        },
        async countShipments(id: string) {
            const shipments = await db.find<Shipment>(Collections.SHIPMENTS, s => s.salespersonId === id && s.isConfirmed !== false);
            return shipments.length;
        },
    },

    customers: {
        async findAll() { return db.find<Customer>(Collections.CUSTOMERS); },
        async findById(id: string) { return db.findOne<Customer>(Collections.CUSTOMERS, id); },
        async findByCode(code: string) {
            const found = await db.find<Customer>(Collections.CUSTOMERS, c => c.code === code);
            return found[0] || null;
        },
        async findByIds(ids: string[]) { return db.find<Customer>(Collections.CUSTOMERS, c => ids.includes(c.id)); },
        async findBySalesperson(id: string) { return db.find<Customer>(Collections.CUSTOMERS, c => c.assignedSalespersonId === id); },
        async create(data: any) { return db.create(Collections.CUSTOMERS, { ...data, id: generateId(), createdAt: new Date(), updatedAt: new Date() }); },
        async update(id: string, data: any) { return db.update(Collections.CUSTOMERS, id, { ...data, updatedAt: new Date() }); },
        async delete(id: string) { return db.delete(Collections.CUSTOMERS, id); },
    },

    rateCards: {
        async findAll() { return db.find<RateCard>(Collections.RATE_CARDS); },
        async findById(id: string, includeRows = false) {
            const card = await db.findOne<RateCard>(Collections.RATE_CARDS, id);
            // Rows are stored in-memory on the object for simple mock
            return card;
        },
        async findActive() {
            const found = await db.find<RateCard>(Collections.RATE_CARDS, r => r.status === 'ACTIVE');
            return found[0] || null;
        },
        async findByIds(ids: string[]) { return db.find<RateCard>(Collections.RATE_CARDS, r => ids.includes(r.id)); },
        async create(data: any, rows: any[] = []) {
            const card = { ...data, id: generateId(), createdAt: new Date(), updatedAt: new Date(), rows: [] };
            if (rows) {
                card.rows = rows.map((r: any) => ({ ...r, id: generateId(), rateCardId: card.id }));
            }
            return db.create(Collections.RATE_CARDS, card);
        },
        async update(id: string, data: any) { return db.update(Collections.RATE_CARDS, id, { ...data, updatedAt: new Date() }); },
        async updateRows(id: string, rows: any[]) {
            const card = await db.findOne<RateCard>(Collections.RATE_CARDS, id);
            if (card) {
                card.rows = rows.map(r => ({ ...r, id: generateId(), rateCardId: id }));
                await db.update(Collections.RATE_CARDS, id, card);
            }
        },
        async activate(id: string) {
            const all = await db.find<RateCard>(Collections.RATE_CARDS);
            for (const c of all) {
                if (c.status === 'ACTIVE') await db.update<RateCard>(Collections.RATE_CARDS, c.id, { status: 'ARCHIVED' });
            }
            await db.update<RateCard>(Collections.RATE_CARDS, id, { status: 'ACTIVE' });
        },
        async delete(id: string) { return db.delete(Collections.RATE_CARDS, id); },
        async getRow(cardId: string, type: string) {
            const card = await db.findOne<RateCard>(Collections.RATE_CARDS, cardId);
            return card?.rows?.find((r: any) => r.productType === type) || null;
        },
    },

    shipments: {
        async findAll(filters: any) {
            return db.find<Shipment>(Collections.SHIPMENTS, s => {
                if (filters?.monthKey && s.monthKey !== filters.monthKey) return false;
                if (filters?.customerId && s.customerId !== filters.customerId) return false;
                if (filters?.salespersonId && s.salespersonId !== filters.salespersonId) return false;
                if (filters?.startDate) {
                    const d = s.dateIn ? new Date(s.dateIn) : null;
                    if (!d || d < new Date(filters.startDate)) return false;
                }
                if (filters?.endDate) {
                    const d = s.dateIn ? new Date(s.dateIn) : null;
                    if (!d || d > new Date(filters.endDate)) return false;
                }
                if (filters?.isConfirmed !== undefined) {
                    if (s.isConfirmed !== filters.isConfirmed) return false;
                }
                return true;
            });
        },
        async findById(id: string) { return db.findOne<Shipment>(Collections.SHIPMENTS, id); },
        async findByTrackingNo(trackingNo: string) {
            const found = await db.find<Shipment>(Collections.SHIPMENTS, s => s.trackingNo === trackingNo);
            return found[0] || null;
        },
        async findByIdWithRelations(id: string) {
            const shipment = await db.findOne<Shipment>(Collections.SHIPMENTS, id);
            if (!shipment) return null;
            // Manual populate
            if (shipment.customerId) {
                shipment.customer = await mockFirestore.customers.findById(shipment.customerId) || undefined;
            }
            if (shipment.salespersonId) {
                shipment.salesperson = await mockFirestore.salespersons.findById(shipment.salespersonId) || undefined;
            }
            return shipment;
        },
        async create(data: any) { return db.create(Collections.SHIPMENTS, { ...data, id: generateId(), createdAt: new Date(), updatedAt: new Date() }); },
        async update(id: string, data: any) { return db.update(Collections.SHIPMENTS, id, { ...data, updatedAt: new Date() }); },
        async delete(id: string) { return db.delete(Collections.SHIPMENTS, id); },
        async bulkCreate(shipments: any[]) {
            const created = [];
            for (const s of shipments) {
                created.push(await this.create(s));
            }
            return created;
        },
        async bulkUpdate(updates: any[]) {
            for (const { id, data } of updates) {
                await this.update(id, data);
            }
        },
        async bulkDelete(ids: string[]) {
            for (const id of ids) {
                await this.delete(id);
            }
        },
    },

    auditLogs: {
        async findAll(filters: any) {
            // Simplified sort/limit not fully implemented but returns all matching
            return db.find<AuditLog>(Collections.AUDIT_LOGS, l => {
                if (filters?.entityType && l.entityType !== filters.entityType) return false;
                if (filters?.entityId && l.entityType !== filters.entityType) return false;
                return true;
            });
        },
        async create(data: any) { return db.create(Collections.AUDIT_LOGS, { ...data, id: generateId(), createdAt: new Date() }); },
    }
};
