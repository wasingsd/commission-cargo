// src/lib/firestore.ts
// Firestore service layer with type-safe operations

import { getDb, Collections } from './firebase';
import {
    DocumentData,
    QueryDocumentSnapshot,
    FieldValue,
    Query,
    CollectionReference,
    DocumentReference,
    WhereFilterOp,
    OrderByDirection
} from 'firebase-admin/firestore';
import {
    Role,
    RateCardStatus,
    ProductType,
    Transport,
    CostMode,
    CostRule,
    CommissionMethod,
    AuditAction,
    ShipmentStatus,
} from './enums';

// ============================================================
// Type Definitions (replacing Prisma types)
// ============================================================

export interface User {
    id: string;
    email: string;
    password?: string;
    name?: string;
    role: Role;
    createdAt: Date;
    updatedAt: Date;
}

export interface Salesperson {
    id: string;
    code: string;
    name: string;
    phone?: string;
    email?: string;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Customer {
    id: string;
    code: string;
    name?: string;
    assignedSalespersonId?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface RateRow {
    id: string;
    rateCardId: string;
    productType: ProductType;
    truckCbm: number;
    truckKg: number;
    shipCbm: number;
    shipKg: number;
}

export interface RateCard {
    id: string;
    name: string;
    status: RateCardStatus;
    effectiveFrom?: Date;
    effectiveTo?: Date;
    createdById?: string;
    createdAt: Date;
    updatedAt: Date;
    rows?: RateRow[];
}

export interface Shipment {
    id: string;
    dateIn?: Date;
    dateOut?: Date;              // ออกโกดัง
    dateArrived?: Date;          // ถึงโกดังปลายทาง
    monthKey?: string;
    trackingNo: string;
    trackingBase?: string;
    trackingSuffix?: number;
    poNo?: string;               // เลข PO
    lotNo?: string;              // ล๊อต เช่น รถ 14245
    customerId?: string;
    salespersonId?: string;
    productType: ProductType;
    transport: Transport;
    quantity?: number;           // จำนวนชิ้น
    weightKg?: number;
    dimensions?: string;         // ขนาด เช่น 23 x 35 x 15
    cbm?: number;
    sellBase?: number;
    sellUnit?: 'CBM' | 'KG';     // ราคาคิดตามหน่วยอะไร
    costMode: CostMode;
    costManual?: number;
    rateCardUsedId?: string;
    costCbm?: number;
    costKg?: number;
    costFinal?: number;
    costRule: CostRule;
    commissionMethod: CommissionMethod;
    commissionValue?: number;
    imageUrl?: string;           // ลิงก์รูป
    status?: ShipmentStatus;     // สถานะ: รอดำเนินการ, ส่งแล้ว, etc
    note?: string;
    createdAt: Date;
    updatedAt: Date;
    isConfirmed?: boolean;
    // Virtual fields for populated data
    customer?: Customer;
    salesperson?: Salesperson;
    rateCardUsed?: RateCard;
}

export interface AuditLog {
    id: string;
    actorUserId?: string;
    entityType: string;
    entityId: string;
    action: AuditAction;
    message?: string;
    beforeJson?: Record<string, unknown>;
    afterJson?: Record<string, unknown>;
    createdAt: Date;
}

// ============================================================
// Helper Functions
// ============================================================

function toDate(value: unknown): Date | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    if (typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
        return (value as { toDate: () => Date }).toDate();
    }
    if (typeof value === 'string' || typeof value === 'number') {
        return new Date(value);
    }
    return undefined;
}

function docToData<T>(doc: QueryDocumentSnapshot<DocumentData>): T {
    const data = doc.data();
    return {
        ...data,
        id: doc.id,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
        dateIn: toDate(data.dateIn),
        effectiveFrom: toDate(data.effectiveFrom),
        effectiveTo: toDate(data.effectiveTo),
    } as T;
}

// ============================================================
// Firestore Service
// ============================================================

// ============================================================
// Firestore Service
// ============================================================

const realFirestore = {
    // Get collection reference
    collection(name: string): CollectionReference {
        return getDb().collection(name);
    },

    // Get document reference
    doc(collection: string, id: string): DocumentReference {
        return getDb().collection(collection).doc(id);
    },

    // ============================================================
    // Users
    // ============================================================
    users: {
        async findAll(): Promise<User[]> {
            const snapshot = await getDb()
                .collection(Collections.USERS)
                .get();
            const users = snapshot.docs.map((doc) => docToData<User>(doc));
            return users.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
        },

        async findById(id: string): Promise<User | null> {
            const doc = await getDb().collection(Collections.USERS).doc(id).get();
            if (!doc.exists) return null;
            return docToData<User>(doc as QueryDocumentSnapshot<DocumentData>);
        },

        async findByEmail(email: string): Promise<User | null> {
            const snapshot = await getDb()
                .collection(Collections.USERS)
                .where('email', '==', email)
                .limit(1)
                .get();
            if (snapshot.empty) return null;
            return docToData<User>(snapshot.docs[0]);
        },

        async findByIds(ids: string[]): Promise<User[]> {
            if (ids.length === 0) return [];
            const refs = ids.map(id => getDb().collection(Collections.USERS).doc(id));
            const docs = await getDb().getAll(...refs);
            return docs.filter(doc => doc.exists).map(doc => docToData<User>(doc as QueryDocumentSnapshot<DocumentData>));
        },

        async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
            const now = new Date();
            const ref = getDb().collection(Collections.USERS).doc();
            const user: User = {
                ...data,
                id: ref.id,
                createdAt: now,
                updatedAt: now,
            };
            await ref.set(user);
            return user;
        },

        async update(id: string, data: Partial<User>): Promise<User | null> {
            const ref = getDb().collection(Collections.USERS).doc(id);
            await ref.update({ ...data, updatedAt: new Date() });
            const doc = await ref.get();
            if (!doc.exists) return null;
            return docToData<User>(doc as QueryDocumentSnapshot<DocumentData>);
        },
    },

