import { MainLayout } from '@/components/MainLayout';
import { RateCardList } from '@/components/rates/RateCardList';

export default function RatesPage() {
    return (
        <MainLayout>
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-800">Rate Cards</h1>
                <p className="text-slate-500 mt-1">Configure shipping rates for automated cost calculation.</p>
            </div>

            <RateCardList />
        </MainLayout>
    );
}
