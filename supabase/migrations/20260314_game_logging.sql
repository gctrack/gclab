-- =============================================================================
-- Game Logging: venues, matches, logged_games, hoops, shots
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------

CREATE TYPE shot_type AS ENUM (
  'setup',
  'roquet',
  'hoop',
  'stop_shot',
  'block',
  'jump',
  'jaws',
  'in_off'
);

CREATE TYPE game_source AS ENUM (
  'manual',
  'watch',
  'spectator',
  'youtube'
);

CREATE TYPE game_status AS ENUM (
  'pending',
  'approved',
  'rejected'
);

CREATE TYPE game_type AS ENUM (
  'tournament',
  'club',
  'practice',
  'casual'
);

CREATE TYPE match_format AS ENUM (
  'single',
  'bo3',
  'bo5'
);

CREATE TYPE lawn_surface AS ENUM (
  'natural',
  'astroturf',
  'carpet'
);

CREATE TYPE lawn_speed AS ENUM (
  'slow',
  'medium',
  'fast'
);

-- ---------------------------------------------------------------------------
-- VENUES
-- ---------------------------------------------------------------------------

CREATE TABLE venues (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  country       text,
  region        text,
  city          text,
  club_wcf_id   text,                        -- link to WCF club record if available
  hoop_type     text,                        -- 'quadway' | 'colonial' | 'other'
  ball_type     text,                        -- 'barlow' | 'dawson' | 'other'
  lawn_surface  lawn_surface,
  lawn_speed    lawn_speed,
  court_count   int,
  notes         text,
  created_by    uuid REFERENCES auth.users(id),
  verified      bool DEFAULT false,          -- admin-verified venue record
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

-- Everyone can read venues
CREATE POLICY "venues_select" ON venues
  FOR SELECT USING (true);

-- Authenticated users can add venues
CREATE POLICY "venues_insert" ON venues
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only creator or admin can update
CREATE POLICY "venues_update" ON venues
  FOR UPDATE USING (auth.uid() = created_by);

-- ---------------------------------------------------------------------------
-- PLAYER PROFILES (extends WCF player data)
-- ---------------------------------------------------------------------------

CREATE TABLE player_profiles (
  user_id               uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  home_club_id          uuid REFERENCES venues(id),
  other_venue_ids       uuid[],
  usual_playing_location text,
  equipment_notes       text,
  public                bool DEFAULT true,
  updated_at            timestamptz DEFAULT now()
);

ALTER TABLE player_profiles ENABLE ROW LEVEL SECURITY;

-- Public profiles are visible to all; private only to owner
CREATE POLICY "profiles_select" ON player_profiles
  FOR SELECT USING (public = true OR auth.uid() = user_id);

CREATE POLICY "profiles_insert" ON player_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update" ON player_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- MATCHES (best of 3/5 container — optional)
-- ---------------------------------------------------------------------------

CREATE TABLE matches (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  format          match_format NOT NULL DEFAULT 'single',
  venue_id        uuid REFERENCES venues(id),
  event_name      text,

  player1_wcf_id  text,
  player2_wcf_id  text,
  player1_user_id uuid REFERENCES auth.users(id),
  player2_user_id uuid REFERENCES auth.users(id),
  player1_name    text,                      -- fallback if no WCF/user match
  player2_name    text,

  winner_wcf_id   text,

  played_at       date,
  source          game_source DEFAULT 'manual',
  youtube_url     text,
  submitted_by    uuid REFERENCES auth.users(id),
  status          game_status DEFAULT 'approved',
  notes           text,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matches_select" ON matches
  FOR SELECT USING (
    status = 'approved'
    OR auth.uid() = submitted_by
    OR auth.uid() = player1_user_id
    OR auth.uid() = player2_user_id
  );

CREATE POLICY "matches_insert" ON matches
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "matches_update" ON matches
  FOR UPDATE USING (
    auth.uid() = submitted_by
    OR auth.uid() = player1_user_id
    OR auth.uid() = player2_user_id
  );

-- ---------------------------------------------------------------------------
-- LOGGED GAMES (individual game record — core table)
-- ---------------------------------------------------------------------------

CREATE TABLE logged_games (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id        uuid REFERENCES matches(id),     -- null for standalone games
  game_number     int,                             -- 1/2/3 within a match

  venue_id        uuid REFERENCES venues(id),
  game_date       date NOT NULL DEFAULT CURRENT_DATE,
  game_type       game_type NOT NULL DEFAULT 'casual',
  points_to       int NOT NULL DEFAULT 13 CHECK (points_to IN (13, 19)),

  -- Players
  player1_wcf_id  text,
  player2_wcf_id  text,
  player1_user_id uuid REFERENCES auth.users(id),
  player2_user_id uuid REFERENCES auth.users(id),
  player1_name    text,                            -- fallback display name
  player2_name    text,

  -- WCF dGrade snapshot at time of game
  player1_dgrade  numeric(6,2),
  player2_dgrade  numeric(6,2),

  -- Game details
  player1_starts  bool,                            -- true = player1 played hoop 1
  player1_score   int,
  player2_score   int,

  -- Logging completeness flags
  has_hoops       bool DEFAULT false,
  has_shots       bool DEFAULT false,
  shot_data_complete bool DEFAULT false,           -- false = partial / key shots only

  source          game_source DEFAULT 'manual',
  submitted_by    uuid REFERENCES auth.users(id),
  status          game_status DEFAULT 'approved',  -- spectator games start 'pending'
  youtube_url     text,
  notes           text,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE logged_games ENABLE ROW LEVEL SECURITY;

-- Approved games visible to all; pending only to submitter or players
CREATE POLICY "logged_games_select" ON logged_games
  FOR SELECT USING (
    status = 'approved'
    OR auth.uid() = submitted_by
    OR auth.uid() = player1_user_id
    OR auth.uid() = player2_user_id
  );

CREATE POLICY "logged_games_insert" ON logged_games
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "logged_games_update" ON logged_games
  FOR UPDATE USING (
    auth.uid() = submitted_by
    OR auth.uid() = player1_user_id
    OR auth.uid() = player2_user_id
  );

-- ---------------------------------------------------------------------------
-- LOGGED GAME HOOPS (hoop-by-hoop results)
-- ---------------------------------------------------------------------------

CREATE TABLE logged_game_hoops (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id      uuid NOT NULL REFERENCES logged_games(id) ON DELETE CASCADE,
  hoop_number  int NOT NULL CHECK (hoop_number BETWEEN 1 AND 19),
  won_by       text NOT NULL CHECK (won_by IN ('player1', 'player2')),
  notes        text
);

ALTER TABLE logged_game_hoops ENABLE ROW LEVEL SECURITY;

-- Inherit visibility from parent game
CREATE POLICY "hoops_select" ON logged_game_hoops
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM logged_games g
      WHERE g.id = game_id
      AND (
        g.status = 'approved'
        OR auth.uid() = g.submitted_by
        OR auth.uid() = g.player1_user_id
        OR auth.uid() = g.player2_user_id
      )
    )
  );

CREATE POLICY "hoops_insert" ON logged_game_hoops
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM logged_games g
      WHERE g.id = game_id
      AND (
        auth.uid() = g.submitted_by
        OR auth.uid() = g.player1_user_id
        OR auth.uid() = g.player2_user_id
      )
    )
  );

