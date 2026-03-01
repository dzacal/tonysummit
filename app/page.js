'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';


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

      {/* ─── Registration Section Removed for Internal Use ─── */}

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
