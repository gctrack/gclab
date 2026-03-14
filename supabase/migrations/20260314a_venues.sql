-- ── VENUES ───────────────────────────────────────────────────────────────────
-- Centralised venue database with an alias system to handle naming inconsistency.
-- Players type whatever they know ("NTCC", "North Toronto", "NT Croquet") and
-- the alias table resolves them to the same canonical record.
--
-- New venues land with verified=false and are immediately usable.
-- Admins can verify, merge duplicates, and add aliases over time.

CREATE TABLE venues (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name text        NOT NULL,                   -- "North Toronto Croquet Club"
  short_name     text,                                   -- "NTCC"
  country        text,
  region         text,                                   -- state / province
  city           text,
  club_wcf_id    text,                                   -- WCF club ID if registered
  hoop_type      text        CHECK (hoop_type    IN ('quadway', 'colonial', 'other')),
  ball_type      text        CHECK (ball_type    IN ('barlow', 'dawson', 'other')),
  lawn_surface   text        CHECK (lawn_surface IN ('natural', 'astroturf', 'carpet', 'other')),
  lawn_speed     text        CHECK (lawn_speed   IN ('slow', 'medium', 'fast')),
  court_count    int,
  notes          text,
  created_by     uuid        REFERENCES auth.users(id),
  verified       bool        DEFAULT false,              -- admin-confirmed record
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX idx_venues_country        ON venues(country);
CREATE INDEX idx_venues_canonical_name ON venues(canonical_name);

-- ── VENUE ALIASES ─────────────────────────────────────────────────────────────
-- Each alias resolves to exactly one venue. Search hits both canonical_name
-- and this table so "NTCC", "North Toronto", "NT" all find the same record.

CREATE TABLE venue_aliases (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id   uuid        NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  alias      text        NOT NULL,
  created_by uuid        REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE (alias)                                         -- one canonical target per alias
);

CREATE INDEX idx_venue_aliases_alias    ON venue_aliases(alias);
CREATE INDEX idx_venue_aliases_venue_id ON venue_aliases(venue_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE venues       ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_aliases ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read venues (needed for game logging search)
CREATE POLICY "venues_select" ON venues
  FOR SELECT TO authenticated USING (true);

-- Any authenticated user can add a venue (lands as unverified)
CREATE POLICY "venues_insert" ON venues
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- Creator can update their own unverified venue (admin handles verified ones)
CREATE POLICY "venues_update" ON venues
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by AND verified = false);

CREATE POLICY "venue_aliases_select" ON venue_aliases
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "venue_aliases_insert" ON venue_aliases
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