CREATE POLICY "hoops_delete" ON logged_game_hoops
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM logged_games g
      WHERE g.id = game_id
      AND (
        auth.uid() = g.submitted_by
        OR auth.uid() = g.player1_user_id
        OR auth.uid() = g.player2_user_id
      )
    )
  );

-- ---------------------------------------------------------------------------
-- LOGGED GAME SHOTS (shot-by-shot detail)
--
-- Distance bucket valid values per shot type:
--   roquet:    '<7' | '7-14' | '14+'
--   hoop:      '0-3' | '4-6' | '7' | '7+'
--   jump:      '1-2' | '3-4' | '4+'
--   setup, block, stop_shot, jaws, in_off: NULL
-- ---------------------------------------------------------------------------

CREATE TABLE logged_game_shots (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id          uuid NOT NULL REFERENCES logged_games(id) ON DELETE CASCADE,
  hoop_number      int CHECK (hoop_number BETWEEN 1 AND 19),
  shooter          text NOT NULL CHECK (shooter IN ('player1', 'player2')),

  shot_type        shot_type NOT NULL,
  distance_bucket  text,                    -- constrained by shot_type; null where not applicable

  success          bool NOT NULL,

  -- Outcome flags
  resulted_in_jaws    bool DEFAULT false,   -- hoop shot that ended in jaws
  resulted_in_snuggle bool DEFAULT false,   -- setup that achieved wire-tight position

  from_memory      bool DEFAULT false,      -- true = entered after the fact, not real-time
  sequence_in_hoop int,                     -- shot order within the hoop contest
  notes            text
);

ALTER TABLE logged_game_shots ENABLE ROW LEVEL SECURITY;

-- Inherit visibility from parent game
CREATE POLICY "shots_select" ON logged_game_shots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM logged_games g
      WHERE g.id = game_id
      AND (
        g.status = 'approved'
        OR auth.uid() = g.submitted_by
        OR auth.uid() = g.player1_user_id
        OR auth.uid() = g.player2_user_id
      )
    )
  );

CREATE POLICY "shots_insert" ON logged_game_shots
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM logged_games g
      WHERE g.id = game_id
      AND (
        auth.uid() = g.submitted_by
        OR auth.uid() = g.player1_user_id
        OR auth.uid() = g.player2_user_id
      )
    )
  );

CREATE POLICY "shots_delete" ON logged_game_shots
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM logged_games g
      WHERE g.id = game_id
      AND (
        auth.uid() = g.submitted_by
        OR auth.uid() = g.player1_user_id
        OR auth.uid() = g.player2_user_id
      )
    )
  );

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------

CREATE INDEX idx_logged_games_player1_wcf    ON logged_games(player1_wcf_id);
CREATE INDEX idx_logged_games_player2_wcf    ON logged_games(player2_wcf_id);
CREATE INDEX idx_logged_games_player1_user   ON logged_games(player1_user_id);
CREATE INDEX idx_logged_games_player2_user   ON logged_games(player2_user_id);
CREATE INDEX idx_logged_games_venue          ON logged_games(venue_id);
CREATE INDEX idx_logged_games_date           ON logged_games(game_date);
CREATE INDEX idx_logged_games_status         ON logged_games(status);
CREATE INDEX idx_logged_game_hoops_game      ON logged_game_hoops(game_id);
CREATE INDEX idx_logged_game_shots_game      ON logged_game_shots(game_id);
CREATE INDEX idx_logged_game_shots_type      ON logged_game_shots(shot_type);
CREATE INDEX idx_venues_country              ON venues(country);
CREATE INDEX idx_venues_wcf                  ON venues(club_wcf_id);