    // ============================================================
    // Salespersons
    // ============================================================
    salespersons: {
        async findAll(): Promise<Salesperson[]> {
            const snapshot = await getDb()
                .collection(Collections.SALESPERSONS)
                .get();
            const results = snapshot.docs.map((doc) => docToData<Salesperson>(doc));
            return results.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
        },

        async findById(id: string): Promise<Salesperson | null> {
            const doc = await getDb().collection(Collections.SALESPERSONS).doc(id).get();
            if (!doc.exists) return null;
            return docToData<Salesperson>(doc as QueryDocumentSnapshot<DocumentData>);
        },

        async findByCode(code: string): Promise<Salesperson | null> {
            const snapshot = await getDb()
                .collection(Collections.SALESPERSONS)
                .where('code', '==', code)
                .limit(1)
                .get();
            if (snapshot.empty) return null;
            return docToData<Salesperson>(snapshot.docs[0]);
        },

        async findByIds(ids: string[]): Promise<Salesperson[]> {
            if (ids.length === 0) return [];
            const refs = ids.map(id => getDb().collection(Collections.SALESPERSONS).doc(id));
            const docs = await getDb().getAll(...refs);
            return docs.filter(doc => doc.exists).map(doc => docToData<Salesperson>(doc as QueryDocumentSnapshot<DocumentData>));
        },

        async findByEmail(email: string): Promise<Salesperson | null> {
            const snapshot = await getDb()
                .collection(Collections.SALESPERSONS)
                .where('email', '==', email)
                .limit(1)
                .get();
            if (snapshot.empty) return null;
            return docToData<Salesperson>(snapshot.docs[0]);
        },

        async create(data: Omit<Salesperson, 'id' | 'createdAt' | 'updatedAt'>): Promise<Salesperson> {
            const now = new Date();
            const ref = getDb().collection(Collections.SALESPERSONS).doc();
            const salesperson: Salesperson = {
                ...data,
                id: ref.id,
                createdAt: now,
                updatedAt: now,
            };
            await ref.set(salesperson);
            return salesperson;
        },

        async update(id: string, data: Partial<Salesperson>): Promise<Salesperson | null> {
            const ref = getDb().collection(Collections.SALESPERSONS).doc(id);
            await ref.update({ ...data, updatedAt: new Date() });
            const doc = await ref.get();
            if (!doc.exists) return null;
            return docToData<Salesperson>(doc as QueryDocumentSnapshot<DocumentData>);
        },

        async delete(id: string): Promise<void> {
            await getDb().collection(Collections.SALESPERSONS).doc(id).delete();
        },

        async countCustomers(id: string): Promise<number> {
            const snapshot = await getDb()
                .collection(Collections.CUSTOMERS)
                .where('assignedSalespersonId', '==', id)
                .count()
                .get();
            return snapshot.data().count;
        },

        async countShipments(id: string): Promise<number> {
            const snapshot = await getDb()
                .collection(Collections.SHIPMENTS)
                .where('salespersonId', '==', id)
                .where('isConfirmed', '==', true)
                .count()
                .get();
            return snapshot.data().count;
        },
    },

