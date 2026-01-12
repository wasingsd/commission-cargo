import { MainLayout } from '@/components/MainLayout';
import { RateCardEditor } from '@/components/rates/RateCardEditor';

export default async function RateEditorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return (
        <MainLayout>
            <div className="mb-6">
                <nav className="text-sm text-slate-500 mb-1">
                    <a href="/rates" className="hover:text-blue-600 transition">Rates</a> / Editor
                </nav>
                <h1 className="text-2xl font-bold text-slate-800">Edit Rate Card</h1>
            </div>

            <RateCardEditor id={id} />
        </MainLayout>
    );
}
