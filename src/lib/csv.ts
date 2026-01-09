/**
 * Commission Cargo - CSV Utilities
 * Parse and export CSV files for shipment data
 */

import Papa from 'papaparse';
import type { CsvShipmentRow, ProductType, TransportType, CostMode } from './types';
import { safeParseNumber } from './calc';

// Product type mapping from Thai to enum
const PRODUCT_TYPE_MAP: Record<string, ProductType> = {
    'ทั่วไป': 'GENERAL',
    'general': 'GENERAL',
    'มอก': 'TIS',
    'tis': 'TIS',
    'อย': 'FDA',
    'fda': 'FDA',
    'พิเศษ': 'SPECIAL',
    'special': 'SPECIAL',
};

// Transport type mapping from Thai to enum
const TRANSPORT_TYPE_MAP: Record<string, TransportType> = {
    'รถ': 'TRUCK',
    'truck': 'TRUCK',
    'เรือ': 'SHIP',
    'ship': 'SHIP',
};

// Cost mode mapping
const COST_MODE_MAP: Record<string, CostMode> = {
    'auto': 'AUTO',
    'อัตโนมัติ': 'AUTO',
    'manual': 'MANUAL',
    'กำหนดเอง': 'MANUAL',
};

export interface ParsedShipmentRow {
    dateIn: string;
    customerCode: string;
    salesCode: string;
    salesName: string;
    trackingNo: string;
    productType: ProductType;
    transport: TransportType;
    weightKg: number;
    cbm: number;
    costMode: CostMode;
    costManual: number | null;
    sellBase: number;
    note: string;
    rowNumber: number;
    errors: string[];
}

export interface CsvParseResult {
    success: boolean;
    data: ParsedShipmentRow[];
    errors: Array<{ row: number; message: string }>;
}

/**
 * Parse CSV file content for shipment import
 */
export function parseCsvShipments(csvContent: string): CsvParseResult {
    const result = Papa.parse<CsvShipmentRow>(csvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_'),
    });

    if (result.errors.length > 0) {
        return {
            success: false,
            data: [],
            errors: result.errors.map((e) => ({
                row: e.row ?? 0,
                message: e.message,
            })),
        };
    }

    const parsedRows: ParsedShipmentRow[] = [];
    const errors: Array<{ row: number; message: string }> = [];

    result.data.forEach((row, index) => {
        const rowNumber = index + 2; // +2 because of header and 0-indexing
        const rowErrors: string[] = [];

        // Validate required fields
        if (!row.date_in) rowErrors.push('date_in is required');
        if (!row.customer_code) rowErrors.push('customer_code is required');
        if (!row.tracking_no) rowErrors.push('tracking_no is required');

        // Parse product type
        const productTypeKey = (row.product_type || '').toLowerCase().trim();
        const productType = PRODUCT_TYPE_MAP[productTypeKey];
        if (!productType) rowErrors.push(`Invalid product_type: ${row.product_type}`);

        // Parse transport type
        const transportKey = (row.transport || '').toLowerCase().trim();
        const transport = TRANSPORT_TYPE_MAP[transportKey];
        if (!transport) rowErrors.push(`Invalid transport: ${row.transport}`);

        // Parse cost mode
        const costModeKey = (row.cost_mode || 'auto').toLowerCase().trim();
        const costMode = COST_MODE_MAP[costModeKey] || 'AUTO';

        // Parse numbers
        const weightKg = safeParseNumber(row.weight_kg);
        const cbm = safeParseNumber(row.cbm);
        const sellBase = safeParseNumber(row.sell_base);
        const costManual = row.cost_manual ? safeParseNumber(row.cost_manual) : null;

        // Validate numbers
        if (weightKg <= 0 && cbm <= 0) {
            rowErrors.push('Either weight_kg or cbm must be greater than 0');
        }

        const parsed: ParsedShipmentRow = {
            dateIn: row.date_in || '',
            customerCode: (row.customer_code || '').trim(),
            salesCode: (row.sales_code || '').trim(),
            salesName: (row.sales_name || '').trim(),
            trackingNo: (row.tracking_no || '').trim(),
            productType: productType || 'GENERAL',
            transport: transport || 'TRUCK',
            weightKg,
            cbm,
            costMode,
            costManual,
            sellBase,
            note: (row.note || '').trim(),
            rowNumber,
            errors: rowErrors,
        };

        if (rowErrors.length > 0) {
            errors.push({
                row: rowNumber,
                message: rowErrors.join('; '),
            });
        }

        parsedRows.push(parsed);
    });

    return {
        success: errors.length === 0,
        data: parsedRows,
        errors,
    };
}

/**
 * Generate CSV content for export
 */
export function generateCsvExport(shipments: Array<{
    dateIn: Date | string;
    customer: { customerCode: string };
    salesperson?: { salesCode: string; salesName: string } | null;
    trackingNo: string;
    productType: ProductType;
    transport: TransportType;
    weightKg: number;
    cbm: number;
    costMode: CostMode;
    costManual: number | null;
    costCbm: number | null;
    costKg: number | null;
    costFinal: number;
    costRule: string;
    sellBase: number;
    commissionMethod: string;
    commissionValue: number;
    rateCardIdUsed: string | null;
    note: string | null;
}>): string {
    const headers = [
        'date_in',
        'customer_code',
        'sales_code',
        'sales_name',
        'tracking_no',
        'product_type',
        'transport',
        'weight_kg',
        'cbm',
        'cost_mode',
        'cost_manual',
        'cost_cbm',
        'cost_kg',
        'cost_final',
        'cost_rule',
        'sell_base',
        'commission_method',
        'commission_value',
        'rate_card_id',
        'note',
    ];

    const rows = shipments.map((s) => ({
        date_in: typeof s.dateIn === 'string' ? s.dateIn : s.dateIn.toISOString().split('T')[0],
        customer_code: s.customer.customerCode,
        sales_code: s.salesperson?.salesCode || '',
        sales_name: s.salesperson?.salesName || '',
        tracking_no: s.trackingNo,
        product_type: s.productType,
        transport: s.transport,
        weight_kg: s.weightKg,
        cbm: s.cbm,
        cost_mode: s.costMode,
        cost_manual: s.costManual ?? '',
        cost_cbm: s.costCbm ?? '',
        cost_kg: s.costKg ?? '',
        cost_final: s.costFinal,
        cost_rule: s.costRule,
        sell_base: s.sellBase,
        commission_method: s.commissionMethod,
        commission_value: s.commissionValue,
        rate_card_id: s.rateCardIdUsed ?? '',
        note: s.note ?? '',
    }));

    return Papa.unparse(rows, { header: true, columns: headers });
}

/**
 * Download CSV file
 */
export function downloadCsv(content: string, filename: string): void {
    const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Get CSV template for import
 */
export function getCsvTemplate(): string {
    const headers = [
        'date_in',
        'customer_code',
        'sales_code',
        'sales_name',
        'tracking_no',
        'product_type',
        'transport',
        'weight_kg',
        'cbm',
        'cost_mode',
        'cost_manual',
        'sell_base',
        'note',
    ];

    const exampleRow = {
        date_in: '2026-01-09',
        customer_code: 'PR-001',
        sales_code: 'S-01',
        sales_name: 'สมชาย',
        tracking_no: '7100123456',
        product_type: 'ทั่วไป',
        transport: 'รถ',
        weight_kg: '50',
        cbm: '0.5',
        cost_mode: 'AUTO',
        cost_manual: '',
        sell_base: '3500',
        note: '',
    };

    return Papa.unparse([exampleRow], { header: true, columns: headers });
}
