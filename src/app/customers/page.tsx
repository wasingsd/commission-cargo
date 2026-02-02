import { MainLayout } from '@/components/MainLayout';
import { CustomerList } from '@/components/customers/CustomerList';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function CustomersPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect('/login');
    }

    return (
        <MainLayout>
            <CustomerList />
        </MainLayout>
    );
}
