'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/DashboardShell';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { supabase } from '@/lib/supabase';
import { isAdmin } from '@/lib/rbac';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export default function FormsPage() {
    return <FormsContent />;
}

function FormsContent() {
    const auth = useAuth();
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState({ name: '', description: '', slug: '' });
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    const fetchForms = useCallback(async () => {
        const { data } = await supabase.from('form_templates').select('*').order('created_at', { ascending: false });
        setForms(data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchForms(); }, [fetchForms]);

    if (!auth || !isAdmin(auth.role)) {
        return <div className="page-loading" style={{ color: 'var(--danger)' }}>Access denied. Admin only.</div>;
    }

    const handleCreate = async () => {
        setSaving(true);
        const slug = form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const { data, error } = await supabase.from('form_templates').insert({
            name: form.name, description: form.description, slug,
            created_by: auth.user.id, status: 'draft',
        }).select().single();
        if (error) setToast({ message: error.message, type: 'error' });
        else { setToast({ message: 'Form created', type: 'success' }); }
        setSaving(false);
        setModalOpen(false);
        setForm({ name: '', description: '', slug: '' });
        fetchForms();
    };

    const handleDuplicate = async (original) => {
        const { data } = await supabase.from('form_fields').select('*').eq('form_id', original.id).order('sort_order');
        const { data: newForm } = await supabase.from('form_templates').insert({
            name: `${original.name} (Copy)`, description: original.description,
            slug: `${original.slug}-copy-${Date.now()}`, created_by: auth.user.id, status: 'draft', settings: original.settings,
        }).select().single();
        if (newForm && data?.length) {
            const fields = data.map(({ id, form_id, ...f }) => ({ ...f, form_id: newForm.id }));
            await supabase.from('form_fields').insert(fields);
        }
        setToast({ message: 'Form duplicated', type: 'success' });
        fetchForms();
    };

    const togglePublish = async (f) => {
        const newStatus = f.status === 'published' ? 'draft' : 'published';
        await supabase.from('form_templates').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', f.id);
        setToast({ message: newStatus === 'published' ? 'Form published' : 'Form unpublished', type: 'success' });
        fetchForms();
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this form and all its fields?')) return;
        await supabase.from('form_templates').delete().eq('id', id);
        setToast({ message: 'Form deleted', type: 'success' });
        fetchForms();
    };

    return (
        <>
            <div className="page-header">
                <h1>Form Builder</h1>
                <p>Create dynamic forms with custom fields, conditions, and templates.</p>
                <div className="page-actions">
                    <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 4v16m8-8H4" /></svg>
                        New Form
                    </button>
                </div>
            </div>

            <div className="table-container">
                {loading ? (
                    <div className="page-loading"><span className="loading-spinner" /></div>
                ) : forms.length === 0 ? (
                    <div className="table-empty">No forms yet. Create your first form.</div>
                ) : (
                    <table>
                        <thead>
                            <tr><th>Form Name</th><th>Slug</th><th>Status</th><th>Created</th><th></th></tr>
                        </thead>
                        <tbody>
                            {forms.map((f) => (
                                <tr key={f.id}>
                                    <td><Link href={`/admin/forms/${f.id}`} style={{ color: 'var(--text-primary)', fontWeight: 500, textDecoration: 'none' }}>{f.name}</Link></td>
                                    <td><code style={{ fontSize: 12, padding: '2px 6px', background: 'var(--bg-input)', borderRadius: 4 }}>/forms/{f.slug}</code></td>
                                    <td>
                                        <span className={`badge ${f.status === 'published' ? 'badge-success' : 'badge-warning'}`}>{f.status}</span>
                                    </td>
                                    <td>{formatDate(f.created_at)}</td>
                                    <td>
                                        <div className="row-actions" style={{ gap: 2 }}>
                                            <Link href={`/admin/forms/${f.id}`} className="btn btn-ghost btn-sm" style={{ textDecoration: 'none', fontSize: 12 }}>Edit</Link>
                                            <Link href={`/admin/forms/${f.id}/responses`} className="btn btn-ghost btn-sm" style={{ textDecoration: 'none', fontSize: 12 }}>Responses</Link>
                                            <button className="btn btn-ghost btn-sm" onClick={() => togglePublish(f)} style={{ fontSize: 12 }}>
                                                {f.status === 'published' ? 'Unpublish' : 'Publish'}
                                            </button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => handleDuplicate(f)} style={{ fontSize: 12 }}>Duplicate</button>
                                            <button className="btn btn-ghost btn-sm delete" onClick={() => handleDelete(f.id)} style={{ fontSize: 12, color: 'var(--danger)' }}>Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New Form" onSubmit={handleCreate} loading={saving}>
                <div className="form-group">
                    <label className="form-label">Form Name *</label>
                    <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Speaker Application" required />
                </div>
                <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea className="form-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Briefly describe the form's purpose" />
                </div>
                <div className="form-group">
                    <label className="form-label">URL Slug</label>
                    <input className="form-input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated from name" />
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Leave blank to auto-generate. Accessible at /forms/slug</p>
                </div>
            </Modal>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </>
    );
}