    // ============================================================
    // Customers
    // ============================================================
    customers: {
        async findAll(): Promise<Customer[]> {
            const snapshot = await getDb()
                .collection(Collections.CUSTOMERS)
                .get();
            const customers = snapshot.docs.map((doc) => docToData<Customer>(doc));
            return customers.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
        },

        async findById(id: string): Promise<Customer | null> {
            const doc = await getDb().collection(Collections.CUSTOMERS).doc(id).get();
            if (!doc.exists) return null;
            return docToData<Customer>(doc as QueryDocumentSnapshot<DocumentData>);
        },

        async findByCode(code: string): Promise<Customer | null> {
            const snapshot = await getDb()
                .collection(Collections.CUSTOMERS)
                .where('code', '==', code)
                .limit(1)
                .get();
            if (snapshot.empty) return null;
            return docToData<Customer>(snapshot.docs[0]);
        },

        async findByIds(ids: string[]): Promise<Customer[]> {
            if (ids.length === 0) return [];
            const refs = ids.map(id => getDb().collection(Collections.CUSTOMERS).doc(id));
            const docs = await getDb().getAll(...refs);
            return docs.filter(doc => doc.exists).map(doc => docToData<Customer>(doc as QueryDocumentSnapshot<DocumentData>));
        },

        async findBySalesperson(salespersonId: string): Promise<Customer[]> {
            const snapshot = await getDb()
                .collection(Collections.CUSTOMERS)
                .where('assignedSalespersonId', '==', salespersonId)
                .get();
            return snapshot.docs.map((doc) => docToData<Customer>(doc));
        },

        async create(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
            const now = new Date();
            const ref = getDb().collection(Collections.CUSTOMERS).doc();
            const customer: Customer = {
                ...data,
                id: ref.id,
                createdAt: now,
                updatedAt: now,
            };
            await ref.set(customer);
            return customer;
        },

        async update(id: string, data: Partial<Customer>): Promise<Customer | null> {
            const ref = getDb().collection(Collections.CUSTOMERS).doc(id);
            await ref.update({ ...data, updatedAt: new Date() });
            const doc = await ref.get();
            if (!doc.exists) return null;
            return docToData<Customer>(doc as QueryDocumentSnapshot<DocumentData>);
        },

        async delete(id: string): Promise<void> {
            await getDb().collection(Collections.CUSTOMERS).doc(id).delete();
        },
    },

