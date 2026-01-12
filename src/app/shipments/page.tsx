import { MainLayout } from '@/components/MainLayout';
import { ShipmentList } from '@/components/shipments/ShipmentList';

export default function ShipmentsPage() {
    return (
        <MainLayout>
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-800">Shipments</h1>
                <p className="text-slate-500 mt-1">Manage all shipping records and calculate commissions.</p>
            </div>

            <ShipmentList />
        </MainLayout>
    );
}
