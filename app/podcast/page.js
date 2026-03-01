'use client';
import { useState, useEffect, useCallback } from 'react';
import DashboardShell, { useAuth } from '@/components/DashboardShell';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { supabase } from '@/lib/supabase';
import { isAdmin } from '@/lib/rbac';
import { formatDate } from '@/lib/utils';

const statusOptions = ['Pending', 'Confirmed', 'Scheduled', 'Completed', 'Cancelled'];

export default function PodcastPage() {
    return <DashboardShell><PodcastBookings /></DashboardShell>;
}

function PodcastBookings() {
    const auth = useAuth();
    const role = auth?.role || 'member';
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

    if (!auth || !auth.user) return <div className="page-loading"><span className="loading-spinner" /> Loading...</div>;

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
            <div className="page-header">
                <h1>Podcast Bookings</h1>
                <p>Manage "Book a Podcast with Tony" form submissions.</p>
                <div className="page-actions">
                    <a href="/book" target="_blank" className="btn btn-secondary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        Open Public Form
                    </a>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card"><div className="stat-value">{bookings.length}</div><div className="stat-label">Total Bookings</div></div>
                <div className="stat-card"><div className="stat-value">{bookings.filter((b) => b.status === 'Pending').length}</div><div className="stat-label">Pending</div></div>
                <div className="stat-card"><div className="stat-value">{bookings.filter((b) => b.status === 'Confirmed').length}</div><div className="stat-label">Confirmed</div></div>
                <div className="stat-card"><div className="stat-value">{bookings.filter((b) => b.synced_to_sheet).length}</div><div className="stat-label">Synced to Sheet</div></div>
            </div>

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
                                    <th>Synced</th>
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
                                        <td>{b.synced_to_sheet ? <span className="badge badge-success">✓</span> : <span className="badge badge-neutral">—</span>}</td>
                                        <td>{formatDate(b.created_at)}</td>
                                        {isAdmin(role) && <td>
                                            <div className="row-actions">
                                                <button title="Edit" onClick={() => openEdit(b)}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                </button>
                                                <button className="delete" title="Delete" onClick={() => handleDelete(b.id)}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                                                </button>
                                            </div>
                                        </td>}
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
