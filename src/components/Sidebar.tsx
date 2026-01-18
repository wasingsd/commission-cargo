'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Coins,
    Truck,
    FileText,
    ClipboardList,
    Package,
    Settings,
    LogOut,
    ChevronRight,
    User as UserIcon
} from 'lucide-react';

const menuItems = [
    { href: '/dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard },
    { href: '/rates', label: 'เรทราคาทุน', icon: Coins },
    { href: '/shipments', label: 'รายการขนส่ง', icon: Truck },
    { href: '/summary', label: 'รายงานสรุป', icon: FileText },
    { href: '/logs', label: 'ประวัติการใช้งาน', icon: ClipboardList },
    { href: '/settings', label: 'ตั้งค่าเซลล์', icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-72 bg-brand-navy fixed left-0 top-0 h-full z-50 flex flex-col border-r border-white/5 shadow-2xl">
            {/* Brand Logo */}
            <div className="p-10 flex items-center gap-4">
                <div className="w-10 h-10 bg-accent-500 rounded-xl flex items-center justify-center text-white shadow-accent shadow-lg">
                    <Package className="w-6 h-6" />
                </div>
                <div className="flex flex-col">
                    <span className="text-xl font-bold text-white tracking-tight">CARGO</span>
                    <span className="text-[11px] font-medium text-slate-500">ระบบจัดการค่าคอมมิชชั่น</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 mt-2 space-y-1">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href || (item.href === '/dashboard' && pathname === '/');
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`
                                group flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-200
                                ${isActive
                                    ? 'bg-accent-500 text-white shadow-accent shadow-lg'
                                    : 'text-slate-400 hover:bg-white/5 hover:text-white'}
                            `}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-105 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-accent-500'}`} />
                                <span className="font-medium tracking-tight">{item.label}</span>
                            </div>
                            {isActive && <ChevronRight className="w-4 h-4 opacity-50" />}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Actions */}
            <div className="p-4 mt-auto border-t border-white/5">
                <div className="bg-white/5 rounded-2xl p-4 mb-4 group cursor-pointer hover:bg-white/10 transition border border-transparent hover:border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-accent-500 font-bold border border-white/10 group-hover:border-accent-500/50 transition">
                            <UserIcon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-semibold text-white truncate">ผู้ดูแลระบบ</p>
                            <p className="text-[11px] font-medium text-slate-500">Super Admin</p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-slate-500 hover:bg-white/5 hover:text-white transition group">
                        <Settings className="w-4 h-4" />
                        <span className="text-[12px] font-medium text-slate-500 group-hover:text-white">ตั้งค่า</span>
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition group">
                        <LogOut className="w-4 h-4" />
                        <span className="text-[12px] font-medium text-slate-500 group-hover:text-red-400">ออกจากระบบ</span>
                    </button>
                </div>
            </div>
        </aside>
    );
}
