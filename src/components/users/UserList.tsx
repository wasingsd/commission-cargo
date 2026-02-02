'use client';

import { useState, useEffect } from 'react';
import {
    Users,
    UserPlus,
    Search,
    Shield,
    Mail,
    Clock,
    Loader2,
    Trash2,
    Edit,
    X,
    Lock
} from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { Role } from '@/lib/enums';

interface User {
    id: string;
    email: string;
    name?: string;
    role: 'ADMIN' | 'MANAGER' | 'STAFF' | 'SALE';
    createdAt: string;
    updatedAt: string;
}

export function UserList() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Form states
    const [formData, setFormData] = useState({
        email: '',
        name: '',
        role: 'STAFF' as Role,
        password: ''
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users');
            const data = await res.json();
            if (data.success) {
                setUsers(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();

            if (data.success) {
                setIsAddModalOpen(false);
                setFormData({ email: '', name: '', role: 'STAFF', password: '' });
                fetchUsers();
            } else {
                setError(data.error || 'เกิดข้อผิดพลาดในการสร้างผู้ใช้งาน');
            }
        } catch (err: any) {
            setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteUser = async (id: string, email: string) => {
        if (!confirm(`ยืนยันการลบผู้ใช้งาน ${email}?\nการกระทำนี้ไม่สามารถเรียกคืนได้`)) return;

        try {
            const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
            const data = await res.json();

            if (data.success) {
                fetchUsers();
            } else {
                alert(data.error || 'ไม่สามารถลบผู้ใช้งานได้');
            }
        } catch (error) {
            console.error('Failed to delete user:', error);
            alert('เกิดข้อผิดพลาดในการลบ');
        }
    };

    const roleLabels: Record<string, { label: string, color: string }> = {
        ADMIN: { label: 'ผู้ดูแลระบบ', color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
        MANAGER: { label: 'ผู้จัดการ', color: 'bg-blue-50 text-blue-700 border-blue-100' },
        STAFF: { label: 'พนักงาน', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
        SALE: { label: 'เซลล์', color: 'bg-amber-50 text-amber-700 border-amber-100' },
    };

    const filteredUsers = users.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-8 animate-premium">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        <span className="text-xs font-medium text-slate-400">ระบบจัดการสิทธิ์การใช้งาน</span>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900">จัดการ <span className="text-slate-400">ผู้ใช้งานระบบ</span></h1>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-4 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อหรืออีเมล..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl py-3 pl-11 pr-4 w-[280px] text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
                        />
                    </div>

                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 group"
                    >
                        <UserPlus className="w-4 h-4" />
                        เพิ่มผู้ใช้งาน
                    </button>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-premium overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">ผู้ใช้งาน</th>
                                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">บทบาท</th>
                                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">วันที่สร้าง</th>
                                <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                [1, 2, 3].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={4} className="px-8 py-6 h-20 bg-slate-50/20" />
                                    </tr>
                                ))
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-8 py-32 text-center">
                                        <div className="flex flex-col items-center">
                                            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                                                <Users className="w-8 h-8 text-slate-200" />
                                            </div>
                                            <p className="text-slate-500 font-medium">ไม่พบข้อมูลผู้ใช้งาน</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100 shadow-sm">
                                                    {user.name?.[0] || user.email[0].toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{user.name || 'ไม่ระบุชื่อ'}</span>
                                                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                                        <Mail className="w-3 h-3" />
                                                        {user.email}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border flex items-center gap-2 w-fit ${roleLabels[user.role]?.color || ''}`}>
                                                <Shield className="w-3 h-3" />
                                                {roleLabels[user.role]?.label || user.role}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-sm text-slate-500 font-medium font-mono">
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-3.5 h-3.5 text-slate-300" />
                                                {user.createdAt ? format(new Date(user.createdAt), 'dd MMM yyyy HH:mm', { locale: th }) : '-'}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="แก้ไขข้อมูล">
                                                    <Edit className="w-4.5 h-4.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(user.id, user.email)}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    title="ลบผู้ใช้"
                                                >
                                                    <Trash2 className="w-4.5 h-4.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add User Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-900">เพิ่มผู้ใช้งานใหม่</h3>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser} className="p-8 space-y-6">
                            {error && (
                                <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-center gap-3">
                                    <XCircle className="w-5 h-5 shrink-0" />
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">ชื่อ-นามสกุล</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
                                        placeholder="ระบุชื่อพนักงาน"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">อีเมลสำหรับเข้าสู่ระบบ</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                        <input
                                            required
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
                                            placeholder="example@company.com"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">รหัสผ่าน</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                        <input
                                            required
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
                                            placeholder="อย่างน้อย 6 ตัวอักษร"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">บทบาทและสิทธิ์</label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium appearance-none"
                                    >
                                        <option value="ADMIN">ADMIN (จัดการทั้งหมด)</option>
                                        <option value="MANAGER">MANAGER (ดูรายงานและลบเรทได้)</option>
                                        <option value="STAFF">STAFF (บันทึกข้อมูลสินค้า)</option>
                                        <option value="SALE">SALE (ดูยอดส่วนตัว)</option>
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
                                    className="flex-1 py-3.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ยืนยันการบันทึก'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

const XCircle = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
