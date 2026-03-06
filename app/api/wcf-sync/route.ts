import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const WCF_URL = 'https://rank.worldcroquet.org/gcrankdg/rank_list.php?year=current&games=0&grade=1200&country=World&rank_order=dg&prefer_name=true&women_only=false&show_state=no_state&show_c2_only=false&show_wc=show_wc_no&age_related=all'

function parseCountryCode(country: string): string {
  const map: Record<string, string> = {
    'Australia': 'AU', 'Belgium': 'BE', 'Canada': 'CA', 'Czech Republic': 'CZ',
    'Egypt': 'EG', 'England': 'GB-ENG', 'Germany': 'DE', 'Hong Kong': 'HK',
    'Ireland': 'IE', 'Latvia': 'LV', 'Mexico': 'MX', 'New Zealand': 'NZ',
    'Norway': 'NO', 'Portugal': 'PT', 'Scotland': 'GB-SCT', 'South Africa': 'ZA',
    'Spain': 'ES', 'Sweden': 'SE', 'Switzerland': 'CH', 'USA': 'US', 'Wales': 'GB-WLS',
  }
  return map[country.trim()] || country.trim()
}

function parsePlayers(html: string) {
  const players = []
  const rows = html.split('<tr>')
  for (const row of rows) {
    if (row.includes('<th>') || !row.includes('player_full.php')) continue
    const cells = row.split('<td>')
    if (cells.length < 8) continue
    try {
      const rank = parseInt(cells[1].replace(/<\/td>.*/, '').trim())
      const nameCell = cells[2]
      const urlMatch = nameCell.match(/href\s*=\s*"player_full\.php\?pffn=([^&]+)&pfsn=([^"&]+)/)
      if (!urlMatch) continue
      const firstName = decodeURIComponent(urlMatch[1].replace(/\+/g, ' ')).trim()
      const lastName = decodeURIComponent(urlMatch[2].replace(/&nt=1.*/, '').replace(/\+/g, ' ')).trim()
      const country = cells[3].replace(/<\/td>.*/, '').trim()
      const dgrade = parseInt(cells[4].replace(/<\/td>.*/, '').trim())
      const games = parseInt(cells[5].replace(/<\/td>.*/, '').trim())
      const wins = parseInt(cells[6].replace(/<\/td>.*/, '').trim())
      const winPct = parseInt(cells[7].replace(/<\/td>.*/, '').trim())
      const lastYear = parseInt(cells[8].replace(/<\/td>.*/, '').trim())
      if (isNaN(rank) || isNaN(dgrade) || !firstName || !lastName) continue
      players.push({
        wcf_first_name: firstName,
        wcf_last_name: lastName,
        country: parseCountryCode(country),
        dgrade,
        world_ranking: rank,
        games,
        wins,
        win_percentage: winPct,
        last_active_year: lastYear,
        wcf_profile_url: `https://rank.worldcroquet.org/gcrankdg/player_full.php?pffn=${urlMatch[1]}&pfsn=${urlMatch[2].replace(/&nt=1.*/, '')}&nt=1`,
      })
    } catch {
      continue
    }
  }
  return players
}

async function runSync(logId: string) {
  try {
    const response = await fetch(WCF_URL)
    const html = await response.text()
    const players = parsePlayers(html)

    if (players.length === 0) {
      await supabase.from('sync_log').update({
        status: 'error',
        error: 'No players parsed',
        completed_at: new Date().toISOString(),
      }).eq('id', logId)
      return
    }

    let updated = 0
    let created = 0

    const BATCH_SIZE = 50
    for (let i = 0; i < players.length; i += BATCH_SIZE) {
      const batch = players.slice(i, i + BATCH_SIZE)
      await Promise.all(batch.map(async (player) => {
        const { data: existing } = await supabase
          .from('wcf_players')
          .select('id, dgrade')
          .eq('wcf_first_name', player.wcf_first_name)
          .eq('wcf_last_name', player.wcf_last_name)
          .single()

        if (existing) {
          if (existing.dgrade !== player.dgrade) {
            await supabase.from('wcf_dgrade_history').insert({
              wcf_player_id: existing.id,
              dgrade_value: player.dgrade,
              world_ranking: player.world_ranking,
            })
          }
          await supabase
            .from('wcf_players')
            .update({ ...player, last_synced_at: new Date().toISOString() })
            .eq('id', existing.id)
          updated++
        } else {
          const { data: newPlayer } = await supabase
            .from('wcf_players')
            .insert({ ...player, last_synced_at: new Date().toISOString() })
            .select('id')
            .single()
          if (newPlayer) {
            await supabase.from('wcf_dgrade_history').insert({
              wcf_player_id: newPlayer.id,
              dgrade_value: player.dgrade,
              world_ranking: player.world_ranking,
            })
          }
          created++
        }
      }))
    }

    await supabase.from('sync_log').update({
      status: 'complete',
      total: players.length,
      created,
      updated,
      completed_at: new Date().toISOString(),
    }).eq('id', logId)

  } catch (error) {
    await supabase.from('sync_log').update({
      status: 'error',
      error: String(error),
      completed_at: new Date().toISOString(),
    }).eq('id', logId)
  }
}

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization')
    const cronHeader = request.headers.get('x-vercel-cron')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && cronHeader !== '1') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const { data: log } = await supabase
    .from('sync_log')
    .insert({ status: 'running', started_at: new Date().toISOString() })
    .select('id')
    .single()

  if (!log) {
    return NextResponse.json({ error: 'Failed to create sync log' }, { status: 500 })
  }

  runSync(log.id)

  return NextResponse.json({ started: true, logId: log.id })
}