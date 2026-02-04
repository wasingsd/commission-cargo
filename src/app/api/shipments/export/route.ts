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

        const customerMap = new Map(customers.map(c => [c.id, c]));
        const salespersonMap = new Map(salespersons.map(s => [s.id, s]));

        // Transform data for Excel
        const excelData = shipments.map((s, index) => {
            const customer = s.customerId ? customerMap.get(s.customerId) : null;
            const salesperson = s.salespersonId ? salespersonMap.get(s.salespersonId) : null;

            // Map product type to Thai
            const productTypeLabel: Record<string, string> = {
                'GENERAL': 'ทั่วไป',
                'TISI': 'มอก.',
                'FDA': 'อย.',
                'SPECIAL': 'พิเศษ'
            };

            // Map status to Thai
            const statusLabel: Record<string, string> = {
                'PENDING': 'รอดำเนินการ',
                'IN_WAREHOUSE': 'ในโกดัง',
                'DEPARTED': 'ออกโกดัง',
                'ARRIVED': 'ถึงปลายทาง',
                'DELIVERED': 'ส่งแล้ว',
                'CANCELLED': 'ยกเลิก'
            };

            // Format date helper
            const formatDate = (date: Date | undefined) => {
                if (!date) return '';
                const d = new Date(date);
                if (isNaN(d.getTime())) return '';
                return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
            };

            return {
                'ลำดับ': index + 1,
                'เลขพัสดุ': s.trackingNo || '',
                'เลข PO': s.poNo || '',
                'ล๊อต': s.lotNo || '',
                'ผู้ใช้งาน': customer?.code || '',
                'ชื่อลูกค้า': customer?.name || '',
                'เซลส์': salesperson?.code || '',
                'ชื่อเซลส์': salesperson?.name || '',
                'ราคาขาย': s.sellBase || 0,
                'หน่วย': s.sellUnit || 'CBM',
                'ประเภทสินค้า': productTypeLabel[s.productType] || s.productType,
                'การขนส่ง': s.transport === 'TRUCK' ? 'ทางบก' : 'ทางเรือ',
                'เข้าโกดัง': formatDate(s.dateIn),
                'ออกโกดัง': formatDate(s.dateOut),
                'ถึงปลายทาง': formatDate(s.dateArrived),
                'จำนวน': s.quantity || 1,
                'น้ำหนัก (KG)': s.weightKg || 0,
                'ขนาด': s.dimensions || '',
                'CBM': s.cbm || 0,
                'ต้นทุน': s.costFinal || 0,
                'กำไร/ค่าคอม': s.commissionValue || 0,
                'สถานะ': statusLabel[s.status || 'PENDING'] || s.status,
                'หมายเหตุ': s.note || ''
            };
        });

        // Create workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);

        // Set column widths
        ws['!cols'] = [
            { wch: 6 },   // ลำดับ
            { wch: 20 },  // เลขพัสดุ
            { wch: 12 },  // เลข PO
            { wch: 12 },  // ล๊อต
            { wch: 12 },  // ผู้ใช้งาน
            { wch: 20 },  // ชื่อลูกค้า
            { wch: 10 },  // เซลส์
            { wch: 15 },  // ชื่อเซลส์
            { wch: 12 },  // ราคาขาย
            { wch: 6 },   // หน่วย
            { wch: 12 },  // ประเภทสินค้า
            { wch: 10 },  // การขนส่ง
            { wch: 12 },  // เข้าโกดัง
            { wch: 12 },  // ออกโกดัง
            { wch: 12 },  // ถึงปลายทาง
            { wch: 8 },   // จำนวน
            { wch: 12 },  // น้ำหนัก
            { wch: 15 },  // ขนาด
            { wch: 10 },  // CBM
            { wch: 12 },  // ต้นทุน
            { wch: 12 },  // กำไร
            { wch: 12 },  // สถานะ
            { wch: 25 },  // หมายเหตุ
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
