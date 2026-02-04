'use client';

import { useState, useEffect } from 'react';
import {
    Users,
    Plus,
    Search,
    Phone,
    Mail,
    Edit2,
    Trash2,
    UserPlus,
    Package,
    ChevronRight,
    X,
    Check,
    AlertCircle
} from 'lucide-react';

interface Salesperson {
    id: string;
    code: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    active: boolean;
    createdAt: string;
    _count: {
        customers: number;
        shipments: number;
    };
}

interface Customer {
    id: string;
    code: string;
    name?: string | null;
}

export function SalespersonSettings() {
    const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [selectedSalesperson, setSelectedSalesperson] = useState<Salesperson | null>(null);
    const [selectedCustomers, setSelectedCustomers] = useState<Customer[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        phone: '',
        email: ''
    });

    // Customer assignment form
    const [customerCode, setCustomerCode] = useState('');

    const fetchSalespersons = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/salespersons');
            const data = await res.json();
            if (data.success) {
                setSalespersons(data.data);
            }
        } catch (err) {
            console.error('Error fetching salespersons:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCustomers = async (salespersonId: string) => {
        setSelectedCustomers([]); // Clear old data
        try {
            const res = await fetch(`/api/salespersons/${salespersonId}`);
            const data = await res.json();
            if (data.success) {
                setSelectedCustomers(data.data.customers || []);
            } else {
                setError(data.error || 'ไม่สามารถโหลดข้อมูลลูกค้าได้');
            }
        } catch (err) {
            console.error('Error fetching customers:', err);
            setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        }
    };

    useEffect(() => {
        fetchSalespersons();
    }, []);

    const handleAddSalesperson = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const res = await fetch('/api/salespersons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'เกิดข้อผิดพลาด');
                return;
            }

            setShowAddModal(false);
            setFormData({ code: '', name: '', phone: '', email: '' });
            fetchSalespersons();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleUpdateSalesperson = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSalesperson) return;
        setError('');

        try {
            const res = await fetch(`/api/salespersons/${selectedSalesperson.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'เกิดข้อผิดพลาด');
                return;
            }

            setShowEditModal(false);
            setSelectedSalesperson(null);
            setFormData({ code: '', name: '', phone: '', email: '' });
            fetchSalespersons();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleDeleteSalesperson = async (id: string) => {
        if (!confirm('ต้องการลบเซลล์นี้หรือไม่?')) return;

        try {
            const res = await fetch(`/api/salespersons/${id}`, {
                method: 'DELETE'
            });
            const data = await res.json();

            if (data.success) {
                fetchSalespersons();
            }
        } catch (err) {
            console.error('Error deleting salesperson:', err);
        }
    };

    const handleAssignCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSalesperson || !customerCode.trim()) return;
        setError('');

        try {
            const res = await fetch(`/api/salespersons/${selectedSalesperson.id}/customers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerCode: customerCode.trim() })
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'เกิดข้อผิดพลาด');
                return;
            }

            setCustomerCode('');
            fetchCustomers(selectedSalesperson.id);
            fetchSalespersons();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleRemoveCustomer = async (customerId: string) => {
        if (!selectedSalesperson) return;

        try {
            const res = await fetch(
                `/api/salespersons/${selectedSalesperson.id}/customers?customerId=${customerId}`,
                { method: 'DELETE' }
            );

            if (res.ok) {
                fetchCustomers(selectedSalesperson.id);
                fetchSalespersons();
            }
        } catch (err) {
            console.error('Error removing customer:', err);
        }
    };

    const openEditModal = (sp: Salesperson) => {
        setSelectedSalesperson(sp);
        setFormData({
            code: sp.code,
            name: sp.name,
            phone: sp.phone || '',
            email: sp.email || ''
        });
        setShowEditModal(true);
    };

    const openCustomerModal = async (sp: Salesperson) => {
        setError('');
        setSelectedCustomers([]);
        setSelectedSalesperson(sp);
        await fetchCustomers(sp.id);
        setShowCustomerModal(true);
    };

    const filteredSalespersons = salespersons.filter(sp =>
        sp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sp.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        <span className="text-accent-500">ตั้งค่า</span> เซลล์
                    </h1>
                    <p className="text-sm text-slate-500 mt-1 font-medium">จัดการข้อมูลพนักงานขายและมอบหมายลูกค้า</p>
                </div>

                <button
                    onClick={() => {
                        setFormData({ code: '', name: '', phone: '', email: '' });
                        setError('');
                        setShowAddModal(true);
                    }}
                    className="flex items-center gap-2 px-7 py-3.5 bg-[#0f172a] text-white rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95 group"
                >
                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                    เพิ่มเซลล์ใหม่
                </button>
            </div>

            {/* Search */}
            <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-accent-500 transition-colors" />
                <input
                    type="text"
                    placeholder="ค้นหาด้วยชื่อหรือรหัสเซลล์..."
                    className="w-full bg-white border border-slate-100 rounded-3xl py-5 pl-14 pr-6 text-sm focus:ring-4 focus:ring-accent-500/5 focus:border-accent-500 transition-all outline-none font-semibold shadow-sm placeholder:text-slate-300"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Salesperson List */}
            <div className="grid gap-5">
                {loading ? (
                    <div className="bg-white rounded-3xl p-20 text-center border border-slate-100 shadow-sm">
                        <div className="w-10 h-10 border-4 border-slate-100 border-t-accent-500 rounded-full animate-spin mx-auto" />
                        <p className="text-sm text-slate-400 mt-6 font-medium">กำลังเตรียมข้อมูลระดับพรีเมียม...</p>
                    </div>
                ) : filteredSalespersons.length === 0 ? (
                    <div className="bg-white rounded-3xl p-20 text-center border border-slate-100 shadow-sm">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Users className="w-10 h-10 text-slate-200" />
                        </div>
                        <p className="text-slate-500 font-bold text-lg">ไม่พบข้อมูลเซลล์</p>
                        <p className="text-sm text-slate-400 mt-2 font-medium">ลองเปลี่ยนคำค้นหา หรือกดปุ่ม "เพิ่มเซลล์ใหม่"</p>
                    </div>
                ) : (
                    filteredSalespersons.map((sp) => (
                        <div
                            key={sp.id}
                            className={`bg-white rounded-[2rem] p-8 border ${sp.active ? 'border-slate-100' : 'border-red-100 bg-red-50/10'} shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group relative overflow-hidden`}
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                                <div className="flex items-center gap-6">
                                    {/* Avatar/Code */}
                                    <div className={`w-16 h-16 rounded-2xl ${sp.active ? 'bg-orange-50' : 'bg-slate-100'} flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                                        <span className={`text-sm font-black tracking-tighter ${sp.active ? 'text-orange-500' : 'text-slate-400'}`}>
                                            {sp.code}
                                        </span>
                                    </div>

                                    <div className="space-y-1.5">
                                        <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                                            {sp.name}
                                            {!sp.active && (
                                                <span className="text-[10px] px-2.5 py-1 bg-red-100 text-red-600 rounded-lg uppercase tracking-widest font-black">Inactive</span>
                                            )}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-slate-400">
                                            {sp.phone && (
                                                <span className="flex items-center gap-2 group/info hover:text-slate-600 transition-colors">
                                                    <div className="p-1.5 bg-slate-50 rounded-lg group-hover/info:bg-accent-50 group-hover/info:text-accent-600 transition-colors">
                                                        <Phone className="w-3 h-3" />
                                                    </div>
                                                    {sp.phone}
                                                </span>
                                            )}
                                            {sp.email && (
                                                <span className="flex items-center gap-2 group/info hover:text-slate-600 transition-colors">
                                                    <div className="p-1.5 bg-slate-50 rounded-lg group-hover/info:bg-blue-50 group-hover/info:text-blue-600 transition-colors">
                                                        <Mail className="w-3 h-3" />
                                                    </div>
                                                    {sp.email}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between md:justify-end gap-10">
                                    {/* Stats */}
                                    <div className="flex items-center gap-8">
                                        <div className="text-center group/stat">
                                            <p className="text-2xl font-black text-slate-900 group-hover/stat:text-accent-600 transition-colors leading-none">
                                                {sp._count.customers}
                                            </p>
                                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">ลูกค้า</p>
                                        </div>
                                        <div className="text-center group/stat">
                                            <p className="text-2xl font-black text-slate-900 group-hover/stat:text-accent-600 transition-colors leading-none">
                                                {sp._count.shipments}
                                            </p>
                                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">รายการ</p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => openCustomerModal(sp)}
                                            className="p-3.5 bg-slate-50 rounded-2xl text-slate-400 hover:text-accent-600 hover:bg-accent-50 hover:shadow-lg hover:shadow-accent-500/10 transition-all duration-300"
                                            title="จัดการลูกค้า"
                                        >
                                            <UserPlus className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => openEditModal(sp)}
                                            className="p-3.5 bg-slate-50 rounded-2xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300"
                                            title="แก้ไข"
                                        >
                                            <Edit2 className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteSalesperson(sp.id)}
                                            className="p-3.5 bg-slate-50 rounded-2xl text-slate-400 hover:text-red-600 hover:bg-red-50 hover:shadow-lg hover:shadow-red-500/10 transition-all duration-300"
                                            title="ลบ"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add/Edit Modal Container */}
            {(showAddModal || showEditModal) && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl relative overflow-hidden">
                        <div className="p-8 border-b border-slate-50">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-black text-slate-900">
                                        {showAddModal ? "เพิ่มเซลล์ใหม่" : "แก้ไขข้อมูลเซลล์"}
                                    </h2>
                                    <p className="text-sm text-slate-400 font-medium">กรุณากรอกข้อมูลให้ครบถ้วนเพื่อผลลัพธ์ที่สมบูรณ์</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setShowEditModal(false);
                                    }}
                                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-colors duration-300"
                                >
                                    <X className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={showAddModal ? handleAddSalesperson : handleUpdateSalesperson} className="p-8 space-y-6">
                            {error && (
                                <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl text-sm font-bold flex items-center gap-3 animate-shake">
                                    <div className="p-2 bg-white rounded-xl shadow-sm">
                                        <AlertCircle className="w-5 h-5" />
                                    </div>
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-5">
                                <div className="col-span-2 sm:col-span-1 space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">
                                        รหัสเซลล์ <span className="text-accent-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-accent-500/10 focus:bg-white transition-all outline-none shadow-inner"
                                        placeholder="SALE-01"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="col-span-2 sm:col-span-2 space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">
                                        ชื่อ-นามสกุล <span className="text-accent-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-accent-500/10 focus:bg-white transition-all outline-none shadow-inner"
                                        placeholder="ระบุชื่อจริงนามสกุล"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="col-span-2 sm:col-span-1 space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">
                                        เบอร์โทรศัพท์
                                    </label>
                                    <input
                                        type="tel"
                                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-accent-500/10 focus:bg-white transition-all outline-none shadow-inner"
                                        placeholder="0xx-xxx-xxxx"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>

                                <div className="col-span-2 sm:col-span-1 space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">
                                        อีเมล
                                    </label>
                                    <input
                                        type="email"
                                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-accent-500/10 focus:bg-white transition-all outline-none shadow-inner"
                                        placeholder="example@mail.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setShowEditModal(false);
                                    }}
                                    className="flex-1 py-4 bg-slate-100 rounded-2xl text-slate-600 font-black hover:bg-slate-200 transition-all duration-300"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[1.5] py-4 bg-[#0f172a] text-white rounded-2xl font-black hover:bg-slate-800 transition-all duration-300 shadow-xl shadow-slate-200"
                                >
                                    {showAddModal ? "บันทึกข้อมูล" : "อัปเดตข้อมูล"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Customer Assignment Modal */}
            {showCustomerModal && selectedSalesperson && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="p-8 border-b border-slate-50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900">จัดการลูกค้า</h2>
                                    <p className="text-sm text-slate-400 font-bold mt-1">
                                        เซลล์: <span className="text-accent-600">{selectedSalesperson.name}</span>
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowCustomerModal(false);
                                        setCustomerCode('');
                                        setError('');
                                    }}
                                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-colors duration-300"
                                >
                                    <X className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>
                        </div>

                        <div className="p-8 flex-1 overflow-auto space-y-8 scrollbar-hide">
                            {/* Add Customer Form */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">
                                    เพิ่มลูกค้าในความดูแล
                                </h3>
                                <form onSubmit={handleAssignCustomer} className="flex gap-3">
                                    <input
                                        type="text"
                                        className="flex-1 px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-accent-500/10 focus:bg-white transition-all outline-none shadow-inner"
                                        placeholder="รหัสลูกค้า (ตย. PR-001)"
                                        value={customerCode}
                                        onChange={(e) => setCustomerCode(e.target.value)}
                                    />
                                    <button
                                        type="submit"
                                        className="px-8 py-4 bg-accent-500 text-white rounded-2xl font-black hover:bg-accent-600 transition-all duration-300 shadow-lg shadow-accent-200 active:scale-95"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </form>
                                {error && (
                                    <p className="text-xs text-red-500 font-bold pl-1 animate-pulse">{error}</p>
                                )}
                            </div>

                            {/* Customer List */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">
                                        รายชื่อปัจจุบัน
                                    </h3>
                                    <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-500">
                                        {selectedCustomers.length} ราย
                                    </span>
                                </div>

                                {selectedCustomers.length === 0 ? (
                                    <div className="text-center py-12 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-100">
                                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                                            <Package className="w-8 h-8 text-slate-200" />
                                        </div>
                                        <p className="text-sm font-bold text-slate-400">ยังไม่มีลูกค้าในความดูแล</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-3">
                                        {selectedCustomers.map((customer) => (
                                            <div
                                                key={customer.id}
                                                className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl group hover:border-accent-100 hover:shadow-lg hover:shadow-slate-100 transition-all duration-300"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center font-black text-xs text-slate-500 group-hover:bg-accent-50 group-hover:text-accent-600 transition-colors">
                                                        CST
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-900 leading-none">{customer.code}</p>
                                                        {customer.name && (
                                                            <p className="text-[11px] text-slate-400 font-bold mt-1.5">{customer.name}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveCustomer(customer.id)}
                                                    className="p-2.5 bg-slate-50 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-300 opacity-0 group-hover:opacity-100"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50/50">
                            <button
                                onClick={() => {
                                    setShowCustomerModal(false);
                                    setCustomerCode('');
                                    setError('');
                                }}
                                className="w-full py-5 bg-[#0f172a] text-white rounded-2xl font-black hover:bg-slate-800 transition-all duration-300 shadow-xl shadow-slate-200"
                            >
                                ตกลง
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
