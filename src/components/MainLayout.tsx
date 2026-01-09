import { Sidebar } from './Sidebar';

export function MainLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex bg-slate-50 min-h-screen text-slate-900">
            <Sidebar />
            <main className="flex-1 ml-64 p-8 transition-all duration-300">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
