'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/DashboardShell';
import { supabase } from '@/lib/supabase';
import { isAdmin } from '@/lib/rbac';
import Link from 'next/link';

export default function AdminDashboardPage() {
    return <AdminDashboard />;
}

function AdminDashboard() {
    const auth = useAuth();
    const [stats, setStats] = useState({});
    const [recentActivity, setRecentActivity] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        const [team, departments, bookings, partners, speakers, assets, users, registrations, formSubs, audit] = await Promise.all([
            supabase.from('team_members').select('id', { count: 'exact', head: true }),
            supabase.from('departments').select('id', { count: 'exact', head: true }),
            supabase.from('podcast_bookings').select('id', { count: 'exact', head: true }),
            supabase.from('partners').select('id', { count: 'exact', head: true }),
            supabase.from('speakers').select('id', { count: 'exact', head: true }),
            supabase.from('marketing_assets').select('id', { count: 'exact', head: true }),
            supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
            supabase.from('summit_registrations').select('id', { count: 'exact', head: true }),
            supabase.from('form_submissions').select('*').order('created_at', { ascending: false }).limit(50),
            supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(10),
        ]);

        setStats({
            team: team.count || 0,
            departments: departments.count || 0,
            bookings: bookings.count || 0,
            partners: partners.count || 0,
            speakers: speakers.count || 0,
            assets: assets.count || 0,
            users: users.count || 0,
            registrations: registrations.count || 0,
        });

        setSubmissions(formSubs.data || []);
        setRecentActivity(audit.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (!auth) return null;

    const statCards = [
        { label: 'Team Members', value: stats.team, icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', colorClass: 'purple' },
        { label: 'Speakers', value: stats.speakers, icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', colorClass: 'teal' },
        { label: 'Partners', value: stats.partners, icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', colorClass: 'success' },
        { label: 'Podcast Submissions', value: stats.bookings, icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z', colorClass: 'info' },
        { label: 'Registrations', value: stats.registrations, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', colorClass: 'success' },
        { label: 'Active Users', value: stats.users, icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', colorClass: 'warning' },
        { label: 'Marketing Assets', value: stats.assets, icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', colorClass: 'danger' },
    ];

    // Compute chart data from submissions
    const statusCounts = {};
    const monthCounts = {};
    (submissions || []).forEach((s) => {
        statusCounts[s.status || 'submitted'] = (statusCounts[s.status || 'submitted'] || 0) + 1;
        const month = new Date(s.created_at).toLocaleString('default', { month: 'short' });
        monthCounts[month] = (monthCounts[month] || 0) + 1;
    });

    const donutData = Object.entries(statusCounts).map(([key, val], i) => ({
        label: key, value: val, color: ['#a78bfa', '#5eead4', '#f59e0b', '#ef4444', '#6366f1'][i % 5],
    }));
    const donutTotal = donutData.reduce((s, d) => s + d.value, 0) || 1;

    const barData = [
        { label: 'Team', value: stats.team || 0 },
        { label: 'Speakers', value: stats.speakers || 0 },
        { label: 'Partners', value: stats.partners || 0 },
        { label: 'Podcasts', value: stats.bookings || 0 },
        { label: 'Assets', value: stats.assets || 0 },
    ];
    const barMax = Math.max(...barData.map((d) => d.value), 1);
    const barColors = ['#a78bfa', '#5eead4', '#22c55e', '#38bdf8', '#f59e0b'];

    // Line chart: submissions per month
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const lineData = months.map((m) => monthCounts[m] || 0);
    const lineMax = Math.max(...lineData, 1);

    const buildLinePath = () => {
        const w = 500, h = 180, px = w / (lineData.length - 1 || 1);
        const points = lineData.map((v, i) => `${i * px},${h - (v / lineMax) * h}`);
        return points.join(' ');
    };

    const buildAreaPath = () => {
        const w = 500, h = 180, px = w / (lineData.length - 1 || 1);
        const points = lineData.map((v, i) => `${i * px},${h - (v / lineMax) * h}`);
        return `0,${h} ${points.join(' ')} ${(lineData.length - 1) * px},${h}`;
    };

    // Donut chart SVG
    const renderDonut = () => {
        const size = 160, cx = size / 2, cy = size / 2, r = 60, strokeWidth = 18;
        const circ = 2 * Math.PI * r;
        let offset = 0;

        return (
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />
                {donutData.map((d, i) => {
                    const pct = d.value / donutTotal;
                    const dash = pct * circ;
                    const gap = circ - dash;
                    const el = (
                        <circle
                            key={i}
                            cx={cx} cy={cy} r={r}
                            fill="none"
                            stroke={d.color}
                            strokeWidth={strokeWidth}
                            strokeDasharray={`${dash} ${gap}`}
                            strokeDashoffset={-offset}
                            style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'all 0.5s ease' }}
                        />
                    );
                    offset += dash;
                    return el;
                })}
                <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--text-primary)" fontSize="24" fontWeight="700">{donutTotal}</text>
                <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--text-muted)" fontSize="11">Total</text>
            </svg>
        );
    };

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
                <h1>Dashboard Overview</h1>
                <p>Welcome back. Here&apos;s what&apos;s happening across the platform.</p>
            </div>

            {loading ? (
                <div className="page-loading"><span className="loading-spinner" /> Loading dashboard...</div>
            ) : (
                <>
                    {/* KPI Cards */}
                    <div className="stats-grid">
                        {statCards.map((card) => (
                            <div key={card.label} className="stat-card">
                                <div className={`stat-icon ${card.colorClass}`}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                                        <path d={card.icon} />
                                    </svg>
                                </div>
                                <div className="stat-value">{card.value}</div>
                                <div className="stat-label">{card.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Quick Actions */}
                    <div style={{ marginBottom: 32 }}>
                        <div className="dashboard-section-title">Quick Actions</div>
                        <div className="quick-actions">
                            <Link href="/team" className="quick-action-btn">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 4v16m8-8H4" /></svg>
                                Add Team Member
                            </Link>
                            <Link href="/summit/speakers" className="quick-action-btn">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 4v16m8-8H4" /></svg>
                                Add Speaker
                            </Link>
                            <Link href="/admin/forms" className="quick-action-btn">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 4v16m8-8H4" /></svg>
                                New Form
                            </Link>
                            <Link href="/admin/users" className="quick-action-btn">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 4v16m8-8H4" /></svg>
                                Manage Users
                            </Link>
                            <Link href="/admin/registrations" className="quick-action-btn">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                                View Registrations
                            </Link>
                        </div>
                    </div>

                    {/* Charts Grid */}
                    <div className="dashboard-grid">
                        {/* Submissions Over Time */}
                        <div className="chart-card">
                            <div className="chart-header">
                                <div>
                                    <div className="chart-title">Submissions Over Time</div>
                                    <div className="chart-subtitle">Form submissions by month</div>
                                </div>
                            </div>
                            <div className="line-chart-area">
                                <svg viewBox="0 0 500 180" preserveAspectRatio="none">
                                    <defs>
                                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.3" />
                                            <stop offset="100%" stopColor="#5eead4" stopOpacity="0.02" />
                                        </linearGradient>
                                    </defs>
                                    {/* Grid lines */}
                                    {[0, 45, 90, 135, 180].map((y) => (
                                        <line key={y} x1="0" y1={y} x2="500" y2={y} stroke="var(--border)" strokeWidth="0.5" />
                                    ))}
                                    <polygon points={buildAreaPath()} fill="url(#areaGrad)" />
                                    <polyline points={buildLinePath()} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                    <defs>
                                        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="#a78bfa" />
                                            <stop offset="100%" stopColor="#5eead4" />
                                        </linearGradient>
                                    </defs>
                                    {lineData.map((v, i) => {
                                        const w = 500, px = w / (lineData.length - 1 || 1);
                                        return (
                                            <circle key={i} cx={i * px} cy={180 - (v / lineMax) * 180} r="3" fill="#a78bfa" stroke="var(--bg-card)" strokeWidth="1.5" />
                                        );
                                    })}
                                </svg>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                                    {months.map((m) => <span key={m} style={{ fontSize: 10, color: 'var(--text-muted)' }}>{m}</span>)}
                                </div>
                            </div>
                        </div>

                        {/* Status Distribution */}
                        <div className="chart-card">
                            <div className="chart-header">
                                <div>
                                    <div className="chart-title">Status Distribution</div>
                                    <div className="chart-subtitle">Submission statuses breakdown</div>
                                </div>
                            </div>
                            <div className="donut-container">
                                <div className="donut-chart">{renderDonut()}</div>
                                <div className="donut-legend">
                                    {donutData.map((d) => (
                                        <div key={d.label} className="donut-legend-item">
                                            <span className="donut-legend-dot" style={{ background: d.color }} />
                                            <span style={{ textTransform: 'capitalize' }}>{d.label}</span>
                                            <span className="donut-legend-value">{d.value}</span>
                                        </div>
                                    ))}
                                    {donutData.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>No data yet</span>}
                                </div>
                            </div>
                        </div>

                        {/* Module Activity */}
                        <div className="chart-card">
                            <div className="chart-header">
                                <div>
                                    <div className="chart-title">Module Activity</div>
                                    <div className="chart-subtitle">Records per module</div>
                                </div>
                            </div>
                            <div className="chart-area" style={{ paddingBottom: 28 }}>
                                {barData.map((d, i) => (
                                    <div
                                        key={d.label}
                                        className="chart-bar"
                                        style={{
                                            height: `${(d.value / barMax) * 100}%`,
                                            minHeight: 4,
                                            background: `linear-gradient(to top, ${barColors[i]}88, ${barColors[i]})`,
                                        }}
                                    >
                                        <span className="chart-bar-label">{d.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="chart-card">
                            <div className="chart-header">
                                <div>
                                    <div className="chart-title">Recent Activity</div>
                                    <div className="chart-subtitle">Latest platform changes</div>
                                </div>
                                <Link href="/admin/audit" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none', fontSize: 12 }}>View All</Link>
                            </div>
                            <div className="activity-feed">
                                {recentActivity.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>No activity yet</p>
                                ) : recentActivity.map((a) => (
                                    <div key={a.id} className="activity-item">
                                        <span className="activity-dot" style={{ background: actionColors[a.action] || 'var(--text-muted)' }} />
                                        <div className="activity-content">
                                            <div className="activity-text">
                                                <strong>{a.action}</strong> on <code style={{ fontSize: 12, padding: '1px 5px', background: 'var(--bg-input)', borderRadius: 3 }}>{a.table_name}</code>
                                                {a.user_email && <> by {a.user_email.split('@')[0]}</>}
                                            </div>
                                            <div className="activity-time">{formatAgo(a.created_at)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
