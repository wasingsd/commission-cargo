'use client';

import { Sidebar } from './Sidebar';
import { Search, Bell, Menu, User, Calendar } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const today = format(new Date(), 'EEEE, dd MMMM yyyy', { locale: th });

    const getPageTitle = (path: string) => {
        if (path === '/' || path === '/dashboard') return 'ศูนย์ควบคุมการดำเนินงาน';
        if (path.includes('/rates')) return 'การจัดการเรทราคาทุน';
        if (path.includes('/shipments')) return 'รายการขนส่งสินค้า';
        if (path.includes('/summary')) return 'รายงานสรุปผลประกอบการ';
        if (path.includes('/logs')) return 'ประวัติการใช้งานระบบ';
        return 'PR Cargo';
    };

    return (
        <div className="flex bg-[#f8fafc] min-h-screen text-slate-900 selection:bg-accent-500/30 selection:text-accent-600">
            {/* Sidebar Wrapper */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex-1 ml-72 flex flex-col min-h-screen relative">
                {/* Decorative Background Element */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent-500/5 blur-[120px] rounded-full -z-10 pointer-events-none" />

                {/* Top Header */}
                <header className="h-[72px] border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-40 px-8 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <button className="lg:hidden text-slate-400 hover:text-slate-600 transition">
                            <Menu className="w-6 h-6" />
                        </button>

                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
                                <Calendar className="w-3.5 h-3.5" />
                                {today}
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight leading-none mt-1.5">
                                {getPageTitle(pathname)}
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden md:flex items-center relative group">
                            <Search className="absolute left-4 w-4 h-4 text-slate-400 group-focus-within:text-accent-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="ค้นหาข้อมูล..."
                                className="bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-11 pr-4 w-[280px] text-sm focus:outline-none focus:ring-4 focus:ring-accent-500/10 focus:border-accent-500 transition-all font-medium"
                            />
                        </div>

                        <div className="flex items-center gap-3 border-l border-slate-200 pl-6">
                            <button className="relative p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:text-accent-500 hover:bg-accent-50 transition-all group">
                                <Bell className="w-5 h-5 transition-transform" />
                                <span className="absolute top-2 right-2 w-2 h-2 bg-accent-500 border-2 border-white rounded-full"></span>
                            </button>

                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center cursor-pointer hover:border-accent-500 transition-all">
                                <User className="w-6 h-6 text-slate-400" />
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <main className="flex-1 p-8 lg:p-12 animate-premium overflow-x-hidden">
                    <div className="max-w-[1400px] mx-auto">
                        {children}
                    </div>
                </main>

                {/* Footer */}
                <footer className="px-8 py-6 border-t border-slate-200 flex justify-between items-center text-xs font-semibold text-slate-400 bg-white">
                    <p>© 2026 ระบบจัดการ PR Cargo</p>
                    <div className="flex gap-6">
                        <a href="#" className="hover:text-accent-500 transition">คู่มือการใช้งาน</a>
                        <a href="#" className="hover:text-accent-500 transition">แจ้งปัญหา</a>
                    </div>
                </footer>
            </div>
        </div>
    );
}
