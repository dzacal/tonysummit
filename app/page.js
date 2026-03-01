'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

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

function RegistrationSection() {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', subscribe_news: false, country_code: 'US', phone: '' });
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('');
  // Bot protection: honeypot + time-based
  const [honeypot, setHoneypot] = useState('');
  const [formLoadedAt] = useState(() => Date.now());

  const selectedCountry = COUNTRIES.find(c => c.code === form.country_code) || COUNTRIES[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Bot protection: if honeypot is filled, silently "succeed" (bot thinks it worked)
    if (honeypot) {
      setStatus('success');
      return;
    }
    // Bot protection: if form was submitted in under 3 seconds, likely a bot
    if (Date.now() - formLoadedAt < 3000) {
      setStatus('success');
      return;
    }
    if (!form.first_name || !form.last_name || !form.email) {
      setErrorMsg('Please fill in all required fields.');
      setStatus('error');
      return;
    }
    setStatus('submitting');
    setErrorMsg('');

    const { error } = await supabase.from('summit_registrations').insert({
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      subscribe_news: form.subscribe_news,
      country_code: form.country_code,
      phone: form.phone ? `${selectedCountry.dial} ${form.phone.trim()}` : null,
      source: 'website',
    });

    if (error) {
      setErrorMsg('Something went wrong. Please try again.');
      setStatus('error');
    } else {
      setStatus('success');
      setForm({ first_name: '', last_name: '', email: '', subscribe_news: false, country_code: 'US', phone: '' });
    }
  };

  return (
    <section className="hp-register-section" id="register">
      <div className="hp-register-inner">
        <h2 className="hp-register-title">GENERATION REGENERATION</h2>
        <h3 className="hp-register-subtitle-line">ONLINE SUMMIT</h3>
        <p className="hp-register-date">SAVE THE DATE | JULY 10, 11 & 12, 2026</p>

        <p className="hp-register-desc">
          <strong>Generation Regeneration</strong> Online Summit is a virtual gathering featuring the world&apos;s leading names in regeneration—from real estate and wellness to social impact and environmental action. Hear unfiltered conversations, learn what&apos;s working now, and meet the next generation shaping a more regenerative tomorrow.
        </p>

        <p className="hp-register-cta-text">Get summit updates by signing up below.</p>

        {status === 'success' ? (
          <div className="hp-register-success">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <h4>You&apos;re registered!</h4>
            <p>Thank you for joining the Global Gathering. We&apos;ll be in touch with summit details soon.</p>
            <button className="hp-register-btn" onClick={() => setStatus('idle')} style={{ marginTop: 16, maxWidth: 240 }}>Register Another</button>
          </div>
        ) : (
          <form className="hp-register-form" onSubmit={handleSubmit}>
            {/* Honeypot — invisible to humans, bots auto-fill it */}
            <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: '-9999px', opacity: 0, height: 0, overflow: 'hidden', tabIndex: -1 }}>
              <label htmlFor="website_url">Leave this empty</label>
              <input type="text" id="website_url" name="website_url" autoComplete="off" tabIndex={-1} value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
            </div>
            <div className="hp-register-heading">Name</div>
            <div className="hp-register-row">
              <div className="hp-register-field">
                <label className="hp-register-label">First Name <span className="hp-required">(required)</span></label>
                <input type="text" className="hp-register-input" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
              </div>
              <div className="hp-register-field">
                <label className="hp-register-label">Last Name <span className="hp-required">(required)</span></label>
                <input type="text" className="hp-register-input" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
              </div>
            </div>

            <div className="hp-register-heading">Email <span className="hp-required">(required)</span></div>
            <input type="email" className="hp-register-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />

            <label className="hp-register-checkbox">
              <input type="checkbox" checked={form.subscribe_news} onChange={(e) => setForm({ ...form, subscribe_news: e.target.checked })} />
              <span>Sign up for news and updates</span>
            </label>

            <div className="hp-register-heading">Phone</div>
            <p className="hp-register-phone-hint">Get an SMS notification as soon as details go live!</p>
            <div className="hp-register-row">
              <div className="hp-register-field" style={{ flex: '0 0 48%' }}>
                <label className="hp-register-label">Country</label>
                <select className="hp-register-select" value={form.country_code} onChange={(e) => setForm({ ...form, country_code: e.target.value })}>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="hp-register-field" style={{ flex: '0 0 48%' }}>
                <label className="hp-register-label">Number</label>
                <input type="tel" className="hp-register-input" placeholder={selectedCountry.dial} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>

            {status === 'error' && errorMsg && (
              <p className="hp-register-error">{errorMsg}</p>
            )}

            <button type="submit" className="hp-register-btn" disabled={status === 'submitting'}>
              {status === 'submitting' ? 'SUBMITTING...' : 'JOIN THE GLOBAL GATHERING'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser(authUser);
        const { data: prof } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', authUser.id)
          .single();
        setRole(prof?.role || 'member');
      }
      setAuthChecked(true);
    }
    checkAuth();
  }, []);

  const handleConnect = () => {
    if (user) {
      router.push(role === 'admin' ? '/admin/dashboard' : '/member/dashboard');
    } else {
      router.push('/login');
    }
  };

  return (
    <div className="hp">
      {/* ─── Navigation ─── */}
      <nav className="hp-nav">
        <div className="hp-nav-inner">
          <a href="/" className="hp-logo">
            <img src="/logo.webp" alt="Tony Cho" />
          </a>

          <div className="hp-nav-right">
            <div className="hp-nav-links">
              <a href="#register">Register</a>
              <a href="/speakers">Speakers</a>
            </div>

            <div className="hp-social-icons">
              <a href="https://www.instagram.com/_tonycho_/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="5" /><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" /></svg>
              </a>
              <a href="https://www.facebook.com/chotimelive" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /></svg>
              </a>
              <a href="https://www.linkedin.com/in/chotimelive" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>
              </a>
              <a href="https://www.youtube.com/@regenerativelivingwithtonycho" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.4 19.6C5.12 20 12 20 12 20s6.88 0 8.6-.46a2.78 2.78 0 001.94-1.96A29 29 0 0023 12a29 29 0 00-.46-5.58z" /><polygon points="9.75,15.02 15.5,12 9.75,8.98" /></svg>
              </a>
            </div>

            <button onClick={handleConnect} className="hp-connect-btn" id="connect-btn">
              {user ? 'DASHBOARD' : 'SIGN IN'}
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Registration Section ─── */}
      <RegistrationSection />

      {/* ─── Social Section ─── */}
      <section className="hp-social-section" id="social">
        <div className="hp-social-inner">
          <h2 className="hp-social-title">Stay Connected</h2>
          <p className="hp-social-desc">Follow the regenerative placemaking movement</p>
          <div className="hp-social-grid">
            <a href="https://www.instagram.com/_tonycho_/" target="_blank" rel="noopener noreferrer" className="hp-social-card">
              <div className="hp-social-card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="5" /><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" /></svg>
              </div>
              <span className="hp-social-card-label">Instagram</span>
              <span className="hp-social-card-handle">@_tonycho_</span>
            </a>
            <a href="https://www.facebook.com/chotimelive" target="_blank" rel="noopener noreferrer" className="hp-social-card">
              <div className="hp-social-card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /></svg>
              </div>
              <span className="hp-social-card-label">Facebook</span>
              <span className="hp-social-card-handle">chotimelive</span>
            </a>
            <a href="https://www.linkedin.com/in/chotimelive" target="_blank" rel="noopener noreferrer" className="hp-social-card">
              <div className="hp-social-card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>
              </div>
              <span className="hp-social-card-label">LinkedIn</span>
              <span className="hp-social-card-handle">chotimelive</span>
            </a>
            <a href="https://www.youtube.com/@regenerativelivingwithtonycho" target="_blank" rel="noopener noreferrer" className="hp-social-card">
              <div className="hp-social-card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.4 19.6C5.12 20 12 20 12 20s6.88 0 8.6-.46a2.78 2.78 0 001.94-1.96A29 29 0 0023 12a29 29 0 00-.46-5.58z" /><polygon points="9.75,15.02 15.5,12 9.75,8.98" /></svg>
              </div>
              <span className="hp-social-card-label">YouTube</span>
              <span className="hp-social-card-handle">Regenerative Living</span>
            </a>
          </div>
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
