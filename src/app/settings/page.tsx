'use client';

import { MainLayout } from '@/components/MainLayout';
import { SalespersonSettings } from '@/components/settings/SalespersonSettings';

export default function SettingsPage() {
    return (
        <MainLayout>
            <SalespersonSettings />
        </MainLayout>
    );
}
