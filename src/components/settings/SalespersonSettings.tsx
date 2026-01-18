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
        try {
            const res = await fetch(`/api/salespersons/${salespersonId}`);
            const data = await res.json();
            if (data.success) {
                setSelectedCustomers(data.data.customers || []);
            }
        } catch (err) {
            console.error('Error fetching customers:', err);
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
        setSelectedSalesperson(sp);
        await fetchCustomers(sp.id);
        setShowCustomerModal(true);
    };

    const filteredSalespersons = salespersons.filter(sp =>
        sp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sp.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-premium">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                        ตั้งค่า <span className="text-slate-400">เซลล์</span>
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">จัดการข้อมูลพนักงานขายและมอบหมายลูกค้า</p>
                </div>

                <button
                    onClick={() => {
                        setFormData({ code: '', name: '', phone: '', email: '' });
                        setError('');
                        setShowAddModal(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                >
                    <Plus className="w-4 h-4" />
                    เพิ่มเซลล์ใหม่
                </button>
            </div>

            {/* Search */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="ค้นหาด้วยชื่อหรือรหัสเซลล์..."
                        className="w-full bg-slate-50/50 border border-slate-100 rounded-xl py-3 pl-11 pr-4 text-sm focus:ring-0 focus:border-accent-500 transition-all outline-none font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Salesperson List */}
            <div className="grid gap-4">
                {loading ? (
                    <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
                        <div className="w-8 h-8 border-4 border-slate-100 border-t-accent-500 rounded-full animate-spin mx-auto" />
                        <p className="text-sm text-slate-400 mt-4">กำลังโหลดข้อมูล...</p>
                    </div>
                ) : filteredSalespersons.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
                        <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <p className="text-slate-500 font-medium">ไม่พบข้อมูลเซลล์</p>
                        <p className="text-sm text-slate-400 mt-1">กดปุ่ม "เพิ่มเซลล์ใหม่" เพื่อเริ่มต้น</p>
                    </div>
                ) : (
                    filteredSalespersons.map((sp) => (
                        <div
                            key={sp.id}
                            className={`bg-white rounded-2xl p-6 border ${sp.active ? 'border-slate-100' : 'border-red-100 bg-red-50/30'} shadow-sm hover:shadow-md transition-all group`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl ${sp.active ? 'bg-gradient-to-br from-accent-500/10 to-accent-500/20' : 'bg-slate-200'} flex items-center justify-center`}>
                                        <span className={`text-lg font-bold ${sp.active ? 'text-accent-600' : 'text-slate-400'}`}>
                                            {sp.code}
                                        </span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                            {sp.name}
                                            {!sp.active && (
                                                <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-semibold">ปิดใช้งาน</span>
                                            )}
                                        </h3>
                                        <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
                                            {sp.phone && (
                                                <span className="flex items-center gap-1">
                                                    <Phone className="w-3 h-3" />
                                                    {sp.phone}
                                                </span>
                                            )}
                                            {sp.email && (
                                                <span className="flex items-center gap-1">
                                                    <Mail className="w-3 h-3" />
                                                    {sp.email}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    {/* Stats */}
                                    <div className="flex items-center gap-4 pr-4 border-r border-slate-100">
                                        <div className="text-center">
                                            <p className="text-xl font-bold text-slate-900">{sp._count.customers}</p>
                                            <p className="text-[11px] text-slate-400 font-medium">ลูกค้า</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xl font-bold text-slate-900">{sp._count.shipments}</p>
                                            <p className="text-[11px] text-slate-400 font-medium">รายการ</p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => openCustomerModal(sp)}
                                            className="p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:text-accent-500 hover:bg-accent-50 transition-all"
                                            title="จัดการลูกค้า"
                                        >
                                            <UserPlus className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => openEditModal(sp)}
                                            className="p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-all"
                                            title="แก้ไข"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteSalesperson(sp.id)}
                                            className="p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                            title="ลบ"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-premium">
                        <div className="p-6 border-b border-slate-100">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-slate-900">เพิ่มเซลล์ใหม่</h2>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="p-2 hover:bg-slate-100 rounded-xl transition"
                                >
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleAddSalesperson} className="p-6 space-y-4">
                            {error && (
                                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    รหัสเซลล์ <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                                    placeholder="ตย. SALE-01"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    ชื่อ-นามสกุล <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                                    placeholder="ชื่อพนักงานขาย"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">เบอร์โทรศัพท์</label>
                                <input
                                    type="tel"
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                                    placeholder="0xx-xxx-xxxx"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">อีเมล</label>
                                <input
                                    type="email"
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                                    placeholder="example@email.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-50 transition"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition"
                                >
                                    บันทึก
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && selectedSalesperson && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-premium">
                        <div className="p-6 border-b border-slate-100">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-slate-900">แก้ไขข้อมูลเซลล์</h2>
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="p-2 hover:bg-slate-100 rounded-xl transition"
                                >
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleUpdateSalesperson} className="p-6 space-y-4">
                            {error && (
                                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    รหัสเซลล์ <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    ชื่อ-นามสกุล <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">เบอร์โทรศัพท์</label>
                                <input
                                    type="tel"
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">อีเมล</label>
                                <input
                                    type="email"
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-50 transition"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition"
                                >
                                    บันทึกการเปลี่ยนแปลง
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Customer Assignment Modal */}
            {showCustomerModal && selectedSalesperson && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-premium max-h-[80vh] flex flex-col">
                        <div className="p-6 border-b border-slate-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">จัดการลูกค้า</h2>
                                    <p className="text-sm text-slate-400 mt-1">
                                        เซลล์: {selectedSalesperson.name} ({selectedSalesperson.code})
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowCustomerModal(false);
                                        setCustomerCode('');
                                        setError('');
                                    }}
                                    className="p-2 hover:bg-slate-100 rounded-xl transition"
                                >
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 flex-1 overflow-auto">
                            {error && (
                                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2 mb-4">
                                    <AlertCircle className="w-4 h-4" />
                                    {error}
                                </div>
                            )}

                            {/* Add Customer Form */}
                            <form onSubmit={handleAssignCustomer} className="flex gap-3 mb-6">
                                <input
                                    type="text"
                                    className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                                    placeholder="รหัสลูกค้า (ตย. PR-001)"
                                    value={customerCode}
                                    onChange={(e) => setCustomerCode(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    className="px-6 py-3 bg-accent-500 text-white rounded-xl font-semibold hover:bg-accent-600 transition flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    เพิ่ม
                                </button>
                            </form>

                            {/* Customer List */}
                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold text-slate-500 mb-3">
                                    ลูกค้าในความดูแล ({selectedCustomers.length})
                                </h3>

                                {selectedCustomers.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400">
                                        <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">ยังไม่มีลูกค้าในความดูแล</p>
                                    </div>
                                ) : (
                                    selectedCustomers.map((customer) => (
                                        <div
                                            key={customer.id}
                                            className="flex items-center justify-between p-4 bg-slate-50 rounded-xl group hover:bg-slate-100 transition"
                                        >
                                            <div>
                                                <p className="font-semibold text-slate-900">{customer.code}</p>
                                                {customer.name && (
                                                    <p className="text-sm text-slate-400">{customer.name}</p>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleRemoveCustomer(customer.id)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100">
                            <button
                                onClick={() => {
                                    setShowCustomerModal(false);
                                    setCustomerCode('');
                                    setError('');
                                }}
                                className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition"
                            >
                                เสร็จสิ้น
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
