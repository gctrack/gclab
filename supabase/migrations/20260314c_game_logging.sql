-- ── GAME LOGGING ─────────────────────────────────────────────────────────────
-- Apply after: 20260314a_venues.sql, 20260314b_recreational_players.sql
--
-- Three logging streams (all use the same tables):
--   Stream 1 — Score only:          logged_games
--   Stream 2 — Score + hoops:       logged_games + logged_game_hoops
--   Stream 3 — Score + hoops + shots: all three tables
--
-- Match vs standalone:
--   Single game → match_id IS NULL on logged_games
--   Match game  → match_id references matches; game_number = 1/2/3

-- ── SHOT TYPE ENUM ───────────────────────────────────────────────────────────
-- Ordered by frequency of use (watch UI ordering follows this).
-- Distance buckets are validated by the application layer per shot type:
--   setup      → no distance
--   roquet     → '<7' | '7-14' | '14+'          (yards)
--   hoop       → '0-3' | '4-6' | '7' | '7+'    (yards; 7yd = boundary distance to 8/12 hoops)
--   block      → no distance
--   stop_shot  → no distance (always short; requires central contact)
--   jump       → '1-2' | '3-4' | '4+'           (yards)
--   jaws       → no distance (ball already partially through hoop)
--   in_off     → no distance

CREATE TYPE shot_type AS ENUM (
  'setup',      -- approach / positional play
  'roquet',     -- hitting another ball (clearance, rush; also covers unjaws)
  'hoop',       -- running a hoop from open position
  'block',      -- defensive block placement
  'stop_shot',  -- hitting another ball, your ball stays in area
  'jump',       -- jumping over a blocking ball
  'jaws',       -- running from jaws position (ball partially through hoop)
  'in_off'      -- cannoning off another ball or the wire to score
);

-- ── MATCHES ──────────────────────────────────────────────────────────────────
-- Container for best-of-3 or best-of-5 series only.
-- Single games never reference this table.
--
-- Player identity established here before any games are logged.
-- For each player slot: at most one of wcf_id/rec_id should be set.

