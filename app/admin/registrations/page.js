'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/DashboardShell';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { supabase } from '@/lib/supabase';
import { isAdmin } from '@/lib/rbac';
import { logAudit } from '@/lib/audit';
import { formatDate } from '@/lib/utils';

const COUNTRIES = [
    { code: 'US', name: 'United States', dial: '+1' },
    { code: 'CA', name: 'Canada', dial: '+1' },
    { code: 'GB', name: 'United Kingdom', dial: '+44' },
    { code: 'AU', name: 'Australia', dial: '+61' },
    { code: 'DE', name: 'Germany', dial: '+49' },
    { code: 'FR', name: 'France', dial: '+33' },
    { code: 'JP', name: 'Japan', dial: '+81' },
    { code: 'KR', name: 'South Korea', dial: '+82' },
    { code: 'IN', name: 'India', dial: '+91' },
    { code: 'BR', name: 'Brazil', dial: '+55' },
    { code: 'MX', name: 'Mexico', dial: '+52' },
    { code: 'PH', name: 'Philippines', dial: '+63' },
    { code: 'SG', name: 'Singapore', dial: '+65' },
    { code: 'AE', name: 'United Arab Emirates', dial: '+971' },
    { code: 'ZA', name: 'South Africa', dial: '+27' },
    { code: 'NG', name: 'Nigeria', dial: '+234' },
    { code: 'KE', name: 'Kenya', dial: '+254' },
    { code: 'IL', name: 'Israel', dial: '+972' },
    { code: 'NL', name: 'Netherlands', dial: '+31' },
    { code: 'SE', name: 'Sweden', dial: '+46' },
    { code: 'NO', name: 'Norway', dial: '+47' },
    { code: 'DK', name: 'Denmark', dial: '+45' },
    { code: 'CH', name: 'Switzerland', dial: '+41' },
    { code: 'IT', name: 'Italy', dial: '+39' },
    { code: 'ES', name: 'Spain', dial: '+34' },
    { code: 'PT', name: 'Portugal', dial: '+351' },
    { code: 'NZ', name: 'New Zealand', dial: '+64' },
    { code: 'CO', name: 'Colombia', dial: '+57' },
    { code: 'AR', name: 'Argentina', dial: '+54' },
    { code: 'CL', name: 'Chile', dial: '+56' },
    { code: 'TH', name: 'Thailand', dial: '+66' },
    { code: 'MY', name: 'Malaysia', dial: '+60' },
    { code: 'ID', name: 'Indonesia', dial: '+62' },
    { code: 'VN', name: 'Vietnam', dial: '+84' },
    { code: 'TW', name: 'Taiwan', dial: '+886' },
    { code: 'HK', name: 'Hong Kong', dial: '+852' },
    { code: 'CN', name: 'China', dial: '+86' },
    { code: 'EG', name: 'Egypt', dial: '+20' },
    { code: 'GH', name: 'Ghana', dial: '+233' },
    { code: 'CR', name: 'Costa Rica', dial: '+506' },
];

export default function RegistrationsPage() {
    return <RegistrationsContent />;
}

