'use client';
import { useState, useEffect, useCallback } from 'react';
import DashboardShell, { useAuth } from '@/components/DashboardShell';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { supabase } from '@/lib/supabase';
import { isAdmin } from '@/lib/rbac';

const emptyPartner = {
    organization: '', partnership_type: '', primary_contact_name: '', primary_contact_title: '',
    primary_contact_email: '', primary_contact_phone: '', website: '', partnership_status: 'Prospecting',
    notes: '',
};

const statusOptions = ['Prospecting', 'In Discussion', 'Agreed', 'Active', 'On Hold', 'Ended'];

export default function PartnersPage() {
    return <DashboardShell><Partners /></DashboardShell>;
}

function Partners() {
    const auth = useAuth();
    const role = auth?.role || 'member';
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyPartner);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    const fetchPartners = useCallback(async () => {
        const { data } = await supabase.from('partners').select('*').order('organization');
        setPartners(data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchPartners(); }, [fetchPartners]);

    const openAdd = () => { setEditing(null); setForm(emptyPartner); setModalOpen(true); };
    const openEdit = (p) => { setEditing(p); setForm({ ...emptyPartner, ...p }); setModalOpen(true); };

    const handleSave = async () => {
        setSaving(true);
        const payload = { ...form };
        if (editing) {
            const { error } = await supabase.from('partners').update(payload).eq('id', editing.id);
            if (error) setToast({ message: error.message, type: 'error' }); else setToast({ message: 'Partner updated', type: 'success' });
        } else {
            const { error } = await supabase.from('partners').insert(payload);
            if (error) setToast({ message: error.message, type: 'error' }); else setToast({ message: 'Partner added', type: 'success' });
        }
        setSaving(false);
        setModalOpen(false);
        fetchPartners();
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this partner?')) return;
        await supabase.from('partners').delete().eq('id', id);
        setToast({ message: 'Partner deleted', type: 'success' });
        fetchPartners();
    };

    const badgeClass = (status) => {
        switch (status) {
            case 'Active': return 'badge-success';
            case 'In Discussion': case 'Agreed': return 'badge-info';
            case 'Prospecting': return 'badge-warning';
            case 'On Hold': case 'Ended': return 'badge-neutral';
            default: return 'badge-neutral';
        }
    };

    const filtered = partners.filter((p) =>
        [p.organization, p.primary_contact_name, p.primary_contact_email].some((f) => f?.toLowerCase().includes(search.toLowerCase()))
    );

    const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

    return (
        <>
            <div className="page-header">
                <h1>Summit Partners</h1>
                <p>Manage partner organizations for the Generation Regeneration Online Summit.</p>
                {isAdmin(role) && <div className="page-actions">
                    <button className="btn btn-primary" onClick={openAdd}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 4v16m8-8H4" /></svg>
                        Add Partner
                    </button>
                </div>}
            </div>

            <div className="table-container">
                <div className="table-toolbar">
                    <div className="table-search">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                        <input placeholder="Search partners..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{filtered.length} partner{filtered.length !== 1 ? 's' : ''}</span>
                </div>

                {loading ? (
                    <div className="page-loading"><span className="loading-spinner" /></div>
                ) : filtered.length === 0 ? (
                    <div className="table-empty">No partners found.</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Company</th>
                                    <th>Website</th>
                                    <th>Point of Contact</th>
                                    <th>Phone</th>
                                    <th>Status</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((p) => (
                                    <tr key={p.id}>
                                        <td><span className="name-cell">{p.organization}</span></td>
                                        <td>{p.website ? <a href={p.website} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>{new URL(p.website).hostname}</a> : '—'}</td>
                                        <td>{p.primary_contact_name || '—'}</td>
                                        <td>{p.primary_contact_phone || '—'}</td>
                                        <td><span className={`badge ${badgeClass(p.partnership_status)}`}>{p.partnership_status}</span></td>
                                        {isAdmin(role) && <td>
                                            <div className="row-actions">
                                                <button title="Edit" onClick={() => openEdit(p)}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                </button>
                                                <button className="delete" title="Delete" onClick={() => handleDelete(p.id)}>
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

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Partner' : 'Add Partner'} onSubmit={handleSave} loading={saving}>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Company *</label>
                        <input className="form-input" value={form.organization} onChange={(e) => updateField('organization', e.target.value)} placeholder="Partner org name" required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Website</label>
                        <input className="form-input" value={form.website} onChange={(e) => updateField('website', e.target.value)} placeholder="https://..." />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Point of Contact</label>
                        <input className="form-input" value={form.primary_contact_name} onChange={(e) => updateField('primary_contact_name', e.target.value)} placeholder="Contact name" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Phone Number</label>
                        <input className="form-input" value={form.primary_contact_phone} onChange={(e) => updateField('primary_contact_phone', e.target.value)} placeholder="+1 234-567-8900" />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Partnership Type</label>
                        <input className="form-input" value={form.partnership_type} onChange={(e) => updateField('partnership_type', e.target.value)} placeholder="e.g. Sponsor, Media" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Status</label>
                        <select className="form-select" value={form.partnership_status} onChange={(e) => updateField('partnership_status', e.target.value)}>
                            {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">Notes</label>
                    <textarea className="form-textarea" value={form.notes} onChange={(e) => updateField('notes', e.target.value)} placeholder="Any additional notes..." />
                </div>
            </Modal>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </>
    );
}
