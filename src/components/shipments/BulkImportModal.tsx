'use client';

import { useState } from 'react';
import {
    X,
    Upload,
    FileSpreadsheet,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Info,
    Copy
} from 'lucide-react';

interface BulkImportModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

interface ParsedRow {
    trackingNo: string;
    customerCode: string;
    sellBase: number;
    productType: 'GENERAL' | 'TISI' | 'FDA' | 'SPECIAL';
    transport: 'TRUCK' | 'SHIP';
    dateIn: string;
    weightKg: number;
    cbm: number;
    note: string;
}

export function BulkImportModal({ onClose, onSuccess }: BulkImportModalProps) {
    const [pasteData, setPasteData] = useState('');
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<{
        success: number;
        failed: number;
        errors: { row: number; tracking: string; error: string }[];
    } | null>(null);

    const parseProductType = (text: string): 'GENERAL' | 'TISI' | 'FDA' | 'SPECIAL' => {
        const lower = text.toLowerCase().trim();
        if (lower.includes('พิเศษ') || lower === 'special') return 'SPECIAL';
        if (lower.includes('มอก') || lower === 'tisi') return 'TISI';
        if (lower.includes('fda') || lower.includes('อาหาร') || lower.includes('ยา')) return 'FDA';
        return 'GENERAL';
    };

    const parseTransport = (text: string): 'TRUCK' | 'SHIP' => {
        const lower = text.toLowerCase().trim();
        if (lower.includes('เรือ') || lower === 'ship' || lower === 'sea') return 'SHIP';
        return 'TRUCK';
    };

    const parseNumber = (text: string): number => {
        if (!text) return 0;
        // Remove commas and parse
        const cleaned = text.replace(/,/g, '').trim();
        const match = cleaned.match(/[\d.]+/);
        return match ? parseFloat(match[0]) : 0;
    };

    const handleParse = () => {
        setError('');
        setParsedRows([]);

        if (!pasteData.trim()) {
            setError('กรุณาวางข้อมูลก่อน');
            return;
        }

        try {
            const lines = pasteData.trim().split('\n');
            const rows: ParsedRow[] = [];

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                // Split by tab (from Excel) or multiple spaces
                const cols = line.split(/\t/).map(c => c.trim());

                // Expected format based on user's example:
                // 0: เลขพัสดุ (Tracking)
                // 1: เลข PO/Lot
                // 2: ผู้ใช้งาน (Customer Code)
                // 3: ราคา (Price with unit like "112.5 (ราคา KG)")
                // 4: ประเภทสินค้า (Product Type)
                // 5: เข้าโกดัง (Date In)
                // 6: ออกโกดัง (optional)
                // 7: ถึงโกดังปลายทาง (optional)
                // 8: จำนวน (Quantity)
                // 9: KG
                // 10: ขนาด (Size)
                // 11: CBM

                if (cols.length < 4) {
                    // Skip header or malformed rows
                    continue;
                }

                // Detect if it's a header row
                if (cols[0].includes('เลขพัสดุ') || cols[0].toLowerCase() === 'tracking') {
                    continue;
                }

                const row: ParsedRow = {
                    trackingNo: cols[0] || '',
                    // cols[1] is PO/Lot - we skip it for now
                    customerCode: cols[2] || '',
                    sellBase: parseNumber(cols[3]),
                    productType: parseProductType(cols[4] || ''),
                    transport: 'TRUCK', // Default, can be inferred from PO field if contains "รถ"
                    dateIn: cols[5] || '',
                    weightKg: parseNumber(cols[9] || '0'),
                    cbm: parseNumber(cols[11] || '0'),
                    note: ''
                };

                // Detect transport from PO field
                if (cols[1] && cols[1].includes('รถ')) {
                    row.transport = 'TRUCK';
                } else if (cols[1] && (cols[1].includes('เรือ') || cols[1].includes('ทะเล'))) {
                    row.transport = 'SHIP';
                }

                // Only add if has tracking
                if (row.trackingNo) {
                    rows.push(row);
                }
            }

            if (rows.length === 0) {
                setError('ไม่พบข้อมูลที่สามารถนำเข้าได้ กรุณาตรวจสอบรูปแบบข้อมูล');
                return;
            }

            setParsedRows(rows);
        } catch (err: any) {
            setError('เกิดข้อผิดพลาดในการแปลงข้อมูล: ' + err.message);
        }
    };

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

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'เกิดข้อผิดพลาด');
                return;
            }

            setResult(data.results);

            if (data.results.success > 0) {
                onSuccess();
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const sampleData = `SF3267038648894\tรถ 1984/ม\tPR-011\t112.5 (ราคา KG)\tพิเศษ\t17/01/2026\t18/01/2026\t-\t1\t1.50\t36 x 26 x 14\t0.0131
906087071059-2\tรถ\tPR-015\t2200 (ราคา KG)\tมอก.\t10/01/2026\t10/01/2026\t16/01/2026\t2\t40.00\t45 x 45 x 35\t0.1417`;

    const handleCopySample = () => {
        navigator.clipboard.writeText(sampleData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl animate-premium max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-accent-500/10 rounded-xl flex items-center justify-center">
                            <FileSpreadsheet className="w-5 h-5 text-accent-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">นำเข้าข้อมูลหลายรายการ</h2>
                            <p className="text-sm text-slate-400">Mass Import - วางข้อมูลจาก Excel</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-xl transition"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6 space-y-6">
                    {/* Instructions */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-blue-900">วิธีใช้งาน</p>
                                <ol className="text-sm text-blue-700 mt-2 space-y-1 list-decimal list-inside">
                                    <li>คัดลอกข้อมูลจาก Excel (รวม columns ที่ต้องการ)</li>
                                    <li>วางลงในช่องด้านล่าง</li>
                                    <li>กด "ตรวจสอบข้อมูล" เพื่อดูตัวอย่าง</li>
                                    <li>กด "นำเข้าข้อมูล" เพื่อบันทึกลงระบบ</li>
                                </ol>
                                <p className="text-xs text-blue-600 mt-2">
                                    รูปแบบ: เลขพัสดุ | เลข PO | รหัสลูกค้า | ราคา | ประเภท | วันที่ | ... | กก. | ... | CBM
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Sample Data */}
                    <div className="bg-slate-50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-slate-700">ตัวอย่างข้อมูล</p>
                            <button
                                onClick={handleCopySample}
                                className="flex items-center gap-1 text-xs text-accent-500 hover:text-accent-600"
                            >
                                <Copy className="w-3 h-3" />
                                คัดลอก
                            </button>
                        </div>
                        <pre className="text-xs text-slate-500 overflow-x-auto whitespace-pre">
                            {sampleData}
                        </pre>
                    </div>

                    {/* Paste Area */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            วางข้อมูลที่นี่
                        </label>
                        <textarea
                            className="w-full h-40 p-4 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 resize-none"
                            placeholder="วางข้อมูลจาก Excel ที่นี่..."
                            value={pasteData}
                            onChange={(e) => setPasteData(e.target.value)}
                        />
                    </div>

                    {/* Parse Button */}
                    <button
                        onClick={handleParse}
                        className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition"
                    >
                        ตรวจสอบข้อมูล
                    </button>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    {/* Preview */}
                    {parsedRows.length > 0 && !result && (
                        <div>
                            <p className="text-sm font-semibold text-slate-700 mb-3">
                                ตัวอย่างข้อมูลที่จะนำเข้า ({parsedRows.length} รายการ)
                            </p>
                            <div className="bg-slate-50 rounded-xl overflow-hidden">
                                <div className="overflow-x-auto max-h-60">
                                    <table className="w-full text-xs">
                                        <thead className="bg-slate-100 sticky top-0">
                                            <tr>
                                                <th className="px-3 py-2 text-left font-semibold text-slate-600">#</th>
                                                <th className="px-3 py-2 text-left font-semibold text-slate-600">เลขพัสดุ</th>
                                                <th className="px-3 py-2 text-left font-semibold text-slate-600">ลูกค้า</th>
                                                <th className="px-3 py-2 text-right font-semibold text-slate-600">ราคาขาย</th>
                                                <th className="px-3 py-2 text-center font-semibold text-slate-600">ประเภท</th>
                                                <th className="px-3 py-2 text-center font-semibold text-slate-600">ขนส่ง</th>
                                                <th className="px-3 py-2 text-right font-semibold text-slate-600">กก.</th>
                                                <th className="px-3 py-2 text-right font-semibold text-slate-600">CBM</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {parsedRows.slice(0, 10).map((row, i) => (
                                                <tr key={i} className="hover:bg-white">
                                                    <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                                                    <td className="px-3 py-2 font-medium text-slate-900">{row.trackingNo}</td>
                                                    <td className="px-3 py-2 text-slate-600">{row.customerCode}</td>
                                                    <td className="px-3 py-2 text-right text-slate-900">{row.sellBase.toLocaleString()}</td>
                                                    <td className="px-3 py-2 text-center">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${row.productType === 'SPECIAL' ? 'bg-purple-100 text-purple-700' :
                                                                row.productType === 'TISI' ? 'bg-blue-100 text-blue-700' :
                                                                    row.productType === 'FDA' ? 'bg-green-100 text-green-700' :
                                                                        'bg-slate-100 text-slate-600'
                                                            }`}>
                                                            {row.productType}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2 text-center text-slate-600">
                                                        {row.transport === 'TRUCK' ? 'ทางบก' : 'ทางเรือ'}
                                                    </td>
                                                    <td className="px-3 py-2 text-right text-slate-600">{row.weightKg}</td>
                                                    <td className="px-3 py-2 text-right text-slate-600">{row.cbm}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {parsedRows.length > 10 && (
                                    <div className="px-3 py-2 bg-slate-100 text-xs text-slate-500 text-center">
                                        ... และอีก {parsedRows.length - 10} รายการ
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Result */}
                    {result && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="flex-1 bg-green-50 rounded-xl p-4 text-center">
                                    <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                                    <p className="text-2xl font-bold text-green-700">{result.success}</p>
                                    <p className="text-xs text-green-600">สำเร็จ</p>
                                </div>
                                {result.failed > 0 && (
                                    <div className="flex-1 bg-red-50 rounded-xl p-4 text-center">
                                        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                                        <p className="text-2xl font-bold text-red-700">{result.failed}</p>
                                        <p className="text-xs text-red-600">ล้มเหลว</p>
                                    </div>
                                )}
                            </div>

                            {result.errors.length > 0 && (
                                <div className="bg-red-50 rounded-xl p-4">
                                    <p className="text-sm font-semibold text-red-700 mb-2">รายการที่เกิดข้อผิดพลาด:</p>
                                    <div className="max-h-32 overflow-y-auto space-y-1">
                                        {result.errors.map((err, i) => (
                                            <p key={i} className="text-xs text-red-600">
                                                แถว {err.row} ({err.tracking}): {err.error}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-50 transition"
                    >
                        {result ? 'ปิด' : 'ยกเลิก'}
                    </button>
                    {!result && parsedRows.length > 0 && (
                        <button
                            onClick={handleImport}
                            disabled={loading}
                            className="flex-1 py-3 bg-accent-500 text-white rounded-xl font-semibold hover:bg-accent-600 transition flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    กำลังนำเข้า...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4" />
                                    นำเข้าข้อมูล ({parsedRows.length} รายการ)
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
