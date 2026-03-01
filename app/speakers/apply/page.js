'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function SpeakerApplyPage() {
    const [fields, setFields] = useState([]);
    const [versionId, setVersionId] = useState(null);
    const [formData, setFormData] = useState({});
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [noForm, setNoForm] = useState(false);

    useEffect(() => {
        async function fetchForm() {
            const { data: version } = await supabase
                .from('speaker_form_versions')
                .select('*')
                .eq('status', 'published')
                .order('version', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (!version) {
                setNoForm(true);
                setLoading(false);
                return;
            }
            setVersionId(version.id);
            const publicFields = (version.fields_snapshot || []).filter((f) => f.visibility === 'public');
            setFields(publicFields);
            const defaults = {};
            publicFields.forEach((f) => { if (f.default_value) defaults[f.field_key] = f.default_value; });
            setFormData(defaults);
            setLoading(false);
        }
        fetchForm();
    }, []);

    const handleChange = (key, value) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
        if (errors[key]) setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
    };

    const validate = () => {
        const errs = {};
        fields.forEach((f) => {
            const val = formData[f.field_key];
            if (f.required && (!val || (typeof val === 'string' && !val.trim()))) {
                errs[f.field_key] = `${f.label} is required`;
            }
            if (f.field_type === 'email' && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
                errs[f.field_key] = 'Invalid email address';
            }
            if (f.field_type === 'url' && val && !/^https?:\/\/.+/.test(val)) {
                errs[f.field_key] = 'Must start with http:// or https://';
            }
        });
        return errs;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }

        setSubmitting(true);
        const nameField = fields.find((f) => f.field_key.includes('name'));
        const emailField = fields.find((f) => f.field_type === 'email');

        const { error } = await supabase.from('speaker_submissions').insert({
            form_version_id: versionId,
            custom_data: formData,
            submitter_name: nameField ? formData[nameField.field_key] : null,
            submitter_email: emailField ? formData[emailField.field_key] : null,
            status: 'new',
        });

        if (error) {
            setErrors({ _form: error.message });
            setSubmitting(false);
        } else {
            setSubmitted(true);
        }
    };

    const renderField = (field) => {
        const val = formData[field.field_key] || '';
        const err = errors[field.field_key];
        const common = { style: err ? { borderColor: 'var(--danger)' } : {} };

        switch (field.field_type) {
            case 'textarea':
                return <textarea className="form-textarea" {...common} value={val} onChange={(e) => handleChange(field.field_key, e.target.value)} placeholder={field.placeholder} />;
            case 'dropdown':
                return (
                    <select className="form-select" {...common} value={val} onChange={(e) => handleChange(field.field_key, e.target.value)}>
                        <option value="">{field.placeholder || 'Select...'}</option>
                        {(field.options || []).map((o, i) => <option key={i} value={o.value || o.label || o}>{o.label || o}</option>)}
                    </select>
                );
            case 'radio':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                        {(field.options || []).map((o, i) => (
                            <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                <input type="radio" name={field.field_key} value={o.value || o.label || o} checked={val === (o.value || o.label || o)} onChange={(e) => handleChange(field.field_key, e.target.value)} />
                                {o.label || o}
                            </label>
                        ))}
                    </div>
                );
            case 'checkbox':
                return (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={!!val} onChange={(e) => handleChange(field.field_key, e.target.checked)} />
                        {field.placeholder || field.label}
                    </label>
                );
            case 'file':
                return (
                    <div className="file-upload-zone" style={{ padding: 20 }} onClick={() => document.getElementById(`file-${field.field_key}`)?.click()}>
                        <input id={`file-${field.field_key}`} type="file" style={{ display: 'none' }} onChange={(e) => handleChange(field.field_key, e.target.files[0]?.name || '')} />
                        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{val || 'Click to upload file'}</p>
                    </div>
                );
            default: {
                const inputType = { email: 'email', phone: 'tel', number: 'number', date: 'date', time: 'time', url: 'url' }[field.field_type] || 'text';
                return <input className="form-input" {...common} type={inputType} value={val} onChange={(e) => handleChange(field.field_key, e.target.value)} placeholder={field.placeholder} />;
            }
        }
    };

    if (loading) return <div className="public-page"><div className="page-loading"><span className="loading-spinner" /></div></div>;

    if (noForm) {
        return (
            <div className="public-page">
                <div className="public-form-card" style={{ textAlign: 'center' }}>
                    <h1>Speaker Application</h1>
                    <p>The application form is not yet available. Please check back later.</p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="public-page">
                <div className="public-form-card">
                    <div className="form-success">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <h2>Application Submitted!</h2>
                        <p>Thank you for applying. We&apos;ll review your submission and get back to you soon.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="public-page">
            <div className="public-form-card">
                <h1>Apply as Speaker</h1>
                <p>Submit your application to speak at the Generation Regeneration Summit.</p>

                {errors._form && <div className="login-error">{errors._form}</div>}

                <form onSubmit={handleSubmit}>
                    {fields.map((field) => (
                        <div key={field.field_key} className="form-group">
                            <label className="form-label">{field.label}{field.required && ' *'}</label>
                            {renderField(field)}
                            {field.help_text && <div className="form-help">{field.help_text}</div>}
                            {errors[field.field_key] && <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>{errors[field.field_key]}</div>}
                        </div>
                    ))}

                    <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
                        {submitting ? <><span className="loading-spinner" /> Submitting...</> : 'Submit Application'}
                    </button>
                </form>
            </div>
        </div>
    );
}
