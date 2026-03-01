# User Account Setup Guide — Tony Cho Dashboard

## Pre-configured Accounts

Two accounts are pre-configured in Supabase:

| Account | Email | Password | Role |
|---------|-------|----------|------|
| Admin | `tonychoadmin@cho.ventures` | `y)o2&<kQmQL` | admin |
| Member | `tonychomember@cho.ventures` | `y)o2&<kQmQL` | member |

> ⚠️ **Change these passwords immediately** in Supabase Auth dashboard after first login.

## Role Permissions

| Capability | Admin | Member |
|------------|-------|--------|
| View all dashboard pages | ✅ | ✅ (read-only) |
| Create/edit/delete records | ✅ | ❌ |
| Access `/admin/*` routes | ✅ | ❌ (blocked) |
| User management | ✅ | ❌ |
| Settings & CMS | ✅ | ❌ |
| Form Builder | ✅ | ❌ |
| Audit Log | ✅ | ❌ |
| Submit public forms | ✅ | ✅ |

## How to Add New Users

### Option A: Admin Dashboard (Recommended)
1. Log in as admin
2. Go to **Users** → click **Create Account**
3. Fill in email, password, display name, and role
4. Click **Save** — account is immediately active

### Option B: Supabase Dashboard
1. Go to Supabase → **Authentication** → **Users**
2. Click **Add user** → fill email + password
3. The `handle_new_user()` trigger auto-creates a profile with `member` role
4. To change role: go to **Table Editor** → `user_profiles` → update `role` to `admin`

## Architecture

```
Login → Supabase Auth → user_profiles → role (admin|member)
                                      → DashboardShell fetches profile
                                      → Sidebar filters nav by role
                                      → AdminGuard blocks /admin/* for members
                                      → Page-level isAdmin() hides actions
```

### Security Layers
1. **Supabase RLS**: Database-level row access control by role
2. **AdminGuard**: Route-level component that redirects non-admin users
3. **isAdmin()**: UI-level conditional rendering of action buttons
4. **Edge Function**: `create-user` validates admin JWT before creating accounts
5. **Audit logs**: All mutations logged with old/new data diffs

## Supabase Environment Variables

Ensure your `.env.local` has:
```
NEXT_PUBLIC_SUPABASE_URL=https://nsljfquevthvwlrqbdej.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```
