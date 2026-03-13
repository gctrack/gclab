/**
 * Lightweight feature-level analytics.
 *
 * Page views are tracked automatically by Vercel Analytics (in layout.tsx).
 * Use trackEvent() for feature-level actions — these land in the
 * `analytics_events` Supabase table and are queryable via the views:
 *
 *   analytics_top_events_30d   — which features are used most
 *   analytics_daily_totals     — day-by-day trend per event
 *   analytics_top_users_30d    — most active users
 *
 * Events fired by this app:
 *   player_history_search  { player: string }
 *   compare_run            { player_a: string, player_b: string }
 *   leaderboard_view       { tab?: string }
 *   thread_created         { category: string }
 *   post_created           { category?: string }
 *   dashboard_view         {}
 *   profile_updated        {}
 */

import { createClient } from '@/lib/supabase'

type EventProperties = Record<string, string | number | boolean | null | undefined>

export async function trackEvent(
  eventName: string,
  properties?: EventProperties,
): Promise<void> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const page = typeof window !== 'undefined' ? window.location.pathname : undefined

    await supabase.from('analytics_events').insert({
      event_name: eventName,
      user_id: user?.id ?? null,
      properties: properties ?? null,
      page: page ?? null,
    })
  } catch {
    // Analytics must never throw — silently ignore all errors
  }
}
