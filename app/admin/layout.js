import DashboardShell from '@/components/DashboardShell';
import AdminGuard from '@/components/AdminGuard';

export default function AdminLayout({ children }) {
    return (
        <DashboardShell>
            <AdminGuard>
                {children}
            </AdminGuard>
        </DashboardShell>
    );
}
