# GCLab Development Log

## Project Overview
Golf croquet shot tracking and analytics web app.
Target platforms: Web, iPhone, Apple Watch.
Stack: Next.js 16 (Turbopack), TypeScript, Tailwind CSS v4, Supabase, Vercel.
Repo: https://github.com/gctrack/gclab
Production: https://gclab.app

## Development Machines
- MacBook and Mac Studio both configured
- Both have Node.js, Homebrew, GitHub CLI, Cursor IDE
- Workflow: git pull before work, git push after
- .env.local is NOT in git — must be recreated on each machine if missing

## .env.local Required Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=gclab_wcf_sync_secret_2026
NEXT_PUBLIC_CRON_SECRET=gclab_wcf_sync_secret_2026
```

## Supabase Project
- Project name: gclab
- Free tier
- Auth: email/password, email confirmation enabled
- RLS: currently disabled on profiles table

## Database Tables
- profiles — user accounts with name, email, country, city, dgrade, mallet, grips, grip_notes, bio, wcf_profile_url, contact fields, privacy toggles, role
- dgrade_history — timestamped dGrade changes for registered users
- clubs — club directory
- club_equipment — hoop/ball types, court surface
- user_club_memberships — user-club relationships
- opponents — user's opponent list
- matches — best-of-3/5 match containers
- games — individual game records
- hoops — hoop-by-hoop scoring
- game_invitations — accept/reject flow
- potential_game_matches — fuzzy name matching
- shot_sessions — watch/phone shot logging
- shots — individual shot records
- feature_flags — tier-based feature gating
- wcf_players — 11,420 players scraped from WCF rankings (columns: id, wcf_first_name, wcf_last_name, country, dgrade, egrade, world_ranking, games, win_percentage, last_active_year, wcf_profile_url, history_imported, wcf_player_code)
- wcf_dgrade_history — dGrade snapshots per player per sync (columns: id, wcf_player_id, dgrade_value, egrade_value, world_ranking, recorded_at, is_imported, event_name, event_url, event_date)
- wcf_player_games — game-level data imported from WCF (columns: id, wcf_player_id, year, game_number, event_number, event_name, event_url, event_date, result, score, player_score, opponent_score, opponent_first_name, opponent_last_name, opponent_wcf_url, dgrade_after, egrade_after, opp_dgrade_after, opp_egrade_after, round_detail, is_imported, created_at)
- country_stats_snapshots — monthly country stat snapshots
- sync_log — tracks WCF sync runs with status, counts, timestamps, notes

## Indexes Created
- wcf_dgrade_history: player_id, recorded_at
- wcf_players: country, dgrade
- wcf_player_games: player_id, event_date

## User Roles
- super_admin (Adam Barr — adamcbarr@gmail.com, user ID: 6a22078c-7f21-4cee-8d3d-d80364ca222a)
- admin
- club_manager
- user
- Role stored in profiles.role column

## Key User Info
- Real user ID: 6a22078c-7f21-4cee-8d3d-d80364ca222a
- WCF player ID: 67d1eadf-1eee-4668-b303-3dc6fb019807

## Pages Built
- / (homepage) — Midnight Lawn theme, hero with animated beaker + stat cards, grade history chart preview, features grid, coming soon grid, CTA section
- /login — email/password login
- /signup — creates auth user, sends confirmation email
- /dashboard — welcome screen with nav cards, WCF match banner. Auth gate for signed-out users
- /profile — full profile editor, WCF history import panel with SSE progress stream. Auth gate for signed-out users
- /compare — head-to-head player comparison with grade chart. Auth gate for signed-out users
- /admin — WCF sync trigger + history, super admin player history import tool
- /rankings — 5-tab rankings page (see below)
- /profile/[id] — admin view of any user's profile

## Components
- WcfMatchBanner — suggests WCF record match on profile/dashboard
- GCLabNav — sticky nav with:
  - Desktop tab bar: Dashboard, My Profile, Rankings, Compare, Historical (locked tabs show padlock + redirect to /login for signed-out users, active tab highlighted)
  - Hamburger menu (mobile): Dashboard, My Profile, Rankings, Compare, Historical Rankings (My Games + Clubs hidden until built)
  - Admin Panel link for admins/super_admins
  - Sign out button
  - Accepts `role`, `isSignedIn`, `currentPath` props

## API Routes
- /api/wcf-sync — daily WCF rankings sync, writes players + dgrade history + egrade, smart game fetch on dgrade change
- /api/wcf-history-import — SSE streaming full career import for a single player
- /api/wcf-history-batch — batch importer, 8 players/run, ordered by world_ranking

## GitHub Actions
- .github/workflows/wcf-history-batch.yml — runs hourly at :15 past, calls /api/wcf-history-batch
- .github/workflows/wcf-sync.yml — daily WCF rankings sync
- Secret required: CRON_SECRET = gclab_wcf_sync_secret_2026

## WCF Sync Details
- Rankings URL: https://rank.worldcroquet.org/gcrankdg/rank_list.php?year=current&games=0&grade=1200&country=World&rank_order=dg
- eGrade URL: https://rank.worldcroquet.org/gcrankdg/rank_list.php?year=current&games=0&grade=1200&country=World&rank_order=eg
- Parses: world ranking, first/last name, country, dGrade, eGrade, games, wins, win%, last active year, profile URL
- Smart sync: if dgrade changed AND history_imported=true, fetches current year page and writes new games to wcf_player_games
- Monthly snapshots written on 1st of each month

## WCF History Import
- Single player: POST /api/wcf-history-import with { wcf_player_id }, streams SSE progress
- Batch: GET /api/wcf-history-batch (cron auth), processes 8 players/hour, 45s between players
- ~192 players/day, ~60 days to import all 11,420 players
- Imports: all years, all games, opponents, scores, dgrade/egrade after each game
- Writes to wcf_player_games (all games) and wcf_dgrade_history (end-of-event snapshots)
- Sets history_imported=true on wcf_players when complete
- Re-import allowed (clears and rewrites)

## Rankings Page — app/rankings/page.tsx
### Tabs
1. **Rankings** — sortable by dGrade/eGrade/Games/Win%/Name. Active/All Time toggle. Pagination 50/100/200. Active + All Time rank columns. Country flags. CSV download. Shows last WCF sync timestamp below player count.
2. **Movers** — biggest dGrade gains and losses since Mar 6 baseline. Filters players with games > 0.
3. **New Players** — players first seen after Mar 3 2026. Country filter + date range.
4. **Country Stats** — sortable table. Top 6 Active Avg + Top 6 All Time Avg columns. Click avg to see tooltip with player list. Compare mode (first snapshot Apr 2026). CSV download.
5. **Historical Rankings** — auth gate (blurred chart + CTA) for signed-out users. For signed-in: autocomplete player search, Show My History button, line chart with year x-axis, hover tooltips, dGrade/eGrade/World Rank toggles, grade diff arrows in table, events + latest sync in table.

### Chart Details
- dGrade: green line
- eGrade: amber dashed line, only appears where data exists
- World Rank: blue line, only shown from first date rank data exists per player (dynamic label)
- Imported points: slightly smaller/darker than GCLab-tracked points
- Hover tooltip: date + event name + all grade values
- X-axis: year tick marks based on actual dates
- Daily sync deduplication: keeps point if dgrade OR world_ranking changed

### Database Functions
- get_movers(since_date, limit_count) — compares first vs last history record
- get_country_stats(active_year) — returns top6 active + alltime per country with player lists

## Homepage Design — Midnight Lawn Theme
- Background: deep forest green (#0d2818)
- Text: cream/ivory (#e8e0d0)
- Accent: lime green (#4ade80)
- Fonts: Playfair Display (headlines), DM Sans (body), DM Mono (numbers)
- Subtle grid overlay + radial green glow
- Hero beaker: conical flask SVG, 3 balls in triangle formation (red bottom-left, blue bottom-right, yellow top-centre), independent float animations (f1/f2/f3 keyframes), tick marks on right wall
- Nav logo: same flask at small scale
- Sections: Nav → Hero (beaker + stat cards) → Grade History Chart Preview → Features grid (3×2, free/account split) → Coming Soon (6 cards) → CTA → Footer

## Coming Soon Features Listed on Homepage
- Performance Grading (shot-by-shot metrics)
- Apple Watch App
- Training Guides
- Deep Game Insights (Huneycutt Gambit effectiveness, hoop 2 analysis, etc.)
- Club Pages
- AI Match Insights

## Auth Gate Pattern
Pages that require login (dashboard, profile, compare, historical tab) show a blurred skeleton preview with a centred overlay instead of hard-redirecting to /login. Pattern:
- `signedIn` state (boolean | null), initially null
- On auth check: if no user → setSignedIn(false), setLoading(false), return
- If user confirmed → setSignedIn(true), continue loading data
- Render: loading/null → spinner; !signedIn → gate UI; signedIn → normal page
- Gate UI: blurred skeleton (coloured tints per page) + white/blur overlay + icon + title + description + "Create free account" + "Sign in" buttons
- Dashboard skeleton: coloured nav cards (green/blue/purple/amber)
- Profile skeleton: avatar circle + coloured stat cards (grade, rank, win%, games)
- Compare skeleton: two overlapping grade lines (green solid + blue dashed)
- Historical skeleton: blurred chart + row skeletons (inline in rankings page)

## Data Rules
- Movers baseline: 6 Mar 2026
- New Players cutoff: 2026-03-03T00:00:00Z (NEW_PLAYERS_SINCE constant)
- FIRST_SYNC_DATE constant: '2026-03-02'
- World rank on chart: nulled out for records before 2026-03-01
- Monthly snapshots: written on 1st of month
- World Rank label: "World Rank Collected Since March 2026"
- Historical range default: 'all'

## Manual Data Fixes Applied
These players had corrupted March 2 baseline records manually corrected:
Ed Paravicini 1499, David Fardon 1459, Josh Head 1631, Gary Hudson 1413,
Joe Zowry 1583, Adam Peck 1998, Margaret Hudson 1486, Bruce Hindin 1908, Rich Rose 1722

## Deployment
- Platform: Vercel
- Production URL: https://gclab.app (also gclab-een9.vercel.app)
- Auto-deploys from GitHub main branch on every push
- Do NOT use vercel --prod from terminal, just use git push
- Environment variables set in Vercel dashboard
- zsh: quote bracket paths — use "app/profile/[id]/page.tsx" not app/profile/[id]/page.tsx

## File → Repo Path Mapping
| Output file | Repo path |
|---|---|
| page.tsx | app/page.tsx |
| GCLabNav.tsx | components/GCLabNav.tsx |
| rankings-page.tsx | app/rankings/page.tsx |
| compare-page.tsx | app/compare/page.tsx |
| dashboard-page.tsx | app/dashboard/page.tsx |
| admin-page.tsx | app/admin/page.tsx |
| profile-page.tsx | app/profile/page.tsx |
| profile-view-page.tsx | app/profile/[id]/page.tsx |
| route.ts | app/api/wcf-sync/route.ts |
| wcf-history-import-route.ts | app/api/wcf-history-import/route.ts |
| wcf-history-next-route.ts | app/api/wcf-history-next/route.ts |
| admin-users-route.ts | app/api/admin/users/route.ts |
| admin-user-id-route.ts | app/api/admin/users/[id]/route.ts |
| admin-reset-password-route.ts | app/api/admin/users/[id]/reset-password/route.ts |
| wcf-history-batch.yml | .github/workflows/wcf-history-batch.yml |

## Important Notes for Next Session
- Always send one terminal command per code block
- Full file replacements preferred over partial edits
- Present download links for files, then git command separately — no cp command needed
- Deployment: just use git push — Vercel auto-deploys from GitHub
- Do NOT run vercel --prod from terminal
- Next.js 15/16: params must be Promise<{id: string}> and awaited in dynamic routes
- Supabase import: always use '@/lib/supabase' (not '@/utils/supabase/client')

## Remaining Roadmap
- ⬜ Profile dashboard — career stats (starting grade, peak, total games, win%, years active)
- ⬜ Success Metrics page — WCF career stats from wcf_player_games
- ⬜ Public rankings — rankings tab already public, confirm other tabs
- ⬜ Regrade detection — flag when dgrade changes but game count unchanged
- ⬜ Batch import progress visible in admin panel
- ⬜ Apply Midnight Lawn brand to all inner pages (rankings, compare, dashboard, admin, profile)
- ⬜ Game logging UI
- ⬜ Clubs page
- ⬜ iPhone app
- ⬜ Apple Watch app
- ⬜ Chart zoom feature
- ⬜ Re-import previously imported players with fixed loss-row regex


Updated Mar 11 - leaving original in case there are important details.
# GCLab Development Log

## Project Overview
Golf croquet analytics web app. Target platforms: Web, iPhone, Apple Watch.
Stack: Next.js 16 (Turbopack), TypeScript, Tailwind CSS v4, Supabase, Vercel.
Repo: https://github.com/gctrack/gclab
Production: https://gclab.app
Supabase project: oswjsxtbbekrciqbivdy

## Development Machines
- MacBook and Mac Studio both configured
- Both have Node.js, Homebrew, GitHub CLI, Cursor IDE
- Workflow: git pull before work, git push after
- .env.local is NOT in git — must be recreated on each machine if missing

## .env.local Required Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=gclab_wcf_sync_secret_2026
NEXT_PUBLIC_CRON_SECRET=gclab_wcf_sync_secret_2026
```

