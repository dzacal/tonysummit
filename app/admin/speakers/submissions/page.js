'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/DashboardShell';
import { supabase } from '@/lib/supabase';
import { isAdmin } from '@/lib/rbac';
import Toast from '@/components/Toast';

export default function SpeakerSubmissionsPage() {
    return <SubmissionsList />;
}

function SubmissionsList() {
    const auth = useAuth();
    const [submissions, setSubmissions] = useState([]);
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [detail, setDetail] = useState(null);
    const [modalTab, setModalTab] = useState('details');
    const [emails, setEmails] = useState([]);
    const [emailsLoading, setEmailsLoading] = useState(false);
    const [selectedEmail, setSelectedEmail] = useState(null);
    const [toast, setToast] = useState(null);

    const fetchData = useCallback(async () => {
        const [{ data: subs }, { data: version }] = await Promise.all([
            supabase.from('speaker_submissions').select('*, speaker_form_versions(version, fields_snapshot)').order('created_at', { ascending: false }),
            supabase.from('speaker_form_versions').select('fields_snapshot').eq('status', 'published').order('version', { ascending: false }).limit(1).single(),
        ]);
        setSubmissions(subs || []);
        setFields(version?.fields_snapshot || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        if (!detail || modalTab !== 'emails') return;
        setEmailsLoading(true);
        setEmails([]);
        setSelectedEmail(null);
        fetch(`/api/gmail/messages?email=${encodeURIComponent(detail.submitter_email)}`)
            .then((r) => r.json())
            .then((data) => { setEmails(data.messages || []); setEmailsLoading(false); })
            .catch(() => setEmailsLoading(false));
    }, [detail, modalTab]);

    if (!auth || !isAdmin(auth.role)) return null;

    const openDetail = (s) => {
        setDetail(s);
        setModalTab('details');
        setSelectedEmail(null);
        setEmails([]);
    };

    const updateStatus = async (id, newStatus) => {
        await supabase.from('speaker_submissions').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
        setSubmissions(submissions.map((s) => s.id === id ? { ...s, status: newStatus } : s));
        if (detail?.id === id) setDetail({ ...detail, status: newStatus });
        setToast({ message: `Status updated to ${newStatus}`, type: 'success' });
    };

    const filtered = submissions.filter((s) => {
        const matchSearch = !search || (s.submitter_name || '').toLowerCase().includes(search.toLowerCase()) || (s.submitter_email || '').toLowerCase().includes(search.toLowerCase());
        const matchStatus = !statusFilter || s.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const statusBadge = (status) => {
        const map = { new: 'badge-info', reviewed: 'badge-warning', approved: 'badge-success', rejected: 'badge-danger' };
        return <span className={`badge ${map[status] || 'badge-neutral'}`}>{status}</span>;
    };

    const exportCSV = () => {
        const keys = fields.map((f) => f.field_key);
        const header = ['Name', 'Email', 'Status', 'Submitted', ...fields.map((f) => f.label)];
        const rows = filtered.map((s) => [
            s.submitter_name || '', s.submitter_email || '', s.status,
            new Date(s.created_at).toLocaleString(),
            ...keys.map((k) => { const v = s.custom_data?.[k]; return typeof v === 'boolean' ? (v ? 'Yes' : 'No') : v || ''; }),
        ]);
        const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'speaker_submissions.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    const exportJSON = () => {
        const data = filtered.map((s) => ({ name: s.submitter_name, email: s.submitter_email, status: s.status, submitted: s.created_at, ...s.custom_data }));
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'speaker_submissions.json'; a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <>
            <div className="page-header">
                <h1>Speaker Submissions</h1>
                <p>Review and manage speaker applications.</p>
                <div className="page-actions">
                    <button className="btn btn-secondary btn-sm" onClick={exportCSV}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Export CSV
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={exportJSON}>Export JSON</button>
                </div>
            </div>

            {loading ? (
                <div className="page-loading"><span className="loading-spinner" /></div>
            ) : (
                <div className="table-container">
                    <div className="table-toolbar">
                        <div className="table-search">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                            <input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
                        </div>
                        <div className="table-filters">
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                <option value="">All Status</option>
                                <option value="new">New</option>
                                <option value="reviewed">Reviewed</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Status</th>
                                <th>Submitted</th>
                                <th>Version</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={6} className="table-empty">No submissions found</td></tr>
                            ) : filtered.map((s) => (
                                <tr key={s.id}>
                                    <td className="name-cell" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{s.submitter_name || '—'}</td>
                                    <td style={{ fontSize: 13 }}>{s.submitter_email || '—'}</td>
                                    <td>{statusBadge(s.status)}</td>
                                    <td style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{new Date(s.created_at).toLocaleDateString()}</td>
                                    <td style={{ fontSize: 13 }}>v{s.speaker_form_versions?.version || '?'}</td>
                                    <td>
                                        <div className="row-actions">
                                            <button title="View" onClick={() => openDetail(s)}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="table-pagination">
                        <span>{filtered.length} submission{filtered.length !== 1 ? 's' : ''}</span>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {detail && (
                <div className="modal-overlay" onClick={() => setDetail(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
                        <div className="modal-header">
                            <h2>{detail.submitter_name || 'Submission Details'}</h2>
                            <button className="btn btn-ghost btn-icon" onClick={() => setDetail(null)}>×</button>
                        </div>

                        {/* Modal Tabs */}
                        <div style={{ display: 'flex', gap: 4, padding: '0 24px', borderBottom: '1px solid var(--border)' }}>
                            {['details', 'emails'].map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setModalTab(t)}
                                    style={{
                                        padding: '10px 16px',
                                        fontSize: 13,
                                        fontWeight: 500,
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: modalTab === t ? 'var(--accent)' : 'var(--text-muted)',
                                        borderBottom: modalTab === t ? '2px solid var(--accent)' : '2px solid transparent',
                                        textTransform: 'capitalize',
                                    }}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>

                        <div className="modal-body">
                            {modalTab === 'details' ? (
                                <>
                                    <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                                        <span style={{ fontWeight: 600 }}>{detail.submitter_name || 'Anonymous'}</span>
                                        <span style={{ color: 'var(--text-muted)' }}>•</span>
                                        <span style={{ color: 'var(--text-secondary)' }}>{detail.submitter_email || '—'}</span>
                                        <span style={{ marginLeft: 'auto' }}>{statusBadge(detail.status)}</span>
                                    </div>
                                    {(detail.speaker_form_versions?.fields_snapshot || fields).map((field) => {
                                        const val = detail.custom_data?.[field.field_key];
                                        return (
                                            <div key={field.field_key} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{field.label}</div>
                                                <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{typeof val === 'boolean' ? (val ? 'Yes' : 'No') : val || '—'}</div>
                                            </div>
                                        );
                                    })}
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                                        Submitted: {new Date(detail.created_at).toLocaleString()} • Version: v{detail.speaker_form_versions?.version || '?'}
                                    </div>
                                </>
                            ) : (
                                <>
                                    {emailsLoading ? (
                                        <div style={{ textAlign: 'center', padding: 40 }}><span className="loading-spinner" /></div>
                                    ) : selectedEmail ? (
                                        <>
                                            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedEmail(null)} style={{ marginBottom: 16 }}>← Back</button>
                                            <div style={{ marginBottom: 12 }}>
                                                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{selectedEmail.subject}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>From: {selectedEmail.from}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>To: {selectedEmail.to}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(selectedEmail.date).toLocaleString()}</div>
                                            </div>
                                            <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', background: 'var(--bg-input)', padding: 16, borderRadius: 'var(--radius-md)', maxHeight: 400, overflowY: 'auto' }}>
                                                {selectedEmail.body || selectedEmail.snippet || '(no content)'}
                                            </div>
                                        </>
                                    ) : emails.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 14 }}>
                                            No emails found for {detail.submitter_email}
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {emails.map((email) => (
                                                <div
                                                    key={email.id}
                                                    onClick={() => setSelectedEmail(email)}
                                                    style={{ padding: '12px 16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: '1px solid var(--border)' }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                        <span style={{ fontSize: 13, fontWeight: 600 }}>{email.subject}</span>
                                                        <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: 8 }}>{new Date(email.date).toLocaleDateString()}</span>
                                                    </div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{email.from}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email.snippet}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="modal-footer">
                            <span style={{ fontSize: 13, color: 'var(--text-muted)', marginRight: 'auto' }}>Change status:</span>
                            {['new', 'reviewed', 'approved', 'rejected'].map((st) => (
                                <button
                                    key={st}
                                    className={`btn btn-sm ${detail.status === st ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => updateStatus(detail.id, st)}
                                    style={{ textTransform: 'capitalize' }}
                                >
                                    {st}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </>
    );
}
