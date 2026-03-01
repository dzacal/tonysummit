'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/DashboardShell';
import Toast from '@/components/Toast';
import { supabase } from '@/lib/supabase';
import { logAudit } from '@/lib/audit';

export default function MemberProfilePage() {
    return <MemberProfile />;
}

function MemberProfile() {
    const auth = useAuth();
    const [form, setForm] = useState({ display_name: '', phone: '', bio: '', company: '', location: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
    const [changingPassword, setChangingPassword] = useState(false);

    const fetchProfile = useCallback(async () => {
        if (!auth?.user) return;
        const { data } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', auth.user.id)
            .single();
        if (data) {
            setForm({
                display_name: data.display_name || '',
                phone: data.phone || '',
                bio: data.bio || '',
                company: data.company || '',
                location: data.location || '',
            });
        }
        setLoading(false);
    }, [auth]);

    useEffect(() => { fetchProfile(); }, [fetchProfile]);

    if (!auth || !auth.user) return <div className="page-loading"><span className="loading-spinner" /></div>;

    const { user, profile, role } = auth;
    const displayName = form.display_name || user.email?.split('@')[0];
    const initial = displayName?.[0]?.toUpperCase() || 'U';

    const handleSave = async () => {
        setSaving(true);
        const updates = {
            display_name: form.display_name.trim() || null,
            phone: form.phone.trim() || null,
            bio: form.bio.trim() || null,
            company: form.company.trim() || null,
            location: form.location.trim() || null,
        };
        const { error } = await supabase
            .from('user_profiles')
            .update(updates)
            .eq('id', user?.id);

        if (error) {
            setToast({ message: error.message, type: 'error' });
        } else {
            setToast({ message: 'Profile updated successfully', type: 'success' });
            await logAudit({
                action: 'UPDATE', tableName: 'user_profiles', recordId: user?.id,
                oldData: profile, newData: updates, userId: user?.id, userEmail: user?.email,
            });
        }
        setSaving(false);
    };

    const handlePasswordChange = async () => {
        if (!passwordForm.newPass || passwordForm.newPass.length < 6) {
            setToast({ message: 'Password must be at least 6 characters', type: 'error' });
            return;
        }
        if (passwordForm.newPass !== passwordForm.confirm) {
            setToast({ message: 'Passwords do not match', type: 'error' });
            return;
        }
        setChangingPassword(true);
        const { error } = await supabase.auth.updateUser({ password: passwordForm.newPass });
        if (error) {
            setToast({ message: error.message, type: 'error' });
        } else {
            setToast({ message: 'Password changed successfully', type: 'success' });
            setPasswordForm({ current: '', newPass: '', confirm: '' });
        }
        setChangingPassword(false);
    };

    return (
        <>
            <div className="page-header">
                <h1>My Profile</h1>
                <p>Manage your personal details and account settings.</p>
            </div>

            {loading ? (
                <div className="page-loading"><span className="loading-spinner" /></div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24, alignItems: 'start' }}>
                    {/* Profile sidebar card */}
                    <div className="profile-card">
                        <div className="profile-avatar-lg">{initial}</div>
                        <div className="profile-name">{displayName}</div>
                        <div className="profile-email">{user.email}</div>
                        <span className="profile-role-badge">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                            {role}
                        </span>
                    </div>

                    {/* Edit form */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {/* Profile Details Card */}
                        <div className="card" style={{ padding: 24 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: 'var(--text-primary)' }}>Profile Details</h3>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Display Name</label>
                                    <input className="form-input" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="Your name" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input className="form-input" value={user.email} disabled style={{ opacity: 0.6 }} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Phone</label>
                                    <input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 234-567-8900" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Company / Organization</label>
                                    <input className="form-input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Where you work" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Location</label>
                                <input className="form-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="City, Country" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Bio</label>
                                <textarea className="form-textarea" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tell us about yourself..." rows={3} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                    {saving ? <><span className="loading-spinner" /> Saving...</> : 'Save Changes'}
                                </button>
                            </div>
                        </div>

                        {/* Change Password Card */}
                        <div className="card" style={{ padding: 24 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: 'var(--text-primary)' }}>Change Password</h3>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">New Password</label>
                                    <input className="form-input" type="password" value={passwordForm.newPass} onChange={(e) => setPasswordForm({ ...passwordForm, newPass: e.target.value })} placeholder="Min 6 characters" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Confirm Password</label>
                                    <input className="form-input" type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} placeholder="Confirm password" />
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                                <button className="btn btn-secondary" onClick={handlePasswordChange} disabled={changingPassword}>
                                    {changingPassword ? <><span className="loading-spinner" /> Changing...</> : 'Change Password'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </>
    );
}
