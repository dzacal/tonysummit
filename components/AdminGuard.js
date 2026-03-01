'use client';
import { useAuth } from '@/components/DashboardShell';
import { isAdmin } from '@/lib/rbac';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * AdminGuard - wraps admin-only pages.
 * Redirects non-admin users to the home page.
 */
export default function AdminGuard({ children }) {
    const auth = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (auth && !isAdmin(auth.role)) {
            router.replace('/');
        }
    }, [auth, router]);

    if (!auth) return null;

    if (!isAdmin(auth.role)) {
        return (
            <div className="page-loading" style={{ textAlign: 'center', padding: 60 }}>
                <h2 style={{ color: 'var(--danger)', marginBottom: 8 }}>Access Denied</h2>
                <p style={{ color: 'var(--text-muted)' }}>You don't have permission to access this page.</p>
            </div>
        );
    }

    return children;
}
