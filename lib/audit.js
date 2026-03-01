import { supabase } from './supabase';

export async function logAudit({ action, tableName, recordId, oldData, newData, userId, userEmail }) {
    try {
        await supabase.from('audit_logs').insert({
            user_id: userId,
            user_email: userEmail,
            action,
            table_name: tableName,
            record_id: recordId,
            old_data: oldData || null,
            new_data: newData || null,
        });
    } catch (e) {
        console.error('Audit log failed:', e);
    }
}
