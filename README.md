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

## Checks

```bash
npm run typecheck
npm run lint
npm run build
```
