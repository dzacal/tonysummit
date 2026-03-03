'use client';
import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const TODAY = new Date().toISOString().split('T')[0];

function speakerDefaults(email) {
    return {
        full_name: email.senderName || '',
        contact_email: email.senderEmail || '',
        organization: '',
        title: '',
        topic: email.subject || '',
        session_type: '',
        response_status: 'Contacted',
        outreach_date: TODAY,
        notes: email.snippet || '',
    };
}

function podcastDefaults(email) {
    return {
        guest_name: email.senderName || '',
        guest_email: email.senderEmail || '',
        guest_phone: '',
        company: '',
        topic: email.subject || '',
        message: email.snippet || '',
        status: 'Pending',
    };
}

export default function SmartInboxPage() {
    const [emails, setEmails] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [scanned, setScanned] = useState(false);
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [savedIds, setSavedIds] = useState({});
    const [activeTab, setActiveTab] = useState('speaker');

    async function scan() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/gmail/smart-scan');
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setEmails(data.results || []);
            setScanned(true);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    function openModal(type, email) {
        setForm(type === 'speaker' ? speakerDefaults(email) : podcastDefaults(email));
        setModal({ type, email });
    }

    async function save() {
        setSaving(true);
        try {
            const table = modal.type === 'speaker' ? 'speakers' : 'podcast_bookings';
            const { error: err } = await supabase.from(table).insert(form);
            if (err) throw err;
            setSavedIds(prev => ({ ...prev, [modal.email.id]: modal.type }));
            setModal(null);
        } catch (e) {
            alert(e.message);
        } finally {
            setSaving(false);
        }
    }

    const speakerEmails = emails.filter(e => e.category === 'speaker');
    const podcastEmails = emails.filter(e => e.category === 'podcast');
    const tabEmails = activeTab === 'speaker' ? speakerEmails : podcastEmails;

    const tabs = [
        { key: 'speaker', label: 'Summit Speakers', count: speakerEmails.length },
        { key: 'podcast', label: 'Podcast', count: podcastEmails.length },
    ];

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Smart Inbox</h1>
                    <p className="page-subtitle">Scan Gmail for speaker and podcast leads</p>
                </div>
                <button className="btn-primary" onClick={scan} disabled={loading}>
                    {loading ? 'Scanning…' : scanned ? 'Rescan' : 'Scan Inbox'}
                </button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {loading && <div className="loading-state">Scanning your inbox…</div>}

            {scanned && !loading && (
                <div>
                    {/* Tabs */}
                    <div style={{
                        display: 'flex',
                        gap: '0',
                        borderBottom: '2px solid var(--border)',
                        marginBottom: '1.5rem',
                    }}>
                        {tabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem 1.25rem',
                                    background: 'none',
                                    border: 'none',
                                    borderBottom: activeTab === tab.key
                                        ? '2px solid var(--accent)'
                                        : '2px solid transparent',
                                    marginBottom: '-2px',
                                    cursor: 'pointer',
                                    fontWeight: activeTab === tab.key ? 600 : 400,
                                    color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-secondary)',
                                    fontSize: '0.9rem',
                                    transition: 'color 0.15s',
                                }}
                            >
                                {tab.label}
                                <span className="badge">{tab.count}</span>
                            </button>
                        ))}
                    </div>

                    {/* Email list */}
                    {tabEmails.length === 0 ? (
                        <div className="empty-state">No matching emails found.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {tabEmails.map(email => (
                                <EmailCard
                                    key={email.id}
                                    email={email}
                                    saved={savedIds[email.id]}
                                    onAdd={(e) => openModal(activeTab, e)}
                                    addLabel={activeTab === 'speaker' ? 'Add as Speaker' : 'Add to Podcast'}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {modal && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{modal.type === 'speaker' ? 'Add Speaker' : 'Add Podcast Booking'}</h3>
                            <button className="btn-ghost btn-icon" onClick={() => setModal(null)}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="modal-body">
                            {modal.type === 'speaker'
                                ? <SpeakerFields form={form} onChange={setForm} />
                                : <PodcastFields form={form} onChange={setForm} />
                            }
                        </div>
                        <div className="modal-footer">
                            <button className="btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                            <button className="btn-primary" onClick={save} disabled={saving}>
                                {saving ? 'Saving…' : 'Save Record'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function EmailCard({ email, saved, onAdd, addLabel }) {
    return (
        <div className="card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{email.subject}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                        {email.senderName} &lt;{email.senderEmail}&gt;
                        {email.date && ` · ${new Date(email.date).toLocaleDateString()}`}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        {email.snippet}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                        {email.keywords.map(k => (
                            <span key={k} className="badge badge-sm">{k}</span>
                        ))}
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0 }}>
                    {saved ? (
                        <span className="badge" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>Saved</span>
                    ) : (
                        <button className="btn-primary btn-sm" onClick={() => onAdd(email)}>
                            {addLabel}
                        </button>
                    )}
                    {email.matchedSpeaker && (
                        <Link href="/summit/speakers" className="btn-ghost btn-sm">
                            View Record
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div className="form-group">
            <label className="form-label">{label}</label>
            {children}
        </div>
    );
}

function SpeakerFields({ form, onChange }) {
    const set = key => e => onChange(prev => ({ ...prev, [key]: e.target.value }));
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Field label="Full Name">
                <input className="form-input" value={form.full_name} onChange={set('full_name')} />
            </Field>
            <Field label="Email">
                <input className="form-input" type="email" value={form.contact_email} onChange={set('contact_email')} />
            </Field>
            <Field label="Organization">
                <input className="form-input" value={form.organization} onChange={set('organization')} />
            </Field>
            <Field label="Title">
                <input className="form-input" value={form.title} onChange={set('title')} />
            </Field>
            <Field label="Topic">
                <input className="form-input" value={form.topic} onChange={set('topic')} />
            </Field>
            <Field label="Response Status">
                <select className="form-select" value={form.response_status} onChange={set('response_status')}>
                    {['Contacted', 'Responded', 'Interested', 'Confirmed', 'Declined', 'No Response'].map(s => (
                        <option key={s}>{s}</option>
                    ))}
                </select>
            </Field>
            <Field label="Notes">
                <textarea className="form-textarea" value={form.notes} onChange={set('notes')} rows={3} />
            </Field>
        </div>
    );
}

function PodcastFields({ form, onChange }) {
    const set = key => e => onChange(prev => ({ ...prev, [key]: e.target.value }));
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Field label="Guest Name">
                <input className="form-input" value={form.guest_name} onChange={set('guest_name')} />
            </Field>
            <Field label="Email">
                <input className="form-input" type="email" value={form.guest_email} onChange={set('guest_email')} />
            </Field>
            <Field label="Company">
                <input className="form-input" value={form.company} onChange={set('company')} />
            </Field>
            <Field label="Topic">
                <input className="form-input" value={form.topic} onChange={set('topic')} />
            </Field>
            <Field label="Status">
                <select className="form-select" value={form.status} onChange={set('status')}>
                    {['Pending', 'Confirmed', 'Scheduled', 'Completed', 'Cancelled'].map(s => (
                        <option key={s}>{s}</option>
                    ))}
                </select>
            </Field>
            <Field label="Message / Notes">
                <textarea className="form-textarea" value={form.message} onChange={set('message')} rows={3} />
            </Field>
        </div>
    );
}
