# Deployment: Supabase + Vercel

Everything here runs on free tiers for a small private league.

## 1. Supabase

1. Create a Supabase account and a new project. Choose the free plan and a strong database password
   (save it in a password manager). Pick the region closest to your players.
2. Open **SQL Editor** and run these files, in this order, one at a time:
   1. `supabase/migrations/0001_initial_schema.sql`
   2. `supabase/seed.sql` (starter clubs)
   3. `supabase/migrations/0002_auth_support.sql`
   4. `supabase/migrations/0003_seasons_teams.sql`
   5. `supabase/migrations/0004_fixtures.sql`
   6. `supabase/migrations/0005_results.sql`
   7. `supabase/migrations/0006_hardening.sql`
   8. `supabase/migrations/0007_phase8.sql`
   9. `supabase/migrations/0008_account_deletion.sql`

   Each should finish with "Success". If one errors, stop and fix it before running the next.
3. **Authentication > Sign In / Providers**: turn **off** "Allow new users to sign up". The app creates
   accounts itself on the server (so an admin can approve them); this closes the direct route.
4. **Project Settings > API**: copy the **Project URL**, the **anon (public)** key and the **service_role** key.
   If your dashboard shows the newer "publishable" and "secret" keys instead, the publishable key plays the
   anon role and the secret key plays the service_role role. Check Supabase's current docs if unsure.

## 2. Environment variables

Copy `.env.example` to `.env.local` and fill it in:

| Name | Where it is used | Secret? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | no |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server | no (safe by design, protected by row level security) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | **YES. Never put `NEXT_PUBLIC_` in front of it, never commit it** |

The service-role key is required: registration, login and team selection use it on the server after
checking who is asking. Without it those features fail.

Run `npm run predeploy` locally. It runs the logic checks, the security audit, the type check, lint and a
production build. Fix anything it reports before deploying.

## 3. Your first admin

1. `npm run dev`, open `/register` and create your own account.
2. In the Supabase SQL Editor run:
   ```sql
   update users set role = 'ADMIN', status = 'APPROVED' where username_lower = 'your_username';
   ```
3. Log in. The Admin shield appears in the navbar.

## 4. GitHub and Vercel

1. Push the project to GitHub (`.env.local` is git-ignored; confirm it is not in the repo).
2. In Vercel choose **Add New Project**, import the repository, and let it detect Next.js.
3. Under **Environment Variables** add **all three** variables from the table above, for Production and
   Preview. (Your original plan listed only the first two. The third is needed too, as a server-only secret.)
4. Deploy. The Hobby tier is fine for a personal, non-commercial project.
5. Set the Vercel Functions region (Project Settings > Functions) near your Supabase region to keep pages quick.

## 5. After the first deploy: test on the live site

- Register a second account. Logging in before approval should be refused with a clear message.
- Approve it, then log in as that player.
- As the player, open `/admin`. You should be sent away.
- Logged out, open `/admin`. You should be sent to the login page.
- As admin: create a season, add players, generate fixtures, assign teams, start the season.
- As a player: pick a team on the season page. Another player should see it locked.
- Record results, then check `/standings`, `/results`, `/statistics` and a player profile.
- Download a match card, the table and a fixtures graphic; try Share on a phone.
- Complete the season and check `/hall-of-fame`.
- Check the main pages on a phone-sized screen.
- Install it: on Android use the footer button, on iPhone Safari use Share then Add to Home Screen. Turn on airplane
  mode and open the app: you should see the offline screen.
- As a player, open `/account`, add a profile picture, and report a score for one of your matches.
- As admin, open `/admin/approvals`: approve it (try changing the numbers once), then open `/admin/audit` and
  confirm both the approval and the adjustment are listed.
- Change a password on `/account`, then check that the other device was signed out.
- Try to open `/account` while logged out: you should be sent to the login page.
- **Account deletion (test with throwaway accounts, never a real player):**
  1. Register `tester1`, approve it, and delete it from `/account` before it joins any season. In Supabase,
     Authentication > Users should no longer list it, and the `users` table should have no row for it.
  2. Register `tester2`, add it to a season, generate fixtures, record a result for one of its matches, then
     delete it. Its matches should now show "Deleted player xxxxxx" on `/results` and `/standings`; the table totals
     must be unchanged; the email must be gone from Authentication > Users; the old username should be free to
     register again; `/admin/audit` should show an entry with no name in it; and the Players page should not list it.
  3. Try to delete your only admin account: it must be refused with a clear message.
  4. Enter a wrong password, then a wrong confirmation word: both must be refused and nothing deleted.

## 6. Good to know

- Free Supabase projects can be paused after a period without activity. Unpause from the dashboard.
- Free plans may not include downloadable backups. Export your tables from the Table Editor now and then,
  especially at the end of a season.
- There is no login rate limiting beyond what Supabase Auth provides, and no Content-Security-Policy
  (a wrong one breaks Next.js). Baseline security headers are set in `next.config.mjs`.
- New registrations pause automatically if 30 accounts are waiting for approval.
- Rotate the service-role key in Supabase (and in Vercel) if it is ever exposed.
