import { CostRule, CommissionMethod } from '@prisma/client';

export interface CalcInputs {
    weightKg?: number | null;
    cbm?: number | null;
    rateCbm?: number | null;
    rateKg?: number | null;
}

export interface CostResult {
    costCbm: number;
    costKg: number;
    costFinal: number;
    costRule: CostRule;
}

export interface CommissionResult {
    commissionMethod: CommissionMethod;
    commissionValue: number;
}

// Helper to round to 2 decimal places
function round2(num: number): number {
    return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function computeCost(inputs: CalcInputs): CostResult {
    const { weightKg = 0, cbm = 0, rateCbm = 0, rateKg = 0 } = inputs;

    const w = weightKg ?? 0;
    const v = cbm ?? 0;

    if (!w && !v) {
        return {
            costCbm: 0,
            costKg: 0,
            costFinal: 0,
            costRule: 'NONE'
        };
    }

    // Per logic doc 5.2.4: Round inputs * rates to 2 decimals
    const costCbm = round2(v * (rateCbm ?? 0));
    const costKg = round2(w * (rateKg ?? 0));

    let costFinal = 0;
    let costRule: CostRule = 'NONE';

    // Per logic doc 5.2.5: If cost_cbm >= cost_kg -> choose CBM
    if (costCbm >= costKg) {
        costFinal = costCbm;
        costRule = 'CBM';
    } else {
        costFinal = costKg;
        costRule = 'KG';
    }

    return {
        costCbm,
        costKg,
        costFinal,
        costRule
    };
}

export function computeCommission(sellBase: number, costFinal: number): CommissionResult {
    const epsilon = 0.001;
    const diff = sellBase - costFinal;

    // Per logic doc 6.2.3: If sell_base === cost_final -> 1%
    if (Math.abs(diff) < epsilon) {
        return {
            commissionMethod: 'ONEPCT',
            commissionValue: round2(sellBase * 0.01)
        };
    } else {
        // Per logic doc 6.2.4 & 203: Else -> DIFF (can be negative)
        return {
            commissionMethod: 'DIFF',
            commissionValue: round2(diff)
        };
    }
}

// Helpers for Frontend
export function formatCurrency(amount: number | null | undefined): string {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
        minimumFractionDigits: 2
    }).format(amount);
}

export function formatNumber(num: number | null | undefined, digits: number = 2): string {
    if (num === null || num === undefined) return '-';
    return new Intl.NumberFormat('th-TH', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
    }).format(num);
}

/**
 * Safely parse a string into a number
 * Returns 0 if the value cannot be parsed
 */
export function safeParseNumber(value: string | number | null | undefined): number {
    if (value === null || value === undefined || value === '') {
        return 0;
    }
    if (typeof value === 'number') {
        return isNaN(value) ? 0 : value;
    }
    const parsed = parseFloat(value.replace(/,/g, ''));
    return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse tracking number into base and suffix
 * Example: "TRK-001-A" -> { base: "TRK-001", suffix: 1 }
 * Example: "TRK-001" -> { base: "TRK-001", suffix: null }
 */
export function parseTrackingNumber(trackingNo: string): { base: string; suffix: number | null } {
    if (!trackingNo) {
        return { base: '', suffix: null };
    }

    // Check if tracking number ends with a letter suffix (e.g., -A, -B, -C)
    const suffixMatch = trackingNo.match(/^(.+)-([A-Z])$/i);
    if (suffixMatch) {
        const base = suffixMatch[1];
        const letter = suffixMatch[2].toUpperCase();
        // Convert letter to number (A=1, B=2, etc.)
        const suffix = letter.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
        return { base, suffix };
    }

    // Check if tracking number ends with a numeric suffix (e.g., -1, -2)
    const numSuffixMatch = trackingNo.match(/^(.+)-(\d+)$/);
    if (numSuffixMatch) {
        return {
            base: numSuffixMatch[1],
            suffix: parseInt(numSuffixMatch[2], 10)
        };
    }

    // No suffix found
    return { base: trackingNo, suffix: null };
}

interface ShipmentInput {
    cbm?: number | null;
    weightKg?: number | null;
    sellBase?: number | null;
    costMode?: 'AUTO' | 'MANUAL';
    costManual?: number | null;
}

interface RateInput {
    rateCbm: number;
    rateKg: number;
}

interface FullCalculationResult extends CostResult, CommissionResult {
    // Combined result from cost and commission calculation
}

export function calculateFull(shipment: ShipmentInput, rates: RateInput): FullCalculationResult {
    const costResult = computeCost({
        cbm: shipment.cbm,
        weightKg: shipment.weightKg,
        rateCbm: rates.rateCbm,
        rateKg: rates.rateKg
    });

    // If manual cost mode, use manual cost
    let finalCost = costResult.costFinal;
    let finalCostRule = costResult.costRule;

    if (shipment.costMode === 'MANUAL' && shipment.costManual !== null && shipment.costManual !== undefined) {
        finalCost = shipment.costManual;
        finalCostRule = 'MANUAL';
    }

    const commissionResult = computeCommission(
        shipment.sellBase ?? 0,
        finalCost
    );

    return {
        costCbm: costResult.costCbm,
        costKg: costResult.costKg,
        costFinal: finalCost,
        costRule: finalCostRule,
        commissionMethod: commissionResult.commissionMethod,
        commissionValue: commissionResult.commissionValue
    };
}
