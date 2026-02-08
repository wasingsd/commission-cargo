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

        // Get all customers for lookup
        const customers = await firestore.customers.findAll();

        const customerMap: Map<string, any> = new Map(customers.map((c: any) => [c.id, c]));

        // Helper for translation
        const PRODUCT_TYPE_LABELS: Record<string, string> = {
            GENERAL: 'ทั่วไป',
            TISI: 'มอก',
            FDA: 'อย',
            SPECIAL: 'พิเศษ',
        };

        const SHIPMENT_STATUS_LABELS: Record<string, string> = {
            PENDING: 'รอดำเนินการ',
            IN_TRANSIT: 'กำลังขนส่ง',
            DELIVERED: 'ส่งแล้ว',
            CANCELLED: 'ยกเลิก',
        };

        // Date formatter for Thai style or just YYYY-MM-DD as requested? User didn't specify format, but usually for export YYYY-MM-DD is safe.
        // Let's stick to YYYY-MM-DD for consistency with previous code.
        const formatDate = (date: Date | undefined) => {
            if (!date) return '';
            const d = new Date(date);
            if (isNaN(d.getTime())) return '';
            return d.toISOString().split('T')[0];
        };

        // Transform data for Excel
        const excelData = shipments.map((s: any) => {
            const customer = s.customerId ? customerMap.get(s.customerId) : null;

            return {
                'เลขพัสดุ': s.trackingNo || '',
                'เลข PO': s.poNo || '',
                'ล๊อต': s.lotNo || '',
                'ผู้ใช้งาน': customer?.code || '',
                'ราคา': s.sellBase || 0,
                'ประเภทสินค้า': PRODUCT_TYPE_LABELS[s.productType] || s.productType,
                'เข้าโกดัง': formatDate(s.dateIn),
                'ออกโกดัง': formatDate(s.dateOut),
                'ถึงโกดังปลายทาง': formatDate(s.dateArrived),
                'จำนวน': s.quantity || 0,
                'KG': s.weightKg || 0,
                'ขนาด': s.dimensions || '',
                'CBM': s.cbm || 0,
                'รูป': s.imageUrl || '',
                'สถานะ': SHIPMENT_STATUS_LABELS[s.status] || s.status
            };
        });

        // Create workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);

        // Set column widths
        ws['!cols'] = [
            { wch: 20 },  // เลขพัสดุ
            { wch: 15 },  // เลข PO
            { wch: 15 },  // ล๊อต
            { wch: 15 },  // ผู้ใช้งาน
            { wch: 12 },  // ราคา
            { wch: 12 },  // ประเภทสินค้า
            { wch: 12 },  // เข้าโกดัง
            { wch: 12 },  // ออกโกดัง
            { wch: 15 },  // ถึงโกดังปลายทาง
            { wch: 10 },  // จำนวน
            { wch: 10 },  // KG
            { wch: 15 },  // ขนาด
            { wch: 10 },  // CBM
            { wch: 30 },  // รูป
            { wch: 15 },  // สถานะ
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
