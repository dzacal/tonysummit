'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function PublicFormPage() {
    const params = useParams();
    const slug = params.slug;
    const [template, setTemplate] = useState(null);
    const [fields, setFields] = useState([]);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState(null);
    const fileRef = useRef({});

    const fetchForm = useCallback(async () => {
        const { data: tpl } = await supabase.from('form_templates').select('*').eq('slug', slug).eq('status', 'published').single();
        if (!tpl) { setError('Form not found or not published.'); setLoading(false); return; }
        const { data: flds } = await supabase.from('form_fields').select('*').eq('form_id', tpl.id).order('sort_order');
        setTemplate(tpl);
        setFields(flds || []);
        setLoading(false);
    }, [slug]);

    useEffect(() => { fetchForm(); }, [fetchForm]);

    const shouldShowField = (field) => {
        if (!field.conditions?.field_id) return true;
        const condFieldValue = formData[field.conditions.field_id];
        return condFieldValue === field.conditions.value;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Validate required
        for (const field of fields) {
            if (field.required && shouldShowField(field) && !formData[field.id] && formData[field.id] !== false) {
                setError(`"${field.label}" is required.`);
                return;
            }
        }
        setSubmitting(true);
        setError(null);
        const { error: err } = await supabase.from('form_submissions').insert({
            form_id: template.id, data: formData, status: 'submitted',
        });
        if (err) { setError(err.message); setSubmitting(false); }
        else setSubmitted(true);
    };

    const handleFileUpload = async (fieldId, file) => {
        if (!file) return;
        const fileName = `forms/${template.id}/${Date.now()}_${file.name}`;
        const { error } = await supabase.storage.from('marketing-assets').upload(fileName, file);
        if (error) { setError(`Upload failed: ${error.message}`); return; }
        const { data: urlData } = supabase.storage.from('marketing-assets').getPublicUrl(fileName);
        setFormData({ ...formData, [fieldId]: urlData.publicUrl });
    };

    if (loading) return <div className="login-page"><div className="page-loading"><span className="loading-spinner" /> Loading form...</div></div>;
    if (error && !template) return <div className="login-page"><div className="login-card"><h2 style={{ color: 'var(--danger)' }}>{error}</h2></div></div>;

    if (submitted) {
        return (
            <div className="login-page">
                <div className="login-card" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
                    <h2 style={{ color: 'var(--accent)', marginBottom: 8 }}>Submitted!</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Thank you for your submission. We'll be in touch.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="login-page">
            <div className="login-card" style={{ maxWidth: 640, width: '100%' }}>
                <h1 style={{ color: 'var(--accent)', fontSize: 22, textAlign: 'center', marginBottom: 4 }}>{template.name}</h1>
                {template.description && <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>{template.description}</p>}

                {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    {fields.map((field) => {
                        if (!shouldShowField(field)) return null;
                        return (
                            <div key={field.id} className="form-group">
                                <label className="form-label">{field.label}{field.required && ' *'}</label>
                                {field.field_type === 'text' && (
                                    <input className="form-input" value={formData[field.id] || ''} onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })} placeholder={field.placeholder} required={field.required} />
                                )}
                                {field.field_type === 'textarea' && (
                                    <textarea className="form-textarea" value={formData[field.id] || ''} onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })} placeholder={field.placeholder} required={field.required} />
                                )}
                                {field.field_type === 'number' && (
                                    <input className="form-input" type="number" value={formData[field.id] || ''} onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })} placeholder={field.placeholder} required={field.required} />
                                )}
                                {field.field_type === 'date' && (
                                    <input className="form-input" type="date" value={formData[field.id] || ''} onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })} required={field.required} />
                                )}
                                {field.field_type === 'checkbox' && (
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={!!formData[field.id]} onChange={(e) => setFormData({ ...formData, [field.id]: e.target.checked })} />
                                        {field.placeholder || 'Yes'}
                                    </label>
                                )}
                                {field.field_type === 'dropdown' && (
                                    <select className="form-select" value={formData[field.id] || ''} onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })} required={field.required}>
                                        <option value="">{field.placeholder || 'Select...'}</option>
                                        {(field.options || []).map((o, i) => <option key={i} value={o.value}>{o.label || o.value}</option>)}
                                    </select>
                                )}
                                {field.field_type === 'file' && (
                                    <>
                                        <input type="file" onChange={(e) => handleFileUpload(field.id, e.target.files[0])} />
                                        {formData[field.id] && <p style={{ fontSize: 12, color: 'var(--success)', marginTop: 4 }}>File uploaded ✓</p>}
                                    </>
                                )}
                            </div>
                        );
                    })}
                    <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
                        {submitting ? <><span className="loading-spinner" /> Submitting...</> : 'Submit'}
                    </button>
                </form>
            </div>
        </div>
    );
}
