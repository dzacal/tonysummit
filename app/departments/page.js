'use client';
import { useState, useEffect, useCallback } from 'react';
import DashboardShell, { useAuth } from '@/components/DashboardShell';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { supabase } from '@/lib/supabase';
import { isAdmin } from '@/lib/rbac';

export default function DepartmentsPage() {
    return <DashboardShell><Departments /></DashboardShell>;
}

function Departments() {
    const auth = useAuth();
    const role = auth?.role || 'member';
    const [departments, setDepartments] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [membersModalOpen, setMembersModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [selectedDept, setSelectedDept] = useState(null);
    const [form, setForm] = useState({ name: '', lead_id: '' });
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [deptMembers, setDeptMembers] = useState([]);
    const [selectedMember, setSelectedMember] = useState('');


    const fetchAll = useCallback(async () => {
        const [{ data: depts }, { data: members }, { data: allDeptMembers }] = await Promise.all([
            supabase.from('departments').select('*, lead:team_members!departments_lead_id_fkey(id, full_name)').order('name'),
            supabase.from('team_members').select('id, full_name').order('full_name'),
            supabase.from('department_members').select('department_id, member_id, member:team_members!department_members_member_id_fkey(full_name)'),
        ]);
        // Group members by department in-memory (avoids N+1 queries)
        const membersByDept = {};
        (allDeptMembers || []).forEach((dm) => {
            if (!membersByDept[dm.department_id]) membersByDept[dm.department_id] = [];
            membersByDept[dm.department_id].push(dm);
        });
        const deptsWithMembers = (depts || []).map((d) => ({
            ...d,
            members: membersByDept[d.id] || [],
        }));
        setDepartments(deptsWithMembers);
        setTeamMembers(members || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    if (!auth) return <div className="page-loading"><span className="loading-spinner" /> Loading...</div>;

    const openAdd = () => { setEditing(null); setForm({ name: '', lead_id: '' }); setModalOpen(true); };
    const openEdit = (d) => { setEditing(d); setForm({ name: d.name, lead_id: d.lead_id || '' }); setModalOpen(true); };

    const openMembers = async (dept) => {
        setSelectedDept(dept);
        const { data } = await supabase.from('department_members').select('member_id, member:team_members!department_members_member_id_fkey(id, full_name)').eq('department_id', dept.id);
        setDeptMembers(data || []);
        setSelectedMember('');
        setMembersModalOpen(true);
    };

    const handleSave = async () => {
        setSaving(true);
        const payload = { name: form.name, lead_id: form.lead_id || null };
        if (editing) {
            const { error } = await supabase.from('departments').update(payload).eq('id', editing.id);
            if (error) setToast({ message: error.message, type: 'error' }); else setToast({ message: 'Department updated', type: 'success' });
        } else {
            const { error } = await supabase.from('departments').insert(payload);
            if (error) setToast({ message: error.message, type: 'error' }); else setToast({ message: 'Department created', type: 'success' });
        }
        setSaving(false);
        setModalOpen(false);
        fetchAll();
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this department?')) return;
        await supabase.from('departments').delete().eq('id', id);
        setToast({ message: 'Department deleted', type: 'success' });
        fetchAll();
    };

    const addMember = async () => {
        if (!selectedMember || !selectedDept) return;
        const { error } = await supabase.from('department_members').insert({ department_id: selectedDept.id, member_id: selectedMember });
        if (error) { setToast({ message: error.message, type: 'error' }); return; }
        const { data } = await supabase.from('department_members').select('member_id, member:team_members!department_members_member_id_fkey(id, full_name)').eq('department_id', selectedDept.id);
        setDeptMembers(data || []);
        setSelectedMember('');
        fetchAll();
    };

    const removeMember = async (memberId) => {
        await supabase.from('department_members').delete().eq('department_id', selectedDept.id).eq('member_id', memberId);
        const { data } = await supabase.from('department_members').select('member_id, member:team_members!department_members_member_id_fkey(id, full_name)').eq('department_id', selectedDept.id);
        setDeptMembers(data || []);
        fetchAll();
    };

    return (
        <>
            <div className="page-header">
                <h1>Departments</h1>
                <p>Organize your team into departments.</p>
                {isAdmin(role) && <div className="page-actions">
                    <button className="btn btn-primary" onClick={openAdd}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 4v16m8-8H4" /></svg>
                        Add Department
                    </button>
                </div>}
            </div>

            <div className="table-container">
                {loading ? (
                    <div className="page-loading"><span className="loading-spinner" /></div>
                ) : departments.length === 0 ? (
                    <div className="table-empty">No departments yet.</div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Department</th>
                                <th>Lead</th>
                                <th>Members</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {departments.map((d) => (
                                <tr key={d.id}>
                                    <td><span className="name-cell">{d.name}</span></td>
                                    <td>{d.lead?.full_name || '—'}</td>
                                    <td>
                                        <button className="btn btn-secondary btn-sm" onClick={() => openMembers(d)}>
                                            {d.members.length} member{d.members.length !== 1 ? 's' : ''}
                                        </button>
                                    </td>
                                    {isAdmin(role) && <td>
                                        <div className="row-actions">
                                            <button title="Edit" onClick={() => openEdit(d)}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                            </button>
                                            <button className="delete" title="Delete" onClick={() => handleDelete(d.id)}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                                            </button>
                                        </div>
                                    </td>}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Add/Edit Department Modal */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Department' : 'New Department'} onSubmit={handleSave} loading={saving}>
                <div className="form-group">
                    <label className="form-label">Department Name *</label>
                    <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Marketing" required />
                </div>
                <div className="form-group">
                    <label className="form-label">Department Lead</label>
                    <select className="form-select" value={form.lead_id} onChange={(e) => setForm({ ...form, lead_id: e.target.value })}>
                        <option value="">Select a lead...</option>
                        {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                    </select>
                </div>
            </Modal>

            {/* Members Management Modal */}
            <Modal isOpen={membersModalOpen} onClose={() => setMembersModalOpen(false)} title={`${selectedDept?.name || ''} — Members`}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                    <select className="form-select" value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)} style={{ flex: 1 }}>
                        <option value="">Select member to add...</option>
                        {teamMembers
                            .filter((m) => !deptMembers.some((dm) => dm.member_id === m.id))
                            .map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                    </select>
                    <button className="btn btn-primary btn-sm" onClick={addMember} disabled={!selectedMember}>Add</button>
                </div>
                {deptMembers.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No members assigned yet.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {deptMembers.map((dm) => (
                            <div key={dm.member_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
                                <span style={{ fontSize: 14 }}>{dm.member?.full_name}</span>
                                <button className="btn btn-danger btn-sm" onClick={() => removeMember(dm.member_id)}>Remove</button>
                            </div>
                        ))}
                    </div>
                )}
            </Modal>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </>
    );
}
