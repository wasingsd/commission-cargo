'use client';

import { useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Package, Loader2, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => {
        if (status === 'authenticated') {
            router.push('/');
        }
    }, [status, router]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-slate-950">
                <Loader2 className="w-10 h-10 text-accent-500 animate-spin" />
            </div>
        );
    }

    const handleEmailSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
                callbackUrl: '/',
            });

            if (result?.error) {
                setError(result.error);
            } else {
                router.push('/');
            }
        } catch (err) {
            setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
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

                    {/* Login Form */}
                    <form onSubmit={handleEmailSignIn} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                อีเมลผู้ใช้งาน
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-accent-500/50 focus:bg-white/10 transition-all placeholder:text-slate-600"
                                placeholder="example@cargo.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                รหัสผ่าน
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-accent-500/50 focus:bg-white/10 transition-all placeholder:text-slate-600"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-white hover:bg-gray-100 text-gray-800 rounded-2xl font-bold text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 group/btn mt-8"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                "เข้าสู่ระบบด้วยอีเมล"
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

