'use client';
import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export default function DashboardShell({ children }) {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        async function init() {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
                setUser(authUser);
                const { data: prof } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('id', authUser.id)
                    .single();
                setProfile(prof || { role: 'member' });
            }
            setLoading(false);
        }
        init();

        const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
            // Only react to actual sign-in/sign-out, not token refreshes
            if (event !== 'SIGNED_IN' && event !== 'SIGNED_OUT') return;
            const u = session?.user || null;
            setUser(u);
            if (u) {
                const { data: prof } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('id', u.id)
                    .single();
                setProfile(prof || { role: 'member' });
            } else {
                setProfile(null);
            }
        });

        return () => listener.subscription.unsubscribe();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
    };

    if (loading) {
        return (
            <div className="page-loading">
                <span className="loading-spinner" /> Loading...
            </div>
        );
    }

    if (!user) {
        // Use router.replace for client-side redirect (safe for SSR)
        router.replace('/login');
        return (
            <div className="page-loading">
                <span className="loading-spinner" /> Redirecting to login...
            </div>
        );
    }

    const role = profile?.role || 'member';

    return (
        <AuthContext.Provider value={{ user, profile, role }}>
            <div className="app-layout">
                {/* Mobile overlay */}
                <div
                    className={`sidebar-overlay${sidebarOpen ? ' show' : ''}`}
                    onClick={() => setSidebarOpen(false)}
                />
                <Sidebar
                    user={user}
                    profile={profile}
                    role={role}
                    onLogout={handleLogout}
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                />

                <div className="main-content">
                    {/* Topbar */}
                    <div className="topbar">
                        <div className="topbar-left">
                            <button
                                className="mobile-menu-btn"
                                onClick={() => setSidebarOpen(true)}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <path d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                            <div className="topbar-search">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                                </svg>
                                <input placeholder="Search..." />
                            </div>
                        </div>
                        <div className="topbar-right">
                            <button className="topbar-btn" title="Notifications">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                                    <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                <span className="topbar-badge" />
                            </button>
                            <div className="topbar-profile">
                                <div className="topbar-profile-avatar">
                                    {(profile?.display_name || user.email)?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div className="topbar-profile-info">
                                    <span className="topbar-profile-name">
                                        {profile?.display_name || user.email?.split('@')[0]}
                                    </span>
                                    <span className="topbar-profile-role">{role}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="main-inner">
                        {children}
                    </div>
                </div>
            </div>
        </AuthContext.Provider>
    );
}