## Key User Info
- Real user ID: 6a22078c-7f21-4cee-8d3d-d80364ca222a
- Email: adamcbarr@gmail.com — Role: super_admin
- WCF player ID: 67d1eadf-1eee-4668-b303-3dc6fb019807

## File Deployment Map
```
login-page.tsx              → app/login/page.tsx
page.tsx                    → app/page.tsx
dashboard-page.tsx          → app/dashboard/page.tsx
profile-page.tsx            → app/profile/page.tsx
profile-view-page.tsx       → app/profile/[id]/page.tsx
rankings-page.tsx           → app/rankings/page.tsx
compare-page.tsx            → app/compare/page.tsx
leaderboards-page.tsx       → app/leaderboards/page.tsx
history-page.tsx            → app/history/page.tsx
community-page.tsx          → app/community/page.tsx
admin-page.tsx              → app/admin/page.tsx
GCLabNav.tsx                → components/GCLabNav.tsx
route.ts                    → app/api/wcf-sync/route.ts
wcf-history-import-route.ts → app/api/wcf-history-import/route.ts
wcf-history-next-route.ts   → app/api/wcf-history-next/route.ts
wcf-history-batch.yml       → .github/workflows/wcf-history-batch.yml
admin-users-route.ts        → app/api/admin/users/route.ts
admin-user-id-route.ts      → app/api/admin/users/[id]/route.ts
admin-reset-password-route.ts → app/api/admin/users/[id]/reset-password/route.ts
```

