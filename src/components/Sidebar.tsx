import Link from 'next/link';
import { LayoutDashboard, Coins, Truck, FileText, ClipboardList } from 'lucide-react';

const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/rates', label: 'Rate Cards', icon: Coins },
    { href: '/shipments', label: 'Shipments', icon: Truck },
    { href: '/summary', label: 'Summary', icon: FileText },
    { href: '/logs', label: 'Audit Logs', icon: ClipboardList },
];

export function Sidebar() {
    return (
        <aside className="w-64 bg-slate-900 text-white min-h-screen p-4 flex flex-col fixed left-0 top-0 h-full overflow-y-auto">
            <div className="text-xl font-bold mb-8 px-4 py-2 border-b border-slate-700 bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
                Commission Cargo
            </div>
            <nav className="flex-1 space-y-2">
                {menuItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-blue-400 transition-all duration-200 group"
                    >
                        <item.icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span className="font-medium">{item.label}</span>
                    </Link>
                ))}
            </nav>
            <div className="mt-auto px-4 py-4 text-xs text-slate-500">
                v0.1.0 MVP
            </div>
        </aside>
    );
}
