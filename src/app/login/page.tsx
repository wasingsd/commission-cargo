'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Package, Loader2, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError('');

        try {
            await signIn('google', { callbackUrl: '/dashboard' });
        } catch (err) {
            setError('เกิดข้อผิดพลาดในการเชื่อมต่อระบบ');
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

                    {/* Google Sign In Button */}
                    <button
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                        className="w-full py-4 bg-white hover:bg-gray-100 text-gray-800 rounded-2xl font-bold text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 group/btn"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path
                                        fill="#4285F4"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="#34A853"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="#FBBC05"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    />
                                    <path
                                        fill="#EA4335"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                </svg>
                                เข้าสู่ระบบด้วย Google
                            </>
                        )}
                    </button>

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

