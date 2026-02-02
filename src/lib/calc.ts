import { CostRule, CommissionMethod } from './enums';

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