function RegistrationsContent() {
    const auth = useAuth();
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [addForm, setAddForm] = useState({ first_name: '', last_name: '', email: '', country_code: 'US', phone: '', subscribe_news: false });
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    const fetchRegistrations = useCallback(async () => {
        const { data } = await supabase
            .from('summit_registrations')
            .select('*')
            .order('created_at', { ascending: false });
        setRegistrations(data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchRegistrations(); }, [fetchRegistrations]);

    if (!auth || !isAdmin(auth.role)) {
        return <div className="page-loading" style={{ color: 'var(--danger)' }}>Access denied. Admin only.</div>;
    }

    // --- Stats ---
    const today = new Date().toDateString();
    const todayCount = registrations.filter(r => new Date(r.created_at).toDateString() === today).length;
    const subscribedCount = registrations.filter(r => r.subscribe_news).length;
    const websiteCount = registrations.filter(r => r.source === 'website').length;
    const adminAddedCount = registrations.filter(r => r.source === 'admin').length;

    // --- Search ---
    const filtered = registrations.filter(r => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            r.first_name?.toLowerCase().includes(q) ||
            r.last_name?.toLowerCase().includes(q) ||
            r.email?.toLowerCase().includes(q) ||
            r.phone?.toLowerCase().includes(q) ||
            r.country_code?.toLowerCase().includes(q)
        );
    });

    // --- Export CSV ---
    const exportCSV = () => {
        const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Country', 'Newsletter', 'Source', 'Registered At'];
        const rows = registrations.map(r => [
            r.first_name,
            r.last_name,
            r.email,
            r.phone || '',
            r.country_code || '',
            r.subscribe_news ? 'Yes' : 'No',
            r.source || 'website',
            new Date(r.created_at).toLocaleString(),
        ]);
        const csv = [headers, ...rows].map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `summit-registrations-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        setToast({ message: `Exported ${registrations.length} registrations`, type: 'success' });
    };

    // --- Add User ---
    const handleAdd = async () => {
        if (!addForm.first_name || !addForm.last_name || !addForm.email) {
            setToast({ message: 'First name, last name, and email are required', type: 'error' });
            return;
        }
        setSaving(true);
        const selectedCountry = COUNTRIES.find(c => c.code === addForm.country_code) || COUNTRIES[0];
        const { error } = await supabase.from('summit_registrations').insert({
            first_name: addForm.first_name.trim(),
            last_name: addForm.last_name.trim(),
            email: addForm.email.trim(),
            country_code: addForm.country_code,
            phone: addForm.phone ? `${selectedCountry.dial} ${addForm.phone.trim()}` : null,
            subscribe_news: addForm.subscribe_news,
            source: 'admin',
        });

        if (error) {
            setToast({ message: error.message, type: 'error' });
        } else {
            setToast({ message: `${addForm.first_name} ${addForm.last_name} added to the gathering`, type: 'success' });
            await logAudit({ action: 'INSERT', tableName: 'summit_registrations', oldData: null, newData: addForm, userId: auth.user.id, userEmail: auth.user.email });
            setAddModalOpen(false);
            setAddForm({ first_name: '', last_name: '', email: '', country_code: 'US', phone: '', subscribe_news: false });
            fetchRegistrations();
        }
        setSaving(false);
    };

    // --- Delete ---
    const handleDelete = async (reg) => {
        if (!confirm(`Remove ${reg.first_name} ${reg.last_name} (${reg.email})?`)) return;
        const { error } = await supabase.from('summit_registrations').delete().eq('id', reg.id);
        if (error) {
            setToast({ message: error.message, type: 'error' });
        } else {
            setToast({ message: 'Registration removed', type: 'success' });
            await logAudit({ action: 'DELETE', tableName: 'summit_registrations', recordId: reg.id, oldData: reg, newData: null, userId: auth.user.id, userEmail: auth.user.email });
            fetchRegistrations();
        }
    };

    const getCountryName = (code) => COUNTRIES.find(c => c.code === code)?.name || code || '—';

    return (
        <>
            <div className="page-header">
                <h1>Summit Registrations</h1>
                <p>Manage attendees for the Generation Regeneration Online Summit & Global Gathering.</p>
                <div className="page-actions">
                    <button className="btn btn-primary" onClick={() => setAddModalOpen(true)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 4v16m8-8H4" /></svg>
                        Add User
                    </button>
                    <button className="btn btn-secondary" onClick={exportCSV} disabled={registrations.length === 0}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                        Export CSV
                    </button>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon purple"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div>
                    <div className="stat-value">{registrations.length}</div>
                    <div className="stat-label">Total Registrations</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon teal"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>
                    <div className="stat-value">{todayCount}</div>
                    <div className="stat-label">Today</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon success"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg></div>
                    <div className="stat-value">{subscribedCount}</div>
                    <div className="stat-label">Newsletter Subs</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon info"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg></div>
                    <div className="stat-value">{websiteCount} / {adminAddedCount}</div>
                    <div className="stat-label">Website / Admin Added</div>
                </div>
            </div>

            {/* Search */}
            <div style={{ marginBottom: 20 }}>
                <input
                    className="form-input"
                    placeholder="Search by name, email, phone, or country..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ maxWidth: 420 }}
                />
            </div>

            <div className="table-container">
                {loading ? (
                    <div className="page-loading"><span className="loading-spinner" /></div>
                ) : filtered.length === 0 ? (
                    <div className="table-empty">{search ? 'No matching registrations.' : 'No registrations yet.'}</div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Country</th>
                                <th>Newsletter</th>
                                <th>Source</th>
                                <th>Registered</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((r) => (
                                <tr key={r.id}>
                                    <td>
                                        <span className="name-cell">{r.first_name} {r.last_name}</span>
                                    </td>
                                    <td>{r.email}</td>
                                    <td>{r.phone || '—'}</td>
                                    <td>{getCountryName(r.country_code)}</td>
                                    <td>
                                        <span className={`badge ${r.subscribe_news ? 'badge-success' : 'badge-neutral'}`}>
                                            {r.subscribe_news ? 'Yes' : 'No'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${r.source === 'admin' ? 'badge-info' : 'badge-neutral'}`} style={{ textTransform: 'capitalize' }}>
                                            {r.source || 'website'}
                                        </span>
                                    </td>
                                    <td>{formatDate(r.created_at)}</td>
                                    <td>
                                        <div className="row-actions" style={{ gap: 2 }}>
                                            <button title="Delete" onClick={() => handleDelete(r)} style={{ color: 'var(--danger)' }}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Add User Modal */}
            <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add User to Global Gathering" onSubmit={handleAdd} loading={saving}>
                <div className="form-group">
                    <label className="form-label">First Name *</label>
                    <input className="form-input" value={addForm.first_name} onChange={(e) => setAddForm({ ...addForm, first_name: e.target.value })} placeholder="First name" required />
                </div>
                <div className="form-group">
                    <label className="form-label">Last Name *</label>
                    <input className="form-input" value={addForm.last_name} onChange={(e) => setAddForm({ ...addForm, last_name: e.target.value })} placeholder="Last name" required />
                </div>
                <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input className="form-input" type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} placeholder="email@example.com" required />
                </div>
                <div className="form-group">
                    <label className="form-label">Country</label>
                    <select className="form-select" value={addForm.country_code} onChange={(e) => setAddForm({ ...addForm, country_code: e.target.value })}>
                        {COUNTRIES.map((c) => (
                            <option key={c.code} value={c.code}>{c.name}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" type="tel" value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} placeholder="Phone number" />
                </div>
                <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" checked={addForm.subscribe_news} onChange={(e) => setAddForm({ ...addForm, subscribe_news: e.target.checked })} />
                        <span className="form-label" style={{ marginBottom: 0 }}>Subscribe to newsletter</span>
                    </label>
                </div>
            </Modal>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </>
    );
}
