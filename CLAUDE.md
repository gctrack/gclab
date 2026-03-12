# GCLab — Claude Code Instructions

## Project Overview
Golf croquet analytics web app. Players link their WCF (World Croquet Federation) profile to track career grade history, win rates, best wins, and leaderboards.

**Repo:** https://github.com/gctrack/gclab  
**Production:** https://gclab.app  
**Supabase project ID:** oswjsxtbbekrciqbivdy

---

## Strategic Direction

Two products, one codebase, one Vercel project, one database:

**gcrankings.com** — Free public rankings resource for the GC community. WCF rankings, leaderboards, player search, grade history, country stats. No login required. Opt-in account creation unlocks the personal dashboard.

**gclab.app** — Personal performance tool. Same account, same dashboard. Adds game logging (including Apple Watch tap input), personal trend analysis, and deeper analytics.

**Current phase:** Finish and polish GCLab before splitting. Apply consistent design across all pages, work through the cleanup list, then introduce gcrankings.com as a second entry point to the same codebase. Do NOT split the codebase or database — two Vercel custom domains, one Next.js project.

**One account** works across both domains. A user who signs up on gcrankings.com gets the same dashboard as gclab.app.

---

## Stack
- Next.js 16, TypeScript, Tailwind v4
- Supabase (Postgres + Auth)
- Vercel (auto-deploys on `git push` — never run `vercel deploy`)
- Fonts: Playfair Display, DM Sans, DM Mono (via Google Fonts)

---

## Key Conventions

- `'use client'` must be the absolute first line of every client component
- Use `@/lib/supabase` for all Supabase client imports
- Never fetch the full `wcf_players` table — 11,450 rows, always use targeted queries
- Scotland = `GB-SCT`, England = `GB-ENG` (not `GB`)
- `wcf_players.win_percentage` = WCF rolling ~12 month figure, NOT career
- `wcf_dgrade_history` first record per player has `event_name = 'Starting Grade'`
- Do NOT reset `history_imported` on `wcf_players` during sync — triggers duplicate re-imports
- Always use `upsert` with `ignoreDuplicates: true` for history writes to handle concurrent syncs

---

## Code Delivery Preferences

- Always deliver **complete files** — never partial snippets or diffs shown to the user
- Internal `str_replace` edits are fine, but always present the full final file for deployment
- Always provide a `mkdir -p` terminal command before any file that requires a new directory
- Always provide the git commit command in a **separate message** after delivering files:
  `git add [files] && git commit -m "message" && git push`

---

## Design System (Midnight Lawn Brand)

### Fonts (apply via className)
- `.ghl` — Playfair Display (headings)
- `.gsans` — DM Sans (body, labels, buttons)
- `.gmono` — DM Mono (numbers, grades, stats)

Load via `ML` style block at top of each page:
```
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
```

### Colours
| Token | Value |
|-------|-------|
| Page background | `#f0ece4` |
| Dark hero bg | `#0d2818` |
| Lime accent | `#4ade80` |
| Card background | `white` |
| Card border | `1.5px solid #ede9e2` |
| Row dividers | `1px solid #f3f0eb` |
| Muted text | `#9ca3af` |
| Body text | `#374151` |
| Win green | `#16a34a` |
| Loss red | `#dc2626` |
| Amber/warning | `#d97706` |
| Admin purple | `#7c3aed` |

### Card Style (Option D — cream, no colour bar)
```tsx
background: 'white', border: '1.5px solid #ede9e2', borderRadius: 12
```

### Row hover
Class `adm-row` or `dash-row` in ML style block:
```css
.dash-row:hover { background: rgba(13,40,24,0.03) !important; }
```

---

## Database Tables (key ones)

| Table | Purpose |
|-------|---------|
| `wcf_players` | All WCF-ranked players. Key cols: `id, wcf_first_name, wcf_last_name, dgrade, egrade, world_ranking, country, history_imported, linked_user_id` |
| `wcf_player_games` | Per-game records. Key cols: `wcf_player_id, year, game_number, result, dgrade_after, opp_dgrade_after, event_name, event_date, is_imported` |
| `wcf_dgrade_history` | Grade history per player. `event_name = null` renders as "Last synced". `event_name = 'Starting Grade'` is first record |
| `profiles` | Auth users. Key cols: `id, role, wcf_player_id, dgrade, first_name, last_name` |
| `sync_log` | One row per sync run: `status, started_at, completed_at, total, created, updated, error` |
| `sync_change_log` | Per-player change events from sync. `event_type`: grade_change / new_games / new_player / error. Purged after 7 days |
| `country_stats_snapshots` | Monthly country-level snapshots |

---

## File Structure (key paths)

```
app/
  page.tsx                  — Homepage (public)
  dashboard/page.tsx        — Logged-in user dashboard
  admin/page.tsx            — Admin panel (role-gated)
  api/
    sync/route.ts           — Daily WCF sync cron
    wcf-history/route.ts    — Batch history importer (4x/hour via GitHub Actions)
components/
  GCLabNav.tsx              — Main nav (props: role, isSignedIn, currentPath)
  admin/
    SyncActivityLog.tsx     — Standalone sync log component (also embedded in admin page)
lib/
  supabase.ts               — Supabase client
  countries.ts              — getFlag(), countryName() helpers
```

---

## Roles & Auth

- Roles: `user`, `admin`, `super_admin` (stored in `profiles.role`)
- Admin panel at `/admin` — role-gated, redirect if not admin/super_admin
- Vercel cron auth: `Authorization: Bearer ${CRON_SECRET}` or `x-vercel-cron: 1` header

---

## Sync Architecture

- **Daily sync** (`app/api/sync/route.ts`): Fetches WCF rank list, updates `wcf_players`, detects grade changes, fetches new games for history-imported players, writes to `wcf_dgrade_history` and `sync_change_log`
- **Batch importer** (`.github/workflows/wcf-history-batch.yml`): Cron `5,20,35,50 * * * *`, imports full career history for players where `history_imported = false`. ~64 players/hour
- **Monthly snapshots**: On 1st of month, sync writes full snapshot to `wcf_dgrade_history` for all players and updates `country_stats_snapshots`

---

## Pending Work

### Phase 1 — Polish & Cleanup (current focus)
- Apply Midnight Lawn design (cream header, Option D cards) to: Compare, Profile, Rankings, Leaderboards pages
- Work through user's list of page-level tweaks (user will paste each page)
- Mobile viewing audit across all pages
- Footer contact link: admin@gclab.app (once email is set up)

### Phase 2 — Feature Completion
- Message board categories: Equipment For Sale, Event Notices, General Discussion, Tactical Talk, Rules Discussion
- Admin: delete posts on message board
- Community Manager role — assignable by admin
- Profile career stats view
- Batch import progress visible in admin panel

### Phase 3 — GCLab Core (personal performance)
- Game logging UI (manual entry)
- Apple Watch app for tap-to-log shots during play
- Personal trend analysis and performance insights

### Phase 4 — gcrankings.com Split
- Add gcrankings.com as second Vercel custom domain
- Build gcrankings-specific homepage and nav (rankings-first, no login prompt)
- Context-aware nav branding based on domain
- Seamless cross-domain sign-in handoff

### Data Fixes (background)
- Jodie Rugart bad DB records cleanup
- Re-import Jana Saeed and Rania Gabr (is_imported was false pre-fix)
- Re-import players with missing loss records (loss-row regex fix)
