# eFootball League Manager

Private double round-robin eFootball league for friends.
Next.js (App Router) + TypeScript + Tailwind + Supabase. Deployed on Vercel.

## Run locally

```bash
npm install
cp .env.example .env.local   # then fill in the Supabase values
npm run dev
```

Open http://localhost:3000. Check the database connection at http://localhost:3000/api/health.

## Database

In Supabase > SQL Editor run, in order:

1. `supabase/migrations/0001_initial_schema.sql`
2. `supabase/seed.sql`
3. `supabase/migrations/0002_auth_support.sql`

## Authentication setup (Phase 2)

Players register with a username, email and password, and log in with username + password.
Emails are stored only in Supabase Auth, never in the public `users` table.

1. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` (Supabase > Project Settings > API). Server only; never commit it.
2. In Supabase > Authentication > Sign In / Providers, turn OFF "Allow new users to sign up".
   The app creates accounts server-side, so this closes the direct sign-up route.
3. Register your own account at `/register`, then make yourself the first admin in the SQL Editor:

```sql
update users set role = 'ADMIN', status = 'APPROVED' where username_lower = 'your_username';
```

4. Log in. The Admin icon appears in the navbar, and `/admin/players` lists pending registrations.

## Checks

```bash
npm run typecheck
npm run lint
npm run build
```
