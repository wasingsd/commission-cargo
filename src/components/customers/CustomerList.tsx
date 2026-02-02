'use client';

import { useState, useEffect } from 'react';
import {
    Building2,
    Plus,
    Search,
    User,
    Mail,
    Phone,
    Loader2,
    Trash2,
    Edit,
    X,
    Filter,
    ChevronRight,
    Building
} from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface Salesperson {
    id: string;
    code: string;
    name: string;
}

interface Customer {
    id: string;
    code: string;
    name?: string | null;
    assignedSalespersonId?: string | null;
    createdAt: string;
    salesperson?: Salesperson | null;
}

export function CustomerList() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [salespersons, setSalespersons] = useState<Salesperson[]>([]);

    // Form state
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        assignedSalespersonId: ''
    });

    useEffect(() => {
        fetchCustomers();
        fetchSalespersons();
    }, []);

    const fetchCustomers = async () => {
        try {
            const res = await fetch('/api/customers');
            const data = await res.json();
            if (data.success) {
                setCustomers(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch customers:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSalespersons = async () => {
        try {
            const res = await fetch('/api/salespersons');
            const data = await res.json();
            if (data.success) {
                setSalespersons(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch salespersons:', error);
        }
    };

    const handleCreateCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            const res = await fetch('/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();

            if (data.success) {
                setIsAddModalOpen(false);
                setFormData({ code: '', name: '', assignedSalespersonId: '' });
                fetchCustomers();
            } else {
                setError(data.error || 'เกิดข้อผิดพลาดในการสร้างลูกค้า');
            }
        } catch (err: any) {
            setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredCustomers = customers.filter(cust =>
        cust.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cust.name && cust.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-8 animate-premium">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-xs font-medium text-slate-400">ระบบบริหารจัดการฐานข้อมูลลูกค้า</span>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900">จัดการ <span className="text-slate-400">ลูกค้า</span></h1>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-4 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="ค้นหารหัสหรือชื่อลูกค้า..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl py-3 pl-11 pr-4 w-[280px] text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm"
                        />
                    </div>

                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95 group"
                    >
                        <Plus className="w-4 h-4" />
                        เพิ่มลูกค้าใหม่
                    </button>
                </div>
            </div>

            {/* Customers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    [1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm animate-pulse h-[160px]" />
                    ))
                ) : filteredCustomers.length === 0 ? (
                    <div className="col-span-full bg-white rounded-3xl p-20 text-center border border-slate-100 shadow-sm">
                        <Building2 className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                        <p className="text-slate-500 font-medium text-lg">ไม่พบข้อมูลลูกค้า</p>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="mt-4 text-emerald-600 font-semibold hover:underline"
                        >
                            + เพิ่มลูกค้าใหม่
                        </button>
                    </div>
                ) : (
                    filteredCustomers.map((cust) => (
                        <div key={cust.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:border-emerald-100 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/50 rounded-bl-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />

                            <div className="flex flex-col h-full">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-emerald-50 group-hover:border-emerald-100 transition-colors">
                                        <Building className="w-6 h-6 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                                    </div>
                                    <span className="text-[10px] font-bold px-2.5 py-1 bg-slate-50 text-slate-500 rounded-lg border border-slate-100">
                                        {cust.code}
                                    </span>
                                </div>

                                <div className="mb-6">
                                    <h3 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors truncate">
                                        {cust.name || 'ไม่ระบุชื่อ'}
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-1 font-medium">ลูกค้า</p>
                                </div>

                                <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {cust.salesperson ? (
                                            <>
                                                <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100">
                                                    <User className="w-3.5 h-3.5 text-indigo-500" />
                                                </div>
                                                <span className="text-[11px] font-bold text-slate-600 truncate max-w-[120px]">
                                                    {cust.salesperson.name}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-[11px] font-medium text-slate-300 italic">ยังไม่ได้เลือกเซลล์</span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-2 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Customer Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-900">เพิ่มลูกค้าใหม่</h3>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateCustomer} className="p-8 space-y-6">
                            {error && (
                                <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-center gap-3 italic">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">รหัสลูกค้า <span className="text-red-500">*</span></label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium"
                                        placeholder="ตย. CUST-001"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">ชื่อลูกค้า / บริษัท</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium"
                                        placeholder="ชื่อลูกค้า"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">เซลล์ที่ดูแล</label>
                                    <select
                                        value={formData.assignedSalespersonId}
                                        onChange={(e) => setFormData({ ...formData, assignedSalespersonId: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium appearance-none"
                                    >
                                        <option value="">-- ยังไม่มอบหมาย --</option>
                                        {salespersons.map(sp => (
                                            <option key={sp.id} value={sp.id}>
                                                {sp.name} ({sp.code})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 py-3.5 border border-slate-200 text-slate-400 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all active:scale-95"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-3.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'บันทึกข้อมูล'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
