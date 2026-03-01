'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/DashboardShell';
import Toast from '@/components/Toast';
import { supabase } from '@/lib/supabase';
import { isAdmin } from '@/lib/rbac';

const fieldTypes = [
    { value: 'text', label: 'Text' },
    { value: 'textarea', label: 'Text Area' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'time', label: 'Time' },
    { value: 'dropdown', label: 'Dropdown / Select' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'radio', label: 'Radio' },
    { value: 'file', label: 'File Upload' },
    { value: 'url', label: 'URL' },
];

export default function SpeakerFormBuilderPage() {
    return <SpeakerFormBuilder />;
}

function SpeakerFormBuilder() {
    const auth = useAuth();
    const [fields, setFields] = useState([]);
    const [versions, setVersions] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [publishing, setPublishing] = useState(false);
    const [tab, setTab] = useState('fields');

    const fetchData = useCallback(async () => {
        const [{ data: flds }, { data: vers }] = await Promise.all([
            supabase.from('speaker_form_fields').select('*').order('sort_order'),
            supabase.from('speaker_form_versions').select('*').order('version', { ascending: false }).limit(10),
        ]);
        setFields(flds || []);
        setVersions(vers || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (!auth || !isAdmin(auth.role)) return null;

    const addField = async () => {
        const key = `field_${Date.now()}`;
        const { data } = await supabase.from('speaker_form_fields').insert({
            label: 'New Field', field_key: key, field_type: 'text',
            sort_order: fields.length, required: false, visibility: 'public',
        }).select().single();
        if (data) {
            setFields([...fields, data]);
            setSelected(data);
            setToast({ message: 'Field added', type: 'success' });
        }
    };

    const updateField = async (id, updates) => {
        await supabase.from('speaker_form_fields').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
        setFields(fields.map((f) => f.id === id ? { ...f, ...updates } : f));
        if (selected?.id === id) setSelected({ ...selected, ...updates });
    };

    const deleteField = async (id) => {
        if (!confirm('Delete this field?')) return;
        await supabase.from('speaker_form_fields').delete().eq('id', id);
        setFields(fields.filter((f) => f.id !== id));
        if (selected?.id === id) setSelected(null);
        setToast({ message: 'Field deleted', type: 'success' });
    };

    const moveField = async (index, direction) => {
        const newFields = [...fields];
        const swapIndex = index + direction;
        if (swapIndex < 0 || swapIndex >= newFields.length) return;
        [newFields[index], newFields[swapIndex]] = [newFields[swapIndex], newFields[index]];
        const updates = newFields.map((f, i) => ({ ...f, sort_order: i }));
        setFields(updates);
        for (const f of updates) {
            await supabase.from('speaker_form_fields').update({ sort_order: f.sort_order }).eq('id', f.id);
        }
    };

    const publishForm = async () => {
        if (fields.length === 0) {
            setToast({ message: 'Add at least one field before publishing', type: 'error' });
            return;
        }
        setPublishing(true);
        const nextVersion = (versions[0]?.version || 0) + 1;
        const snapshot = fields.map(({ id, created_at, updated_at, ...rest }) => rest);
        const { error } = await supabase.from('speaker_form_versions').insert({
            version: nextVersion,
            fields_snapshot: snapshot,
            status: 'published',
            published_by: auth.user.id,
        });
        if (error) {
            setToast({ message: error.message, type: 'error' });
        } else {
            setToast({ message: `Version ${nextVersion} published!`, type: 'success' });
            fetchData();
        }
        setPublishing(false);
    };

    const hasOptions = (type) => ['dropdown', 'radio'].includes(type);

    return (
        <>
            <div className="page-header">
                <h1>Speaker Form Builder</h1>
                <p>Customize the speaker application form. Changes take effect after publishing.</p>
                <div className="page-actions">
                    <button className="btn btn-primary" onClick={publishForm} disabled={publishing}>
                        {publishing ? <><span className="loading-spinner" /> Publishing...</> : (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12l5 5L20 7" /></svg>
                                Publish Version
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
                {[{ key: 'fields', label: 'Form Fields' }, { key: 'versions', label: 'Version History' }, { key: 'preview', label: 'Preview' }].map((t) => (
                    <button key={t.key} className={`btn ${tab === t.key ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab(t.key)} style={{ borderRadius: 'var(--radius-sm)' }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="page-loading"><span className="loading-spinner" /></div>
            ) : tab === 'versions' ? (
                /* Versions Tab */
                <div className="table-container">
                    <table>
                        <thead><tr><th>Version</th><th>Status</th><th>Fields</th><th>Published</th></tr></thead>
                        <tbody>
                            {versions.length === 0 ? (
                                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No versions published yet</td></tr>
                            ) : versions.map((v) => (
                                <tr key={v.id}>
                                    <td style={{ fontWeight: 600 }}>v{v.version}</td>
                                    <td><span className="badge badge-success">{v.status}</span></td>
                                    <td>{v.fields_snapshot?.length || 0} fields</td>
                                    <td style={{ fontSize: 13 }}>{new Date(v.published_at).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : tab === 'preview' ? (
                /* Preview Tab */
                <div className="card" style={{ maxWidth: 640, margin: '0 auto' }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Apply as Speaker</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>Submit your application to speak at the Generation Regeneration Summit.</p>
                    {fields.filter((f) => f.visibility === 'public').map((field) => (
                        <div key={field.id} className="form-group">
                            <label className="form-label">{field.label}{field.required && ' *'}</label>
                            {field.field_type === 'textarea' ? <textarea className="form-textarea" placeholder={field.placeholder} disabled /> :
                                field.field_type === 'dropdown' ? (
                                    <select className="form-select" disabled>
                                        <option>{field.placeholder || 'Select...'}</option>
                                        {(field.options || []).map((o, i) => <option key={i}>{o.label || o}</option>)}
                                    </select>
                                ) : field.field_type === 'radio' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                                        {(field.options || []).map((o, i) => (
                                            <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
                                                <input type="radio" disabled name={field.field_key} /> {o.label || o}
                                            </label>
                                        ))}
                                    </div>
                                ) : field.field_type === 'checkbox' ? (
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
                                        <input type="checkbox" disabled /> {field.placeholder || field.label}
                                    </label>
                                ) : field.field_type === 'file' ? (
                                    <div className="file-upload-zone" style={{ padding: 16 }}>
                                        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Click to upload file</p>
                                    </div>
                                ) : (
                                    <input className="form-input" type={field.field_type === 'phone' ? 'tel' : field.field_type} placeholder={field.placeholder} disabled />
                                )}
                            {field.help_text && <div className="form-help">{field.help_text}</div>}
                        </div>
                    ))}
                    <button className="btn btn-primary" disabled style={{ width: '100%', justifyContent: 'center' }}>Submit Application (Preview)</button>
                </div>
            ) : (
                /* Field Builder Tab */
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>
                    {/* Field List */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{fields.length} field{fields.length !== 1 ? 's' : ''}</span>
                            <button className="btn btn-primary btn-sm" onClick={addField}>+ Add Field</button>
                        </div>

                        {fields.length === 0 ? (
                            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                                <p style={{ color: 'var(--text-muted)' }}>No fields yet. Click &quot;Add Field&quot; to start building.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {fields.map((field, idx) => (
                                    <div
                                        key={field.id}
                                        onClick={() => setSelected(field)}
                                        style={{
                                            padding: '12px 16px',
                                            background: selected?.id === field.id ? 'var(--accent-bg)' : 'var(--bg-card)',
                                            border: `1px solid ${selected?.id === field.id ? 'var(--accent-border)' : 'var(--border)'}`,
                                            borderRadius: 'var(--radius-md)', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            transition: 'all 0.15s', boxShadow: 'var(--shadow-sm)',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                <button onClick={(e) => { e.stopPropagation(); moveField(idx, -1); }} style={{ padding: 0, width: 18, height: 14, fontSize: 10, border: 'none', cursor: 'pointer', background: 'none', color: 'var(--text-muted)' }}>▲</button>
                                                <button onClick={(e) => { e.stopPropagation(); moveField(idx, 1); }} style={{ padding: 0, width: 18, height: 14, fontSize: 10, border: 'none', cursor: 'pointer', background: 'none', color: 'var(--text-muted)' }}>▼</button>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 14, fontWeight: 500 }}>{field.label}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                                    {fieldTypes.find((t) => t.value === field.field_type)?.label} {field.required && '• Required'}
                                                    {field.visibility === 'internal' && ' • Internal'}
                                                </div>
                                            </div>
                                        </div>
                                        <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); deleteField(field.id); }} style={{ color: 'var(--danger)', fontSize: 16, padding: '2px 6px' }}>×</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Properties Panel */}
                    <div className="card" style={{ position: 'sticky', top: 84 }}>
                        {selected ? (
                            <>
                                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Field Properties</h3>
                                <div className="form-group">
                                    <label className="form-label">Label</label>
                                    <input className="form-input" value={selected.label} onChange={(e) => updateField(selected.id, { label: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Key</label>
                                    <input className="form-input" value={selected.field_key} onChange={(e) => updateField(selected.id, { field_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} />
                                    <div className="form-help">Used as the data column name</div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Type</label>
                                    <select className="form-select" value={selected.field_type} onChange={(e) => updateField(selected.id, { field_type: e.target.value })}>
                                        {fieldTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Placeholder</label>
                                    <input className="form-input" value={selected.placeholder || ''} onChange={(e) => updateField(selected.id, { placeholder: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Help Text</label>
                                    <input className="form-input" value={selected.help_text || ''} onChange={(e) => updateField(selected.id, { help_text: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Default Value</label>
                                    <input className="form-input" value={selected.default_value || ''} onChange={(e) => updateField(selected.id, { default_value: e.target.value })} />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                                            <input type="checkbox" checked={selected.required} onChange={(e) => updateField(selected.id, { required: e.target.checked })} />
                                            Required
                                        </label>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Visibility</label>
                                        <select className="form-select" value={selected.visibility} onChange={(e) => updateField(selected.id, { visibility: e.target.value })}>
                                            <option value="public">Public</option>
                                            <option value="internal">Internal</option>
                                        </select>
                                    </div>
                                </div>

                                {hasOptions(selected.field_type) && (
                                    <div className="form-group" style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                                        <label className="form-label">Options (one per line)</label>
                                        <textarea
                                            className="form-textarea"
                                            value={(selected.options || []).map((o) => typeof o === 'string' ? o : o.label || o.value).join('\n')}
                                            onChange={(e) => {
                                                const opts = e.target.value.split('\n').filter(Boolean).map((v) => ({ value: v.trim(), label: v.trim() }));
                                                updateField(selected.id, { options: opts });
                                            }}
                                            placeholder="Option 1&#10;Option 2&#10;Option 3"
                                        />
                                    </div>
                                )}
                            </>
                        ) : (
                            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
                                <p style={{ fontSize: 14 }}>Select a field to edit its properties.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </>
    );
}
