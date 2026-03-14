-- ── RECREATIONAL PLAYERS ─────────────────────────────────────────────────────
-- Players who do not appear in the WCF competitive database.
-- The WCF system only captures competitive tournament players; many club and
-- recreational players exist outside it and need to be referenceable for
-- game logging.
--
-- Players are public by default so that multiple users logging games against
-- the same local player resolve to the same record rather than creating
-- duplicates. Creator can mark private if needed.

CREATE TABLE recreational_players (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name     text        NOT NULL,
  last_name      text        NOT NULL,
  country        text,
  home_venue_id  uuid        REFERENCES venues(id),     -- their home club
  approx_dgrade  int,                                   -- rough skill estimate, player-provided
  notes          text,
  created_by     uuid        NOT NULL REFERENCES auth.users(id),
  is_public      bool        DEFAULT true,              -- false = only visible to creator
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX idx_rec_players_created_by ON recreational_players(created_by);
CREATE INDEX idx_rec_players_name       ON recreational_players(last_name, first_name);
CREATE INDEX idx_rec_players_venue      ON recreational_players(home_venue_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE recreational_players ENABLE ROW LEVEL SECURITY;

-- Public players visible to all authenticated users; private only to creator
CREATE POLICY "rec_players_select" ON recreational_players
  FOR SELECT TO authenticated
  USING (is_public = true OR auth.uid() = created_by);

-- Creator adds their own
CREATE POLICY "rec_players_insert" ON recreational_players
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Creator updates their own
CREATE POLICY "rec_players_update" ON recreational_players
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);
