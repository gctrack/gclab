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
- /login — email/password login
- /signup — creates auth user, sends confirmation email
- /dashboard — welcome screen with nav cards, WCF match banner
- /profile — full profile editor, WCF history import panel with SSE progress stream
- /admin — WCF sync trigger + history, super admin player history import tool
- /rankings — 5-tab rankings page (see below)

## Components
- WcfMatchBanner — suggests WCF record match on profile/dashboard
- GCLabNav — hamburger nav used on all pages, animates to X, dropdown with all sections + admin link for admins + sign out

## API Routes
- /api/wcf-sync — daily WCF rankings sync, writes players + dgrade history + egrade, smart game fetch on dgrade change
- /api/wcf-history-import — SSE streaming full career import for a single player
- /api/wcf-history-batch — batch importer, 8 players/run, ordered by world_ranking

## GitHub Actions
- .github/workflows/wcf-history-batch.yml — runs hourly at :15 past, calls /api/wcf-history-batch
- .github/workflows/wcf-sync.yml — daily WCF rankings sync (if exists)
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
1. **Rankings** — sortable by dGrade/eGrade/Games/Win%/Name. Active/All Time toggle. Pagination 50/100/200. Active + All Time rank columns. Country flags. CSV download.
2. **Movers** — biggest dGrade gains and losses since Mar 6 baseline. Filters players with games > 0.
3. **New Players** — players first seen after Mar 3 2026. Country filter + date range.
4. **Country Stats** — sortable table. Top 6 Active Avg + Top 6 All Time Avg columns. Click avg to see tooltip with player list. Compare mode (first snapshot Apr 2026). CSV download.
5. **Historical Rankings** — autocomplete player search, Show My History button, line chart with year x-axis, hover tooltips, dGrade/eGrade/World Rank toggles, grade diff arrows in table (↑/↓ green/red), events + latest sync only in table.

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

## Data Rules
- Movers baseline: 6 Mar 2026
- New Players cutoff: 2026-03-03T00:00:00Z (NEW_PLAYERS_SINCE constant)
- FIRST_SYNC_DATE constant: '2026-03-02'
- World rank on chart: nulled out for records before 2026-03-01
- Monthly snapshots: written on 1st of month

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

## Important Notes for Next Session
- Always send one terminal command per code block
- Full file replacements preferred over partial edits
- Present download links for files, then git command separately — no cp command needed
- Deployment: just use git push — Vercel auto-deploys from GitHub
- Do NOT run vercel --prod from terminal

## Remaining Roadmap
- ⬜ Profile dashboard — career stats (starting grade, peak, total games, win%, years active)
- ⬜ Public rankings — remove auth gate
- ⬜ Success Metrics page — WCF career stats from wcf_player_games
- ⬜ Regrade detection — flag when dgrade changes but game count unchanged
- ⬜ Batch import progress visible in admin panel
- ⬜ Game logging UI
- ⬜ Clubs page
- ⬜ iPhone app
- ⬜ Apple Watch app