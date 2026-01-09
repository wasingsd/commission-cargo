/**
 * Commission Cargo - Type Definitions
 * Shared types for Frontend and Backend
 */

// ==================== ENUMS ====================

export type UserRole = 'ADMIN' | 'MANAGER' | 'STAFF' | 'SALE';
export type RateCardStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type ProductType = 'GENERAL' | 'TIS' | 'FDA' | 'SPECIAL';
export type TransportType = 'TRUCK' | 'SHIP';
export type UnitType = 'CBM' | 'KG';
export type CostMode = 'AUTO' | 'MANUAL';
export type CostRule = 'CBM' | 'KG' | 'MANUAL';
export type CommissionMethod = 'DIFF' | 'ONEPCT' | 'NONE';
export type ShipmentStatus = 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'RECALC';
export type EntityType = 'RATE_CARD' | 'RATE_ROW' | 'SHIPMENT' | 'CUSTOMER' | 'SALESPERSON' | 'USER';

// ==================== DISPLAY LABELS ====================

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
    GENERAL: 'ทั่วไป',
    TIS: 'มอก',
    FDA: 'อย',
    SPECIAL: 'พิเศษ',
};

export const TRANSPORT_TYPE_LABELS: Record<TransportType, string> = {
    TRUCK: 'รถ',
    SHIP: 'เรือ',
};

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
    CBM: 'CBM',
    KG: 'KG',
};

export const COST_MODE_LABELS: Record<CostMode, string> = {
    AUTO: 'อัตโนมัติ',
    MANUAL: 'กำหนดเอง',
};

export const RATE_CARD_STATUS_LABELS: Record<RateCardStatus, string> = {
    DRAFT: 'แบบร่าง',
    ACTIVE: 'ใช้งาน',
    ARCHIVED: 'เก็บถาวร',
};

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
    PENDING: 'รอดำเนินการ',
    IN_TRANSIT: 'กำลังขนส่ง',
    DELIVERED: 'ส่งแล้ว',
    CANCELLED: 'ยกเลิก',
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
    ADMIN: 'ผู้ดูแลระบบ',
    MANAGER: 'ผู้จัดการ',
    STAFF: 'พนักงาน',
    SALE: 'เซลล์',
};

// ==================== DATA INTERFACES ====================

export interface User {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Salesperson {
    id: string;
    salesCode: string;
    salesName: string;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Customer {
    id: string;
    customerCode: string;
    customerName: string | null;
    assignedSalespersonId: string | null;
    assignedSalesperson?: Salesperson | null;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface RateCard {
    id: string;
    name: string;
    description: string | null;
    effectiveFrom: Date;
    effectiveTo: Date | null;
    status: RateCardStatus;
    createdById: string;
    createdBy?: User;
    rateRows?: RateRow[];
    createdAt: Date;
    updatedAt: Date;
}

export interface RateRow {
    id: string;
    rateCardId: string;
    productType: ProductType;
    transport: TransportType;
    unit: UnitType;
    rateValue: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface Shipment {
    id: string;
    dateIn: Date;
    customerId: string;
    customer?: Customer;
    salespersonId: string | null;
    salesperson?: Salesperson | null;
    trackingNo: string;
    trackingBase: string | null;
    trackingSuffix: string | null;
    productType: ProductType;
    transport: TransportType;
    weightKg: number;
    cbm: number;
    sellBase: number;
    costMode: CostMode;
    costManual: number | null;
    rateCardIdUsed: string | null;
    rateCardUsed?: RateCard | null;
    costCbm: number | null;
    costKg: number | null;
    costFinal: number;
    costRule: CostRule;
    commissionMethod: CommissionMethod;
    commissionValue: number;
    status: ShipmentStatus;
    note: string | null;
    createdById: string;
    createdBy?: User;
    createdAt: Date;
    updatedAt: Date;
}

export interface AuditLog {
    id: string;
    actorUserId: string;
    actor?: User;
    entityType: EntityType;
    entityId: string;
    action: AuditAction;
    beforeJson: unknown | null;
    afterJson: unknown | null;
    message: string | null;
    createdAt: Date;
}

// ==================== API REQUEST/RESPONSE ====================

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// Shipment Filters
export interface ShipmentFilters {
    month?: string; // YYYY-MM format
    customerId?: string;
    salespersonId?: string;
    productType?: ProductType;
    transport?: TransportType;
    status?: ShipmentStatus;
    search?: string;
}

// Summary Data
export interface CommissionSummary {
    totalShipments: number;
    totalSellBase: number;
    totalCostFinal: number;
    totalCommission: number;
    avgMarginPercent: number;
}

export interface CustomerSummary extends CommissionSummary {
    customerId: string;
    customerCode: string;
    customerName: string | null;
}

export interface SalespersonSummary extends CommissionSummary {
    salespersonId: string;
    salesCode: string;
    salesName: string;
}

export interface MonthlySummary extends CommissionSummary {
    month: string; // YYYY-MM format
}

// CSV Import/Export
export interface CsvShipmentRow {
    date_in: string;
    customer_code: string;
    sales_code: string;
    sales_name: string;
    tracking_no: string;
    product_type: string;
    transport: string;
    weight_kg: string | number;
    cbm: string | number;
    cost_mode: string;
    cost_manual: string | number;
    sell_base: string | number;
    note: string;
}

export interface ImportResult {
    success: boolean;
    imported: number;
    failed: number;
    errors: Array<{
        row: number;
        message: string;
    }>;
}

// Recalculate Request
export interface RecalculateRequest {
    filters: ShipmentFilters;
    rateCardId: string;
    mode: 'update' | 'preview';
}

export interface RecalculateResult {
    affectedCount: number;
    changes: Array<{
        shipmentId: string;
        trackingNo: string;
        oldCostFinal: number;
        newCostFinal: number;
        oldCommission: number;
        newCommission: number;
    }>;
}

// ==================== FORM DATA ====================

export interface CreateShipmentInput {
    dateIn: string;
    customerId: string;
    salespersonId?: string;
    trackingNo: string;
    productType: ProductType;
    transport: TransportType;
    weightKg: number;
    cbm: number;
    sellBase: number;
    costMode: CostMode;
    costManual?: number;
    status?: ShipmentStatus;
    note?: string;
}

export interface UpdateShipmentInput extends Partial<CreateShipmentInput> {
    id: string;
}

export interface CreateRateCardInput {
    name: string;
    description?: string;
    effectiveFrom: string;
    effectiveTo?: string;
    rateRows: CreateRateRowInput[];
}

export interface CreateRateRowInput {
    productType: ProductType;
    transport: TransportType;
    unit: UnitType;
    rateValue: number;
}

export interface CreateCustomerInput {
    customerCode: string;
    customerName?: string;
    assignedSalespersonId?: string;
}

export interface CreateSalespersonInput {
    salesCode: string;
    salesName: string;
}
