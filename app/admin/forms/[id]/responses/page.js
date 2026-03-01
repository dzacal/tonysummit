'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/components/DashboardShell';
import Toast from '@/components/Toast';
import { supabase } from '@/lib/supabase';
import { isAdmin } from '@/lib/rbac';
import { formatDateTime } from '@/lib/utils';

export default function FormResponsesPage() {
    return <ResponsesContent />;
}

function ResponsesContent() {
    const auth = useAuth();
    const params = useParams();
    const formId = params.id;
    const [template, setTemplate] = useState(null);
    const [fields, setFields] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);

    const fetchData = useCallback(async () => {
        const [{ data: tpl }, { data: flds }, { data: subs }] = await Promise.all([
            supabase.from('form_templates').select('*').eq('id', formId).single(),
            supabase.from('form_fields').select('*').eq('form_id', formId).order('sort_order'),
            supabase.from('form_submissions').select('*').eq('form_id', formId).order('created_at', { ascending: false }),
        ]);
        setTemplate(tpl);
        setFields(flds || []);
        setSubmissions(subs || []);
        setLoading(false);
    }, [formId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (!auth || !isAdmin(auth.role)) {
        return <div className="page-loading" style={{ color: 'var(--danger)' }}>Access denied.</div>;
    }

    if (loading) return <div className="page-loading"><span className="loading-spinner" /></div>;

    const exportCSV = () => {
        const headers = ['Submitted At', ...fields.map((f) => f.label), 'Status'];
        const rows = submissions.map((s) => [
            new Date(s.created_at).toLocaleString(),
            ...fields.map((f) => {
                const val = s.data?.[f.id];
                return typeof val === 'boolean' ? (val ? 'Yes' : 'No') : (val || '');
            }),
            s.status,
        ]);
        const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${template?.name || 'responses'}.csv`;
        a.click();
    };

    const deleteSubmission = async (id) => {
        if (!confirm('Delete this submission?')) return;
        await supabase.from('form_submissions').delete().eq('id', id);
        setToast({ message: 'Submission deleted', type: 'success' });
        fetchData();
    };

    return (
        <>
            <div className="page-header">
                <h1 style={{ fontSize: 22 }}>{template?.name} — Responses</h1>
                <p>{submissions.length} submission{submissions.length !== 1 ? 's' : ''}</p>
                <div className="page-actions">
                    <button className="btn btn-secondary" onClick={exportCSV} disabled={submissions.length === 0}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Export CSV
                    </button>
                </div>
            </div>

            <div className="table-container">
                {submissions.length === 0 ? (
                    <div className="table-empty">No submissions yet.</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Submitted</th>
                                    {fields.map((f) => <th key={f.id}>{f.label}</th>)}
                                    <th>Status</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {submissions.map((s) => (
                                    <tr key={s.id}>
                                        <td style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{formatDateTime(s.created_at)}</td>
                                        {fields.map((f) => {
                                            const val = s.data?.[f.id];
                                            return (
                                                <td key={f.id} style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {typeof val === 'boolean' ? (val ? '✓' : '—') : (val || '—')}
                                                </td>
                                            );
                                        })}
                                        <td><span className="badge badge-info">{s.status}</span></td>
                                        <td>
                                            <div className="row-actions">
                                                <button className="delete" title="Delete" onClick={() => deleteSubmission(s.id)}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </>
    );
}
