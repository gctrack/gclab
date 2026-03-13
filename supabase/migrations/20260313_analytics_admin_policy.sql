-- ─────────────────────────────────────────────────────────────────────────────
-- Admin read policy for analytics_events
-- Allows admins/super_admins to query all rows (not just their own).
-- Run this in the Supabase SQL editor after 20260313_analytics.sql
-- ─────────────────────────────────────────────────────────────────────────────

create policy "analytics_select_admin" on public.analytics_events
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'super_admin')
    )
  );
