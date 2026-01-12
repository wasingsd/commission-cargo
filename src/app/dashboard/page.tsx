'use client';

import { MainLayout } from '@/components/MainLayout';
import { DashboardView } from '@/components/dashboard/DashboardView';

export default function DashboardPage() {
    return (
        <MainLayout>
            <DashboardView />
        </MainLayout>
    );
}
