'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/DashboardShell';
import { supabase } from '@/lib/supabase';

export default function MemberDashboardPage() {
    return <MemberDashboard />;
}

function MemberDashboard() {
    const auth = useAuth();
    const [submissions, setSubmissions] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [activity, setActivity] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!auth?.user) return;

        const [subs, blocks, audit] = await Promise.all([
            supabase.from('form_submissions')
                .select('*, form_templates(name)')
                .eq('submitted_by', auth.user.id)
                .order('created_at', { ascending: false })
                .limit(10),
            supabase.from('cms_blocks')
                .select('*')
                .eq('page_key', 'announcements')
                .eq('enabled', true)
                .order('sort_order'),
            supabase.from('audit_logs')
                .select('*')
                .eq('user_id', auth.user.id)
                .order('created_at', { ascending: false })
                .limit(10),
        ]);

        setSubmissions(subs.data || []);
        setAnnouncements(blocks.data || []);
        setActivity(audit.data || []);
        setLoading(false);
    }, [auth]);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (!auth) return null;

    const { user, profile, role } = auth;
    const displayName = profile?.display_name || user.email?.split('@')[0];
    const initial = displayName?.[0]?.toUpperCase() || 'U';

    const formatAgo = (dateStr) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

    const actionColors = { INSERT: '#22c55e', UPDATE: '#38bdf8', DELETE: '#ef4444' };

    return (
        <>
            <div className="page-header">
                <h1>My Dashboard</h1>
                <p>Welcome, {displayName}. Here&apos;s your personal overview.</p>
            </div>

            {loading ? (
                <div className="page-loading"><span className="loading-spinner" /></div>
            ) : (
                <div className="dashboard-grid">
                    {/* Profile Card */}
                    <div className="profile-card">
                        <div className="profile-avatar-lg">{initial}</div>
                        <div className="profile-name">{displayName}</div>
                        <div className="profile-email">{user.email}</div>
                        <span className="profile-role-badge">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                            {role}
                        </span>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24, padding: '16px 0 0', borderTop: '1px solid var(--border)' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)' }}>{submissions.length}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Submissions</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--teal)' }}>{activity.length}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</div>
                            </div>
                        </div>
                    </div>

                    {/* Announcements */}
                    <div>
                        <div className="dashboard-section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                            Announcements
                        </div>
                        {announcements.length === 0 ? (
                            <div className="announcement-card">
                                <h4>No announcements</h4>
                                <p>Check back later for updates from your team.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {announcements.map((a) => (
                                    <div key={a.id} className="announcement-card">
                                        <h4>{a.block_key?.replace(/_/g, ' ')}</h4>
                                        <p>{a.content?.text || ''}</p>
                                        {a.updated_at && <time>{new Date(a.updated_at).toLocaleDateString()}</time>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* My Submissions */}
                    <div className="dashboard-grid-full">
                        <div className="dashboard-section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            My Submissions
                        </div>
                        <div className="table-container">
                            {submissions.length === 0 ? (
                                <div className="table-empty">
                                    <p>You haven&apos;t submitted any forms yet.</p>
                                </div>
                            ) : (
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Form</th>
                                            <th>Submitted</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {submissions.map((s) => (
                                            <tr key={s.id}>
                                                <td className="name-cell" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                                                    {s.form_templates?.name || 'Unknown Form'}
                                                </td>
                                                <td style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{new Date(s.created_at).toLocaleDateString()}</td>
                                                <td>
                                                    <span className={`badge ${s.status === 'submitted' ? 'badge-info' : s.status === 'approved' ? 'badge-success' : 'badge-warning'}`}>
                                                        {s.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* Activity Feed */}
                    <div className="dashboard-grid-full">
                        <div className="dashboard-section-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Recent Activity
                        </div>
                        <div className="card">
                            <div className="activity-feed">
                                {activity.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No activity yet</p>
                                ) : activity.map((a) => (
                                    <div key={a.id} className="activity-item">
                                        <span className="activity-dot" style={{ background: actionColors[a.action] || 'var(--text-muted)' }} />
                                        <div className="activity-content">
                                            <div className="activity-text">
                                                <strong>{a.action}</strong> on <code style={{ fontSize: 12, padding: '1px 5px', background: 'var(--bg-input)', borderRadius: 3 }}>{a.table_name}</code>
                                            </div>
                                            <div className="activity-time">{formatAgo(a.created_at)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
