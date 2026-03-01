// Role-based access control helpers

export function isAdmin(role) {
    return role === 'admin';
}

export function isMember(role) {
    return role === 'member';
}

export function canEdit(role) {
    return role === 'admin';
}

export function canDelete(role) {
    return role === 'admin';
}

export function canManageUsers(role) {
    return role === 'admin';
}

export function canAccessSettings(role) {
    return role === 'admin';
}

export function canAccessAuditLog(role) {
    return role === 'admin';
}

export function canAccessFormBuilder(role) {
    return role === 'admin';
}
