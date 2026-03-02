'use client';
import { useState, useEffect, useCallback } from 'react';
import DashboardShell, { useAuth } from '@/components/DashboardShell';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { supabase } from '@/lib/supabase';
import { isAdmin } from '@/lib/rbac';
import { formatDate } from '@/lib/utils';

const sessionTypes = ['Keynote', 'Panel Discussion', 'Workshop', 'Fireside Chat', 'Lightning Talk', 'Pre-recorded Video'];
const responseStatuses = ['Not Contacted', 'Contacted', 'Interested', 'Confirmed', 'Declined'];

const emptySpeaker = {
    full_name: '', organization: '', title: '', topic: '', session_type: '',
    contact_email: '', contact_phone: '', poc_name: '', poc_role: '', poc_email: '', poc_phone: '',
    outreach_date: '', outreach_method: '', follow_up_date: '', response_status: 'Not Contacted',
    confirmed: false, honorarium: '', session_date: '', session_time_utc: '', session_length_min: '',
    bio_received: false, headshot_received: false, contract_sent: false, contract_signed: false,
    av_requirements: '', travel_notes: '', notes: '',
    bio: '', headshot_url: '', show_on_website: false,
};

export default function SpeakersPage() {
    return <DashboardShell><Speakers /></DashboardShell>;
}

