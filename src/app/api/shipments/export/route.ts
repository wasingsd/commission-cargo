import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { firestore } from '@/lib/firestore';
import * as XLSX from 'xlsx';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Get all shipments with relations
        const shipments = await firestore.shipments.findAll();

        // Get all customers and salespersons for lookup
        const customers = await firestore.customers.findAll();
        const salespersons = await firestore.salespersons.findAll();

        const customerMap: Map<string, any> = new Map(customers.map((c: any) => [c.id, c]));
        const salespersonMap: Map<string, any> = new Map(salespersons.map((s: any) => [s.id, s]));

        // Transform data for Excel (Matching Bulk Import Format)
        const excelData = shipments.map((s: any) => {
            const customer = s.customerId ? customerMap.get(s.customerId) : null;

            // Date formatter for Import standard (YYYY-MM-DD)
            const formatDate = (date: Date | undefined) => {
                if (!date) return '';
                const d = new Date(date);
                if (isNaN(d.getTime())) return '';
                return d.toISOString().split('T')[0];
            };

            return {
                trackingNo: s.trackingNo || '',
                customerCode: customer?.code || '',
                poNo: s.poNo || '',
                lotNo: s.lotNo || '',
                productType: s.productType, // GENERAL, TISI, etc.
                transport: s.transport,     // TRUCK, SHIP
                dateIn: formatDate(s.dateIn),
                dateOut: formatDate(s.dateOut),
                dateArrived: formatDate(s.dateArrived),
                status: s.status,           // PENDING, ARRIVED, etc.
                weightKg: s.weightKg || 0,
                cbm: s.cbm || 0,
                sellBase: s.sellBase || 0,
                sellUnit: s.sellUnit || 'CBM',
                quantity: s.quantity || 1,
                dimensions: s.dimensions || '',
                note: s.note || '',
                profit: s.commissionValue || 0 // Column R
            };
        });

        // Create workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);

        // Set column widths
        ws['!cols'] = [
            { wch: 20 },  // trackingNo
            { wch: 15 },  // customerCode
            { wch: 15 },  // poNo
            { wch: 15 },  // lotNo
            { wch: 12 },  // productType
            { wch: 10 },  // transport
            { wch: 12 },  // dateIn
            { wch: 12 },  // dateOut
            { wch: 12 },  // dateArrived
            { wch: 15 },  // status
            { wch: 12 },  // weightKg
            { wch: 12 },  // cbm
            { wch: 12 },  // sellBase
            { wch: 8 },   // sellUnit
            { wch: 8 },   // quantity
            { wch: 15 },  // dimensions
            { wch: 25 },  // note
            { wch: 15 },  // profit (R)
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Shipments');

        // Generate array (Uint8Array)
        const array = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

        // Generate filename with date
        const now = new Date();
        const dateStr = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
        const filename = `shipments_export_${dateStr}.xlsx`;

        return new NextResponse(array, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Access-Control-Expose-Headers': 'Content-Disposition',
            },
        });
    } catch (error: any) {
        console.error('Export error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
