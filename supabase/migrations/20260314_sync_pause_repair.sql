-- Migration: Sync Pause & History Repair
-- Created: 2026-03-14
-- Reason: WCF individual player pages (player.php?year=...) went down on Mar 13.
--         Nightly sync paused (see .github/workflows/wcf-sync.yml — schedule commented out).
--         This migration flags affected players and repairs known bad data.

-- ── 1. Add repull tracking columns ──────────────────────────────────────────
ALTER TABLE wcf_players
  ADD COLUMN IF NOT EXISTS needs_history_repull  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS history_repull_reason text;

-- ── 2. Flag players with history_imported=true who had grade changes Mar 9-14
--       with null event names. When WCF pages recover, re-fetch year pages for
--       these players to backfill event details.
UPDATE wcf_players p
SET
  needs_history_repull  = true,
  history_repull_reason = 'Grade change recorded Mar 9-14 without event detail — WCF year pages unavailable during this window'
WHERE p.history_imported = true
  AND EXISTS (
    SELECT 1 FROM wcf_dgrade_history h
    WHERE h.wcf_player_id = p.id
      AND h.is_imported   = false
      AND h.event_name    IS NULL
      AND h.recorded_at   >= '2026-03-09T00:00:00Z'
      AND h.recorded_at   <  '2026-03-15T00:00:00Z'
  );

-- ── 3. Fix Jeff Soo (id: 31543dd6-2cdf-4e1b-a262-b9d8014c0c90) ─────────────
--       WCF rank_list briefly showed 2273 on Mar 9 manual sync.
--       By Mar 14 rank_list had him back at 2272; wcf_players was silently
--       corrected but no history entry was written.

-- Remove the bad 2273 entry from the Mar 9 manual sync
DELETE FROM wcf_dgrade_history
WHERE wcf_player_id = '31543dd6-2cdf-4e1b-a262-b9d8014c0c90'
  AND dgrade_value  = 2273
  AND is_imported   = false
  AND recorded_at   >= '2026-03-09T00:00:00Z'
  AND recorded_at   <  '2026-03-10T00:00:00Z';

-- Add the missing correction entry for Mar 14
INSERT INTO wcf_dgrade_history (
  wcf_player_id,
  dgrade_value,
  world_ranking,
  recorded_at,
  record_date,
  event_name,
  is_imported
) VALUES (
  '31543dd6-2cdf-4e1b-a262-b9d8014c0c90',
  2272,
  172,
  '2026-03-14T07:50:46.068+00:00',
  '2026-03-14',
  'Grade verified — WCF data blip corrected',
  false
)
ON CONFLICT (wcf_player_id, dgrade_value, record_date, event_name) DO NOTHING;

-- ── 4. Helper query to check repull count (informational) ───────────────────
-- SELECT COUNT(*) FROM wcf_players WHERE needs_history_repull = true;
-- Expected: players with history_imported=true and null-event-name entries Mar 9-14

-- ── TO RESTORE SYNC ─────────────────────────────────────────────────────────
-- 1. Confirm WCF pages are back:
--    curl "https://rank.worldcroquet.org/gcrankdg/player.php?year=2026&pfn=Jeff&psn=Soo&nt=1&pid="
-- 2. Uncomment schedule in .github/workflows/wcf-sync.yml
-- 3. Run wcf-history-next batch for needs_history_repull=true players
