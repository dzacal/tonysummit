'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function PublicSpeakersPage() {
    const [speakers, setSpeakers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchSpeakers() {
            const { data } = await supabase
                .from('speakers')
                .select('id, full_name, title, organization, topic, session_type, bio, headshot_url')
                .eq('confirmed', true)
                .eq('show_on_website', true)
                .order('full_name');
            setSpeakers(data || []);
            setLoading(false);
        }
        fetchSpeakers();
    }, []);

    return (
        <div className="hp" style={{ minHeight: '100vh' }}>
            {/* ─── Navigation ─── */}
            <nav className="hp-nav">
                <div className="hp-nav-inner">
                    <a href="/" className="hp-logo">
                        <img src="/logo.webp" alt="Tony Cho" />
                    </a>
                    <div className="hp-nav-right">
                        <div className="hp-nav-links">
                            <a href="/speakers">Speakers</a>
                            <a href="/#register">Register</a>
                            <a href="/speakers/apply">Apply to Speak</a>
                        </div>
                        <a href="/login" className="hp-connect-btn">SIGN IN</a>
                    </div>
                </div>
            </nav>

            {/* ─── Speakers Header ─── */}
            <section className="speakers-hero">
                <div className="speakers-hero-inner">
                    <h1 className="speakers-hero-title">MEET OUR SPEAKERS</h1>
                    <p className="speakers-hero-subtitle">
                        World-class leaders in regeneration, real estate, wellness, social impact, and environmental action — coming together for the Generation Regeneration Online Summit.
                    </p>
                    <p className="speakers-hero-date">JULY 10, 11 & 12, 2026</p>
                </div>
            </section>

            {/* ─── Speakers Grid ─── */}
            <section className="speakers-grid-section">
                <div className="speakers-grid-inner">
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '80px 0' }}>
                            <span className="loading-spinner" style={{ width: 32, height: 32 }} />
                        </div>
                    ) : speakers.length === 0 ? (
                        <div className="speakers-empty">
                            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: '#1a9988', marginBottom: 16 }}>
                                <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <h3>Speakers Coming Soon</h3>
                            <p>We&apos;re finalizing our incredible lineup. Check back soon or register below to be the first to know!</p>
                            <a href="/#register" className="hp-cta-primary" style={{ marginTop: 16, display: 'inline-flex' }}>
                                Register for Updates
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                            </a>
                        </div>
                    ) : (
                        <div className="speakers-grid">
                            {speakers.map((speaker) => (
                                <div key={speaker.id} className="speaker-card">
                                    <div className="speaker-card-avatar">
                                        {speaker.headshot_url ? (
                                            <img src={speaker.headshot_url} alt={speaker.full_name} />
                                        ) : (
                                            <div className="speaker-card-initials">
                                                {speaker.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="speaker-card-body">
                                        <h3 className="speaker-card-name">{speaker.full_name}</h3>
                                        {speaker.title && <p className="speaker-card-title">{speaker.title}</p>}
                                        {speaker.organization && <p className="speaker-card-org">{speaker.organization}</p>}
                                        {speaker.session_type && (
                                            <span className="speaker-card-badge">{speaker.session_type}</span>
                                        )}
                                        {speaker.topic && <p className="speaker-card-topic">{speaker.topic}</p>}
                                        {speaker.bio && <p className="speaker-card-bio">{speaker.bio}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* ─── CTA ─── */}
            <section className="speakers-cta-section">
                <div className="speakers-cta-inner">
                    <h2>Want to Speak at the Summit?</h2>
                    <p>Share your expertise with a global audience passionate about regeneration.</p>
                    <a href="/speakers/apply" className="hp-cta-primary">
                        Apply to Speak
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </a>
                </div>
            </section>

            {/* ─── Footer ─── */}
            <footer className="hp-footer">
                <div className="hp-footer-inner">
                    <img src="/logo.webp" alt="Tony Cho" className="hp-footer-logo" />
                    <p>&copy; {new Date().getFullYear()} Generation Regeneration. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
