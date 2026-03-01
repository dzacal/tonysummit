# Tony Cho Brand Dashboard

Internal operations dashboard for the **Tony Cho Brand** and **Generation Regeneration Online Summit**.

Built with **Next.js 16**, **React 19**, and **Supabase** (Auth, Database, Storage, Edge Functions).

---

## Features

- **Role-Based Access Control** — Admin & Member roles with 3-tier security (RLS, route guards, UI guards)
- **Admin Dashboard** — KPI stats, charts, activity feed
- **User Management** — Create, edit, deactivate accounts via Supabase Edge Function
- **Dynamic Form Builder** — Create custom forms with drag-and-drop field ordering
- **Speaker Management** — Full CRM for summit speakers (outreach, contracts, scheduling)
- **Podcast Booking** — Public form + admin management with Google Sheets sync
- **Team & Departments** — Organize team members into departments
- **Marketing Assets** — Upload and manage brand files via Supabase Storage
- **Summit Partners** — Track partnership organizations and statuses
- **Audit Log** — Complete mutation history with old/new data diffs
- **CMS Content Blocks** — Editable page content from the admin panel

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and **npm**
- A **Supabase** project ([supabase.com](https://supabase.com))

### 1. Clone & Install

```bash
git clone https://github.com/your-org/tonysummit.git
cd tonysummit
npm install
```

### 2. Configure Environment

Copy the example env file and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment (Vercel)

This project is configured for **Vercel** deployment:

1. Push this repo to GitHub
2. Import the repo in [Vercel](https://vercel.com/new)
3. Add environment variables in Vercel Project Settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy — Vercel auto-detects Next.js and handles the build

### Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key for client-side auth |

> **Note:** The service role key is only used in the `create-user` Edge Function (configured in Supabase dashboard, not in `.env.local`).

---

## Supabase Setup

### Edge Functions

Two Edge Functions are required:

| Function | Purpose |
|----------|---------|
| `create-user` | Admin-only user creation via Supabase Auth Admin API |
| `sync-podcast-sheet` | Syncs podcast bookings to Google Sheets |

### Storage Buckets

| Bucket | Access | Purpose |
|--------|--------|---------|
| `marketing-assets` | Public | Marketing asset file uploads |

### Database Tables

The app uses 22 tables including: `user_profiles`, `team_members`, `departments`, `speakers`, `partners`, `podcast_bookings`, `marketing_assets`, `form_templates`, `form_fields`, `form_submissions`, `speaker_form_fields`, `speaker_form_versions`, `speaker_submissions`, `audit_logs`, `app_settings`, `cms_blocks`, and more.

See [docs/SETUP_USERS.md](docs/SETUP_USERS.md) for account setup details.

---

## Project Structure

```
tonysummit/
├── app/                    # Next.js App Router pages
│   ├── admin/              # Admin-only pages (dashboard, users, forms, settings, audit)
│   ├── member/             # Member dashboard
│   ├── book/               # Public podcast booking form
│   ├── speakers/apply/     # Public speaker application
│   ├── forms/[slug]/       # Dynamic public forms
│   ├── team/               # Team management
│   ├── departments/        # Department management
│   ├── podcast/            # Podcast booking management
│   ├── summit/             # Summit speakers & partners
│   ├── assets/             # Marketing asset management
│   └── login/              # Authentication
├── components/             # Reusable UI components
│   ├── DashboardShell.js   # Main layout + auth context
│   ├── Sidebar.js          # Role-filtered navigation
│   ├── AdminGuard.js       # Admin route protection
│   ├── Modal.js            # Reusable modal dialog
│   └── Toast.js            # Toast notifications
├── lib/                    # Utilities
│   ├── supabase.js         # Supabase client init
│   ├── rbac.js             # Role-based access helpers
│   ├── audit.js            # Audit logging
│   └── utils.js            # Date formatting, ID generation
├── public/                 # Static assets
├── docs/                   # Documentation
├── vercel.json             # Vercel deployment config
└── .env.example            # Environment variable template
```

---

## Security

- **Supabase RLS** — Row-level security on all tables
- **AdminGuard** — Server-side route protection for `/admin/*`
- **isAdmin()** — Client-side UI conditional rendering
- **Edge Function Auth** — Custom JWT validation for `create-user`
- **Security Headers** — Configured in `vercel.json` (X-Frame-Options, CSP, etc.)
- **Audit Trail** — All mutations logged with user, timestamp, and data diffs

---

## License

Private — © Tony Cho Brand. All rights reserved.
