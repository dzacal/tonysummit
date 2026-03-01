'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        async function checkAuth() {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user || null;
            if (user) {
                const { data: prof } = await supabase
                    .from('user_profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                const role = prof?.role || 'member';
                router.replace(role === 'admin' ? '/admin/dashboard' : '/member/dashboard');
            } else {
                setChecking(false);
            }
        }
        checkAuth();
    }, [router]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) {
            setError(err.message);
            setLoading(false);
        } else {
            const { data: prof } = await supabase
                .from('user_profiles')
                .select('role')
                .eq('id', data.user.id)
                .single();
            const role = prof?.role || 'member';
            router.replace(role === 'admin' ? '/admin/dashboard' : '/member/dashboard');
        }
    };

    if (checking) {
        return (
            <div className="login-page">
                <div className="page-loading">
                    <span className="loading-spinner" /> Checking authentication...
                </div>
            </div>
        );
    }

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-logo-area">
                    <img src="/logo.webp" alt="Tony Cho" className="login-logo-img" />
                </div>
                <h1>Welcome Back</h1>
                <p>Sign in to your dashboard</p>
                {error && <div className="login-error">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            className="form-input"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            className="form-input"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                        {loading ? <><span className="loading-spinner" /> Signing in...</> : 'Sign In'}
                    </button>
                </form>
                <div className="login-footer">
                    <a href="/" className="login-back-link">← Back to Homepage</a>
                </div>
            </div>
        </div>
    );
}
