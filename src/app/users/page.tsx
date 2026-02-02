import { MainLayout } from '@/components/MainLayout';
import { UserList } from '@/components/users/UserList';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Role } from '@/lib/enums';

export default async function UsersPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect('/login');
    }

    if (session.user.role !== Role.ADMIN) {
        redirect('/dashboard');
    }

    return (
        <MainLayout>
            <UserList />
        </MainLayout>
    );
}