    // ============================================================
    // Rate Cards
    // ============================================================
    rateCards: {
        async findAll(): Promise<RateCard[]> {
            const snapshot = await getDb()
                .collection(Collections.RATE_CARDS)
                .get();
            const cards = snapshot.docs.map((doc) => docToData<RateCard>(doc));
            return cards.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
        },

        async findById(id: string, includeRows = false): Promise<RateCard | null> {
            const doc = await getDb().collection(Collections.RATE_CARDS).doc(id).get();
            if (!doc.exists) return null;
            const rateCard = docToData<RateCard>(doc as QueryDocumentSnapshot<DocumentData>);

            if (includeRows) {
                const rowsSnapshot = await getDb()
                    .collection(Collections.RATE_CARDS)
                    .doc(id)
                    .collection('rows')
                    .get();
                rateCard.rows = rowsSnapshot.docs.map((rowDoc) => ({
                    ...rowDoc.data(),
                    id: rowDoc.id,
                    rateCardId: id,
                } as RateRow));
            }

            return rateCard;
        },

        async findActive(): Promise<RateCard | null> {
            const snapshot = await getDb()
                .collection(Collections.RATE_CARDS)
                .where('status', '==', 'ACTIVE')
                .limit(1)
                .get();
            if (snapshot.empty) return null;
            return docToData<RateCard>(snapshot.docs[0]);
        },

        async findByIds(ids: string[]): Promise<RateCard[]> {
            if (ids.length === 0) return [];
            const refs = ids.map(id => getDb().collection(Collections.RATE_CARDS).doc(id));
            const docs = await getDb().getAll(...refs);
            return docs.filter(doc => doc.exists).map(doc => docToData<RateCard>(doc as QueryDocumentSnapshot<DocumentData>));
        },

        async create(data: Omit<RateCard, 'id' | 'createdAt' | 'updatedAt'>, rows?: Omit<RateRow, 'id' | 'rateCardId'>[]): Promise<RateCard> {
            const now = new Date();
            const ref = getDb().collection(Collections.RATE_CARDS).doc();
            const rateCard: RateCard = {
                ...data,
                id: ref.id,
                createdAt: now,
                updatedAt: now,
            };

            const batch = getDb().batch();
            batch.set(ref, rateCard);

            if (rows && rows.length > 0) {
                rateCard.rows = [];
                for (const row of rows) {
                    const rowRef = ref.collection('rows').doc();
                    const rowData: RateRow = {
                        ...row,
                        id: rowRef.id,
                        rateCardId: ref.id,
                    };
                    batch.set(rowRef, rowData);
                    rateCard.rows.push(rowData);
                }
            }

            await batch.commit();
            return rateCard;
        },

        async update(id: string, data: Partial<RateCard>): Promise<RateCard | null> {
            const ref = getDb().collection(Collections.RATE_CARDS).doc(id);
            await ref.update({ ...data, updatedAt: new Date() });
            return this.findById(id, true);
        },

        async updateRows(id: string, rows: Omit<RateRow, 'id' | 'rateCardId'>[]): Promise<void> {
            const ref = getDb().collection(Collections.RATE_CARDS).doc(id);
            const batch = getDb().batch();

            // Delete existing rows
            const existingRows = await ref.collection('rows').get();
            existingRows.docs.forEach((doc) => batch.delete(doc.ref));

            // Add new rows
            for (const row of rows) {
                const rowRef = ref.collection('rows').doc();
                batch.set(rowRef, {
                    ...row,
                    id: rowRef.id,
                    rateCardId: id,
                });
            }

            batch.update(ref, { updatedAt: new Date() });
            await batch.commit();
        },

        async activate(id: string): Promise<void> {
            const batch = getDb().batch();

            // Deactivate all other cards
            const activeCards = await getDb()
                .collection(Collections.RATE_CARDS)
                .where('status', '==', 'ACTIVE')
                .get();

            activeCards.docs.forEach((doc) => {
                batch.update(doc.ref, { status: 'ARCHIVED', updatedAt: new Date() });
            });

            // Activate this card
            batch.update(getDb().collection(Collections.RATE_CARDS).doc(id), {
                status: 'ACTIVE',
                updatedAt: new Date(),
            });

            await batch.commit();
        },

        async delete(id: string): Promise<void> {
            const ref = getDb().collection(Collections.RATE_CARDS).doc(id);

            // Delete rows subcollection first
            const rows = await ref.collection('rows').get();
            const batch = getDb().batch();
            rows.docs.forEach((doc) => batch.delete(doc.ref));
            batch.delete(ref);

            await batch.commit();
        },

        async getRow(rateCardId: string, productType: ProductType): Promise<RateRow | null> {
            const snapshot = await getDb()
                .collection(Collections.RATE_CARDS)
                .doc(rateCardId)
                .collection('rows')
                .where('productType', '==', productType)
                .limit(1)
                .get();
            if (snapshot.empty) return null;
            const doc = snapshot.docs[0];
            return {
                ...doc.data(),
                id: doc.id,
                rateCardId,
            } as RateRow;
        },
    },