CREATE TABLE matches (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  format          text        NOT NULL CHECK (format IN ('bo3', 'bo5')),
  points_to       int         NOT NULL DEFAULT 13 CHECK (points_to IN (13, 19)),

  -- Player 1
  player1_wcf_id  uuid        REFERENCES wcf_players(id),
  player1_rec_id  uuid        REFERENCES recreational_players(id),
  player1_user_id uuid        REFERENCES auth.users(id),
  player1_name    text        NOT NULL,   -- always set; display fallback

  -- Player 2
  player2_wcf_id  uuid        REFERENCES wcf_players(id),
  player2_rec_id  uuid        REFERENCES recreational_players(id),
  player2_user_id uuid        REFERENCES auth.users(id),
  player2_name    text        NOT NULL,

  winner          text        CHECK (winner IN ('player1', 'player2')),  -- null until complete
  game_type       text        CHECK (game_type IN ('tournament', 'club', 'practice', 'casual')),
  venue_id        uuid        REFERENCES venues(id),
  event_name      text,
  played_at       date,
  visibility      text        DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  submitted_by    uuid        NOT NULL REFERENCES auth.users(id),
  status          text        DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes           text,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_matches_submitted_by  ON matches(submitted_by);
CREATE INDEX idx_matches_player1_wcf   ON matches(player1_wcf_id);
CREATE INDEX idx_matches_player2_wcf   ON matches(player2_wcf_id);
CREATE INDEX idx_matches_venue         ON matches(venue_id);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matches_select" ON matches
  FOR SELECT TO authenticated
  USING (
    submitted_by    = auth.uid() OR
    player1_user_id = auth.uid() OR
    player2_user_id = auth.uid() OR
    visibility      = 'public'
  );

CREATE POLICY "matches_insert" ON matches
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "matches_update" ON matches
  FOR UPDATE TO authenticated
  USING (auth.uid() = submitted_by);

-- ── LOGGED GAMES ─────────────────────────────────────────────────────────────
-- One row per game. match_id null = standalone single game.
--
-- Who starts hoop 1:
--   Standalone / match game 1: set from toss (player1_starts)
--   Match game 2+: loser of previous game; app pre-fills, user confirms
--
-- steps_player1/2: HealthKit step delta from watch (null if not tracked)
-- visibility: 'private' (submitter + named players) | 'public' (all users)

CREATE TABLE logged_games (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id         uuid        REFERENCES matches(id) ON DELETE CASCADE,
  game_number      int,                               -- 1/2/3 in a match; null for standalone

  -- Settings
  points_to        int         NOT NULL DEFAULT 13 CHECK (points_to IN (13, 19)),
  game_type        text        CHECK (game_type IN ('tournament', 'club', 'practice', 'casual')),
  game_date        date,
  venue_id         uuid        REFERENCES venues(id),

  -- Player 1 (at most one of wcf_id/rec_id set)
  player1_wcf_id   uuid        REFERENCES wcf_players(id),
  player1_rec_id   uuid        REFERENCES recreational_players(id),
  player1_user_id  uuid        REFERENCES auth.users(id),
  player1_name     text        NOT NULL,
  player1_dgrade   int,                               -- snapshot at time of game

  -- Player 2
  player2_wcf_id   uuid        REFERENCES wcf_players(id),
  player2_rec_id   uuid        REFERENCES recreational_players(id),
  player2_user_id  uuid        REFERENCES auth.users(id),
  player2_name     text        NOT NULL,
  player2_dgrade   int,

  -- Result
  player1_starts   bool,                              -- true = player1 played first to hoop 1
  player1_score    int,
  player2_score    int,

  -- Watch / health (HealthKit; null if not tracked)
  steps_player1    int,
  steps_player2    int,
  duration_minutes int,

  -- Logging completeness
  has_hoops           bool DEFAULT false,
  has_shots           bool DEFAULT false,
  shot_data_complete  bool DEFAULT false,             -- false = partial / key shots only

  -- Provenance
  source          text        DEFAULT 'manual' CHECK (source IN ('manual', 'watch', 'spectator', 'youtube')),
  youtube_url     text,
  visibility      text        DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  submitted_by    uuid        NOT NULL REFERENCES auth.users(id),
  status          text        DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes           text,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_logged_games_submitted_by  ON logged_games(submitted_by);
CREATE INDEX idx_logged_games_match_id      ON logged_games(match_id);
CREATE INDEX idx_logged_games_venue         ON logged_games(venue_id);
CREATE INDEX idx_logged_games_player1_wcf   ON logged_games(player1_wcf_id);
CREATE INDEX idx_logged_games_player2_wcf   ON logged_games(player2_wcf_id);
CREATE INDEX idx_logged_games_player1_rec   ON logged_games(player1_rec_id);
CREATE INDEX idx_logged_games_player2_rec   ON logged_games(player2_rec_id);
CREATE INDEX idx_logged_games_player1_user  ON logged_games(player1_user_id);
CREATE INDEX idx_logged_games_player2_user  ON logged_games(player2_user_id);
CREATE INDEX idx_logged_games_game_date     ON logged_games(game_date);

ALTER TABLE logged_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "logged_games_select" ON logged_games
  FOR SELECT TO authenticated
  USING (
    submitted_by    = auth.uid() OR
    player1_user_id = auth.uid() OR
    player2_user_id = auth.uid() OR
    visibility      = 'public'
  );

CREATE POLICY "logged_games_insert" ON logged_games
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "logged_games_update" ON logged_games
  FOR UPDATE TO authenticated
  USING (auth.uid() = submitted_by);

-- ── LOGGED GAME HOOPS ────────────────────────────────────────────────────────
-- One row per hoop. Unique constraint prevents duplicate entries per game.
--
-- first_to_hoop: derived by app, stored for query performance.
-- Derivation rule:
--   hoop 1:     first_to_hoop = toss winner (player1_starts on logged_games)
--   hoop N > 1: accidental_score=false → loser of hoop[N-1] goes first (normal)
--               accidental_score=true  → winner of hoop[N-1] goes first
--               (accidental scorer retains first play to next hoop)

CREATE TABLE logged_game_hoops (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id          uuid NOT NULL REFERENCES logged_games(id) ON DELETE CASCADE,
  hoop_number      int  NOT NULL CHECK (hoop_number BETWEEN 1 AND 19),
  won_by           text NOT NULL CHECK (won_by        IN ('player1', 'player2')),
  first_to_hoop    text          CHECK (first_to_hoop IN ('player1', 'player2')),
  accidental_score bool DEFAULT false,   -- scorer also goes first to next hoop
  notes            text,
  UNIQUE (game_id, hoop_number)
);

CREATE INDEX idx_hoops_game_id ON logged_game_hoops(game_id);

ALTER TABLE logged_game_hoops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hoops_select" ON logged_game_hoops
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM logged_games g WHERE g.id = game_id AND (
        g.submitted_by = auth.uid() OR g.player1_user_id = auth.uid() OR
        g.player2_user_id = auth.uid() OR g.visibility = 'public'
      )
    )
  );

