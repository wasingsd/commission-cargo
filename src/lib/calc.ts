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

    const costCbm = v * (rateCbm ?? 0);
    const costKg = w * (rateKg ?? 0);

    let costFinal = 0;
    let costRule: CostRule = 'NONE';

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

    if (Math.abs(diff) < epsilon) {
        return {
            commissionMethod: 'ONEPCT',
            commissionValue: sellBase * 0.01
        };
    } else {
        return {
            commissionMethod: 'DIFF',
            commissionValue: diff
        };
    }
}
