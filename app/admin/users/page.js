'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/DashboardShell';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { supabase } from '@/lib/supabase';
import { isAdmin } from '@/lib/rbac';
import { logAudit } from '@/lib/audit';
import { formatDate } from '@/lib/utils';

export default function UsersPage() {
    return <UsersContent />;
}

function UsersContent() {
    const auth = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [editForm, setEditForm] = useState({ display_name: '', role: 'member', phone: '', company: '', location: '', bio: '' });
    const [createForm, setCreateForm] = useState({ email: '', password: '', display_name: '', role: 'member' });
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    const fetchUsers = useCallback(async () => {
        const { data } = await supabase.from('user_profiles').select('*').order('created_at');
        setUsers(data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    if (!auth || !isAdmin(auth.role)) {
        return <div className="page-loading" style={{ color: 'var(--danger)' }}>Access denied. Admin only.</div>;
    }

    // --- Edit User ---
    const openEdit = (u) => {
        setEditing(u);
        setEditForm({
            display_name: u.display_name || '',
            role: u.role || 'member',
            phone: u.phone || '',
            company: u.company || '',
            location: u.location || '',
            bio: u.bio || ''
        });
        setEditModalOpen(true);
    };

    const handleEdit = async () => {
        setSaving(true);
        const oldData = { display_name: editing.display_name, role: editing.role, phone: editing.phone, company: editing.company, location: editing.location, bio: editing.bio };
        const { error } = await supabase.from('user_profiles').update({
            display_name: editForm.display_name,
            role: editForm.role,
            phone: editForm.phone,
            company: editForm.company,
            location: editForm.location,
            bio: editForm.bio,
            updated_at: new Date().toISOString(),
        }).eq('id', editing.id);

        if (error) {
            setToast({ message: error.message, type: 'error' });
        } else {
            setToast({ message: 'User updated', type: 'success' });
            await logAudit({ action: 'UPDATE', tableName: 'user_profiles', recordId: editing.id, oldData, newData: editForm, userId: auth.user.id, userEmail: auth.user.email });
        }
        setSaving(false);
        setEditModalOpen(false);
        fetchUsers();
    };

    // --- Create User ---
    const handleCreate = async () => {
        if (!createForm.email || !createForm.password) {
            setToast({ message: 'Email and password are required', type: 'error' });
            return;
        }
        if (createForm.password.length < 6) {
            setToast({ message: 'Password must be at least 6 characters', type: 'error' });
            return;
        }
        setSaving(true);
        try {
            const { data: result, error: fnError } = await supabase.functions.invoke('create-user', {
                body: createForm,
            });
            if (fnError) {
                setToast({ message: fnError.message || 'Failed to create user', type: 'error' });
            } else if (result?.error) {
                setToast({ message: result.error, type: 'error' });
            } else {
                setToast({ message: `User ${createForm.email} created successfully`, type: 'success' });
                setCreateModalOpen(false);
                setCreateForm({ email: '', password: '', display_name: '', role: 'member' });
                fetchUsers();
            }
        } catch (err) {
            setToast({ message: err.message, type: 'error' });
        }
        setSaving(false);
    };

    // --- Delete User ---
    const handleDelete = async (u) => {
        if (u.id === auth.user.id) {
            setToast({ message: "You can't delete your own account", type: 'error' });
            return;
        }
        if (!confirm(`Are you absolutely sure you want to permanently delete ${u.display_name || u.email}? This action cannot be undone.`)) return;

        setSaving(true);
        const { error } = await supabase.rpc('delete_user', { target_user_id: u.id });
        if (error) {
            setToast({ message: error.message, type: 'error' });
        } else {
            setToast({ message: `User deleted successfully`, type: 'success' });
            await logAudit({ action: 'DELETE', tableName: 'user_profiles', recordId: u.id, oldData: u, newData: null, userId: auth.user.id, userEmail: auth.user.email });
            fetchUsers();
        }
        setSaving(false);
    };

    // --- Deactivate User ---
    const handleDeactivate = async (u) => {
        if (u.id === auth.user.id) {
            setToast({ message: "You can't deactivate your own account", type: 'error' });
            return;
        }
        const action = u.deactivated ? 'reactivate' : 'deactivate';
        if (!confirm(`Are you sure you want to ${action} ${u.display_name || u.email}?`)) return;

        const { error } = await supabase.from('user_profiles').update({
            deactivated: !u.deactivated,
            updated_at: new Date().toISOString(),
        }).eq('id', u.id);

        if (error) {
            setToast({ message: error.message, type: 'error' });
        } else {
            setToast({ message: `User ${action}d`, type: 'success' });
            await logAudit({ action: 'UPDATE', tableName: 'user_profiles', recordId: u.id, oldData: { deactivated: u.deactivated }, newData: { deactivated: !u.deactivated }, userId: auth.user.id, userEmail: auth.user.email });
        }
        fetchUsers();
    };

    const activeUsers = users.filter(u => !u.deactivated);
    const deactivatedUsers = users.filter(u => u.deactivated);

    return (
        <>
            <div className="page-header">
                <h1>User Management</h1>
                <p>Create, edit, and manage user accounts and RBAC roles.</p>
                <div className="page-actions">
                    <button className="btn btn-primary" onClick={() => setCreateModalOpen(true)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 4v16m8-8H4" /></svg>
                        Create Account
                    </button>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card"><div className="stat-value">{users.length}</div><div className="stat-label">Total Users</div></div>
                <div className="stat-card"><div className="stat-value">{users.filter(u => u.role === 'admin').length}</div><div className="stat-label">Admins</div></div>
                <div className="stat-card"><div className="stat-value">{users.filter(u => u.role === 'member').length}</div><div className="stat-label">Members</div></div>
                <div className="stat-card"><div className="stat-value">{deactivatedUsers.length}</div><div className="stat-label">Deactivated</div></div>
            </div>

            <div className="table-container">
                {loading ? (
                    <div className="page-loading"><span className="loading-spinner" /></div>
                ) : users.length === 0 ? (
                    <div className="table-empty">No users found.</div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => (
                                <tr key={u.id} style={u.deactivated ? { opacity: 0.5 } : {}}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div className="sidebar-avatar" style={{ width: 32, height: 32, fontSize: 13 }}>
                                                {(u.display_name || u.email)?.[0]?.toUpperCase() || 'U'}
                                            </div>
                                            <span className="name-cell">{u.display_name || '—'}</span>
                                        </div>
                                    </td>
                                    <td>{u.email || '—'}</td>
                                    <td>
                                        <span className={`badge ${u.role === 'admin' ? 'badge-info' : 'badge-neutral'}`} style={{ textTransform: 'capitalize' }}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${u.deactivated ? 'badge-danger' : 'badge-success'}`}>
                                            {u.deactivated ? 'Deactivated' : 'Active'}
                                        </span>
                                    </td>
                                    <td>{formatDate(u.created_at)}</td>
                                    <td>
                                        <div className="row-actions" style={{ gap: 2 }}>
                                            <button title="Edit" onClick={() => openEdit(u)}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                            </button>
                                            <button
                                                title={u.deactivated ? 'Reactivate' : 'Deactivate'}
                                                onClick={() => handleDeactivate(u)}
                                                style={u.deactivated ? {} : { color: 'var(--danger)' }}
                                            >
                                                {u.deactivated ? (
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                                ) : (
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                                )}
                                            </button>
                                            <button className="delete" title="Delete" onClick={() => handleDelete(u)}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Edit User Modal */}
            <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit User Profile" onSubmit={handleEdit} loading={saving}>
                <div className="form-group">
                    <label className="form-label">Display Name</label>
                    <input className="form-input" value={editForm.display_name} onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })} placeholder="Display name" />
                </div>
                <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="+1 234 567 8900" />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Company</label>
                        <input className="form-input" value={editForm.company} onChange={(e) => setEditForm({ ...editForm, company: e.target.value })} placeholder="Company name" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Location</label>
                        <input className="form-input" value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} placeholder="City, Country" />
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">Bio (Optional)</label>
                    <textarea className="form-textarea" value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} placeholder="A short bio..." />
                </div>
                <div className="form-group">
                    <label className="form-label">System Role</label>
                    <select className="form-select" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                    </select>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                        <strong>Admin:</strong> Full access to all modules, settings, user management.<br />
                        <strong>Member:</strong> Read-only access to permitted data, can submit forms.
                    </p>
                </div>
            </Modal>

            {/* Create User Modal */}
            <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create New Account" onSubmit={handleCreate} loading={saving}>
                <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input className="form-input" type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} placeholder="user@example.com" required />
                </div>
                <div className="form-group">
                    <label className="form-label">Password *</label>
                    <input className="form-input" type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} placeholder="Minimum 6 characters" required />
                </div>
                <div className="form-group">
                    <label className="form-label">Display Name</label>
                    <input className="form-input" value={createForm.display_name} onChange={(e) => setCreateForm({ ...createForm, display_name: e.target.value })} placeholder="Full name" />
                </div>
                <div className="form-group">
                    <label className="form-label">Role</label>
                    <select className="form-select" value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}>
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
            </Modal>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </>
    );
}
