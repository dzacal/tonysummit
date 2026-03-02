'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/DashboardShell';
import Toast from '@/components/Toast';
import { supabase } from '@/lib/supabase';
import { isAdmin } from '@/lib/rbac';

export default function SettingsPage() {
    return <SettingsContent />;
}

function SettingsContent() {
    const auth = useAuth();
    const [tab, setTab] = useState('modules');
    const [settings, setSettings] = useState({});
    const [cmsBlocks, setCmsBlocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [saving, setSaving] = useState(false);
    const [gmailConnected, setGmailConnected] = useState(false);

    const fetchSettings = useCallback(async () => {
        const { data: appSettings } = await supabase.from('app_settings').select('*');
        const settingsMap = {};
        (appSettings || []).forEach((s) => { settingsMap[s.key] = s.value; });
        setSettings(settingsMap);

        const { data: blocks } = await supabase.from('cms_blocks').select('*').order('sort_order');
        setCmsBlocks(blocks || []);

        const { data: gmailTokens } = await supabase.from('gmail_tokens').select('id').limit(1);
        setGmailConnected(!!(gmailTokens && gmailTokens.length > 0));

        setLoading(false);
    }, []);

    useEffect(() => {
        fetchSettings();
        const params = new URLSearchParams(window.location.search);
        if (params.get('success') === 'gmail_connected') setToast({ message: 'Gmail connected!', type: 'success' });
        if (params.get('error') === 'gmail_denied') setToast({ message: 'Gmail connection cancelled.', type: 'error' });
        if (params.get('error') === 'gmail_failed') setToast({ message: 'Gmail connection failed.', type: 'error' });
    }, [fetchSettings]);

    if (!auth || !isAdmin(auth.role)) {
        return <div className="page-loading" style={{ color: 'var(--danger)' }}>Access denied. Admin only.</div>;
    }

    const modules = [
        { key: 'team', label: 'Team Members' },
        { key: 'departments', label: 'Departments' },
        { key: 'podcast', label: 'Podcast Bookings' },
        { key: 'summit_partners', label: 'Summit Partners' },
        { key: 'summit_speakers', label: 'Summit Speakers' },
        { key: 'assets', label: 'Marketing Assets' },
        { key: 'forms', label: 'Dynamic Forms' },
    ];

    const enabledModules = settings.enabled_modules || modules.map((m) => m.key);

    const toggleModule = async (key) => {
        const updated = enabledModules.includes(key)
            ? enabledModules.filter((m) => m !== key)
            : [...enabledModules, key];
        setSaving(true);
        await supabase.from('app_settings').upsert({ key: 'enabled_modules', value: updated, updated_at: new Date().toISOString() });
        setSettings({ ...settings, enabled_modules: updated });
        setSaving(false);
        setToast({ message: 'Modules updated', type: 'success' });
    };

    const updateBranding = async (field, value) => {
        const colors = settings.brand_colors || { primary: '#6366f1', accent: '#8b5cf6', bg: '#0a0a0f' };
        const updated = { ...colors, [field]: value };
        await supabase.from('app_settings').upsert({ key: 'brand_colors', value: updated, updated_at: new Date().toISOString() });
        setSettings({ ...settings, brand_colors: updated });
    };

    const updateLogo = async (url) => {
        await supabase.from('app_settings').upsert({ key: 'brand_logo', value: { url }, updated_at: new Date().toISOString() });
        setSettings({ ...settings, brand_logo: { url } });
        setToast({ message: 'Logo updated', type: 'success' });
    };

    const addCmsBlock = async () => {
        const pageKey = prompt('Page key (e.g. home, team, podcast):');
        const blockKey = prompt('Block key (e.g. hero_title, section_heading):');
        if (!pageKey || !blockKey) return;
        const { error } = await supabase.from('cms_blocks').insert({
            page_key: pageKey, block_key: blockKey, content: { text: '' }, sort_order: cmsBlocks.length,
        });
        if (error) setToast({ message: error.message, type: 'error' }); else fetchSettings();
    };

    const updateBlock = async (id, content, enabled) => {
        await supabase.from('cms_blocks').update({
            content, enabled, updated_at: new Date().toISOString(), updated_by: auth.user.id,
        }).eq('id', id);
        fetchSettings();
    };

    const deleteBlock = async (id) => {
        if (!confirm('Delete this block?')) return;
        await supabase.from('cms_blocks').delete().eq('id', id);
        fetchSettings();
    };

    const tabs = [
        { key: 'modules', label: 'Modules' },
        { key: 'branding', label: 'Branding' },
        { key: 'pages', label: 'Page Content' },
        { key: 'gmail', label: 'Gmail' },
    ];

    const brandColors = settings.brand_colors || { primary: '#6366f1', accent: '#8b5cf6', bg: '#0a0a0f' };

    return (
        <>
            <div className="page-header">
                <h1>Settings</h1>
                <p>Configure dashboard modules, branding, and page content.</p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
                {tabs.map((t) => (
                    <button key={t.key} className={`btn ${tab === t.key ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab(t.key)} style={{ borderRadius: 'var(--radius-sm)' }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="page-loading"><span className="loading-spinner" /></div>
            ) : tab === 'modules' ? (
                <div className="card">
                    <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 600 }}>Enable/Disable Modules</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>Toggle which modules appear in the sidebar and are accessible.</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {modules.map((mod) => (
                            <label key={mod.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                                <span style={{ fontSize: 14, fontWeight: 500 }}>{mod.label}</span>
                                <div style={{ position: 'relative', width: 44, height: 24, borderRadius: 12, background: enabledModules.includes(mod.key) ? 'var(--accent)' : 'var(--border)', transition: 'background 0.2s', cursor: 'pointer' }} onClick={(e) => { e.preventDefault(); toggleModule(mod.key); }}>
                                    <div style={{ position: 'absolute', top: 2, left: enabledModules.includes(mod.key) ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: 'var(--shadow-sm)' }} />
                                </div>
                            </label>
                        ))}
                    </div>
                </div>
            ) : tab === 'branding' ? (
                <div className="card">
                    <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 600 }}>Brand Customization</h3>
                    <div className="form-group">
                        <label className="form-label">Logo URL</label>
                        <input className="form-input" value={settings.brand_logo?.url || ''} onChange={(e) => updateLogo(e.target.value)} placeholder="https://..." />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Primary Color</label>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input type="color" value={brandColors.primary} onChange={(e) => updateBranding('primary', e.target.value)} style={{ width: 40, height: 34, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
                                <input className="form-input" value={brandColors.primary} onChange={(e) => updateBranding('primary', e.target.value)} style={{ flex: 1 }} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Accent Color</label>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input type="color" value={brandColors.accent} onChange={(e) => updateBranding('accent', e.target.value)} style={{ width: 40, height: 34, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
                                <input className="form-input" value={brandColors.accent} onChange={(e) => updateBranding('accent', e.target.value)} style={{ flex: 1 }} />
                            </div>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Background Color</label>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input type="color" value={brandColors.bg} onChange={(e) => updateBranding('bg', e.target.value)} style={{ width: 40, height: 34, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
                            <input className="form-input" value={brandColors.bg} onChange={(e) => updateBranding('bg', e.target.value)} style={{ flex: 1 }} />
                        </div>
                    </div>
                </div>
            ) : tab === 'gmail' ? (
                <div className="card">
                    <h3 style={{ marginBottom: 8, fontSize: 16, fontWeight: 600 }}>Gmail Integration</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>Connect a Gmail account to send emails from the dashboard.</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: gmailConnected ? 'var(--success, #22c55e)' : 'var(--danger, #ef4444)', flexShrink: 0 }} />
                        <span style={{ fontSize: 14 }}>{gmailConnected ? 'Gmail is connected' : 'Gmail is not connected'}</span>
                    </div>
                    <a href="/api/auth/gmail" className="btn btn-primary" style={{ display: 'inline-block' }}>
                        {gmailConnected ? 'Reconnect Gmail' : 'Connect Gmail'}
                    </a>
                </div>
            ) : (
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <div>
                            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Page Content Blocks</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Edit headings, text, and toggle sections on/off.</p>
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={addCmsBlock}>+ Add Block</button>
                    </div>

                    {cmsBlocks.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No content blocks yet. Click "Add Block" to create one.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {cmsBlocks.map((block) => (
                                <div key={block.id} style={{ padding: 16, background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                        <div>
                                            <code style={{ fontSize: 12, color: 'var(--accent)' }}>{block.page_key}</code>
                                            <span style={{ margin: '0 6px', color: 'var(--text-muted)' }}>→</span>
                                            <code style={{ fontSize: 12 }}>{block.block_key}</code>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>
                                                <input type="checkbox" checked={block.enabled} onChange={(e) => updateBlock(block.id, block.content, e.target.checked)} />
                                                Enabled
                                            </label>
                                            <button className="btn btn-danger btn-sm" onClick={() => deleteBlock(block.id)} style={{ padding: '4px 8px' }}>×</button>
                                        </div>
                                    </div>
                                    <textarea
                                        className="form-textarea"
                                        value={block.content?.text || ''}
                                        onChange={(e) => updateBlock(block.id, { ...block.content, text: e.target.value }, block.enabled)}
                                        placeholder="Block content..."
                                        style={{ minHeight: 50, fontSize: 13 }}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </>
    );
}
