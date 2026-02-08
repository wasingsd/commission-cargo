'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
    ArrowLeft,
    Upload,
    FileSpreadsheet,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Info,
    Package,
    X,
    Download,
    HelpCircle,
    FileUp,
    Trash2
} from 'lucide-react';

interface ParsedRow {
    trackingNo: string;
    customerCode: string;
    poNo?: string;
    lotNo?: string;
    sellBase?: number;
    sellUnit?: 'CBM' | 'KG';
    productType?: 'GENERAL' | 'TISI' | 'FDA' | 'SPECIAL';
    transport?: 'TRUCK' | 'SHIP';
    dateIn?: string;
    dateOut?: string;
    dateArrived?: string;
    quantity?: number;
    weightKg?: number;
    dimensions?: string;
    cbm?: number;
    status?: string;
    note?: string;
}

export function BulkImportPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState('');
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [error, setError] = useState('');
    const [showHelp, setShowHelp] = useState(false);
    const [result, setResult] = useState<{
        success: number;
        failed: number;
        errors: { row: number; tracking: string; error: string }[];
    } | null>(null);

    const parseProductType = (text: string): 'GENERAL' | 'TISI' | 'FDA' | 'SPECIAL' | undefined => {
        if (!text) return undefined;
        const lower = text.toLowerCase().trim();
        if (!lower || lower === '-') return undefined;
        if (lower.includes('พิเศษ') || lower === 'special') return 'SPECIAL';
        if (lower.includes('มอก') || lower === 'tisi') return 'TISI';
        if (lower.includes('fda') || lower.includes('อาหาร') || lower.includes('ยา') || lower.includes('อย')) return 'FDA';
        return 'GENERAL';
    };

    const parseTransport = (text: string): 'TRUCK' | 'SHIP' | undefined => {
        if (!text) return undefined;
        const lower = text.toLowerCase().trim();
        if (!lower || lower === '-') return undefined;
        if (lower.includes('เรือ') || lower === 'ship' || lower === 'sea' || lower.includes('ทะเล')) return 'SHIP';
        if (lower.includes('รถ') || lower === 'truck') return 'TRUCK';
        return 'TRUCK'; // Default to TRUCK if text exists but matches nothing? Or undefined? 
        // User says "Lot column specifies Truck or Ship". If it's just a Lot ID like '1234' without keywords, we shouldn't force it?
        // But legacy behavior might expect 'TRUCK' default. 
        // Safer: If keyword found -> set. If no keyword -> Undefined (Keep existing).
        // Let's change strictly:
        // return undefined; 
        // However, if the user explicitly puts "Truck" in Lot, we get TRUCK.
        // If they put "L1234", do they mean Truck?
        // The previous logic defaulted to TRUCK.
        // Let's stick to: If empty -> undefined. If text -> Default TRUCK unless Ship detected.
        return 'TRUCK';
    };

    const parseNumber = (value: any): number | undefined => {
        if (value === null || value === undefined) return undefined;
        if (typeof value === 'number') return value === 0 ? undefined : value;
        const str = String(value).replace(/,/g, '').trim();
        if (!str || str === '-') return undefined;
        const match = str.match(/[\d.]+/);
        if (!match) return undefined;
        const val = parseFloat(match[0]);
        return val === 0 ? undefined : val;
    };

    const parseSellUnit = (text: string): 'CBM' | 'KG' => {
        // Default CBM is fine for unit, or maybe undefined?
        // Let's keep existing logic but handle empty?
        // If we want partial update, we need undefined.
        if (!text) return 'CBM';
        const lower = text.toLowerCase();
        if (lower.includes('kg') || lower.includes('กก')) return 'KG';
        return 'CBM';
    };

    const parseStatus = (text: string): string | undefined => {
        if (!text) return undefined;
        const lower = text.toLowerCase().trim();
        if (!lower || lower === '-') return undefined;
        if (lower.includes('ส่งแล้ว') || lower.includes('delivered')) return 'DELIVERED';
        if (lower.includes('ถึง') || lower.includes('arrived')) return 'ARRIVED';
        if (lower.includes('ออก') || lower.includes('departed')) return 'DEPARTED';
        if (lower.includes('โกดัง') || lower.includes('warehouse')) return 'IN_WAREHOUSE';
        if (lower.includes('ยกเลิก') || lower.includes('cancel')) return 'CANCELLED';
        return 'PENDING';
    };

    const formatExcelDate = (value: any): string => {
        if (!value) return '';

        // If it's already a string date
        if (typeof value === 'string') {
            return value.trim();
        }

        // If it's a number (Excel serial date)
        if (typeof value === 'number') {
            // Excel serial date to JavaScript Date
            const date = XLSX.SSF.parse_date_code(value);
            if (date) {
                return `${date.d.toString().padStart(2, '0')}/${date.m.toString().padStart(2, '0')}/${date.y}`;
            }
        }

        // If it's a Date object
        if (value instanceof Date && !isNaN(value.getTime())) {
            return `${value.getDate().toString().padStart(2, '0')}/${(value.getMonth() + 1).toString().padStart(2, '0')}/${value.getFullYear()}`;
        }

        return '';
    };

    const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        setParsedRows([]);
        setError('');
        setResult(null);
        setParsing(true);

        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

            // Get first sheet
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Convert to JSON with header detection
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

            if (jsonData.length === 0) {
                setError('ไม่พบข้อมูลในไฟล์ Excel');
                setParsing(false);
                return;
            }

            const rows: ParsedRow[] = [];

            for (let i = 0; i < jsonData.length; i++) {
                const excelRow = jsonData[i] as Record<string, any>;

                // Map columns - support both Thai and English column names
                const getVal = (...keys: string[]) => {
                    for (const key of keys) {
                        const lowerKey = key.toLowerCase();
                        for (const [colName, value] of Object.entries(excelRow)) {
                            if (colName.toLowerCase().includes(lowerKey) || colName.toLowerCase() === lowerKey) {
                                return value;
                            }
                        }
                    }
                    return '';
                };

                // Extract values with flexible column matching
                const trackingNo = String(getVal('เลขพัสดุ', 'tracking', 'พัสดุ') || '').trim();
                const customerCode = String(getVal('ผู้ใช้งาน', 'ลูกค้า', 'customer', 'รหัสลูกค้า') || '').trim();

                // Skip if no tracking number
                if (!trackingNo || trackingNo.length < 3) continue;

                const priceVal = getVal('ราคา', 'ราคาขาย', 'price', 'sell');
                const priceStr = String(priceVal || '');

                const lotVal = String(getVal('ล๊อต', 'lot', 'ล็อต', 'ขนส่ง', 'transport') || '').trim();
                const typeVal = String(getVal('ประเภท', 'type', 'สินค้า') || '').trim();

                const row: ParsedRow = {
                    trackingNo,
                    poNo: String(getVal('po', 'เลข po') || '').trim() || undefined,
                    lotNo: String(getVal('ล๊อต', 'lot', 'ล็อต') || '').trim() || undefined,
                    customerCode,
                    sellBase: parseNumber(priceVal),
                    sellUnit: parseSellUnit(priceStr),
                    productType: parseProductType(typeVal),
                    transport: parseTransport(lotVal), // Use 'Lot' column content for transport
                    dateIn: formatExcelDate(getVal('เข้าโกดัง', 'date in', 'วันเข้า')) || undefined,
                    dateOut: formatExcelDate(getVal('ออกโกดัง', 'date out', 'วันออก')) || undefined,
                    dateArrived: formatExcelDate(getVal('ถึง', 'arrived', 'ปลายทาง')) || undefined,
                    quantity: parseNumber(getVal('จำนวน', 'qty', 'quantity')),
                    weightKg: parseNumber(getVal('kg', 'กก', 'น้ำหนัก', 'weight')),
                    dimensions: String(getVal('ขนาด', 'size', 'dimension') || '').trim() || undefined,
                    cbm: parseNumber(getVal('cbm', 'คิว')),
                    status: parseStatus(String(getVal('สถานะ', 'status') || '')),
                    note: String(getVal('หมายเหตุ', 'note', 'remark') || '').trim() || undefined,
                };

                rows.push(row);
            }

            if (rows.length === 0) {
                setError('ไม่พบข้อมูลที่สามารถนำเข้าได้ กรุณาตรวจสอบรูปแบบไฟล์');
            } else {
                setParsedRows(rows);
            }
        } catch (err: any) {
            console.error('Parse error:', err);
            setError('ไม่สามารถอ่านไฟล์ได้: ' + err.message);
        } finally {
            setParsing(false);
        }
    }, []);

    const handleImport = async () => {
        if (parsedRows.length === 0) {
            setError('ไม่มีข้อมูลสำหรับนำเข้า');
            return;
        }

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const res = await fetch('/api/shipments/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rows: parsedRows })
            });

            // Safely read response text first
            const text = await res.text();

            let data: any;
            try {
                data = JSON.parse(text);
            } catch (e) {
                // If JSON parse fails, it means server returned HTML error or plain text
                console.error('Server returned non-JSON:', text);
                throw new Error(`เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ (Invalid JSON): ${text.substring(0, 100)}...`);
            }

            if (!res.ok) {
                setError(data.error || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
                return;
            }

            setResult(data.results);
        } catch (err: any) {
            console.error('Import error:', err);
            setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
        } finally {
            setLoading(false);
        }
    };

    const handleGoToList = () => {
        router.push('/shipments');
    };

    const handleClear = () => {
        setFileName('');
        setParsedRows([]);
        setError('');
        setResult(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleDownloadTemplate = () => {
        // Create template workbook
        const templateData = [
            {
                'เลขพัสดุ': 'SF3167680990258',
                'เลข PO': '',
                'ล๊อต': 'รถ 14245',
                'ผู้ใช้งาน': 'PR-011',
                'ราคา': '99.6 (ราคา CBM)',
                'ประเภทสินค้า': 'พิเศษ',
                'เข้าโกดัง': '14/03/2025',
                'ออกโกดัง': '15/03/2025',
                'ถึงโกดังปลายทาง': '20/03/2025',
                'จำนวน': 1,
                'KG': 1,
                'ขนาด': '23 x 35 x 15',
                'CBM': 0.012,
                'รูป': '',
                'สถานะ': 'ส่งแล้ว'
            }
        ];

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(templateData);

        // Set column widths
        ws['!cols'] = [
            { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 20 },
            { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 8 },
            { wch: 8 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 20 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Template');

        // Use Blob approach for consistent download
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'import_template.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const productTypeLabel = (pt: string) => {
        const labels: Record<string, string> = {
            'SPECIAL': 'พิเศษ',
            'TISI': 'มอก.',
            'FDA': 'อย.',
            'GENERAL': 'ทั่วไป'
        };
        return labels[pt] || pt;
    };

    const statusLabel = (st: string) => {
        const labels: Record<string, string> = {
            'DELIVERED': 'ส่งแล้ว',
            'ARRIVED': 'ถึงปลายทาง',
            'DEPARTED': 'ออกโกดัง',
            'IN_WAREHOUSE': 'ในโกดัง',
            'PENDING': 'รอดำเนินการ',
            'CANCELLED': 'ยกเลิก'
        };
        return labels[st] || st;
    };

    return (
        <div className="space-y-6 animate-premium">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/shipments"
                        className="p-2 hover:bg-slate-100 rounded-xl transition-colors group"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition-colors" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                            นำเข้าข้อมูล <span className="text-slate-400">จาก Excel</span>
                        </h1>
                        <p className="text-sm text-slate-400 mt-0.5">
                            อัปโหลดไฟล์ Excel (.xlsx) เพื่อนำเข้าข้อมูลขนส่ง
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleDownloadTemplate}
                        className="flex items-center gap-2 px-4 py-2.5 bg-green-50 text-green-700 rounded-xl text-sm font-semibold hover:bg-green-100 transition-all"
                    >
                        <Download className="w-4 h-4" />
                        ดาวน์โหลด Template
                    </button>
                    <button
                        onClick={() => setShowHelp(!showHelp)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-all"
                    >
                        <HelpCircle className="w-4 h-4" />
                        วิธีใช้งาน
                    </button>
                </div>
            </div>

            {/* Help Section */}
            {showHelp && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6 animate-in slide-in-from-top duration-300">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shrink-0">
                            <Info className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-slate-900 mb-3">วิธีใช้งานการนำเข้าไฟล์ Excel</h3>
                            <ol className="space-y-2.5 text-sm text-slate-600">
                                <li className="flex gap-3">
                                    <span className="w-6 h-6 bg-blue-500 text-white rounded-full text-xs font-bold flex items-center justify-center shrink-0">1</span>
                                    <span>ดาวน์โหลด Template เพื่อดูรูปแบบไฟล์ที่รองรับ</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="w-6 h-6 bg-blue-500 text-white rounded-full text-xs font-bold flex items-center justify-center shrink-0">2</span>
                                    <span>เตรียมไฟล์ Excel ของคุณตามรูปแบบ Template หรือรูปแบบเดิมที่คุณมี</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="w-6 h-6 bg-blue-500 text-white rounded-full text-xs font-bold flex items-center justify-center shrink-0">3</span>
                                    <span>อัปโหลดไฟล์ โดยลากวางหรือคลิกเลือกไฟล์</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="w-6 h-6 bg-blue-500 text-white rounded-full text-xs font-bold flex items-center justify-center shrink-0">4</span>
                                    <span>ตรวจสอบข้อมูลที่ระบบอ่านได้ในตารางตัวอย่าง</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="w-6 h-6 bg-blue-500 text-white rounded-full text-xs font-bold flex items-center justify-center shrink-0">5</span>
                                    <span>กด &quot;นำเข้าข้อมูล&quot; เพื่อบันทึกลงระบบ</span>
                                </li>
                            </ol>

                            <div className="mt-4 p-4 bg-white/60 rounded-xl">
                                <p className="text-xs font-semibold text-slate-700 mb-2">คอลัมน์ที่รองรับ (ไม่จำเป็นต้องมีครบทุกคอลัมน์):</p>
                                <p className="text-xs text-slate-500">
                                    เลขพัสดุ, เลข PO, ล๊อต, ผู้ใช้งาน/ลูกค้า, ราคา, ประเภทสินค้า, เข้าโกดัง, ออกโกดัง, ถึงปลายทาง, จำนวน, KG, ขนาด, CBM, สถานะ, หมายเหตุ
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setShowHelp(false)} className="p-1 hover:bg-blue-100 rounded-lg transition-colors">
                            <X className="w-4 h-4 text-slate-400" />
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-6">
                {/* Upload Section */}
                <div className="space-y-6">
                    {/* File Upload Card */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-accent-100 rounded-lg flex items-center justify-center">
                                    <FileSpreadsheet className="w-4 h-4 text-accent-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900">อัปโหลดไฟล์ Excel</p>
                                    <p className="text-xs text-slate-400">รองรับไฟล์ .xlsx, .xls</p>
                                </div>
                            </div>
                            {fileName && (
                                <button
                                    onClick={handleClear}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    ล้างข้อมูล
                                </button>
                            )}
                        </div>

                        <div className="p-6">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleFileChange}
                                className="hidden"
                                id="excel-upload"
                            />

                            <label
                                htmlFor="excel-upload"
                                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-10 cursor-pointer transition-all ${fileName
                                    ? 'border-accent-300 bg-accent-50'
                                    : 'border-slate-200 hover:border-accent-400 hover:bg-slate-50'
                                    }`}
                            >
                                {parsing ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 className="w-10 h-10 text-accent-500 animate-spin" />
                                        <p className="text-sm font-semibold text-slate-600">กำลังอ่านไฟล์...</p>
                                    </div>
                                ) : fileName ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-14 h-14 bg-accent-100 rounded-2xl flex items-center justify-center">
                                            <FileSpreadsheet className="w-7 h-7 text-accent-600" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-bold text-slate-900">{fileName}</p>
                                            <p className="text-xs text-slate-400 mt-1">คลิกเพื่อเลือกไฟล์ใหม่</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
                                            <FileUp className="w-7 h-7 text-slate-400" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-semibold text-slate-600">
                                                ลากไฟล์มาวางที่นี่ หรือ <span className="text-accent-500">คลิกเพื่อเลือกไฟล์</span>
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1">รองรับ Excel (.xlsx, .xls)</p>
                                        </div>
                                    </div>
                                )}
                            </label>
                        </div>

                        {parsedRows.length > 0 && (
                            <div className="px-6 pb-6">
                                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-xl">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    <p className="text-sm font-medium text-green-700">
                                        พบข้อมูล {parsedRows.length} รายการพร้อมนำเข้า
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-600 px-5 py-4 rounded-xl flex items-start gap-3 animate-in slide-in-from-top duration-200">
                            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                            <div>
                                <p className="font-semibold text-sm">เกิดข้อผิดพลาด</p>
                                <p className="text-sm mt-0.5">{error}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Full Width Preview Table */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[450px]">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-20">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-accent-50 rounded-lg flex items-center justify-center">
                                <Package className="w-4 h-4 text-accent-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">ตารางตรวจสอบและนำเข้าข้อมูล</h3>
                                <p className="text-[11px] text-slate-400 font-medium">โปรดตรวจสอบความถูกต้องก่อนกดยืนยัน</p>
                            </div>
                        </div>

                        {parsedRows.length > 0 && !result && (
                            <button
                                onClick={handleImport}
                                disabled={loading}
                                className="px-6 py-2.5 bg-accent-500 text-white rounded-xl font-bold hover:bg-accent-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 shadow-lg shadow-accent-500/20"
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="w-4 h-4" />
                                )}
                                ยืนยันนำเข้าข้อมูล
                            </button>
                        )}
                    </div>

                    {parsedRows.length === 0 && !result ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
                            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                                <Package className="w-8 h-8 text-slate-300" />
                            </div>
                            <p className="text-sm font-semibold text-slate-400">ยังไม่มีข้อมูลที่จะนำเข้า</p>
                            <p className="text-xs text-slate-300 mt-1">อัปโหลดไฟล์ Excel เพื่อเริ่มต้น</p>
                        </div>
                    ) : result ? (
                        <div className="flex-1 p-6 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-green-50 rounded-2xl p-5 text-center border border-green-100">
                                    <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
                                    <p className="text-3xl font-bold text-green-700">{result.success}</p>
                                    <p className="text-xs text-green-600 font-medium">นำเข้าสำเร็จ</p>
                                </div>
                                {result.failed > 0 && (
                                    <div className="bg-red-50 rounded-2xl p-5 text-center border border-red-100">
                                        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
                                        <p className="text-3xl font-bold text-red-700">{result.failed}</p>
                                        <p className="text-xs text-red-600 font-medium">ล้มเหลว</p>
                                    </div>
                                )}
                            </div>

                            {result.errors.length > 0 && (
                                <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                                    <p className="text-sm font-semibold text-red-700 mb-3">รายการที่เกิดข้อผิดพลาด:</p>
                                    <div className="max-h-40 overflow-y-auto space-y-1.5">
                                        {result.errors.map((err, i) => (
                                            <p key={i} className="text-xs text-red-600 font-mono">
                                                แถว {err.row} ({err.tracking}): {err.error}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleGoToList}
                                className="w-full py-4 bg-accent-500 text-white rounded-xl font-semibold hover:bg-accent-600 transition-all flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 className="w-5 h-5" />
                                ไปยังรายการขนส่ง
                            </button>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="flex-1 overflow-auto">
                                <table className="w-full text-xs text-left border-collapse min-w-[1000px]">
                                    <thead className="bg-slate-50/50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-5 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px]">#</th>
                                            <th className="px-5 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px]">เลขพัสดุ</th>
                                            <th className="px-5 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px]">ลูกค้า</th>
                                            <th className="px-5 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px]">ล๊อต</th>
                                            <th className="px-5 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px] text-center">ประเภท / ขนส่ง</th>
                                            <th className="px-5 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px]">ราคาขาย</th>
                                            <th className="px-5 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px] text-center">วันที่เข้า</th>
                                            <th className="px-5 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px] text-center">วันที่ออก</th>
                                            <th className="px-5 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px] text-center">วันที่ถึง</th>
                                            <th className="px-5 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px] text-right">กก.</th>
                                            <th className="px-5 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px] text-right">CBM</th>
                                            <th className="px-5 py-4 font-bold text-slate-500 uppercase tracking-widest text-[10px] text-center">สถานะ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium font-sans">
                                        {parsedRows.map((row, i) => (
                                            <tr key={i} className="hover:bg-accent-50/10 transition-colors">
                                                <td className="px-5 py-3 text-slate-400 font-mono">{i + 1}</td>
                                                <td className="px-5 py-3 font-bold text-slate-900">{row.trackingNo}</td>
                                                <td className="px-5 py-3">
                                                    <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold text-slate-600">{row.customerCode}</span>
                                                </td>
                                                <td className="px-5 py-3 text-slate-600 font-medium">{row.lotNo || '-'}</td>
                                                <td className="px-5 py-3 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${!row.transport ? 'bg-slate-100 text-slate-400' :
                                                            row.transport === 'TRUCK' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                                                            }`}>
                                                            {!row.transport ? '-' : row.transport === 'TRUCK' ? 'รถ' : 'เรือ'}
                                                        </span>
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${!row.productType ? 'bg-slate-100 text-slate-400' :
                                                            row.productType === 'SPECIAL' ? 'bg-purple-100 text-purple-700' :
                                                                row.productType === 'TISI' ? 'bg-cyan-100 text-cyan-700' :
                                                                    row.productType === 'FDA' ? 'bg-emerald-100 text-emerald-700' :
                                                                        'bg-slate-100 text-slate-600'
                                                            }`}>
                                                            {row.productType ? productTypeLabel(row.productType) : '-'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    <div className="font-bold text-slate-900">
                                                        {row.sellBase?.toLocaleString() ?? '-'}
                                                        <span className="text-[10px] text-slate-400 ml-1">{row.sellUnit}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 text-center text-[11px] text-slate-500 font-mono">{row.dateIn || '-'}</td>
                                                <td className="px-5 py-3 text-center text-[11px] text-slate-500 font-mono">{row.dateOut || '-'}</td>
                                                <td className="px-5 py-3 text-center text-[11px] text-slate-500 font-mono">{row.dateArrived || '-'}</td>
                                                <td className="px-5 py-3 text-right text-slate-600 font-mono">{row.weightKg?.toFixed(2) ?? '-'}</td>
                                                <td className="px-5 py-3 text-right text-slate-600 font-mono">{row.cbm?.toFixed(4) ?? '-'}</td>
                                                <td className="px-5 py-3 text-center">
                                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${!row.status ? 'bg-slate-100 text-slate-400' :
                                                        row.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                                                            row.status === 'ARRIVED' ? 'bg-blue-100 text-blue-700' :
                                                                'bg-amber-100 text-amber-700'
                                                        }`}>
                                                        {row.status ? statusLabel(row.status) : '-'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="p-3 text-center text-[10px] font-bold text-slate-300 bg-slate-50/50 border-t border-slate-100 uppercase tracking-widest">
                                    สิ้นสุดรายการ ({parsedRows.length} รายการ)
                                </div>
                            </div>

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