CREATE POLICY "hoops_insert" ON logged_game_hoops
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM logged_games g WHERE g.id = game_id AND g.submitted_by = auth.uid())
  );

CREATE POLICY "hoops_update" ON logged_game_hoops
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM logged_games g WHERE g.id = game_id AND g.submitted_by = auth.uid())
  );

CREATE POLICY "hoops_delete" ON logged_game_hoops
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM logged_games g WHERE g.id = game_id AND g.submitted_by = auth.uid())
  );

-- ── LOGGED GAME SHOTS ────────────────────────────────────────────────────────
-- One row per shot. Loosely coupled to hoops via hoop_number (not a FK) so
-- shot logging works without requiring hoop-by-hoop data to also be entered.
--
-- distance_bucket CHECK allows all valid values across all shot types;
-- the app enforces which values apply to which shot type.
--
-- consecutive_shot: same player shot twice in a row — derivable from sequence
-- but stored explicitly for direct filtering in analytics.
--
-- resulted_in_jaws:    hoop shot where ball ends sitting in jaws
-- resulted_in_snuggle: setup where ball achieves wire-tight position
-- Both are outcome flags independent of success (a jaws result may be
-- intentional or unintentional; either way it changes the opponent's options).
--
-- from_memory: shot entered after the fact rather than real-time on watch.
-- Analytics layer can filter or weight partial-recall data accordingly.

CREATE TABLE logged_game_shots (
  id                  uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id             uuid      NOT NULL REFERENCES logged_games(id) ON DELETE CASCADE,
  hoop_number         int       CHECK (hoop_number BETWEEN 1 AND 19),
  shooter             text      NOT NULL CHECK (shooter IN ('player1', 'player2')),
  shot_type           shot_type NOT NULL,
  distance_bucket     text      CHECK (
                        distance_bucket IS NULL OR
                        distance_bucket IN ('<7', '7-14', '14+', '0-3', '4-6', '7', '7+', '1-2', '3-4', '4+')
                      ),
  success             bool      NOT NULL,
  consecutive_shot    bool      DEFAULT false,  -- same player shot twice in a row
  resulted_in_jaws    bool      DEFAULT false,  -- hoop shot that left ball in jaws
  resulted_in_snuggle bool      DEFAULT false,  -- setup that achieved wire-tight position
  from_memory         bool      DEFAULT false,  -- entered after the fact, not real-time
  sequence_in_hoop    int,                      -- shot order within the hoop contest (1, 2, 3…)
  notes               text,
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_shots_game_id   ON logged_game_shots(game_id);
CREATE INDEX idx_shots_shot_type ON logged_game_shots(shot_type);
CREATE INDEX idx_shots_shooter   ON logged_game_shots(shooter);

ALTER TABLE logged_game_shots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shots_select" ON logged_game_shots
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM logged_games g WHERE g.id = game_id AND (
        g.submitted_by = auth.uid() OR g.player1_user_id = auth.uid() OR
        g.player2_user_id = auth.uid() OR g.visibility = 'public'
      )
    )
  );

CREATE POLICY "shots_insert" ON logged_game_shots
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM logged_games g WHERE g.id = game_id AND g.submitted_by = auth.uid())
  );

CREATE POLICY "shots_update" ON logged_game_shots
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM logged_games g WHERE g.id = game_id AND g.submitted_by = auth.uid())
  );

CREATE POLICY "shots_delete" ON logged_game_shots
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM logged_games g WHERE g.id = game_id AND g.submitted_by = auth.uid())
  );
