'use client';
import { useState } from 'react';

export default function Modal({ isOpen, onClose, title, children, onSubmit, submitLabel = 'Save', loading = false }) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button className="btn-ghost btn-icon" onClick={onClose}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
                {onSubmit && (
                    <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
                        <button className="btn btn-primary" onClick={onSubmit} disabled={loading}>
                            {loading && <span className="loading-spinner" />}
                            {submitLabel}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
