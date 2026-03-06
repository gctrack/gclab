# GCLab Development Log

## Project Overview
Golf croquet shot tracking and analytics web app.
Target platforms: Web, iPhone, Apple Watch.
Stack: Next.js 16 (Turbopack), TypeScript, Tailwind CSS v4, Supabase, Vercel.
Repo: https://github.com/gctrack/gclab

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

## Database Tables Built
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
- wcf_players — 11,417 players scraped from WCF rankings
- wcf_dgrade_history — dGrade snapshots per player per sync (foundation for historical reporting)
- sync_log — tracks WCF sync runs with status, counts, timestamps

## Indexes Created
- wcf_dgrade_history: player_id, recorded_at
- wcf_players: country, dgrade

## User Roles
- super_admin (Adam Barr — adamcbarr@gmail.com)
- admin
- club_manager
- user
- Role stored in profiles.role column
- admin_permissions stored as jsonb for granular admin access control

## Pages Built
- /login — email/password login with confirmation message support
- /signup — creates auth user, sends confirmation email, redirects to login
- /dashboard — shows user name, dGrade, links to Profile/Games/Clubs
- /profile — full profile editor with country dropdown+flag, grip buttons, contact fields with privacy toggles
- /admin — admin panel with WCF sync trigger, polling for completion, sync history log

## API Routes Built
- /api/wcf-sync — fetches WCF rankings, parses HTML, upserts all players and dGrade history, logs to sync_log, runs as background job and returns immediately
- /api/wcf-debug — debug route showing raw HTML from WCF (can be deleted later)

## WCF Sync Details
- Source URL: https://rank.worldcroquet.org/gcrankdg/rank_list.php?year=current&games=0&grade=1200&country=World&rank_order=dg&...
- Parses: world ranking, first name, last name, country, dGrade, games, wins, win%, last active year, profile URL
- Runs in batches of 50 to avoid timeouts
- Admin panel polls sync_log every 5 seconds for completion status
- 11,417 players currently in database
- dGrade history records every change detected between syncs

## Trigger
- handle_new_user() — auto-creates profile row on signup with first_name, last_name, email from auth metadata

## Key Design Decisions
- Games store dGrade snapshots at time of play for historical accuracy
- Verified games require both players to accept result
- WCF player records are separate from user profiles — linked via wcf_player_id
- Weekly sync planned via Vercel cron
- Privacy toggles control what contact info is visible to other signed-in members

## Next Steps (in order)
1. Deploy to Vercel
2. Set up weekly WCF sync cron job on Vercel
3. Build WCF player matching flow on signup (suggest WCF record to new users)
4. Build Rankings/Movers page — biggest dGrade changes over selectable time frames, all names linked to WCF profiles
5. Build game logging UI (simple score entry first)
6. Build clubs page
7. iPhone app
8. Apple Watch app

## Feature Ideas Captured
- dGrade movers leaderboard (biggest gains/losses over 30d/3m/6m/1y)
- Individual player dGrade history chart (archive that doesn't exist on WCF)
- Country trend analysis
- HealthKit integration for steps/distance during games
- YouTube game logging for championship match analysis
- Miss tendency tracking (left/right/high/low)
- Hoop importance analysis (hoop 9 significance)
- Performance scoring formula weighting shot difficulty
```
## Deployment
- Platform: Vercel
- Production URL: https://gclab-een9.vercel.app
- Auto-deploys from GitHub main branch on every push
- Do NOT use vercel --prod from terminal, just use git push
- Environment variables must be set in Vercel dashboard
- Vercel project: gctracks-projects/gclab

## Completed Steps
1. ✅ Deployed to Vercel - https://gclab-een9.vercel.app
2. ✅ Weekly WCF sync cron job - runs every Tuesday 3am UTC (vercel.json)
3. ⬜ WCF player matching flow on signup
4. ⬜ Rankings/Movers page
5. ⬜ Game logging UI
6. ⬜ Clubs page
7. ⬜ iPhone app
8. ⬜ Apple Watch app

## Important Notes for Next Session
- Always send one code block per response - never mix instructions and git commands in same block
- Full file replacements preferred over partial edits
- Terminal commands always in their own separate code block
- Deployment: just use git push - Vercel auto-deploys from GitHub
- Do NOT run vercel --prod from terminal

## Rankings Page - Completed 6 Mar 2026

### What Was Built
- app/rankings/page.tsx — 5 tab rankings page
  - Tab 1: Rankings — sortable by dGrade, Games, Win%. Active/All Time toggle. Pagination 50/100/200. Active Rank + All Time Rank columns. Country flags + full names.
  - Tab 2: Movers — gains and losses. Filtered by games > 0 to exclude inactive players. Shows change, dGrade, games, win%.
  - Tab 3: New Players — shows players first seen after Mar 3 2026. Country filter + date range.
  - Tab 4: Country Stats — sortable by clicking column headers. Row numbers. Compare mode (ready for Apr 2026 first snapshot). Full country names + flags.
  - Tab 5: Historical Rankings — search any player. Line chart with dGrade (green) and World Ranking (blue). Toggle each line. Date range: 1yr/5yr/all/custom. Grid lines and dual Y-axis.

### Database
- country_stats_snapshots table: snapshot_date, country, total_players, active_players, avg_top6_dgrade
- get_movers() function: compares first vs last history record, filters games > 0
- get_country_stats() function: fixed ambiguous column reference
- wcf_dgrade_history: baseline reset 6 Mar 2026 — all 11,680 players have clean baseline at current dGrade

### Known Issues / Revisit Later
- Movers data sparse until daily syncs accumulate real changes — check back in a few weeks
- Country Stats compare mode needs first snapshot (1 Apr 2026) before it becomes useful
- Historical chart only has 1-2 data points per player now — will improve over months
- New Players tab currently empty — will populate as new WCF players appear after Mar 3

### Data Rules
- Movers baseline: 6 Mar 2026 (all bad March 2 import data was deleted and replaced with current dGrade)
- New Players cutoff: 2026-03-03T00:00:00Z (hardcoded as NEW_PLAYERS_SINCE constant)
- Monthly snapshots: written on 1st of month for all players + country stats
- FIRST_SYNC_DATE constant: '2026-03-02'

### Manual Data Fixes Applied
These players had corrupted March 2 baseline records manually corrected:
Ed Paravicini 1499, David Fardon 1459, Josh Head 1631, Gary Hudson 1413,
Joe Zowry 1583, Adam Peck 1998, Margaret Hudson 1486, Bruce Hindin 1908, Rich Rose 1722

### Remaining Roadmap
- Game logging UI
- Clubs page  
- iPhone app
- Apple Watch app