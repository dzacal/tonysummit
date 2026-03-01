export function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
    });
}

export function formatDateTime(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

export function generateBookingId(email, date) {
    return `${email}_${date}`.toLowerCase().replace(/[^a-z0-9_@.-]/g, '');
}

export function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}
