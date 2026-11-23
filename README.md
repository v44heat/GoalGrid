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
4. `supabase/migrations/0003_seasons_teams.sql` (creates the `team-logos` storage bucket and the season-creation function)
5. `supabase/migrations/0004_fixtures.sql` (fixture generation function and participant lock)
6. `supabase/migrations/0005_results.sql` (record and delete result functions)
7. `supabase/migrations/0006_hardening.sql` (privacy for unapproved accounts, season status rules, protection for finished seasons)

## Season lifecycle, Hall of Fame and the dashboard (Phase 7)

- A season moves DRAFT, ACTIVE, COMPLETED, ARCHIVED. The admin buttons live on the season's admin page.
  The database enforces the order (and a completed season can be reopened if it was completed by mistake).
  Completing locks results and teams. Finished seasons can never be deleted.
- `/hall-of-fame` lists every completed season's champion, a titles table and all-time player records.
  A tie for first place awards no title: the season is shown as "shared first place".
- The home page is a live dashboard: current leader, standings, latest results, upcoming fixtures and
  top performers. Before any season has fixtures it shows the welcome page instead.
- Registration is paused automatically if 30 accounts are waiting for approval (a spam guard).

## Before you deploy

```bash
npm run predeploy      # verify + audit + typecheck + lint + build
```

`npm run audit` checks the security rules the project relies on (admin checks in every server action, the
service-role key kept on the server, row level security on every table, no secrets in the folder).
See `docs/DEPLOYMENT.md` for the full Supabase and Vercel steps.

## Results and standings (Phase 5)

- `/admin/results` records, corrects and deletes results. It works only while the season is active.
  A fixture can have at most one result (database `UNIQUE`), and recording one marks the fixture played.
  Deleting a result puts the fixture back to upcoming.
- Standings are never stored or edited. `/standings` recalculates from the results on every request, so a
  corrected or deleted result is reflected immediately. Win 3, draw 1, loss 0. Ranked by points, goal
  difference, then goals scored. Players level on all three share a position, shown with `=`.
- `/results` lists played matches, `/players` shows each player's stats and form, `/players/<id>` shows a
  profile with match history.
- `npm run verify:standings` checks the calculation against the spec examples and 200 random seasons (Node 22.6+).

## Statistics and shareable graphics (Phase 6)

- `/statistics` shows season totals and records (leader, top scorer, wins/draws/losses, goal difference, best
  defence, streaks, highest scoring match). Ties are listed, never hidden. All values are calculated from results.
- `/head-to-head` is an all-time record between two players across every season, with previous meetings.
- Images are drawn in the browser on a canvas, so they cost nothing to host and need no extra service:
  match card (on `/results` and in `/admin/results`), league table (`/standings`), fixture graphic for a matchday
  (`/fixtures`) and a season summary card (on a completed season's page). On phones a Share button sends the
  image straight to WhatsApp.
- The season summary appears once a season is completed (use "Complete season" on the season's admin page).
- `npm run verify` runs the fixture, standings, statistics and Hall of Fame checks together.

## Fixtures (Phase 4)

- On a draft season's admin page you get a preview of the generated fixtures. Nothing is saved until you click "Confirm and generate fixtures".
- Format: double round-robin (circle method). Every pairing is played twice with home and away reversed. With 2 to 14 players. For 6 players that is 30 matches over 10 matchdays, 3 per matchday.
- Dates: matchdays are spread from day 1 to day 28 (6 players: days 1, 4, 7 ... 28). Days 29 and 30 are a buffer for postponed games.
- Once fixtures exist the player list is locked (enforced by a database trigger). "Discard fixtures" unlocks it again while the season is a draft.
- "Start season" needs fixtures and a team for every player, and only one season can be active at a time.
- `/admin/fixtures` reschedules fixtures and changes their status (upcoming, postponed, cancelled). `/fixtures` is the public view.
- `npm run verify:fixtures` checks the generator for 2 to 14 players (Node 22.6+).

## Seasons and teams (Phase 3)

- Admin: `/admin/teams` manages clubs and logos; `/admin/seasons` creates seasons and manages participants.
- A season always lasts 30 days: the end date is the start date + 29 days and is calculated on the server.
- Players pick a team on `/seasons/<id>` while the season is a draft. Each team can be used by one player per season.
- After that, only an admin can change a team (Participants list on the season's admin page).

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