## Architecture Notes
- Supabase client import: `@/lib/supabase` throughout
- Next.js 15/16: params must be `Promise<{id: string}>` and awaited in dynamic routes
- zsh: quote bracket paths — "app/profile/[id]/page.tsx"
- 'use client' must be ABSOLUTE FIRST LINE — no comments above it
- World rank only meaningful from March 2026 — imported history has null world_ranking
- Daily sync writes world_ranking to wcf_dgrade_history on dgrade, egrade, OR world_ranking change
- Sync pre-snap: written 1 second before event record, event_name=null (renders as "Grade change")

## Navigation Structure (live)
1. Dashboard — /dashboard
2. My Profile — /profile
3. WCF Rankings — /rankings (tabs: Rankings, Movers, Country Rankings)
4. Stats & Leaderboards — /leaderboards
5. Compare — /compare
6. Player History — /history
7. Community — /community (members only)
8. Admin — /admin (super_admin only)

## Database Tables (key ones)
- wcf_players — 11,450 players. Fields: id, wcf_first_name, wcf_last_name, country, dgrade, egrade, world_ranking, games (WCF rolling ~12mo), win_percentage (WCF rolling ~12mo), history_imported
- wcf_player_games — imported game records. Fields: id, wcf_player_id, event_date, event_name, result, dgrade_after, opp_dgrade_after, opponent_first_name, opponent_last_name, player_score, opponent_score, is_imported
- wcf_dgrade_history — grade history snapshots. Fields: id, wcf_player_id, recorded_at, dgrade_value, egrade_value, world_ranking, event_name, is_imported
- wcf_player_country_stats — aggregated stats per player per country
- profiles — GCLab user accounts. Fields: id, first_name, last_name, wcf_player_id, role
- sync_log — daily sync audit log
- forum_threads — community board threads (PENDING SQL — see below)
- forum_posts — community board posts (PENDING SQL — see below)

