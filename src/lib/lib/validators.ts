import { z } from 'zod';
import { ProductType, Transport, Unit } from '@prisma/client';

export const RateRowSchema = z.object({
    productType: z.nativeEnum(ProductType),
    transport: z.nativeEnum(Transport),
    unit: z.nativeEnum(Unit),
    rateValue: z.number().min(0)
});

export const CreateRateCardSchema = z.object({
    name: z.string().min(1, "Name is required"),
    effectiveFrom: z.string().optional().nullable(), // ISO date string
    rows: z.array(RateRowSchema).optional()
});

export const CreateShipmentSchema = z.object({
    dateIn: z.string().optional(),
    trackingNo: z.string().min(1),
    customerId: z.string().optional(),
    salespersonId: z.string().optional(),
    productType: z.nativeEnum(ProductType),
    transport: z.nativeEnum(Transport),
    weightKg: z.number().optional(),
    cbm: z.number().optional(),
    sellBase: z.number().optional(),
    costManual: z.number().optional(),
    rateCardUsedId: z.string().optional()
});

export const UpdateShipmentSchema = CreateShipmentSchema.partial();
