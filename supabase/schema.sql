-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  first_name text not null,
  last_name text not null,
  email text not null,
  country text,
  bio text,
  mallet_type text,
  grip text,
  dgrade integer,
  wcf_profile_url text,
  subscription_tier text not null default 'full',
  contribute_to_aggregate boolean not null default true,
  show_name_in_reports boolean not null default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- dGrade history
create table public.dgrade_history (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  dgrade_value integer not null,
  recorded_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Clubs
create table public.clubs (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  country text,
  city text,
  website text,
  created_by_user_id uuid references public.profiles(id) on delete set null,
  verified boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Club equipment
create table public.club_equipment (
  id uuid default uuid_generate_v4() primary key,
  club_id uuid references public.clubs(id) on delete cascade not null,
  hoop_type text,
  ball_type text,
  court_surface text,
  notes text,
  effective_from date,
  effective_to date
);

-- User club memberships
create table public.user_club_memberships (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  club_id uuid references public.clubs(id) on delete cascade not null,
  is_default boolean not null default false,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Opponents
create table public.opponents (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  opponent_name text not null,
  linked_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Matches
create table public.matches (
  id uuid default uuid_generate_v4() primary key,
  player_1_id uuid references public.profiles(id) on delete cascade not null,
  player_2_id uuid references public.profiles(id) on delete set null,
  format text not null,
  winner_id uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Games
create table public.games (
  id uuid default uuid_generate_v4() primary key,
  match_id uuid references public.matches(id) on delete set null,
  player_1_id uuid references public.profiles(id) on delete cascade not null,
  player_2_id uuid references public.profiles(id) on delete set null,
  player_1_score integer,
  player_2_score integer,
  player_1_dgrade_at_time integer,
  player_2_dgrade_at_time integer,
  who_played_first uuid references public.profiles(id) on delete set null,
  format text not null default '13pt',
  date_played date,
  source text not null default 'manual',
  verified boolean not null default false,
  status text not null default 'pending',
  created_by_user_id uuid references public.profiles(id) on delete cascade not null,
  club_id uuid references public.clubs(id) on delete set null,
  hoop_type text,
  ball_type text,
  youtube_url text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Hoops
create table public.hoops (
  id uuid default uuid_generate_v4() primary key,
  game_id uuid references public.games(id) on delete cascade not null,
  hoop_number integer not null,
  scored_by_user_id uuid references public.profiles(id) on delete set null,
  running_score_player_1 integer,
  running_score_player_2 integer
);

-- Game invitations
create table public.game_invitations (
  id uuid default uuid_generate_v4() primary key,
  game_id uuid references public.games(id) on delete cascade not null,
  from_user_id uuid references public.profiles(id) on delete cascade not null,
  to_user_id uuid references public.profiles(id) on delete cascade not null,
  status text not null default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Potential matches for late joiners
create table public.potential_game_matches (
  id uuid default uuid_generate_v4() primary key,
  new_user_id uuid references public.profiles(id) on delete cascade not null,
  game_id uuid references public.games(id) on delete cascade not null,
  confidence_score numeric,
  status text not null default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Shot sessions
create table public.shot_sessions (
  id uuid default uuid_generate_v4() primary key,
  game_id uuid references public.games(id) on delete set null,
  logged_by_user_id uuid references public.profiles(id) on delete cascade not null,
  subject_user_id uuid references public.profiles(id) on delete cascade not null,
  opponent_id uuid references public.opponents(id) on delete set null,
  completeness text not null default 'full',
  session_date date,
  steps integer,
  distance_meters numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Shots
create table public.shots (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.shot_sessions(id) on delete cascade not null,
  shot_type text not null,
  outcome text not null,
  miss_direction text,
  score_at_time_player_1 integer,
  score_at_time_player_2 integer,
  hoop_number_at_time integer,
  sequence_number integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Discussion groups (for gated forum areas: clubs, custom groups, etc.)
create table public.discussion_groups (
  id          uuid default uuid_generate_v4() primary key,
  slug        text not null unique,
  name        text not null,
  description text,
  type        text not null default 'custom' check (type in ('club', 'custom')),
  club_id     uuid references public.clubs(id) on delete set null,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamp with time zone default now() not null
);

-- Group membership (role: owner | admin | member)
create table public.discussion_group_members (
  id        uuid default uuid_generate_v4() primary key,
  group_id  uuid references public.discussion_groups(id) on delete cascade not null,
  user_id   uuid references public.profiles(id) on delete cascade not null,
  role      text not null default 'member' check (role in ('owner', 'admin', 'member')),
  added_by  uuid references public.profiles(id) on delete set null,
  added_at  timestamp with time zone default now() not null,
  unique (group_id, user_id)
);

-- Feature flags
create table public.feature_flags (
  id uuid default uuid_generate_v4() primary key,
  feature_name text not null unique,
  min_tier text not null default 'free',
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert default feature flags
insert into public.feature_flags (feature_name, min_tier, description) values
  ('shot_tracking', 'free', 'Log shots during a game via watch or phone'),
  ('hoop_by_hoop_entry', 'free', 'Enter game scores hoop by hoop'),
  ('watch_app_sync', 'free', 'Sync shot data from Apple Watch'),
  ('advanced_reporting', 'free', 'Access detailed shot and performance reports'),
  ('community_benchmarking', 'free', 'Compare stats against players at similar dGrade'),
  ('dgrade_history', 'free', 'Track dGrade changes over time'),
  ('basic_game_logging', 'free', 'Log game results manually'),
  ('spectator_mode', 'free', 'Log shots for games you are watching'),
  ('video_review', 'free', 'Log shots from recorded video');
-- =============================================================================
-- Game Logging (migration: 20260314_game_logging.sql)
-- =============================================================================

-- Shot type enum: setup | roquet | hoop | stop_shot | block | jump | jaws | in_off
-- Distance buckets: roquet(<7,7-14,14+) hoop(0-3,4-6,7,7+) jump(1-2,3-4,4+)

-- Venues
create table public.venues (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  country       text,
  region        text,
  city          text,
  club_wcf_id   text,
  hoop_type     text,   -- quadway | colonial | other
  ball_type     text,   -- barlow | dawson | other
  lawn_surface  text,   -- natural | astroturf | carpet
  lawn_speed    text,   -- slow | medium | fast
  court_count   int,
  notes         text,
  created_by    uuid references auth.users(id),
  verified      bool default false,
  created_at    timestamptz default now()
);

-- Player profile extensions (home club, memberships, usual location)
create table public.player_profiles (
  user_id               uuid primary key references auth.users(id) on delete cascade,
  home_club_id          uuid references public.venues(id),
  other_venue_ids       uuid[],
  usual_playing_location text,
  equipment_notes       text,
  public                bool default true,
  updated_at            timestamptz default now()
);

-- Match container for best-of-3/5 series
create table public.matches (
  id              uuid primary key default gen_random_uuid(),
  format          text not null default 'single',  -- single | bo3 | bo5
  venue_id        uuid references public.venues(id),
  event_name      text,
  player1_wcf_id  text,
  player2_wcf_id  text,
  player1_user_id uuid references auth.users(id),
  player2_user_id uuid references auth.users(id),
  player1_name    text,
  player2_name    text,
  winner_wcf_id   text,
  played_at       date,
  source          text default 'manual',  -- manual | watch | spectator | youtube
  youtube_url     text,
  submitted_by    uuid references auth.users(id),
  status          text default 'approved',  -- pending | approved | rejected
  notes           text,
  created_at      timestamptz default now()
);

-- Individual game record (core logging table)
create table public.logged_games (
  id              uuid primary key default gen_random_uuid(),
  match_id        uuid references public.matches(id),
  game_number     int,
  venue_id        uuid references public.venues(id),
  game_date       date not null default current_date,
  game_type       text not null default 'casual',  -- tournament | club | practice | casual
  points_to       int not null default 13,          -- 13 or 19
  player1_wcf_id  text,
  player2_wcf_id  text,
  player1_user_id uuid references auth.users(id),
  player2_user_id uuid references auth.users(id),
  player1_name    text,
  player2_name    text,
  player1_dgrade  numeric(6,2),   -- snapshot at time of game
  player2_dgrade  numeric(6,2),
  player1_starts  bool,           -- true = player1 played hoop 1
  player1_score   int,
  player2_score   int,
  has_hoops       bool default false,
  has_shots       bool default false,
  shot_data_complete bool default false,  -- false = partial / key shots only
  source          text default 'manual',
  submitted_by    uuid references auth.users(id),
  status          text default 'approved',
  youtube_url     text,
  notes           text,
  created_at      timestamptz default now()
);

-- Hoop-by-hoop results
create table public.logged_game_hoops (
  id           uuid primary key default gen_random_uuid(),
  game_id      uuid not null references public.logged_games(id) on delete cascade,
  hoop_number  int not null,   -- 1–13 or 1–19
  won_by       text not null,  -- player1 | player2
  notes        text
);

-- Shot-by-shot detail (from watch or post-game entry)
create table public.logged_game_shots (
  id                  uuid primary key default gen_random_uuid(),
  game_id             uuid not null references public.logged_games(id) on delete cascade,
  hoop_number         int,
  shooter             text not null,   -- player1 | player2
  shot_type           text not null,   -- see enum above
  distance_bucket     text,            -- null where not applicable
  success             bool not null,
  resulted_in_jaws    bool default false,
  resulted_in_snuggle bool default false,
  from_memory         bool default false,
  sequence_in_hoop    int,
  notes               text
);
