'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function BookPodcastPage() {
    const [form, setForm] = useState({
        guest_name: '', guest_email: '', guest_phone: '', company: '', topic: '',
        preferred_date: '', preferred_time: '', message: '',
    });
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const bookingId = `${form.guest_email}_${form.preferred_date || new Date().toISOString().slice(0, 10)}`.toLowerCase();
        const { error: err } = await supabase.from('podcast_bookings').insert({
            ...form,
            booking_id: bookingId,
        });

        if (err) {
            setError(err.message);
            setLoading(false);
        } else {
            setSubmitted(true);
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="public-page">
                <div className="public-form-card">
                    <div className="form-success">
                        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <h2>Booking Submitted!</h2>
                        <p>Thank you, {form.guest_name}. We&apos;ll be in touch to confirm your podcast session with Tony.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="public-page">
            <div className="public-form-card">
                <h1>Book a Podcast with Tony</h1>
                <p>Fill out the form below and our team will reach out to schedule your session.</p>

                {error && <div className="login-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Your Name *</label>
                            <input className="form-input" value={form.guest_name} onChange={(e) => updateField('guest_name', e.target.value)} placeholder="Full name" required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email *</label>
                            <input className="form-input" type="email" value={form.guest_email} onChange={(e) => updateField('guest_email', e.target.value)} placeholder="you@example.com" required />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Phone</label>
                            <input className="form-input" value={form.guest_phone} onChange={(e) => updateField('guest_phone', e.target.value)} placeholder="+1 234-567-8900" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Company / Organization</label>
                            <input className="form-input" value={form.company} onChange={(e) => updateField('company', e.target.value)} placeholder="Company name" />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Podcast Topic *</label>
                        <input className="form-input" value={form.topic} onChange={(e) => updateField('topic', e.target.value)} placeholder="What would you like to discuss?" required />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Preferred Date</label>
                            <input className="form-input" type="date" value={form.preferred_date} onChange={(e) => updateField('preferred_date', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Preferred Time</label>
                            <input className="form-input" value={form.preferred_time} onChange={(e) => updateField('preferred_time', e.target.value)} placeholder="e.g. 2:00 PM EST" />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Additional Message</label>
                        <textarea className="form-textarea" value={form.message} onChange={(e) => updateField('message', e.target.value)} placeholder="Tell us more about yourself or your show..." />
                    </div>

                    <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 8, padding: '14px' }}>
                        {loading ? <><span className="loading-spinner" /> Submitting...</> : 'Submit Booking Request'}
                    </button>
                </form>
            </div>
        </div>
    );
}
