'use client';

import { useState, useEffect } from 'react';
import {
    Search,
    Filter,
    Plus,
    Download,
    MoreVertical,
    Package,
    User,
    TrendingUp,
    TrendingDown,
    AlertCircle,
    CheckCircle2,
    Inbox,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Search as SearchIcon,
    Upload,
    Edit2,
    Trash2,
    X
} from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { ShipmentForm } from './ShipmentForm';
import { BulkImportModal } from './BulkImportModal';
import { formatCurrency, formatNumber } from '@/lib/calc';

interface Shipment {
    id: string;
    dateIn: string;
    trackingNo: string;
    transport: 'TRUCK' | 'SHIP';
    weightKg: number;
    cbm: number;
    sellBase: number;
    costFinal: number;
    commissionValue: number;
    commissionMethod: string;
    customer?: { code: string; name: string } | null;
    salesperson?: { code: string; name: string } | null;
}

export function ShipmentList() {
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [filters, setFilters] = useState({
        search: '',
        month: '',
        status: ''
    });

    // Dropdown & Edit State
    const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
    const [editItem, setEditItem] = useState<Shipment | undefined>(undefined);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (activeDropdownId && !(event.target as Element).closest('.action-menu')) {
                setActiveDropdownId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeDropdownId]);

    const handleEdit = (item: Shipment) => {
        setEditItem(item);
        setShowAddForm(true);
        setActiveDropdownId(null);
    };

    const handleDelete = async (id: string, trackingNo: string) => {
        if (!confirm(`ยืนยันการลบรายการ ${trackingNo}?\nการกระทำนี้ไม่สามารถเรียกคืนได้`)) return;

        setActiveDropdownId(null);
        setLoading(true);
        try {
            const res = await fetch(`/api/shipments/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchShipments();
            } else {
                alert('ลบรายการไม่สำเร็จ');
            }
        } catch (error) {
            console.error('Error deleting:', error);
            alert('เกิดข้อผิดพลาดในการลบ');
        } finally {
            setLoading(false);
        }
    };

    const fetchShipments = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.search) params.append('search', filters.search);
            const res = await fetch(`/api/shipments?${params.toString()}`);
            const data = await res.json();
            if (data.success) {
                setShipments(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch shipments:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchShipments();
    }, [filters]);

    const getItemStatus = (item: Shipment) => {
        if (item.costFinal > item.sellBase) return 'LOSS';
        if (!item.costFinal || item.costFinal === 0) return 'MISSING';
        return 'NORMAL';
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'LOSS': return <AlertCircle className="w-4 h-4 text-red-500" />;
            case 'MISSING': return <AlertCircle className="w-4 h-4 text-amber-500" />;
            case 'NORMAL': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            default: return <Package className="w-4 h-4 text-slate-400" />;
        }
    };

    const translateStatus = (status: string) => {
        const trans: Record<string, string> = {
            'LOSS': 'ขาดทุน',
            'MISSING': 'รอเรทราคา',
            'NORMAL': 'ปกติ',
            'INCOMPLETE': 'ข้อมูลไม่ครบ'
        };
        return trans[status] || 'รอดำเนินการ';
    };

    return (
        <div className="space-y-8 animate-premium">
            {/* Header Content */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">รายการ <span className="text-slate-400">ขนส่งสินค้า</span></h1>
                    <p className="text-sm text-slate-400 mt-1">จัดการและตรวจสอบราคาทุน-คอมมิชชั่นรายพัสดุ</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-lg active:scale-95 group"
                    >
                        <Plus className="w-4 h-4" />
                        เพิ่มรายการใหม่
                    </button>
                    <button
                        onClick={() => setShowBulkImport(true)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-accent-500 text-white rounded-xl text-sm font-semibold hover:bg-accent-600 transition-all shadow-lg active:scale-95"
                    >
                        <Upload className="w-4 h-4" />
                        นำเข้าหลายรายการ
                    </button>
                    <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm">
                        <Download className="w-4 h-4" />
                        ส่งออกข้อมูล
                    </button>
                </div>
            </div>

            {/* Filter Shelf */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full md:w-auto">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="ค้นหาด้วยรหัสลูกค้า หรือ เลขพัสดุ..."
                        className="w-full bg-slate-50/50 border border-slate-100 rounded-xl py-3 pl-11 pr-4 text-sm focus:ring-0 focus:border-accent-500 transition-all outline-none font-medium"
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <select className="bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium focus:ring-0 outline-none min-w-[140px]">
                        <option>รอบเดือนทั้งหมด</option>
                        <option>มกราคม 2026</option>
                    </select>
                    <button className="p-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all">
                        <Filter className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-premium overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 tracking-wider">รายละเอียดพัสดุ</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 tracking-wider text-center">ประเภท</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 tracking-wider text-right">สัดส่วน กก./CBM</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 tracking-wider text-right">ราคาขาย/ต้นทุน</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 tracking-wider text-right">ส่วนต่าง/GP</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 tracking-wider text-center">สถานะ</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 tracking-wider"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-4 border-slate-100 border-t-accent-500 rounded-full animate-spin" />
                                            <p className="text-xs font-medium text-slate-400">กำลังดึงข้อมูลขนส่ง...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : shipments.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-32 text-center grayscale opacity-50">
                                        <Inbox className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                                        <p className="text-sm font-semibold text-slate-900">ไม่พบรายการขนส่ง</p>
                                    </td>
                                </tr>
                            ) : (
                                shipments.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:shadow-sm transition-all">
                                                    <Package className="w-5 h-5" />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm font-bold text-slate-900 tracking-tight">{item.trackingNo}</span>
                                                    <span className="text-[11px] font-medium text-slate-400">ลูกค้า: {item.customer?.code || '-'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-center">
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-lg text-[11px] font-bold text-slate-500">
                                                {item.transport === 'TRUCK' ? 'ทางบก' : 'ทางเรือ'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-right">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-slate-900">{formatNumber(item.weightKg)} กก.</span>
                                                <span className="text-[11px] font-medium text-slate-400">{formatNumber(item.cbm, 3)} CBM</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-right">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-900">{formatCurrency(item.sellBase)}</span>
                                                <span className="text-[11px] font-semibold text-slate-400">ทุน: {formatCurrency(item.costFinal)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-right">
                                            <div className="flex flex-col">
                                                <span className={`text-sm font-bold ${item.commissionValue >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                    {item.commissionValue >= 0 ? '+' : ''}{formatCurrency(item.commissionValue)}
                                                </span>
                                                <div className="flex items-center justify-end gap-1 mt-0.5">
                                                    {item.commissionValue >= 0 ? <ArrowUpRight className="w-3 h-3 text-green-500" /> : <ArrowDownRight className="w-3 h-3 text-red-500" />}
                                                    <span className="text-[10px] font-bold text-slate-400">
                                                        {formatNumber((item.commissionValue / (item.sellBase || 1)) * 100)}%
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-center">
                                            {(() => {
                                                const status = getItemStatus(item);
                                                return (
                                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors
                                                        ${status === 'NORMAL' ? 'bg-green-50 text-green-700 border-green-100' :
                                                            status === 'LOSS' ? 'bg-red-50 text-red-700 border-red-100' :
                                                                'bg-amber-50 text-amber-700 border-amber-100'}
                                                    `}>
                                                        {getStatusIcon(status)}
                                                        {translateStatus(status)}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-6 py-6 text-right">
                                            <div className="relative action-menu">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveDropdownId(activeDropdownId === item.id ? null : item.id);
                                                    }}
                                                    className={`p-2 rounded-lg transition-colors ${activeDropdownId === item.id ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                                                >
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>

                                                {/* Dropdown Menu */}
                                                {activeDropdownId === item.id && (
                                                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                                        <div className="p-1.5 space-y-0.5">
                                                            <button
                                                                onClick={() => handleEdit(item)}
                                                                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                                แก้ไขข้อมูล
                                                            </button>
                                                            <div className="h-px bg-slate-100 my-1"></div>
                                                            <button
                                                                onClick={() => handleDelete(item.id, item.trackingNo)}
                                                                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                ลบรายการ
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Placeholder */}
                <div className="px-8 py-5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-400">แสดง {shipments.length} รายการปัจจุบัน</p>
                    <div className="flex items-center gap-2">
                        <button className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors">ย้อนกลับ</button>
                        <button className="px-4 py-2 text-xs font-bold bg-white shadow-sm border border-slate-200 rounded-lg text-slate-900">1</button>
                        <button className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors">ถัดไป</button>
                    </div>
                </div>
            </div>

            {showAddForm && (
                <ShipmentForm
                    initialData={editItem}
                    onClose={() => {
                        setShowAddForm(false);
                        setEditItem(undefined);
                    }}
                    onSuccess={() => {
                        setShowAddForm(false);
                        setEditItem(undefined);
                        fetchShipments();
                    }}
                />
            )}

            {showBulkImport && (
                <BulkImportModal
                    onClose={() => setShowBulkImport(false)}
                    onSuccess={() => {
                        setShowBulkImport(false);
                        fetchShipments();
                    }}
                />
            )}
        </div>
    );
}
