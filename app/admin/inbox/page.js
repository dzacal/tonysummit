'use client';
import { useState } from 'react';
import { useAuth } from '@/components/DashboardShell';
import { isAdmin } from '@/lib/rbac';
import { useRouter } from 'next/navigation';

export default function SmartInboxPage() {
    const auth = useAuth();
    const router = useRouter();
    const [scanning, setScanning] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);
    const [ignored, setIgnored] = useState(new Set());

    if (!auth || !isAdmin(auth.role)) return null;

    const scan = async () => {
        setScanning(true);
        setError(null);
        setResults(null);
        try {
            const res = await fetch('/api/gmail/smart-scan');
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setResults(data.results || []);
        } catch (err) {
            setError(err.message);
        }
        setScanning(false);
    };

    const ignore = (id) => setIgnored(prev => new Set([...prev, id]));

    const addAsSpeaker = (item) => {
        const params = new URLSearchParams({
            prefill_name: item.senderName,
            prefill_email: item.senderEmail,
        });
        router.push(`/summit/speakers?${params}`);
    };

    const addToPodcast = (item) => {
        const params = new URLSearchParams({
            prefill_name: item.senderName,
            prefill_email: item.senderEmail,
        });
        router.push(`/podcast?${params}`);
    };

    const visible = results?.filter(r => !ignored.has(r.id)) || [];
    const speakerEmails = visible.filter(r => r.category === 'speaker');
    const podcastEmails = visible.filter(r => r.category === 'podcast');

    return (
        <>
            <div className="page-header">
                <h1>Smart Inbox</h1>
                <p>Scan your Gmail for summit and podcast-related emails and route them automatically.</p>
                <div className="page-actions">
                    <button className="btn btn-primary" onClick={scan} disabled={scanning}>
                        {scanning ? (
                            <><span className="loading-spinner" style={{ width: 14, height: 14, marginRight: 6 }} />Scanning…</>
                        ) : (
                            <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ marginRight: 6 }}><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>Scan Inbox</>
                        )}
                    </button>
                </div>
            </div>

            {/* Keywords legend */}
            <div className="card" style={{ marginBottom: 20, padding: '12px 16px' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Scanning for keywords</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {['generation regeneration', 'online summit', 'interview', 'panel', 'substack'].map(k => (
                        <span key={k} style={{ padding: '2px 8px', background: 'var(--accent)', color: '#fff', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>{k}</span>
                    ))}
                    {['podcast'].map(k => (
                        <span key={k} style={{ padding: '2px 8px', background: '#f59e0b', color: '#fff', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>{k}</span>
                    ))}
                </div>
            </div>

            {error && (
                <div className="card" style={{ borderLeft: '3px solid var(--danger)', color: 'var(--danger)', padding: '12px 16px', marginBottom: 16 }}>
                    {error}
                </div>
            )}

            {results === null && !scanning && (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                    Click "Scan Inbox" to search your Gmail for relevant emails.
                </div>
            )}

            {results !== null && visible.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                    No matching emails found.
                </div>
            )}

            {/* Speaker emails */}
            {speakerEmails.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <span style={{ fontSize: 16 }}>🎤</span>
                        <h2 style={{ fontSize: 15, fontWeight: 700 }}>Speaker-Related</h2>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-input)', padding: '2px 8px', borderRadius: 20 }}>{speakerEmails.length}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {speakerEmails.map(item => (
                            <EmailCard
                                key={item.id}
                                item={item}
                                onIgnore={() => ignore(item.id)}
                                primaryLabel={item.matchedSpeaker ? 'View Speaker' : 'Add as Speaker'}
                                primaryAction={() => item.matchedSpeaker
                                    ? router.push(`/summit/speakers`)
                                    : addAsSpeaker(item)
                                }
                                matchedLabel={item.matchedSpeaker
                                    ? `Matched: ${item.matchedSpeaker.full_name}`
                                    : 'No existing speaker match'}
                                matchedColor={item.matchedSpeaker ? '#22c55e' : '#f59e0b'}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Podcast emails */}
            {podcastEmails.length > 0 && (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <span style={{ fontSize: 16 }}>🎙️</span>
                        <h2 style={{ fontSize: 15, fontWeight: 700 }}>Podcast-Related</h2>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-input)', padding: '2px 8px', borderRadius: 20 }}>{podcastEmails.length}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {podcastEmails.map(item => (
                            <EmailCard
                                key={item.id}
                                item={item}
                                onIgnore={() => ignore(item.id)}
                                primaryLabel="Add to Podcast List"
                                primaryAction={() => addToPodcast(item)}
                                matchedLabel="Routes to Podcast section"
                                matchedColor="#f59e0b"
                            />
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}

function EmailCard({ item, onIgnore, primaryLabel, primaryAction, matchedLabel, matchedColor }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.subject}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                        {item.from} · {new Date(item.date).toLocaleDateString()}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: matchedColor, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{matchedLabel}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {item.keywords.map(k => (
                            <span key={k} style={{ padding: '1px 6px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 11, color: 'var(--text-secondary)' }}>
                                {k}
                            </span>
                        ))}
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                    <button className="btn btn-primary btn-sm" onClick={primaryAction} style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                        {primaryLabel}
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setExpanded(e => !e)} style={{ fontSize: 12 }}>
                        {expanded ? 'Hide' : 'Preview'}
                    </button>
                    <button onClick={onIgnore} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', padding: '2px 0', textAlign: 'center' }}>
                        Ignore
                    </button>
                </div>
            </div>
            {expanded && (
                <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', maxHeight: 200, overflowY: 'auto' }}>
                    {item.snippet || '(no preview)'}
                </div>
            )}
        </div>
    );
}
