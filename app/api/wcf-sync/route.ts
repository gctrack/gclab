import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const WCF_URL = 'https://rank.worldcroquet.org/gcrankdg/rank_list.php?year=current&games=0&grade=1200&country=World&rank_order=dg&prefer_name=true&women_only=false&show_state=no_state&show_c2_only=false&show_wc=show_wc_no&age_related=all'

function parseCountryCode(country: string): string {
  const map: Record<string, string> = {
    'Australia': 'AU',
    'Belgium': 'BE',
    'Canada': 'CA',
    'Czech Republic': 'CZ',
    'Egypt': 'EG',
    'England': 'GB-ENG',
    'Germany': 'DE',
    'Hong Kong': 'HK',
    'Ireland': 'IE',
    'Latvia': 'LV',
    'Mexico': 'MX',
    'New Zealand': 'NZ',
    'Norway': 'NO',
    'Portugal': 'PT',
    'Scotland': 'GB-SCT',
    'South Africa': 'ZA',
    'Spain': 'ES',
    'Sweden': 'SE',
    'Switzerland': 'CH',
    'USA': 'US',
    'Wales': 'GB-WLS',
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
      // Cell 1: rank number
      const rank = parseInt(cells[1].replace(/<\/td>.*/, '').trim())

      // Cell 2: name and URL (no world ranking column in world list)
      const nameCell = cells[2]
      const urlMatch = nameCell.match(/href\s*=\s*"player_full\.php\?pffn=([^&]+)&pfsn=([^"&]+)/)
      if (!urlMatch) continue
      const firstName = decodeURIComponent(urlMatch[1].replace(/\+/g, ' ')).trim()
      const lastName = decodeURIComponent(urlMatch[2].replace(/&nt=1.*/, '').replace(/\+/g, ' ')).trim()

      // Cell 3: country
      const country = cells[3].replace(/<\/td>.*/, '').trim()

      // Cell 4: dgrade
      const dgrade = parseInt(cells[4].replace(/<\/td>.*/, '').trim())

      // Cell 5: games
      const games = parseInt(cells[5].replace(/<\/td>.*/, '').trim())

      // Cell 6: wins
      const wins = parseInt(cells[6].replace(/<\/td>.*/, '').trim())

      // Cell 7: win percentage
      const winPct = parseInt(cells[7].replace(/<\/td>.*/, '').trim())

      // Cell 8: last active year
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

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const response = await fetch(WCF_URL)
    const html = await response.text()
    const players = parsePlayers(html)

    if (players.length === 0) {
      return NextResponse.json({ error: 'No players parsed - check HTML structure' }, { status: 500 })
    }

    let updated = 0
    let created = 0

    for (const player of players) {
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
    }

    return NextResponse.json({
      success: true,
      total: players.length,
      created,
      updated,
    })

  } catch (error) {
    return NextResponse.json({ error: 'Sync failed', details: String(error) }, { status: 500 })
  }
}