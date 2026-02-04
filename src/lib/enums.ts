// src/lib/enums.ts
// Enums moved from Prisma schema to standalone file

export const Role = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  STAFF: 'STAFF',
  SALE: 'SALE',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const RateCardStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
} as const;
export type RateCardStatus = (typeof RateCardStatus)[keyof typeof RateCardStatus];

export const ProductType = {
  GENERAL: 'GENERAL',
  TISI: 'TISI',
  FDA: 'FDA',
  SPECIAL: 'SPECIAL',
} as const;
export type ProductType = (typeof ProductType)[keyof typeof ProductType];

export const Transport = {
  TRUCK: 'TRUCK',
  SHIP: 'SHIP',
} as const;
export type Transport = (typeof Transport)[keyof typeof Transport];

export const Unit = {
  CBM: 'CBM',
  KG: 'KG',
} as const;
export type Unit = (typeof Unit)[keyof typeof Unit];

export const CostMode = {
  AUTO: 'AUTO',
  MANUAL: 'MANUAL',
} as const;
export type CostMode = (typeof CostMode)[keyof typeof CostMode];

export const CostRule = {
  CBM: 'CBM',
  KG: 'KG',
  MANUAL: 'MANUAL',
  NONE: 'NONE',
} as const;
export type CostRule = (typeof CostRule)[keyof typeof CostRule];

export const CommissionMethod = {
  DIFF: 'DIFF',
  ONEPCT: 'ONEPCT',
  NONE: 'NONE',
} as const;
export type CommissionMethod = (typeof CommissionMethod)[keyof typeof CommissionMethod];

export const ShipmentStatus = {
  PENDING: 'PENDING',
  IN_WAREHOUSE: 'IN_WAREHOUSE',
  DEPARTED: 'DEPARTED',
  ARRIVED: 'ARRIVED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;
export type ShipmentStatus = (typeof ShipmentStatus)[keyof typeof ShipmentStatus];

export const AuditAction = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  RECALC: 'RECALC',
  ACTIVATE: 'ACTIVATE',
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];