function Speakers() {
    const auth = useAuth();
    const role = auth?.role || 'member';
    const [speakers, setSpeakers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptySpeaker);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    // View detail + emails
    const [viewDetail, setViewDetail] = useState(null);
    const [viewTab, setViewTab] = useState('details');
    const [emails, setEmails] = useState([]);
    const [emailsLoading, setEmailsLoading] = useState(false);
    const [selectedEmail, setSelectedEmail] = useState(null);

    const fetchSpeakers = useCallback(async () => {
        const { data } = await supabase.from('speakers').select('*').order('full_name');
        setSpeakers(data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchSpeakers(); }, [fetchSpeakers]);

    useEffect(() => {
        if (!viewDetail || viewTab !== 'emails') return;
        setEmailsLoading(true);
        setEmails([]);
        setSelectedEmail(null);
        fetch(`/api/gmail/messages?email=${encodeURIComponent(viewDetail.contact_email || '')}`)
            .then((r) => r.json())
            .then((data) => { setEmails(data.messages || []); setEmailsLoading(false); })
            .catch(() => setEmailsLoading(false));
    }, [viewDetail, viewTab]);

    const openAdd = () => { setEditing(null); setForm(emptySpeaker); setModalOpen(true); };
    const openEdit = (s) => { setEditing(s); setForm({ ...emptySpeaker, ...s, honorarium: s.honorarium ?? '' }); setModalOpen(true); };
    const openView = (s) => { setViewDetail(s); setViewTab('details'); setEmails([]); setSelectedEmail(null); };

    const handleSave = async () => {
        setSaving(true);
        const payload = { ...form, honorarium: form.honorarium ? parseFloat(form.honorarium) : null, session_length_min: form.session_length_min ? parseInt(form.session_length_min) : null };
        delete payload.id;
        delete payload.created_at;

        if (editing) {
            const { error } = await supabase.from('speakers').update(payload).eq('id', editing.id);
            if (error) setToast({ message: error.message, type: 'error' }); else setToast({ message: 'Speaker updated', type: 'success' });
        } else {
            const { error } = await supabase.from('speakers').insert(payload);
            if (error) setToast({ message: error.message, type: 'error' }); else setToast({ message: 'Speaker added', type: 'success' });
        }
        setSaving(false);
        setModalOpen(false);
        fetchSpeakers();
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this speaker?')) return;
        await supabase.from('speakers').delete().eq('id', id);
        setToast({ message: 'Speaker deleted', type: 'success' });
        fetchSpeakers();
    };

    const badgeClass = (status) => {
        switch (status) {
            case 'Confirmed': return 'badge-success';
            case 'Interested': case 'Contacted': return 'badge-info';
            case 'Not Contacted': return 'badge-warning';
            case 'Declined': return 'badge-danger';
            default: return 'badge-neutral';
        }
    };

    const filtered = speakers.filter((s) => {
        const matchSearch = [s.full_name, s.organization, s.topic, s.contact_email].some((f) => f?.toLowerCase().includes(search.toLowerCase()));
        const matchStatus = !statusFilter || s.response_status === statusFilter;
        return matchSearch && matchStatus;
    });

    const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

    return (
        <>
            <div className="page-header">
                <h1>Summit Speakers</h1>
                <p>Manage speakers for the Generation Regeneration Online Summit.</p>
                {isAdmin(role) && <div className="page-actions">
                    <button className="btn btn-primary" onClick={openAdd}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 4v16m8-8H4" /></svg>
                        Add Speaker
                    </button>
                </div>}
            </div>

            <div className="table-container">
                <div className="table-toolbar">
                    <div className="table-search">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                        <input placeholder="Search speakers..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <div className="table-filters">
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="">All statuses</option>
                            {responseStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="page-loading"><span className="loading-spinner" /></div>
                ) : filtered.length === 0 ? (
                    <div className="table-empty">No speakers found.</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Organization</th>
                                    <th>Topic</th>
                                    <th>Session Type</th>
                                    <th>Speaker Fee</th>
                                    <th>Status</th>
                                    <th>POC</th>
                                    <th>Session Date</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((s) => (
                                    <tr key={s.id}>
                                        <td><span className="name-cell">{s.full_name}</span></td>
                                        <td>{s.organization || '—'}</td>
                                        <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.topic || '—'}</td>
                                        <td>{s.session_type || '—'}</td>
                                        <td>{s.honorarium ? `$${Number(s.honorarium).toLocaleString()}` : '—'}</td>
                                        <td><span className={`badge ${badgeClass(s.response_status)}`}>{s.response_status}</span></td>
                                        <td>{s.poc_name || s.agent_name || '—'}</td>
                                        <td>{formatDate(s.session_date)}</td>
                                        <td>
                                            <div className="row-actions">
                                                <button title="View" onClick={() => openView(s)}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                </button>
                                                {isAdmin(role) && <>
                                                    <button title="Edit" onClick={() => openEdit(s)}>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                    </button>
                                                    <button className="delete" title="Delete" onClick={() => handleDelete(s.id)}>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                                                    </button>
                                                </>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* View Detail Modal */}
            {viewDetail && (
                <div className="modal-overlay" onClick={() => setViewDetail(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 680 }}>
                        <div className="modal-header">
                            <h2>{viewDetail.full_name}</h2>
                            <button className="btn btn-ghost btn-icon" onClick={() => setViewDetail(null)}>×</button>
                        </div>

                        <div style={{ display: 'flex', gap: 4, padding: '0 24px', borderBottom: '1px solid var(--border)' }}>
                            {['details', 'emails'].map((t) => (
                                <button key={t} onClick={() => setViewTab(t)} style={{ padding: '10px 16px', fontSize: 13, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', color: viewTab === t ? 'var(--accent)' : 'var(--text-muted)', borderBottom: viewTab === t ? '2px solid var(--accent)' : '2px solid transparent', textTransform: 'capitalize' }}>
                                    {t}
                                </button>
                            ))}
                        </div>

                        <div className="modal-body">
                            {viewTab === 'details' ? (
                                <>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20 }}>
                                        <span style={{ fontWeight: 600 }}>{viewDetail.full_name}</span>
                                        {viewDetail.organization && <><span style={{ color: 'var(--text-muted)' }}>•</span><span style={{ color: 'var(--text-secondary)' }}>{viewDetail.organization}</span></>}
                                        <span style={{ marginLeft: 'auto' }}><span className={`badge ${badgeClass(viewDetail.response_status)}`}>{viewDetail.response_status}</span></span>
                                    </div>
                                    {[
                                        ['Title', viewDetail.title],
                                        ['Topic', viewDetail.topic],
                                        ['Session Type', viewDetail.session_type],
                                        ['Session Date', formatDate(viewDetail.session_date)],
                                        ['Session Length', viewDetail.session_length_min ? `${viewDetail.session_length_min} min` : null],
                                        ['Speaker Fee', viewDetail.honorarium ? `$${Number(viewDetail.honorarium).toLocaleString()}` : null],
                                        ['Speaker Email', viewDetail.contact_email],
                                        ['Speaker Phone', viewDetail.contact_phone],
                                        ['POC Name', viewDetail.poc_name],
                                        ['POC Email', viewDetail.poc_email],
                                        ['Outreach Method', viewDetail.outreach_method],
                                        ['Notes', viewDetail.notes],
                                    ].map(([label, val]) => val ? (
                                        <div key={label} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>{label}</div>
                                            <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{val}</div>
                                        </div>
                                    ) : null)}
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
                                    ) : !viewDetail.contact_email ? (
                                        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 14 }}>No email address on file for this speaker.</div>
                                    ) : emails.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 14 }}>No emails found for {viewDetail.contact_email}</div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {emails.map((email) => (
                                                <div key={email.id} onClick={() => setSelectedEmail(email)} style={{ padding: '12px 16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: '1px solid var(--border)' }}>
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
                    </div>
                </div>
            )}

            {/* Edit/Add Modal */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Speaker' : 'Add Speaker'} onSubmit={handleSave} loading={saving}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Speaker Information</p>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Full Name *</label>
                        <input className="form-input" value={form.full_name} onChange={(e) => updateField('full_name', e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Organization</label>
                        <input className="form-input" value={form.organization} onChange={(e) => updateField('organization', e.target.value)} />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Title</label>
                        <input className="form-input" value={form.title} onChange={(e) => updateField('title', e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Topic</label>
                        <input className="form-input" value={form.topic} onChange={(e) => updateField('topic', e.target.value)} />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Session Type</label>
                        <select className="form-select" value={form.session_type} onChange={(e) => updateField('session_type', e.target.value)}>
                            <option value="">Select...</option>
                            {sessionTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Speaker Fee ($)</label>
                        <input className="form-input" type="number" value={form.honorarium} onChange={(e) => updateField('honorarium', e.target.value)} placeholder="0.00" />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Speaker Email</label>
                        <input className="form-input" type="email" value={form.contact_email} onChange={(e) => updateField('contact_email', e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Speaker Phone</label>
                        <input className="form-input" value={form.contact_phone} onChange={(e) => updateField('contact_phone', e.target.value)} />
                    </div>
                </div>

                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>Point of Contact</p>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">POC Name</label>
                        <input className="form-input" value={form.poc_name} onChange={(e) => updateField('poc_name', e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">POC Role / Title</label>
                        <input className="form-input" value={form.poc_role} onChange={(e) => updateField('poc_role', e.target.value)} />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">POC Email</label>
                        <input className="form-input" type="email" value={form.poc_email} onChange={(e) => updateField('poc_email', e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">POC Phone</label>
                        <input className="form-input" value={form.poc_phone} onChange={(e) => updateField('poc_phone', e.target.value)} />
                    </div>
                </div>

                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>Outreach & Scheduling</p>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Response Status</label>
                        <select className="form-select" value={form.response_status} onChange={(e) => updateField('response_status', e.target.value)}>
                            {responseStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Outreach Method</label>
                        <input className="form-input" value={form.outreach_method} onChange={(e) => updateField('outreach_method', e.target.value)} placeholder="e.g. Email, LinkedIn" />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Session Date</label>
                        <input className="form-input" type="date" value={form.session_date || ''} onChange={(e) => updateField('session_date', e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Session Length (min)</label>
                        <input className="form-input" type="number" value={form.session_length_min || ''} onChange={(e) => updateField('session_length_min', e.target.value)} />
                    </div>
                </div>

                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>Checklist</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                    {[['confirmed', 'Confirmed'], ['contract_sent', 'Contract Sent'], ['contract_signed', 'Contract Signed'], ['bio_received', 'Bio Received'], ['headshot_received', 'Headshot Received']].map(([key, label]) => (
                        <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                            <input type="checkbox" checked={form[key] || false} onChange={(e) => updateField(key, e.target.checked)} />
                            {label}
                        </label>
                    ))}
                </div>

                <div className="form-group" style={{ marginTop: 16 }}>
                    <label className="form-label">Notes</label>
                    <textarea className="form-textarea" value={form.notes || ''} onChange={(e) => updateField('notes', e.target.value)} />
                </div>

                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>Public Website Display</p>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: 12 }}>
                    <input type="checkbox" checked={form.show_on_website || false} onChange={(e) => updateField('show_on_website', e.target.checked)} />
                    Show on public speakers page
                </label>
                <div className="form-group">
                    <label className="form-label">Speaker Bio (public)</label>
                    <textarea className="form-textarea" value={form.bio || ''} onChange={(e) => updateField('bio', e.target.value)} placeholder="Bio displayed on the website..." rows={3} />
                </div>
                <div className="form-group">
                    <label className="form-label">Headshot URL</label>
                    <input className="form-input" value={form.headshot_url || ''} onChange={(e) => updateField('headshot_url', e.target.value)} placeholder="https://example.com/photo.jpg" />
                </div>
            </Modal>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </>
    );
}
