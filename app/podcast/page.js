'use client';
import { useState, useEffect, useCallback } from 'react';
import DashboardShell, { useAuth } from '@/components/DashboardShell';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { supabase } from '@/lib/supabase';
import { isAdmin } from '@/lib/rbac';
import { formatDate } from '@/lib/utils';

const statusOptions = ['Pending', 'Confirmed', 'Scheduled', 'Completed', 'Cancelled'];

const collabStatusOptions = [
    'Pitching', 'Evaluating', 'Outreach', 'Follow up', 'Interest indicated',
    'Follow up (Send Mediakit)', 'Follow up (Scheduling)', 'Scheduled',
    'Follow up (Awaiting Questions)', 'Follow up (Awaiting Published Link)',
    'Published', 'Passed/Rejected', 'In Progress'
];

const collabCategories = ['General', 'Real Estate', 'Wellness', 'Psychedelics', 'Impact'];
const recordingOptions = ['In-Person', 'Virtual', 'TBD'];

export default function PodcastPage() {
    return <DashboardShell><PodcastManager /></DashboardShell>;
}

function PodcastManager() {
    const auth = useAuth();
    const [activeTab, setActiveTab] = useState('outbound');

    if (!auth || !auth.user) return <div className="page-loading"><span className="loading-spinner" /></div>;

    return (
        <>
            <div className="page-header">
                <h1>Podcast Management</h1>
                <p>Manage inbound requests and outbound collaborations.</p>
                <div className="page-actions">
                    <a href="https://docs.google.com/forms/d/e/1FAIpQLSfrlA7V2t3nqqWdLj3Pfiwp1zHkO71lftjjBSEAs8__W1wfOg/viewform" target="_blank" className="btn btn-secondary" rel="noreferrer">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        Open Public Form
                    </a>
                    <a href="https://docs.google.com/spreadsheets/d/1a_qeyWhqvRH9DkF4hqMbmCUD6r96x2lYEtMwk1plYt0/edit?gid=1129896733#gid=1129896733" target="_blank" className="btn btn-primary" rel="noreferrer">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Mindful Agency - Tcho Roadmap
                    </a>
                </div>
            </div>

            <div className="tabs" style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
                <button
                    onClick={() => setActiveTab('outbound')}
                    style={{ background: 'none', border: 'none', padding: '12px 0', cursor: 'pointer', color: activeTab === 'outbound' ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: activeTab === 'outbound' ? 600 : 400, borderBottom: activeTab === 'outbound' ? '2px solid var(--text-primary)' : '2px solid transparent' }}
                >
                    Podcast Collaborations
                </button>
                <button
                    onClick={() => setActiveTab('inbound')}
                    style={{ background: 'none', border: 'none', padding: '12px 0', cursor: 'pointer', color: activeTab === 'inbound' ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: activeTab === 'inbound' ? 600 : 400, borderBottom: activeTab === 'inbound' ? '2px solid var(--text-primary)' : '2px solid transparent' }}
                >
                    Inbound Bookings (Legacy)
                </button>
            </div>

            {activeTab === 'outbound' ? <OutboundCollaborations role={auth.role} /> : <InboundBookings role={auth.role} />}
        </>
    );
}

