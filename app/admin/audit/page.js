'use client';
import { useState, useEffect, useCallback, Fragment } from 'react';
import { useAuth } from '@/components/DashboardShell';
import Toast from '@/components/Toast';
import { supabase } from '@/lib/supabase';
import { isAdmin } from '@/lib/rbac';
import { formatDateTime } from '@/lib/utils';

export default function AuditPage() {
    return <AuditContent />;
}

function AuditContent() {
    const auth = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tableFilter, setTableFilter] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [expandedId, setExpandedId] = useState(null);

    const fetchLogs = useCallback(async () => {
        let query = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200);
        if (tableFilter) query = query.eq('table_name', tableFilter);
        if (actionFilter) query = query.eq('action', actionFilter);
        const { data } = await query;
        setLogs(data || []);
        setLoading(false);
    }, [tableFilter, actionFilter]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    if (!auth || !isAdmin(auth.role)) {
        return <div className="page-loading" style={{ color: 'var(--danger)' }}>Access denied. Admin only.</div>;
    }

    const tables = [...new Set(logs.map((l) => l.table_name).filter(Boolean))];
    const actionClass = (action) => {
        switch (action) {
            case 'INSERT': return 'badge-success';
            case 'UPDATE': return 'badge-info';
            case 'DELETE': return 'badge-danger';
            default: return 'badge-neutral';
        }
    };

    return (
        <>
            <div className="page-header">
                <h1>Audit Log</h1>
                <p>Track all write operations across the platform.</p>
            </div>

            <div className="table-container">
                <div className="table-toolbar">
                    <div className="table-filters">
                        <select value={tableFilter} onChange={(e) => setTableFilter(e.target.value)}>
                            <option value="">All tables</option>
                            {tables.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
                            <option value="">All actions</option>
                            <option value="INSERT">INSERT</option>
                            <option value="UPDATE">UPDATE</option>
                            <option value="DELETE">DELETE</option>
                        </select>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{logs.length} entries</span>
                </div>

                {loading ? (
                    <div className="page-loading"><span className="loading-spinner" /></div>
                ) : logs.length === 0 ? (
                    <div className="table-empty">No audit entries found.</div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>User</th>
                                <th>Action</th>
                                <th>Table</th>
                                <th>Record ID</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log) => (
                                <Fragment key={log.id}>
                                    <tr>
                                        <td style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{formatDateTime(log.created_at)}</td>
                                        <td>{log.user_email || '—'}</td>
                                        <td><span className={`badge ${actionClass(log.action)}`}>{log.action}</span></td>
                                        <td><code style={{ fontSize: 12, padding: '2px 6px', background: 'var(--bg-input)', borderRadius: 4 }}>{log.table_name}</code></td>
                                        <td style={{ fontSize: 12, fontFamily: 'monospace', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.record_id?.slice(0, 8) || '—'}</td>
                                        <td>
                                            <button className="btn btn-ghost btn-sm" onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}>
                                                {expandedId === log.id ? 'Hide' : 'View'}
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedId === log.id && (
                                        <tr key={`${log.id}-detail`}>
                                            <td colSpan={6} style={{ padding: 20, background: 'var(--bg-input)' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                                    <div>
                                                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Old Data</p>
                                                        <pre style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>
                                                            {log.old_data ? JSON.stringify(log.old_data, null, 2) : '—'}
                                                        </pre>
                                                    </div>
                                                    <div>
                                                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>New Data</p>
                                                        <pre style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>
                                                            {log.new_data ? JSON.stringify(log.new_data, null, 2) : '—'}
                                                        </pre>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </>
    );
}
