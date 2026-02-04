'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
    X,
    RefreshCw,
    RotateCw
} from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { ShipmentForm } from './ShipmentForm';
import { formatCurrency, formatNumber } from '@/lib/calc';
import { ConfirmModal } from '../common/ConfirmModal';


interface Shipment {
    id: string;
    dateIn: string;
    trackingNo: string;
    transport: 'TRUCK' | 'SHIP';
    productType: 'GENERAL' | 'TISI' | 'FDA' | 'SPECIAL';
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
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [isBulkEditing, setIsBulkEditing] = useState(false);
    const [filters, setFilters] = useState({
        search: '',
        month: '',
        status: ''
    });

    // Pagination State
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [total, setTotal] = useState(0);

    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void | Promise<void>;
        isDestructive?: boolean;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
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

    const handleDelete = async (e: React.MouseEvent, id: string, trackingNo: string) => {
        e.stopPropagation();
        setConfirmConfig({
            isOpen: true,
            title: 'ยืนยันการลบรายการ',
            message: `ยืนยันการลบรายการ ${trackingNo}?\nการกระทำนี้ไม่สามารถเรียกคืนได้`,
            isDestructive: true,
            onConfirm: async () => {
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                setActiveDropdownId(null);
                setLoading(true);
                try {
                    const res = await fetch(`/api/shipments/${id}`, { method: 'DELETE' });
                    if (res.ok) {
                        fetchShipments();
                    } else {
                        const json = await res.json();
                        alert(`ลบรายการไม่สำเร็จ: ${json.message || json.error || 'Unknown error'}`);
                    }
                } catch (error) {
                    console.error('Delete failed:', error);
                    alert('เกิดข้อผิดพลาดในการลบ (Network Error)');
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const handleBulkDelete = async () => {
        setConfirmConfig({
            isOpen: true,
            title: 'ยืนยันการลบหลายรายการ',
            message: `ยืนยันการลบ ${selectedIds.length} รายการที่เลือก?\nการกระทำนี้ไม่สามารถเรียกคืนได้`,
            isDestructive: true,
            onConfirm: async () => {
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                setIsBulkDeleting(true);
                try {
                    const res = await fetch('/api/shipments/bulk', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ids: selectedIds })
                    });
                    if (res.ok) {
                        setSelectedIds([]);
                        fetchShipments();
                    } else {
                        const json = await res.json();
                        alert(`ลบรายการไม่สำเร็จ: ${json.message || json.error}`);
                    }
                } catch (error) {
                    console.error('Error bulk deleting:', error);
                    alert('เกิดข้อผิดพลาดในการลบ (Network Error)');
                } finally {
                    setIsBulkDeleting(false);
                }
            }
        });
    };

    const handleBulkEditTransport = async (transport: 'TRUCK' | 'SHIP') => {
        setConfirmConfig({
            isOpen: true,
            title: 'ยืนยันการเปลี่ยนข้อมูล',
            message: `ยืนยันการเปลี่ยนประเภทเป็น ${transport === 'TRUCK' ? 'ทางบก' : 'ทางเรือ'} สำหรับ ${selectedIds.length} รายการ?`,
            onConfirm: async () => {
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                setIsBulkEditing(true);
                try {
                    const res = await fetch('/api/shipments/bulk', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ids: selectedIds, data: { transport } })
                    });

                    if (res.ok) {
                        setSelectedIds([]);
                        fetchShipments();
                    } else {
                        const json = await res.json();
                        alert(`แก้ไขไม่สำเร็จ: ${json.error}`);
                    }
                } catch (error) {
                    console.error('Error bulk editing:', error);
                } finally {
                    setIsBulkEditing(false);
                }
            }
        });
    };

    const handleBulkEditProductType = async (productType: 'GENERAL' | 'TISI' | 'FDA' | 'SPECIAL') => {
        const typeLabels: Record<string, string> = {
            'GENERAL': 'ทั่วไป',
            'TISI': 'มอก.',
            'FDA': 'อย.',
            'SPECIAL': 'พิเศษ'
        };

        setConfirmConfig({
            isOpen: true,
            title: 'ยืนยันการเปลี่ยนประเภทสินค้า',
            message: `ยืนยันการเปลี่ยนประเภทเป็น ${typeLabels[productType]} สำหรับ ${selectedIds.length} รายการ?`,
            onConfirm: async () => {
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                setIsBulkEditing(true);
                try {
                    const res = await fetch('/api/shipments/bulk', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ids: selectedIds, data: { productType } })
                    });

                    if (res.ok) {
                        setSelectedIds([]);
                        fetchShipments();
                    } else {
                        const json = await res.json();
                        alert(`แก้ไขไม่สำเร็จ: ${json.error}`);
                    }
                } catch (error) {
                    console.error('Error bulk editing:', error);
                } finally {
                    setIsBulkEditing(false);
                }
            }
        });
    };

    const [isRecalculating, setIsRecalculating] = useState(false);
    const handleRecalculateAll = async () => {
        if (typeof window === 'undefined') return;

        setConfirmConfig({
            isOpen: true,
            title: 'ยืนยันการคำนวณใหม่',
            message: 'ยืนยันระบบการคำนวณต้นทุน/ค่าคอมมิชชั่นใหม่ทั้งหมดตามเรทปัจจุบัน? (รวมถึงอัปเดตผู้ดูแลตามฐานข้อมูลล่าสุด)',
            onConfirm: async () => {
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                setIsRecalculating(true);
                try {
                    const res = await fetch('/api/shipments/recalculate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    const json = await res.json();

                    if (res.ok && json.success) {
                        alert(`คำนวณใหม่สำเร็จ ${json.count} รายการ`);
                        await fetchShipments();
                    } else {
                        alert(`ล้มเหลว: ${json.error || 'เกิดข้อผิดพลาดศทางเทคนิค'}`);
                    }
                } catch (e: any) {
                    console.error('Recalculate error:', e);
                    alert('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + e.message);
                } finally {
                    setIsRecalculating(false);
                }
            }
        });
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === shipments.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(shipments.map(item => item.id));
        }
    };


    const fetchShipments = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.search) params.append('search', filters.search);
            if (filters.month) params.append('month', filters.month);
            if (filters.status) params.append('status', filters.status);
            params.append('page', page.toString());
            params.append('limit', pageSize.toString());

            const res = await fetch(`/api/shipments?${params.toString()}`);
            const data = await res.json();
            if (data.success) {
                setShipments(data.data);
                setTotal(data.pagination?.total || 0);
            }
        } catch (error) {
            console.error('Failed to fetch shipments:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setPage(1); // Reset to first page on filter change
    }, [filters, pageSize]);

    useEffect(() => {
        fetchShipments();
    }, [filters, page, pageSize]);

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
                    <Link
                        href="/shipments/new"
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-lg active:scale-95 group"
                    >
                        <Plus className="w-4 h-4" />
                        เพิ่มรายการใหม่
                    </Link>

                    <Link
                        href="/shipments/import"
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-accent-500 text-white rounded-xl text-sm font-semibold hover:bg-accent-600 transition-all shadow-lg active:scale-95"
                    >
                        <Upload className="w-4 h-4" />
                        นำเข้าหลายรายการ
                    </Link>
                    <button
                        onClick={() => handleRecalculateAll()}
                        disabled={isRecalculating}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRecalculating ? 'animate-spin' : ''}`} />
                        คำนวณใหม่ {isRecalculating ? '...' : ''}
                    </button>
                    <button
                        onClick={async () => {
                            try {
                                const res = await fetch('/api/shipments/export');
                                if (!res.ok) throw new Error('Export failed');
                                const blob = await res.blob();
                                const excelBlob = new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                                const url = URL.createObjectURL(excelBlob);
                                const a = document.createElement('a');
                                a.href = url;

                                // Better filename extraction
                                const contentDisposition = res.headers.get('Content-Disposition');
                                let filename = 'shipments_export.xlsx';
                                if (contentDisposition) {
                                    const filenameMatch = contentDisposition.match(/filename="?([^"; ]+)"?/);
                                    if (filenameMatch && filenameMatch[1]) {
                                        filename = filenameMatch[1];
                                    }
                                }

                                a.download = filename;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                            } catch (e) {
                                alert('ส่งออกข้อมูลล้มเหลว');
                            }
                        }}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <Download className="w-4 h-4" />
                        ส่งออก Excel
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
                    <select
                        className="bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium focus:ring-0 outline-none min-w-[140px]"
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    >
                        <option value="">สถานะทั้งหมด</option>
                        <option value="NORMAL" className="text-green-600 font-bold">ปกติ (Normal)</option>
                        <option value="LOSS" className="text-red-500 font-bold">ขาดทุน (Loss)</option>
                        <option value="MISSING" className="text-amber-500 font-bold">รอเรท (Missing)</option>
                    </select>

                    <select
                        className="bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium focus:ring-0 outline-none min-w-[140px]"
                        value={filters.month}
                        onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                    >
                        <option value="">รอบเดือนทั้งหมด</option>
                        <option value="2026-01">มกราคม 2026</option>
                        <option value="2026-02">กุมภาพันธ์ 2026</option>
                        <option value="2025-12">ธันวาคม 2025</option>
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
                                <th className="px-6 py-5 w-10">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-slate-300 text-accent-500 focus:ring-accent-500 cursor-pointer"
                                        checked={selectedIds.length === shipments.length && shipments.length > 0}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 tracking-wider">วันที่เข้า</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 tracking-wider">เลขพัสดุ</th>
                                <th className="px-6 py-5 text-xs font-bold text-slate-400 tracking-wider">รหัสลูกค้า</th>
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
                                    <td colSpan={9} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-4 border-slate-100 border-t-accent-500 rounded-full animate-spin" />
                                            <p className="text-xs font-medium text-slate-400">กำลังดึงข้อมูลขนส่ง...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : shipments.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="py-32 text-center grayscale opacity-50">
                                        <Inbox className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                                        <p className="text-sm font-semibold text-slate-900">ไม่พบรายการขนส่ง</p>
                                    </td>
                                </tr>
                            ) : (
                                shipments.map((item) => (
                                    <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors group ${selectedIds.includes(item.id) ? 'bg-accent-50/30' : ''}`}>
                                        <td className="px-6 py-6">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-slate-300 text-accent-500 focus:ring-accent-500 cursor-pointer"
                                                checked={selectedIds.includes(item.id)}
                                                onChange={() => toggleSelect(item.id)}
                                            />
                                        </td>
                                        <td className="px-6 py-6 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-slate-600">
                                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                <span className="text-sm font-medium font-mono">
                                                    {item.dateIn ? format(new Date(item.dateIn), 'dd/MM/yyyy') : '-'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:shadow-sm transition-all">
                                                    <Package className="w-4 h-4" />
                                                </div>
                                                <span className="text-sm font-bold text-slate-900 tracking-tight">{item.trackingNo}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <span className="inline-flex px-2.5 py-1 bg-accent-50 text-accent-700 rounded-lg text-xs font-bold border border-accent-100/50">
                                                {item.customer?.code || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-6 text-center">
                                            <div className="flex flex-col items-center gap-1.5">
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-lg text-[11px] font-bold text-slate-500">
                                                    {item.transport === 'TRUCK' ? 'ทางบก' : 'ทางเรือ'}
                                                </div>
                                                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-tighter ${item.productType === 'SPECIAL' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                                    item.productType === 'TISI' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                        item.productType === 'FDA' ? 'bg-green-50 text-green-600 border-green-100' :
                                                            'bg-slate-50 text-slate-500 border-slate-200'
                                                    }`}>
                                                    {item.productType}
                                                </span>
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
                                                                onClick={(e) => handleDelete(e, item.id, item.trackingNo)}

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

                {/* Pagination */}
                <div className="px-8 py-5 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <p className="text-xs font-semibold text-slate-400">
                            แสดง {Math.min(total, (page - 1) * pageSize + 1)}-{Math.min(total, page * pageSize)} จากทั้งหมด {total} รายการ
                        </p>
                        <select
                            className="bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-accent-500/20"
                            value={pageSize}
                            onChange={(e) => setPageSize(Number(e.target.value))}
                        >
                            <option value={20}>20 แถว</option>
                            <option value={50}>50 แถว</option>
                            <option value={100}>100 แถว</option>
                            <option value={200}>200 แถว</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            ย้อนกลับ
                        </button>

                        <div className="flex items-center gap-1">
                            {[...Array(Math.min(5, Math.ceil(total / pageSize)))].map((_, i) => {
                                // Simplified page numbers for now
                                const p = i + 1; // This is a placeholder, a real pagination might be better
                                return (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        className={`w-8 h-8 flex items-center justify-center text-xs font-bold rounded-lg transition-all ${page === p
                                                ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                );
                            })}
                            {Math.ceil(total / pageSize) > 5 && <span className="text-slate-400 px-1">...</span>}
                        </div>

                        <button
                            onClick={() => setPage(p => Math.min(Math.ceil(total / pageSize), p + 1))}
                            disabled={page >= Math.ceil(total / pageSize)}
                            className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            ถัดไป
                        </button>
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



            {/* Floating Action Bar */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-6 z-[60] animate-in fade-in slide-in-from-bottom-4 duration-300 border border-slate-800/50 backdrop-blur-md">
                    <div className="flex items-center gap-3 border-r border-slate-700 pr-6 mr-6">
                        <div className="w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center text-xs font-bold">
                            {selectedIds.length}
                        </div>
                        <span className="text-sm font-semibold text-slate-300 whitespace-nowrap">เลือกอยู่</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex bg-slate-800 p-1 rounded-xl gap-1">
                            <button
                                onClick={() => handleBulkEditTransport('TRUCK')}
                                disabled={isBulkEditing}
                                title="เปลี่ยนเป็นทางบก"
                                className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-700 rounded-lg transition-all text-[11px] font-bold disabled:opacity-50"
                            >
                                <TrendingUp className="w-3.5 h-3.5 text-accent-400" />
                                ทางบก
                            </button>
                            <button
                                onClick={() => handleBulkEditTransport('SHIP')}
                                disabled={isBulkEditing}
                                title="เปลี่ยนเป็นทางเรือ"
                                className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-700 rounded-lg transition-all text-[11px] font-bold disabled:opacity-50"
                            >
                                <User className="w-3.5 h-3.5 text-blue-400" />
                                ทางเรือ
                            </button>
                        </div>

                        <div className="w-px h-6 bg-slate-700 mx-1" />

                        <div className="flex bg-slate-800 p-1 rounded-xl gap-1">
                            <button
                                onClick={() => handleBulkEditProductType('GENERAL')}
                                disabled={isBulkEditing}
                                className="px-3 py-1.5 hover:bg-slate-700 rounded-lg transition-all text-[11px] font-bold disabled:opacity-50"
                            >
                                ทั่วไป
                            </button>
                            <button
                                onClick={() => handleBulkEditProductType('TISI')}
                                disabled={isBulkEditing}
                                className="px-3 py-1.5 hover:bg-slate-700 rounded-lg transition-all text-[11px] font-bold disabled:opacity-50 text-amber-400"
                            >
                                มอก.
                            </button>
                            <button
                                onClick={() => handleBulkEditProductType('FDA')}
                                disabled={isBulkEditing}
                                className="px-3 py-1.5 hover:bg-slate-700 rounded-lg transition-all text-[11px] font-bold disabled:opacity-50 text-green-400"
                            >
                                อย.
                            </button>
                            <button
                                onClick={() => handleBulkEditProductType('SPECIAL')}
                                disabled={isBulkEditing}
                                className="px-3 py-1.5 hover:bg-slate-700 rounded-lg transition-all text-[11px] font-bold disabled:opacity-50 text-purple-400"
                            >
                                พิเศษ
                            </button>
                        </div>

                        <div className="w-px h-6 bg-slate-700 mx-1" />

                        <button
                            onClick={handleBulkDelete}
                            disabled={isBulkDeleting}
                            className="flex items-center gap-2 px-4 py-2 hover:bg-red-500/10 text-red-400 rounded-xl transition-all text-sm font-bold disabled:opacity-50"
                        >
                            {isBulkDeleting ? (
                                <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                            ) : (
                                <Trash2 className="w-4 h-4" />
                            )}
                            ลบ
                        </button>
                    </div>

                    <button
                        onClick={() => setSelectedIds([])}
                        className="p-2 hover:bg-slate-800 rounded-lg transition-colors ml-4"
                    >
                        <X className="w-5 h-5 text-slate-500 hover:text-white" />
                    </button>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmConfig.isOpen}
                onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmConfig.onConfirm}
                title={confirmConfig.title}
                message={confirmConfig.message}
                isDestructive={confirmConfig.isDestructive}
            />
        </div>
    );
}
