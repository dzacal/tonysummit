import DashboardShell from '@/components/DashboardShell';

export default function MemberLayout({ children }) {
    return (
        <DashboardShell>
            {children}
        </DashboardShell>
    );
}
