import { CostRule, CommissionMethod } from '@prisma/client';

// Use basic numbers for calculation logic to keep it simple.
// In a real app dealing with currency, use a library like decimal.js
// but here we assume the inputs are converted to numbers.

export interface CalcInputs {
    weightKg?: number | null;
    cbm?: number | null;
    sellBase?: number | null;
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

export function computeCost(inputs: CalcInputs): CostResult {
    const { weightKg = 0, cbm = 0, rateCbm = 0, rateKg = 0 } = inputs;

    const w = weightKg ?? 0;
    const v = cbm ?? 0;

    // Rule: If no kg and cbm -> NONE
    if (!w && !v) {
        return {
            costCbm: 0,
            costKg: 0,
            costFinal: 0,
            costRule: 'NONE'
        };
    }

    const costCbm = v * (rateCbm ?? 0);
    const costKg = w * (rateKg ?? 0);

    // Default rule: compare and take max
    // Note: if one is 0 (because rate is 0 or weight is 0), the other might be taken.
    // Ideally both rates should be present or at least one.

    let costFinal = 0;
    let costRule: CostRule = 'NONE';

    if (costCbm >= costKg) {
        costFinal = costCbm;
        costRule = 'CBM';
    } else {
        costFinal = costKg;
        costRule = 'KG';
    }

    // Handle case where both are 0 but inputs existed (e.g. rate is 0)
    // If cost is 0, rule might still be valid (free shipping?)

    return {
        costCbm,
        costKg,
        costFinal,
        costRule
    };
}

export function computeCommission(sellBase: number, costFinal: number): CommissionResult {
    // 4.3 Commission
    // If sellBase == costFinal -> ONEPCT = sellBase * 0.01
    // else -> DIFF = sellBase - costFinal

    // Use a small epsilon for float comparison if needed, or just exact check
    const epsilon = 0.001;
    const diff = sellBase - costFinal;

    if (Math.abs(diff) < epsilon) {
        // Equal
        return {
            commissionMethod: 'ONEPCT',
            commissionValue: sellBase * 0.01
        };
    } else {
        // Diff
        return {
            commissionMethod: 'DIFF',
            commissionValue: diff
        };
    }
}
