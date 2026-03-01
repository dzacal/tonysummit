'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import DashboardShell, { useAuth } from '@/components/DashboardShell';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { supabase } from '@/lib/supabase';
import { isAdmin } from '@/lib/rbac';
import { formatDate } from '@/lib/utils';

const assetTypes = ['Image', 'Video', 'Deck', 'Document', 'Social Copy', 'Other'];
const statusOptions = ['Draft', 'In Review', 'Approved', 'Published', 'Archived'];

const emptyAsset = {
    asset_name: '', asset_type: '', campaign: '', owner: '', status: 'Draft',
    file_url: '', category: '', platform: '', notes: '',
};

export default function AssetsPage() {
    return <DashboardShell><MarketingAssets /></DashboardShell>;
}

function MarketingAssets() {
    const auth = useAuth();
    const role = auth?.role || 'member';
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyAsset);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef(null);

    const fetchAssets = useCallback(async () => {
        const { data } = await supabase.from('marketing_assets').select('*').order('created_at', { ascending: false });
        setAssets(data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAssets(); }, [fetchAssets]);

    const openAdd = () => { setEditing(null); setForm(emptyAsset); setModalOpen(true); };
    const openEdit = (a) => { setEditing(a); setForm({ ...emptyAsset, ...a }); setModalOpen(true); };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        const fileName = `${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage.from('marketing-assets').upload(fileName, file);
        if (error) {
            setToast({ message: `Upload failed: ${error.message}`, type: 'error' });
            setUploading(false);
            return;
        }
        const { data: urlData } = supabase.storage.from('marketing-assets').getPublicUrl(fileName);
        setForm((prev) => ({ ...prev, file_url: urlData.publicUrl, file_name: file.name }));
        setUploading(false);
        setToast({ message: 'File uploaded!', type: 'success' });
    };

    const handleSave = async () => {
        setSaving(true);
        const payload = { ...form };
        delete payload.id;
        delete payload.created_at;

        if (editing) {
            const { error } = await supabase.from('marketing_assets').update(payload).eq('id', editing.id);
            if (error) setToast({ message: error.message, type: 'error' }); else setToast({ message: 'Asset updated', type: 'success' });
        } else {
            const { error } = await supabase.from('marketing_assets').insert(payload);
            if (error) setToast({ message: error.message, type: 'error' }); else setToast({ message: 'Asset added', type: 'success' });
        }
        setSaving(false);
        setModalOpen(false);
        fetchAssets();
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this asset?')) return;
        await supabase.from('marketing_assets').delete().eq('id', id);
        setToast({ message: 'Asset deleted', type: 'success' });
        fetchAssets();
    };

    const badgeClass = (status) => {
        switch (status) {
            case 'Approved': case 'Published': return 'badge-success';
            case 'In Review': return 'badge-info';
            case 'Draft': return 'badge-warning';
            case 'Archived': return 'badge-neutral';
            default: return 'badge-neutral';
        }
    };

    const filtered = assets.filter((a) => {
        const matchSearch = [a.asset_name, a.campaign, a.owner, a.category].some((f) => f?.toLowerCase().includes(search.toLowerCase()));
        const matchType = !typeFilter || a.asset_type === typeFilter;
        const matchStatus = !statusFilter || a.status === statusFilter;
        return matchSearch && matchType && matchStatus;
    });

    const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

    return (
        <>
            <div className="page-header">
                <h1>Marketing Assets</h1>
                <p>Upload, organize, and manage brand assets and campaign files.</p>
                {isAdmin(role) && <div className="page-actions">
                    <button className="btn btn-primary" onClick={openAdd}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 4v16m8-8H4" /></svg>
                        Add Asset
                    </button>
                </div>}
            </div>

            <div className="table-container">
                <div className="table-toolbar">
                    <div className="table-search">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                        <input placeholder="Search assets..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <div className="table-filters">
                        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                            <option value="">All types</option>
                            {assetTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="">All statuses</option>
                            {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="page-loading"><span className="loading-spinner" /></div>
                ) : filtered.length === 0 ? (
                    <div className="table-empty">No assets found.</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Asset Name</th>
                                    <th>Type</th>
                                    <th>Campaign</th>
                                    <th>Owner</th>
                                    <th>Status</th>
                                    <th>Upload Date</th>
                                    <th>File</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((a) => (
                                    <tr key={a.id}>
                                        <td><span className="name-cell">{a.asset_name}</span></td>
                                        <td><span className="badge badge-neutral">{a.asset_type || '—'}</span></td>
                                        <td>{a.campaign || '—'}</td>
                                        <td>{a.owner || '—'}</td>
                                        <td><span className={`badge ${badgeClass(a.status)}`}>{a.status}</span></td>
                                        <td>{formatDate(a.upload_date || a.created_at)}</td>
                                        <td>
                                            {a.file_url ? (
                                                <a href={a.file_url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                    Download
                                                </a>
                                            ) : '—'}
                                        </td>
                                        {isAdmin(role) && <td>
                                            <div className="row-actions">
                                                <button title="Edit" onClick={() => openEdit(a)}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                </button>
                                                <button className="delete" title="Delete" onClick={() => handleDelete(a.id)}>
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

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Asset' : 'Add Asset'} onSubmit={handleSave} loading={saving}>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Asset Name *</label>
                        <input className="form-input" value={form.asset_name} onChange={(e) => updateField('asset_name', e.target.value)} placeholder="e.g. Summit Banner v2" required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Type</label>
                        <select className="form-select" value={form.asset_type} onChange={(e) => updateField('asset_type', e.target.value)}>
                            <option value="">Select type...</option>
                            {assetTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Campaign</label>
                        <input className="form-input" value={form.campaign} onChange={(e) => updateField('campaign', e.target.value)} placeholder="e.g. Q1 Launch" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Owner</label>
                        <input className="form-input" value={form.owner} onChange={(e) => updateField('owner', e.target.value)} placeholder="Who owns this asset?" />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Status</label>
                        <select className="form-select" value={form.status} onChange={(e) => updateField('status', e.target.value)}>
                            {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Category</label>
                        <input className="form-input" value={form.category} onChange={(e) => updateField('category', e.target.value)} placeholder="e.g. Social, Print" />
                    </div>
                </div>

                {/* File Upload */}
                <div className="form-group">
                    <label className="form-label">Upload File</label>
                    <div className="file-upload-zone" onClick={() => fileRef.current?.click()}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                        {uploading ? <p>Uploading...</p> : form.file_url ? <p>File uploaded ✓ — <span>Click to replace</span></p> : <p>Click to upload or drag & drop — <span>Browse files</span></p>}
                    </div>
                    <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleFileUpload} />
                </div>

                {form.file_url && (
                    <div className="form-group">
                        <label className="form-label">File URL</label>
                        <input className="form-input" value={form.file_url} readOnly style={{ opacity: 0.7 }} />
                    </div>
                )}

                <div className="form-group">
                    <label className="form-label">Notes</label>
                    <textarea className="form-textarea" value={form.notes} onChange={(e) => updateField('notes', e.target.value)} placeholder="Version notes, usage instructions..." />
                </div>
            </Modal>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </>
    );
}