    // ============================================================
    // Shipments
    // ============================================================
    shipments: {
        async findAll(filters?: {
            monthKey?: string;
            customerId?: string;
            salespersonId?: string;
            startDate?: Date;
            endDate?: Date;
            isConfirmed?: boolean;
        }): Promise<Shipment[]> {
            let query: Query = getDb().collection(Collections.SHIPMENTS);

            if (filters?.monthKey) {
                query = query.where('monthKey', '==', filters.monthKey);
            }
            if (filters?.customerId) {
                query = query.where('customerId', '==', filters.customerId);
            }
            if (filters?.salespersonId) {
                query = query.where('salespersonId', '==', filters.salespersonId);
            }
            if (filters?.startDate) {
                query = query.where('dateIn', '>=', filters.startDate);
            }
            if (filters?.endDate) {
                query = query.where('dateIn', '<=', filters.endDate);
            }
            if (filters?.isConfirmed !== undefined) {
                query = query.where('isConfirmed', '==', filters.isConfirmed);
            }

            // If date filtering is active, order by dateIn to avoid index issues
            if (filters?.startDate || filters?.endDate) {
                query = query.orderBy('dateIn', 'desc');
            } else {
                query = query.orderBy('createdAt', 'desc');
            }

            const snapshot = await query.get();
            return snapshot.docs.map((doc) => docToData<Shipment>(doc));
        },

        async findById(id: string): Promise<Shipment | null> {
            const doc = await getDb().collection(Collections.SHIPMENTS).doc(id).get();
            if (!doc.exists) return null;
            return docToData<Shipment>(doc as QueryDocumentSnapshot<DocumentData>);
        },

        async findByTrackingNo(trackingNo: string): Promise<Shipment | null> {
            const snapshot = await getDb()
                .collection(Collections.SHIPMENTS)
                .where('trackingNo', '==', trackingNo)
                .limit(1)
                .get();
            if (snapshot.empty) return null;
            return docToData<Shipment>(snapshot.docs[0]);
        },

        async findByIdWithRelations(id: string): Promise<Shipment | null> {
            const shipment = await this.findById(id);
            if (!shipment) return null;

            // Populate relations
            if (shipment.customerId) {
                shipment.customer = await realFirestore.customers.findById(shipment.customerId) || undefined;
            }
            if (shipment.salespersonId) {
                shipment.salesperson = await realFirestore.salespersons.findById(shipment.salespersonId) || undefined;
            }
            if (shipment.rateCardUsedId) {
                shipment.rateCardUsed = await realFirestore.rateCards.findById(shipment.rateCardUsedId) || undefined;
            }

            return shipment;
        },

        async create(data: Omit<Shipment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Shipment> {
            const now = new Date();
            const ref = getDb().collection(Collections.SHIPMENTS).doc();
            const shipment: Shipment = {
                ...data,
                id: ref.id,
                createdAt: now,
                updatedAt: now,
            };
            await ref.set(shipment);
            return shipment;
        },

        async update(id: string, data: Partial<Shipment>): Promise<Shipment | null> {
            const ref = getDb().collection(Collections.SHIPMENTS).doc(id);
            await ref.update({ ...data, updatedAt: new Date() });
            return this.findById(id);
        },

        async delete(id: string): Promise<void> {
            await getDb().collection(Collections.SHIPMENTS).doc(id).delete();
        },

        async bulkCreate(shipments: Omit<Shipment, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Shipment[]> {
            const now = new Date();
            const batch = getDb().batch();
            const created: Shipment[] = [];

            for (const data of shipments) {
                const ref = getDb().collection(Collections.SHIPMENTS).doc();
                const shipment: Shipment = {
                    ...data,
                    id: ref.id,
                    createdAt: now,
                    updatedAt: now,
                };
                batch.set(ref, shipment);
                created.push(shipment);
            }

            await batch.commit();
            return created;
        },

        async bulkUpdate(updates: { id: string; data: Partial<Shipment> }[]): Promise<void> {
            const batch = getDb().batch();
            const now = new Date();
            for (const { id, data } of updates) {
                const ref = getDb().collection(Collections.SHIPMENTS).doc(id);
                batch.update(ref, { ...data, updatedAt: now });
            }
            await batch.commit();
        },

        async bulkDelete(ids: string[]): Promise<void> {
            const batch = getDb().batch();
            for (const id of ids) {
                const ref = getDb().collection(Collections.SHIPMENTS).doc(id);
                batch.delete(ref);
            }
            await batch.commit();
        },
    },

    // ============================================================ 
    // Audit Logs 
    // ============================================================ 
    auditLogs: {
        async findAll(filters?: {
            entityType?: string;
            entityId?: string;
            limit?: number;
        }): Promise<AuditLog[]> {
            let query: Query = getDb().collection(Collections.AUDIT_LOGS);

            if (filters?.entityType) {
                query = query.where('entityType', '==', filters.entityType);
            }
            if (filters?.entityId) {
                query = query.where('entityId', '==', filters.entityId);
            }

            query = query.orderBy('createdAt', 'desc');

            if (filters?.limit) {
                query = query.limit(filters.limit);
            }

            const snapshot = await query.get();
            return snapshot.docs.map((doc) => docToData<AuditLog>(doc));
        },

        async create(data: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog> {
            const now = new Date();
            const ref = getDb().collection(Collections.AUDIT_LOGS).doc();
            const log: AuditLog = {
                ...data,
                id: ref.id,
                createdAt: now,
            };
            await ref.set(log);
            return log;
        },
    },
};

// MOCK DB SWITCH 
import { mockFirestore } from './mock-db';

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_DB === 'true';

if (useMock) {
    console.warn('⚠️ USING MOCK DATABASE (mock-db.json) ⚠️');
}

const exportedFirestore = useMock ? (mockFirestore as any) : realFirestore;

export { exportedFirestore as firestore };
export default exportedFirestore;