## Supabase RPC Functions (all live)
- get_players_by_country() — total ranked players by country
- get_active_players_by_country() — players with games in last 12 months
- get_most_games_player() — top 1 by imported game count
- get_most_unique_opponents() — top 1 by distinct opponents
- get_most_travelled() — top 1 by distinct countries
- get_biggest_career_rise() — top 1 by max-min dgrade_value
- get_biggest_upset_win() — top 1 by grade gap, includes opponent_country via join
- get_best_win_rate() — top 1 by wcf win_percentage where imported games >= 100
- get_top10_most_games() — top 10 by imported game count
- get_top10_win_rate() — top 10 by win rate
- get_top10_most_travelled() — top 10 by countries
- get_top10_most_opponents() — top 10 by unique opponents
- get_top10_career_rise() — top 10 by career grade rise
- get_top10_upset_wins() — top 10 by upset gap

## Import System
- GitHub Actions: .github/workflows/wcf-history-batch.yml
- Runs at :05 and :35 each hour (2x/hour)
- 16 players/run, 30s between players = ~32 players/hour
- 200+ players fully imported as of session 15

## Pending SQL (run in Supabase SQL Editor)

### Forum tables for Community page:
```sql
CREATE TABLE forum_threads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  post_count int DEFAULT 0,
  last_post_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
CREATE TABLE forum_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id uuid REFERENCES forum_threads(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

### Jodie Rugart bad records (still pending):
```sql
DELETE FROM wcf_dgrade_history WHERE id IN (
  '310f915a-e574-471b-9107-67bd52bcdf43',
  '7af02a8d-7efe-48ec-af5c-98c46111ae01',
  'c7a5762b-fd52-4fdb-baed-4138dd6dd686'
);
```

## What's Live on gclab.app
- New nav with all 7 tabs
- Login page redesign (SVG logo, dark green)
- WCF Rankings (restructured, Country Rankings tab)
- Stats & Leaderboards (scorecards via RPCs, country tables, new players)
- Player History (grade chart, player search)
- Community (members-only board, needs forum SQL tables to work)
- Compare (streak fix, flat colors, country matching)
- Import running 4x faster

## What Needs Finishing (start of next session)

### 1. Leaderboards top-10 tables
RPCs are live (get_top10_*). Need to add tables below the scorecards on the Records tab.
Each metric gets a table showing rank, flag, name, country, value.
Upset wins table also shows opponent name+flag.

### 2. Leaderboard scorecard copy fixes
- Most Games Played: sublabel → "Career total games". Remove "imported games" from detail line.
- Most Travelled: remove "imported players" from sublabel.
- Biggest Upset: remove grade display from above names. Show winner flag+name+dgrade, then "beat", then opponent flag+name+dgrade.

### 3. Win Rate
Currently uses wcf_players.win_percentage (WCF rolling ~12 month figure).
Best approach for career rate = count wins/total from wcf_player_games.
Blocked by data artifact: some players with partial imports show 100%.
Fix: require minimum 5 losses in imported data (already in get_best_win_rate RPC as HAVING losses >= 5... verify this is live).

### 4. Other pending items
- Re-import Jana Saeed and Rania Gabr (is_imported was false, pre-fix)
- Store opponent_country on game record at import time
- Jodie Rugart DB cleanup (SQL above)
- Profile career stats view
- Game logging UI (shots, hoops, results) — core future feature
- iPhone app, Apple Watch app

## Key Design Decisions / Conventions
- Dark green: #0d2818, Accent green: #4ade80, Cream: #f5f0e8
- Fonts: Playfair Display (headers), DM Sans (body), DM Mono (numbers/grades)
- All pages use GCLabNav component with role + isSignedIn + currentPath props
- Game sort order: event_date ASC → event_name ASC (alphabetical). Critical for streak accuracy.
  "World Championship Block Stage" < "World Championship Consolation" = correct order.
- wcf_players.games and win_percentage = WCF rolling ~12 month figures, NOT career totals
- Career game count = COUNT(*) from wcf_player_games for that player
- Supabase anon role sees all wcf_player_games (RLS allows public read)
