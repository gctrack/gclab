-- ─────────────────────────────────────────────────────────────────────────────
-- Analytics events table
-- Lightweight feature-level event tracking.
-- Page views are handled by Vercel Analytics automatically.
-- Run this in the Supabase SQL editor.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.analytics_events (
  id          uuid    default uuid_generate_v4() primary key,
  event_name  text    not null,            -- e.g. 'compare_run', 'thread_created'
  page        text,                        -- pathname at time of event
  user_id     uuid    references public.profiles(id) on delete set null,
  properties  jsonb,                       -- flexible extra data (search terms, tab names, etc.)
  created_at  timestamp with time zone default now() not null
);

-- Fast queries by event name and date
create index if not exists analytics_events_name_idx on public.analytics_events(event_name);
create index if not exists analytics_events_created_idx on public.analytics_events(created_at desc);
create index if not exists analytics_events_user_idx on public.analytics_events(user_id);

-- RLS: anyone (including anon) can insert; only authenticated users can read their own rows.
-- Admins should use the Supabase dashboard (service role) to query all rows.
alter table public.analytics_events enable row level security;

create policy "analytics_insert" on public.analytics_events
  for insert with check (true);

create policy "analytics_select_own" on public.analytics_events
  for select using (user_id = auth.uid());

-- ── Convenience views (query these in the Supabase SQL editor) ───────────────

-- Top events in the last 30 days
create or replace view public.analytics_top_events_30d as
select
  event_name,
  count(*)                                        as total,
  count(distinct user_id)                         as unique_users,
  count(*) filter (where user_id is not null)     as logged_in_events,
  count(*) filter (where user_id is null)         as anonymous_events,
  date_trunc('day', max(created_at))              as last_seen
from public.analytics_events
where created_at >= now() - interval '30 days'
group by event_name
order by total desc;

-- Daily event totals (for a trend chart)
create or replace view public.analytics_daily_totals as
select
  date_trunc('day', created_at)::date             as day,
  event_name,
  count(*)                                        as total,
  count(distinct user_id)                         as unique_users
from public.analytics_events
group by 1, 2
order by 1 desc, 3 desc;

-- Most searched players in Player History
create or replace view public.analytics_top_searched_players as
select
  properties->>'player'                           as player_name,
  count(*)                                        as search_count,
  count(distinct user_id)                         as unique_searchers,
  max(created_at)                                 as last_searched
from public.analytics_events
where event_name = 'player_history_search'
  and properties->>'player' is not null
group by properties->>'player'
order by search_count desc;

-- Most common compare pairings
create or replace view public.analytics_top_compare_pairs as
select
  properties->>'player_a'                         as player_a,
  properties->>'player_b'                         as player_b,
  count(*)                                        as compare_count
from public.analytics_events
where event_name = 'compare_run'
group by properties->>'player_a', properties->>'player_b'
order by compare_count desc;

-- Most active users (logged-in only)
create or replace view public.analytics_top_users_30d as
select
  ae.user_id,
  p.first_name || ' ' || p.last_name             as name,
  count(*)                                        as event_count,
  count(distinct ae.event_name)                   as distinct_features,
  max(ae.created_at)                              as last_active
from public.analytics_events ae
join public.profiles p on p.id = ae.user_id
where ae.created_at >= now() - interval '30 days'
  and ae.user_id is not null
group by ae.user_id, p.first_name, p.last_name
order by event_count desc;
