import { z } from 'zod';
import { ProductType, Transport } from './enums';

// Use z.enum with the actual values since we're no longer using Prisma
const ProductTypeEnum = z.enum(['GENERAL', 'TISI', 'FDA', 'SPECIAL']);
const TransportEnum = z.enum(['TRUCK', 'SHIP']);
const CostModeEnum = z.enum(['AUTO', 'MANUAL']);

export const RateRowSchema = z.object({
    productType: ProductTypeEnum,
    truckCbm: z.number().min(0).default(0),
    truckKg: z.number().min(0).default(0),
    shipCbm: z.number().min(0).default(0),
    shipKg: z.number().min(0).default(0),
});

export const CreateRateCardSchema = z.object({
    name: z.string().min(1, "Name is required"),
    effectiveFrom: z.string().optional().nullable(),
    rows: z.array(RateRowSchema).optional()
});

export const CreateShipmentSchema = z.object({
    dateIn: z.string().optional(),
    trackingNo: z.string().min(1),
    customerId: z.string().optional(),
    salespersonId: z.string().optional(),
    productType: ProductTypeEnum,
    transport: TransportEnum,
    weightKg: z.number().optional(),
    cbm: z.number().optional(),
    sellBase: z.number().optional(),
    costMode: CostModeEnum.optional().default('AUTO'),
    costManual: z.number().optional(),
    rateCardUsedId: z.string().optional()
});

export const UpdateShipmentSchema = CreateShipmentSchema.partial();

export const CreateUserSchema = z.object({
    email: z.string().email("กรุณากรอกอีเมลที่ถูกต้อง"),
    name: z.string().min(1, "กรุณากรอกชื่อ"),
    role: z.enum(['ADMIN', 'MANAGER', 'STAFF', 'SALE']),
    password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร").optional().or(z.literal('')),
});