function OutboundCollaborations({ role }) {
    const [collabs, setCollabs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [toast, setToast] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);

    const emptyForm = {
        host_name: '', podcast_with_host: '', ig_link: '', yt_link: '', fb_link: '',
        linkedin_link: '', website_link: '', other_metrics: '', mindful_agency_notes: '',
        status_update: 'Pitching', client_notes: '', location: '', categories: [],
        recording_option: 'TBD', representative: '', published_link: ''
    };
    const [form, setForm] = useState(emptyForm);

    const fetchCollabs = useCallback(async () => {
        const { data } = await supabase.from('podcast_collaborations').select('*').order('created_at', { ascending: false });
        setCollabs(data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchCollabs(); }, [fetchCollabs]);

    const openAdd = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
    const openEdit = (c) => { setEditing(c); setForm({ ...emptyForm, ...c, categories: c.categories || [] }); setModalOpen(true); };

    const handleSave = async () => {
        setSaving(true);
        const payload = { ...form };
        delete payload.id;
        delete payload.created_at;
        delete payload.updated_at;

        if (editing) {
            const { error } = await supabase.from('podcast_collaborations').update(payload).eq('id', editing.id);
            if (error) setToast({ message: error.message, type: 'error' }); else setToast({ message: 'Collaboration updated', type: 'success' });
        } else {
            payload.categories = payload.categories || [];
            const { error } = await supabase.from('podcast_collaborations').insert(payload);
            if (error) setToast({ message: error.message, type: 'error' }); else setToast({ message: 'Collaboration added', type: 'success' });
        }
        setSaving(false);
        setModalOpen(false);
        fetchCollabs();
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this collaboration?')) return;
        await supabase.from('podcast_collaborations').delete().eq('id', id);
        setToast({ message: 'Collaboration deleted', type: 'success' });
        fetchCollabs();
    };

    const updateField = (f, v) => setForm(p => ({ ...p, [f]: v }));
    const toggleCategory = (cat) => setForm(p => {
        const arr = Array.isArray(p.categories) ? p.categories : [];
        return { ...p, categories: arr.includes(cat) ? arr.filter(c => c !== cat) : [...arr, cat] };
    });

    const formatLink = (url) => {
        if (!url) return '';
        return url.startsWith('http') ? url : `https://${url}`;
    };

    const renderLink = (url, label = "Link") => url ? <a href={formatLink(url)} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>{label}</a> : '—';

    const filtered = collabs.filter(c => [c.host_name, c.podcast_with_host].some(x => x?.toLowerCase().includes(search.toLowerCase())));

    return (
        <>
            <div className="table-container">
                <div className="table-toolbar">
                    <div className="table-search">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                        <input placeholder="Search hosts..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <button className="btn btn-primary" onClick={openAdd} style={{ padding: '6px 16px', fontSize: 13 }}>
                        Add Collaboration
                    </button>
                </div>

                {loading ? (
                    <div className="page-loading"><span className="loading-spinner" /></div>
                ) : filtered.length === 0 ? (
                    <div className="table-empty">No collaborations match your search.</div>
                ) : (
                    <div style={{ overflowX: 'auto', paddingBottom: 60 }}>
                        <table style={{ whiteSpace: 'nowrap' }}>
                            <thead>
                                <tr>
                                    <th>Status</th>
                                    <th>Host Name</th>
                                    <th>Podcast</th>
                                    <th>Links</th>
                                    <th>Location</th>
                                    <th>Categories</th>
                                    <th>Recording</th>
                                    <th>Published Link</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((c) => (
                                    <tr key={c.id}>
                                        <td><span className="badge badge-neutral">{c.status_update || 'Pitching'}</span></td>
                                        <td><span className="name-cell">{c.host_name}</span></td>
                                        <td>{c.podcast_with_host || '—'}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                {renderLink(c.ig_link, 'IG')}
                                                {renderLink(c.yt_link, 'YT')}
                                                {renderLink(c.fb_link, 'FB')}
                                                {renderLink(c.linkedin_link, 'IN')}
                                                {renderLink(c.website_link, 'Web')}
                                            </div>
                                        </td>
                                        <td>{c.location || '—'}</td>
                                        <td>{(c.categories || []).join(', ') || '—'}</td>
                                        <td>{c.recording_option || '—'}</td>
                                        <td>{renderLink(c.published_link, 'Published')}</td>
                                        <td>
                                            <div className="row-actions">
                                                <button title="Edit" onClick={() => openEdit(c)}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                </button>
                                                <button className="delete" title="Delete" onClick={() => handleDelete(c.id)}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Collaboration' : 'Add Collaboration'} onSubmit={handleSave} loading={saving}>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Host Name *</label>
                        <input className="form-input" value={form.host_name || ''} onChange={(e) => updateField('host_name', e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Podcast with Host</label>
                        <input className="form-input" value={form.podcast_with_host || ''} onChange={(e) => updateField('podcast_with_host', e.target.value)} placeholder="Podcast name or link" />
                    </div>
                </div>

                <h4 style={{ margin: '16px 0 8px', fontSize: 13, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Social Links</h4>
                <div className="form-row">
                    <div className="form-group"><input className="form-input" placeholder="IG Link" value={form.ig_link || ''} onChange={(e) => updateField('ig_link', e.target.value)} /></div>
                    <div className="form-group"><input className="form-input" placeholder="YT Link" value={form.yt_link || ''} onChange={(e) => updateField('yt_link', e.target.value)} /></div>
                </div>
                <div className="form-row">
                    <div className="form-group"><input className="form-input" placeholder="FB Link" value={form.fb_link || ''} onChange={(e) => updateField('fb_link', e.target.value)} /></div>
                    <div className="form-group"><input className="form-input" placeholder="LinkedIn Link" value={form.linkedin_link || ''} onChange={(e) => updateField('linkedin_link', e.target.value)} /></div>
                </div>
                <div className="form-row">
                    <div className="form-group"><input className="form-input" placeholder="Website Link" value={form.website_link || ''} onChange={(e) => updateField('website_link', e.target.value)} /></div>
                    <div className="form-group"><input className="form-input" placeholder="Published Podcast Link" value={form.published_link || ''} onChange={(e) => updateField('published_link', e.target.value)} /></div>
                </div>

                <div className="form-group">
                    <label className="form-label">Other Metric(s)</label>
                    <input className="form-input" value={form.other_metrics || ''} onChange={(e) => updateField('other_metrics', e.target.value)} />
                </div>

                <h4 style={{ margin: '16px 0 8px', fontSize: 13, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Status & Operations</h4>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Status Update</label>
                        <select className="form-select" value={form.status_update || ''} onChange={(e) => updateField('status_update', e.target.value)}>
                            {collabStatusOptions.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Recording Option</label>
                        <select className="form-select" value={form.recording_option || ''} onChange={(e) => updateField('recording_option', e.target.value)}>
                            {recordingOptions.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Location</label>
                        <input className="form-input" value={form.location || ''} onChange={(e) => updateField('location', e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Representative (Initials)</label>
                        <input className="form-input" value={form.representative || ''} onChange={(e) => updateField('representative', e.target.value)} />
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Categories</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {collabCategories.map(cat => (
                            <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', background: 'var(--bg-card)', padding: '6px 12px', borderRadius: 20, border: '1px solid var(--border)' }}>
                                <input type="checkbox" checked={(form.categories || []).includes(cat)} onChange={() => toggleCategory(cat)} />
                                {cat}
                            </label>
                        ))}
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Mindful Agency's Notes</label>
                    <textarea className="form-textarea" value={form.mindful_agency_notes || ''} onChange={(e) => updateField('mindful_agency_notes', e.target.value)} />
                </div>
                <div className="form-group">
                    <label className="form-label">Client Notes</label>
                    <textarea className="form-textarea" value={form.client_notes || ''} onChange={(e) => updateField('client_notes', e.target.value)} />
                </div>

            </Modal>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </>
    );
}

function InboundBookings({ role }) {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    const fetchBookings = useCallback(async () => {
        const { data } = await supabase.from('podcast_bookings').select('*').order('created_at', { ascending: false });
        setBookings(data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchBookings(); }, [fetchBookings]);

    const openEdit = (b) => { setEditing(b); setForm({ ...b }); setModalOpen(true); };

    const handleSave = async () => {
        if (!editing) return;
        setSaving(true);
        const { error } = await supabase.from('podcast_bookings').update({
            status: form.status, guest_name: form.guest_name, guest_email: form.guest_email,
            guest_phone: form.guest_phone, company: form.company, topic: form.topic,
            preferred_date: form.preferred_date, preferred_time: form.preferred_time, message: form.message,
        }).eq('id', editing.id);
        if (error) setToast({ message: error.message, type: 'error' }); else setToast({ message: 'Booking updated', type: 'success' });
        setSaving(false);
        setModalOpen(false);
        fetchBookings();
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this booking?')) return;
        await supabase.from('podcast_bookings').delete().eq('id', id);
        setToast({ message: 'Booking deleted', type: 'success' });
        fetchBookings();
    };

    const badgeClass = (status) => {
        switch (status) {
            case 'Confirmed': case 'Completed': return 'badge-success';
            case 'Pending': return 'badge-warning';
            case 'Cancelled': return 'badge-danger';
            default: return 'badge-info';
        }
    };

    const filtered = bookings.filter((b) => {
        const matchSearch = [b.guest_name, b.guest_email, b.company, b.topic].some((f) => f?.toLowerCase().includes(search.toLowerCase()));
        const matchStatus = !statusFilter || b.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

    return (
        <>
            <div className="table-container">
                <div className="table-toolbar">
                    <div className="table-search">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                        <input placeholder="Search bookings..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <div className="table-filters">
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="">All statuses</option>
                            {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="page-loading"><span className="loading-spinner" /></div>
                ) : filtered.length === 0 ? (
                    <div className="table-empty">No bookings found.</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Guest</th>
                                    <th>Email</th>
                                    <th>Company</th>
                                    <th>Topic</th>
                                    <th>Preferred Date</th>
                                    <th>Status</th>
                                    <th>Submitted</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((b) => (
                                    <tr key={b.id}>
                                        <td><span className="name-cell">{b.guest_name}</span></td>
                                        <td>{b.guest_email}</td>
                                        <td>{b.company || '—'}</td>
                                        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.topic || '—'}</td>
                                        <td>{formatDate(b.preferred_date)}</td>
                                        <td><span className={`badge ${badgeClass(b.status)}`}>{b.status}</span></td>
                                        <td>{formatDate(b.created_at)}</td>
                                        <td>
                                            <div className="row-actions">
                                                <button title="Edit" onClick={() => openEdit(b)}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                </button>
                                                <button className="delete" title="Delete" onClick={() => handleDelete(b.id)}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Edit Booking" onSubmit={handleSave} loading={saving}>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Guest Name</label>
                        <input className="form-input" value={form.guest_name || ''} onChange={(e) => updateField('guest_name', e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input className="form-input" value={form.guest_email || ''} onChange={(e) => updateField('guest_email', e.target.value)} />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Company</label>
                        <input className="form-input" value={form.company || ''} onChange={(e) => updateField('company', e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Status</label>
                        <select className="form-select" value={form.status || 'Pending'} onChange={(e) => updateField('status', e.target.value)}>
                            {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Preferred Date</label>
                        <input className="form-input" type="date" value={form.preferred_date || ''} onChange={(e) => updateField('preferred_date', e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Preferred Time</label>
                        <input className="form-input" value={form.preferred_time || ''} onChange={(e) => updateField('preferred_time', e.target.value)} />
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">Topic</label>
                    <input className="form-input" value={form.topic || ''} onChange={(e) => updateField('topic', e.target.value)} />
                </div>
                <div className="form-group">
                    <label className="form-label">Message</label>
                    <textarea className="form-textarea" value={form.message || ''} onChange={(e) => updateField('message', e.target.value)} />
                </div>
            </Modal>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </>
    );
}
