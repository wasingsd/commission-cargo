'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Package, Lock, Mail, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await signIn('credentials', {
                ...formData,
                redirect: false
            });

            if (res?.error) {
                setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
            } else {
                router.push('/dashboard');
            }
        } catch (err) {
            setError('เกิดข้อผิดพลาดในการเชื่อมต่อระบบ');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-slate-950">
            {/* High-end Background Image with Overlay */}
            <div className="absolute inset-0 z-0">
                <img
                    src="/logistics_bg_1768213865055.png"
                    alt="Logistics Background"
                    className="w-full h-full object-cover opacity-40 scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-950/80 to-transparent" />
            </div>

            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-accent-500/10 blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <div className="relative z-10 w-full max-w-md px-6 animate-premium">
                <div className="glass-card p-10 border-white/10 shadow-2xl backdrop-blur-3xl relative overflow-hidden group">
                    {/* Branding */}
                    <div className="flex flex-col items-center mb-10">
                        <div className="w-16 h-16 bg-accent-500 rounded-2xl flex items-center justify-center mb-6 shadow-2xl shadow-accent-500/40">
                            <Package className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight text-center">
                            ยินดีต้อนรับสู่ <br />
                            <span className="text-accent-500">CARGO</span>
                        </h1>
                        <p className="text-slate-400 text-xs font-semibold mt-4 flex items-center gap-2">
                            ระบบคํานวณค่าคอมมิชชั่นอัจฉริยะ
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm font-medium">
                            <ShieldCheck className="w-5 h-5" />
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 ml-1">อีเมลผู้ใช้งาน</label>
                            <div className="relative group/field">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within/field:text-accent-500 transition-colors" />
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-4 focus:ring-accent-500/10 focus:bg-white/10 transition-all text-sm font-medium"
                                    placeholder="ระบุอีเมลของคุณ"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-xs font-bold text-slate-500">รหัสผ่าน</label>
                                <a href="#" className="text-xs font-semibold text-accent-500 hover:underline">ลืมรหัสผ่าน?</a>
                            </div>
                            <div className="relative group/field">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within/field:text-accent-500 transition-colors" />
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-4 focus:ring-accent-500/10 focus:bg-white/10 transition-all text-sm font-medium"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-accent-500 hover:bg-accent-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-accent-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 group/btn"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    เข้าสู่ระบบ
                                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-10 pt-8 border-t border-white/5 text-center">
                        <p className="text-[11px] font-semibold text-slate-500 leading-relaxed">
                            ระบบรักษาความปลอดภัยมาตรฐานระดับองค์กร <br />
                            © 2026 Cargo Logic Systems
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
