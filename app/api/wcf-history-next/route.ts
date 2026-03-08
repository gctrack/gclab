// SAVE TO: app/api/wcf-history-next/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: player } = await supabase
    .from('wcf_players')
    .select('id, wcf_first_name, wcf_last_name, world_ranking')
    .eq('history_imported', false)
    .not('world_ranking', 'is', null)
    .order('world_ranking', { ascending: true })
    .limit(1)
    .single()

  if (!player) {
    return NextResponse.json({ done: true, message: 'All players imported' })
  }

  const { count: remaining } = await supabase
    .from('wcf_players')
    .select('id', { count: 'exact', head: true })
    .eq('history_imported', false)
    .not('world_ranking', 'is', null)

  return NextResponse.json({
    done: false,
    player,
    remaining: remaining || 0,
  })
}
