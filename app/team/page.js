'use client';
import { useState, useEffect, useCallback } from 'react';
import DashboardShell, { useAuth } from '@/components/DashboardShell';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { supabase } from '@/lib/supabase';
import { isAdmin } from '@/lib/rbac';
import { logAudit } from '@/lib/audit';

const emptyMember = {
    full_name: '', company: '', title: '', email: '', phone: '', whatsapp_phone: '',
    role_to_brand: '', timezone: '', call_availability: '', role: '', responsibilities: '', notes: '',
};

export default function TeamPage() {
    return <DashboardShell><TeamMembers /></DashboardShell>;
}

function TeamMembers() {
    const auth = useAuth();
    const role = auth?.role || 'member';
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyMember);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    const fetchMembers = useCallback(async () => {
        const { data } = await supabase.from('team_members').select('*').order('full_name');
        setMembers(data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchMembers(); }, [fetchMembers]);

    const openAdd = () => { setEditing(null); setForm(emptyMember); setModalOpen(true); };
    const openEdit = (m) => { setEditing(m); setForm({ ...emptyMember, ...m }); setModalOpen(true); };

    const handleSave = async () => {
        setSaving(true);
        if (editing) {
            const { error } = await supabase.from('team_members').update(form).eq('id', editing.id);
            if (error) { setToast({ message: error.message, type: 'error' }); } else { setToast({ message: 'Member updated', type: 'success' }); }
        } else {
            const { error } = await supabase.from('team_members').insert(form);
            if (error) { setToast({ message: error.message, type: 'error' }); } else { setToast({ message: 'Member added', type: 'success' }); }
        }
        setSaving(false);
        setModalOpen(false);
        fetchMembers();
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this team member?')) return;
        await supabase.from('team_members').delete().eq('id', id);
        setToast({ message: 'Member deleted', type: 'success' });
        fetchMembers();
    };

    const filtered = members.filter((m) =>
        [m.full_name, m.email, m.company, m.role_to_brand].some((f) => f?.toLowerCase().includes(search.toLowerCase()))
    );

    const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

    return (
        <>
            <div className="page-header">
                <h1>Team Members</h1>
                <p>Manage your team across the Tony Cho Brand.</p>
                {isAdmin(role) && <div className="page-actions">
                    <button className="btn btn-primary" onClick={openAdd}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 4v16m8-8H4" /></svg>
                        Add Member
                    </button>
                </div>}
            </div>

            <div className="table-container">
                <div className="table-toolbar">
                    <div className="table-search">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                        <input placeholder="Search team members..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{filtered.length} members</span>
                </div>

                {loading ? (
                    <div className="page-loading"><span className="loading-spinner" /></div>
                ) : filtered.length === 0 ? (
                    <div className="table-empty">No team members found.</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Company</th>
                                    <th>Title</th>
                                    <th>Email</th>
                                    <th>Phone / WhatsApp</th>
                                    <th>Role to Brand</th>
                                    <th>Time Zone</th>
                                    <th>Availability</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((m) => (
                                    <tr key={m.id}>
                                        <td><span className="name-cell">{m.full_name}</span></td>
                                        <td>{m.company || '—'}</td>
                                        <td>{m.title || '—'}</td>
                                        <td>{m.email || '—'}</td>
                                        <td>{m.whatsapp_phone || m.phone || '—'}</td>
                                        <td>{m.role_to_brand || '—'}</td>
                                        <td>{m.timezone || '—'}</td>
                                        <td>{m.call_availability || '—'}</td>
                                        {isAdmin(role) && <td>
                                            <div className="row-actions">
                                                <button title="Edit" onClick={() => openEdit(m)}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                </button>
                                                <button className="delete" title="Delete" onClick={() => handleDelete(m.id)}>
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

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Member' : 'Add Member'} onSubmit={handleSave} loading={saving}>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Full Name *</label>
                        <input className="form-input" value={form.full_name} onChange={(e) => updateField('full_name', e.target.value)} placeholder="John Doe" required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Company</label>
                        <input className="form-input" value={form.company} onChange={(e) => updateField('company', e.target.value)} placeholder="Company name" />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Title</label>
                        <input className="form-input" value={form.title} onChange={(e) => updateField('title', e.target.value)} placeholder="Director of Marketing" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input className="form-input" type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="john@example.com" />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Phone</label>
                        <input className="form-input" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="+1 234-567-8900" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">WhatsApp Number</label>
                        <input className="form-input" value={form.whatsapp_phone} onChange={(e) => updateField('whatsapp_phone', e.target.value)} placeholder="+1 234-567-8900" />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Role to Tony Cho Brand</label>
                        <input className="form-input" value={form.role_to_brand} onChange={(e) => updateField('role_to_brand', e.target.value)} placeholder="e.g. PR Manager" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Time Zone</label>
                        <input className="form-input" value={form.timezone} onChange={(e) => updateField('timezone', e.target.value)} placeholder="e.g. PST, EST, UTC+8" />
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">Call Availability</label>
                    <input className="form-input" value={form.call_availability} onChange={(e) => updateField('call_availability', e.target.value)} placeholder="e.g. Mon-Fri 9am-5pm PST" />
                </div>
                <div className="form-group">
                    <label className="form-label">Internal Role</label>
                    <input className="form-input" value={form.role} onChange={(e) => updateField('role', e.target.value)} placeholder="e.g. Team Lead" />
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
