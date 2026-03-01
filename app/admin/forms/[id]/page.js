'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/components/DashboardShell';
import Toast from '@/components/Toast';
import { supabase } from '@/lib/supabase';
import { isAdmin } from '@/lib/rbac';

const fieldTypes = [
    { value: 'text', label: 'Text' },
    { value: 'textarea', label: 'Text Area' },
    { value: 'dropdown', label: 'Dropdown' },
    { value: 'date', label: 'Date' },
    { value: 'number', label: 'Number' },
    { value: 'file', label: 'File Upload' },
    { value: 'checkbox', label: 'Checkbox' },
];

export default function FormBuilderPage() {
    return <FormBuilder />;
}

function FormBuilder() {
    const auth = useAuth();
    const params = useParams();
    const formId = params.id;
    const [template, setTemplate] = useState(null);
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedField, setSelectedField] = useState(null);
    const [toast, setToast] = useState(null);
    const [preview, setPreview] = useState(false);

    const fetchForm = useCallback(async () => {
        const { data: tpl } = await supabase.from('form_templates').select('*').eq('id', formId).single();
        const { data: flds } = await supabase.from('form_fields').select('*').eq('form_id', formId).order('sort_order');
        setTemplate(tpl);
        setFields(flds || []);
        setLoading(false);
    }, [formId]);

    useEffect(() => { fetchForm(); }, [fetchForm]);

    if (!auth || !isAdmin(auth.role)) {
        return <div className="page-loading" style={{ color: 'var(--danger)' }}>Access denied.</div>;
    }

    if (loading) return <div className="page-loading"><span className="loading-spinner" /></div>;
    if (!template) return <div className="page-loading">Form not found.</div>;

    const addField = async () => {
        const { data, error } = await supabase.from('form_fields').insert({
            form_id: formId, label: 'New Field', field_type: 'text',
            sort_order: fields.length, required: false,
        }).select().single();
        if (data) {
            setFields([...fields, data]);
            setSelectedField(data);
        }
    };

    const updateField = async (fieldId, updates) => {
        await supabase.from('form_fields').update(updates).eq('id', fieldId);
        setFields(fields.map((f) => f.id === fieldId ? { ...f, ...updates } : f));
        if (selectedField?.id === fieldId) setSelectedField({ ...selectedField, ...updates });
    };

    const deleteField = async (fieldId) => {
        await supabase.from('form_fields').delete().eq('id', fieldId);
        setFields(fields.filter((f) => f.id !== fieldId));
        if (selectedField?.id === fieldId) setSelectedField(null);
    };

    const moveField = async (index, direction) => {
        const newFields = [...fields];
        const swapIndex = index + direction;
        if (swapIndex < 0 || swapIndex >= newFields.length) return;
        [newFields[index], newFields[swapIndex]] = [newFields[swapIndex], newFields[index]];
        const updates = newFields.map((f, i) => ({ ...f, sort_order: i }));
        setFields(updates);
        for (const f of updates) {
            await supabase.from('form_fields').update({ sort_order: f.sort_order }).eq('id', f.id);
        }
    };

    const saveTemplate = async (updates) => {
        await supabase.from('form_templates').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', formId);
        setTemplate({ ...template, ...updates });
        setToast({ message: 'Form saved', type: 'success' });
    };

    return (
        <>
            <div className="page-header">
                <h1 style={{ fontSize: 22 }}>{template.name}</h1>
                <p>{template.description || 'No description'}</p>
                <div className="page-actions">
                    <button className="btn btn-secondary" onClick={() => setPreview(!preview)}>
                        {preview ? 'Editor' : 'Preview'}
                    </button>
                    <button className="btn btn-primary" onClick={() => saveTemplate({ status: template.status === 'published' ? 'draft' : 'published' })}>
                        {template.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>
                </div>
            </div>

            {preview ? (
                /* Live Preview */
                <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{template.name}</h2>
                    {template.description && <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>{template.description}</p>}
                    {fields.map((field) => (
                        <div key={field.id} className="form-group">
                            <label className="form-label">{field.label}{field.required && ' *'}</label>
                            {field.field_type === 'text' && <input className="form-input" placeholder={field.placeholder} disabled />}
                            {field.field_type === 'textarea' && <textarea className="form-textarea" placeholder={field.placeholder} disabled />}
                            {field.field_type === 'number' && <input className="form-input" type="number" placeholder={field.placeholder} disabled />}
                            {field.field_type === 'date' && <input className="form-input" type="date" disabled />}
                            {field.field_type === 'checkbox' && (
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
                                    <input type="checkbox" disabled /> {field.placeholder || field.label}
                                </label>
                            )}
                            {field.field_type === 'dropdown' && (
                                <select className="form-select" disabled>
                                    <option>{field.placeholder || 'Select...'}</option>
                                    {(field.options || []).map((o, i) => <option key={i}>{o.label || o.value}</option>)}
                                </select>
                            )}
                            {field.field_type === 'file' && (
                                <div className="file-upload-zone" style={{ padding: 16 }}>
                                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>File upload</p>
                                </div>
                            )}
                        </div>
                    ))}
                    <button className="btn btn-primary" disabled style={{ width: '100%', justifyContent: 'center' }}>Submit (Preview)</button>
                </div>
            ) : (
                /* Builder UI */
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>
                    {/* Field List */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{fields.length} field{fields.length !== 1 ? 's' : ''}</span>
                            <button className="btn btn-primary btn-sm" onClick={addField}>+ Add Field</button>
                        </div>

                        {fields.length === 0 ? (
                            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                                <p style={{ color: 'var(--text-muted)' }}>No fields yet. Click "Add Field" to start building.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {fields.map((field, idx) => (
                                    <div
                                        key={field.id}
                                        onClick={() => setSelectedField(field)}
                                        style={{
                                            padding: '12px 16px', background: selectedField?.id === field.id ? 'var(--accent-bg)' : 'var(--bg-card)',
                                            border: `1px solid ${selectedField?.id === field.id ? 'var(--accent-border)' : 'var(--border)'}`,
                                            borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            {/* Drag handle / ordering */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                <button className="btn-ghost" onClick={(e) => { e.stopPropagation(); moveField(idx, -1); }} style={{ padding: 0, width: 18, height: 14, fontSize: 10, border: 'none', cursor: 'pointer', background: 'none', color: 'var(--text-muted)' }}>▲</button>
                                                <button className="btn-ghost" onClick={(e) => { e.stopPropagation(); moveField(idx, 1); }} style={{ padding: 0, width: 18, height: 14, fontSize: 10, border: 'none', cursor: 'pointer', background: 'none', color: 'var(--text-muted)' }}>▼</button>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 14, fontWeight: 500 }}>{field.label}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                                    {fieldTypes.find(t => t.value === field.field_type)?.label} {field.required && '• Required'}
                                                </div>
                                            </div>
                                        </div>
                                        <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); deleteField(field.id); }} style={{ color: 'var(--danger)', fontSize: 16, padding: '2px 6px' }}>×</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Field Editor Panel */}
                    <div className="card" style={{ position: 'sticky', top: 20 }}>
                        {selectedField ? (
                            <>
                                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Field Settings</h3>
                                <div className="form-group">
                                    <label className="form-label">Label</label>
                                    <input className="form-input" value={selectedField.label} onChange={(e) => updateField(selectedField.id, { label: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Type</label>
                                    <select className="form-select" value={selectedField.field_type} onChange={(e) => updateField(selectedField.id, { field_type: e.target.value })}>
                                        {fieldTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Placeholder</label>
                                    <input className="form-input" value={selectedField.placeholder || ''} onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                                        <input type="checkbox" checked={selectedField.required} onChange={(e) => updateField(selectedField.id, { required: e.target.checked })} />
                                        Required
                                    </label>
                                </div>

                                {selectedField.field_type === 'dropdown' && (
                                    <div className="form-group">
                                        <label className="form-label">Options (one per line)</label>
                                        <textarea
                                            className="form-textarea"
                                            value={(selectedField.options || []).map((o) => o.label || o.value).join('\n')}
                                            onChange={(e) => {
                                                const opts = e.target.value.split('\n').filter(Boolean).map((v) => ({ value: v.trim(), label: v.trim() }));
                                                updateField(selectedField.id, { options: opts });
                                            }}
                                            placeholder="Option 1&#10;Option 2&#10;Option 3"
                                        />
                                    </div>
                                )}

                                {/* Conditional Logic */}
                                <div className="form-group" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                                    <label className="form-label">Conditional Visibility</label>
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Show this field only when another field has a specific value.</p>
                                    <select
                                        className="form-select"
                                        value={selectedField.conditions?.field_id || ''}
                                        onChange={(e) => updateField(selectedField.id, { conditions: e.target.value ? { ...selectedField.conditions, field_id: e.target.value } : null })}
                                        style={{ marginBottom: 8 }}
                                    >
                                        <option value="">Always visible</option>
                                        {fields.filter((f) => f.id !== selectedField.id).map((f) => (
                                            <option key={f.id} value={f.id}>{f.label}</option>
                                        ))}
                                    </select>
                                    {selectedField.conditions?.field_id && (
                                        <input
                                            className="form-input"
                                            value={selectedField.conditions?.value || ''}
                                            onChange={(e) => updateField(selectedField.id, { conditions: { ...selectedField.conditions, value: e.target.value, operator: 'equals' } })}
                                            placeholder="Show when value equals..."
                                        />
                                    )}
                                </div>

                                {/* Role Visibility */}
                                <div className="form-group" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                                    <label className="form-label">Visible To</label>
                                    <div style={{ display: 'flex', gap: 16 }}>
                                        {['admin', 'member'].map((r) => (
                                            <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer', textTransform: 'capitalize' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={(selectedField.visible_to || ['admin', 'member']).includes(r)}
                                                    onChange={(e) => {
                                                        const vis = selectedField.visible_to || ['admin', 'member'];
                                                        const updated = e.target.checked ? [...vis, r] : vis.filter((v) => v !== r);
                                                        updateField(selectedField.id, { visible_to: updated });
                                                    }}
                                                />
                                                {r}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
                                <p style={{ fontSize: 14 }}>Select a field to edit its settings.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </>
    );
}
