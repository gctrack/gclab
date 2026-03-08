import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const DGRADE_URL = 'https://rank.worldcroquet.org/gcrankdg/rank_list.php?year=current&games=0&grade=1200&country=World&rank_order=dg&prefer_name=true&women_only=false&show_state=no_state&show_c2_only=false&show_wc=show_wc_no&age_related=all'
const EGRADE_URL = 'https://rank.worldcroquet.org/gcrankdg/rank_list.php?year=current&games=0&grade=1200&country=World&rank_order=egrade&prefer_name=true&women_only=false&show_state=no_state&show_c2_only=false&show_wc=show_wc_no&age_related=all'

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

function buildEgradeMap(html: string): Record<string, number> {
  const map: Record<string, number> = {}
  const rows = html.split('<tr>')
  for (const row of rows) {
    if (row.includes('<th>') || !row.includes('player_full.php')) continue
    const cells = row.split('<td>')
    if (cells.length < 5) continue
    try {
      const nameCell = cells[2]
      const urlMatch = nameCell.match(/href\s*=\s*"player_full\.php\?pffn=([^&]+)&pfsn=([^"&]+)/)
      if (!urlMatch) continue
      const firstName = decodeURIComponent(urlMatch[1].replace(/\+/g, ' ')).trim()
      const lastName = decodeURIComponent(urlMatch[2].replace(/&nt=1.*/, '').replace(/\+/g, ' ')).trim()
      const egrade = parseInt(cells[4].replace(/<\/td>.*/, '').trim())
      if (!isNaN(egrade) && egrade > 0) map[`${firstName}|${lastName}`] = egrade
    } catch {
      continue
    }
  }
  return map
}

function isFirstOfMonth(date: Date): boolean {
  return date.getDate() === 1
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    })
    clearTimeout(timeout)
    return response
  } catch (err) {
    clearTimeout(timeout)
    throw err
  }
}

async function writeMonthlySnapshots(now: string) {
  const { data: allPlayers } = await supabase
    .from('wcf_players')
    .select('id, dgrade, egrade, world_ranking')
  if (!allPlayers) return
  const BATCH_SIZE = 100
  for (let i = 0; i < allPlayers.length; i += BATCH_SIZE) {
    const batch = allPlayers.slice(i, i + BATCH_SIZE)
    await Promise.all(batch.map(async (player) => {
      await supabase.from('wcf_dgrade_history').insert({
        wcf_player_id: player.id,
        dgrade_value: player.dgrade,
        egrade_value: player.egrade,
        world_ranking: player.world_ranking,
        recorded_at: now,
      })
    }))
  }
}

async function writeCountrySnapshot(activeYear: number, snapshotDate: string) {
  const { data } = await supabase.rpc('get_country_stats', { active_year: activeYear })
  if (!data) return
  const BATCH_SIZE = 50
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE)
    await Promise.all(batch.map(async (row: any) => {
      await supabase.from('country_stats_snapshots').upsert({
        snapshot_date: snapshotDate,
        country: row.country,
        total_players: row.total_players,
        active_players: row.active_players,
        avg_top6_dgrade: row.avg_top6_dgrade,
      }, { onConflict: 'snapshot_date,country' })
    }))
  }
}

async function runSync(logId: string) {
  try {
    const now = new Date()
    const nowISO = now.toISOString()
    const isMonthly = isFirstOfMonth(now)
    const activeYear = now.getFullYear() - 1
    const snapshotDate = now.toISOString().split('T')[0]

    let dgradeHtml: string
    let egradeHtml: string
    try {
      const [dgradeResponse, egradeResponse] = await Promise.all([
        fetchWithTimeout(DGRADE_URL, 30000),
        fetchWithTimeout(EGRADE_URL, 30000),
      ])
      if (!dgradeResponse.ok) throw new Error(`dGrade fetch returned HTTP ${dgradeResponse.status}`)
      if (!egradeResponse.ok) throw new Error(`eGrade fetch returned HTTP ${egradeResponse.status}`)
      ;[dgradeHtml, egradeHtml] = await Promise.all([
        dgradeResponse.text(),
        egradeResponse.text(),
      ])
    } catch (fetchErr) {
      await supabase.from('sync_log').update({
        status: 'error',
        error: `WCF fetch failed: ${String(fetchErr)}`,
        completed_at: nowISO,
      }).eq('id', logId)
      return
    }

    const players = parsePlayers(dgradeHtml)
    const egradeMap = buildEgradeMap(egradeHtml)

    if (players.length === 0) {
      await supabase.from('sync_log').update({
        status: 'error',
        error: 'No players parsed from WCF response',
        completed_at: nowISO,
      }).eq('id', logId)
      return
    }

    let updated = 0
    let created = 0

    const BATCH_SIZE = 50
    for (let i = 0; i < players.length; i += BATCH_SIZE) {
      const batch = players.slice(i, i + BATCH_SIZE)
      await Promise.all(batch.map(async (player) => {
        const egrade = egradeMap[`${player.wcf_first_name}|${player.wcf_last_name}`] || null

        const { data: existing } = await supabase
          .from('wcf_players')
          .select('id, dgrade, egrade, world_ranking, linked_user_id, history_imported')
          .eq('wcf_first_name', player.wcf_first_name)
          .eq('wcf_last_name', player.wcf_last_name)
          .maybeSingle()

        if (existing) {
          const dgradeChanged = existing.dgrade !== player.dgrade
          const egradeChanged = egrade !== null && existing.egrade !== egrade

          if (dgradeChanged || egradeChanged) {
            // If history imported, try to fetch the new game details from WCF
            let eventName: string | null = null
            let eventUrl: string | null = null
            let eventDate: string | null = null

            if (existing.history_imported && dgradeChanged) {
              try {
                const yearUrl = `https://rank.worldcroquet.org/gcrankdg/player.php?year=${now.getFullYear()}&pfn=${encodeURIComponent(player.wcf_first_name)}&psn=${encodeURIComponent(player.wcf_last_name)}&nt=1&pid=`
                const res = await fetchWithTimeout(yearUrl, 15000)
                const yearHtml = await res.text()

                // Find most recent event from page
                const rows = yearHtml.split('<tr>')
                let lastEvent: { name: string, url: string, date: string | null } | null = null
                let lastGames: any[] = []

                for (const row of rows) {
                  const eventMatch = row.match(
                    /<td>&nbsp\s*<\/td><td><b>(\d+)<\/b><\/td><td><b>\s*<a href\s*=\s*"(event\.php\?[^"]+)">\s*([^<]+?)\s*<\/a><\/b><\/td><td><b>(\d{2}\.\d{2}\.\d{2})<\/b>/
                  )
                  if (eventMatch) {
                    if (lastEvent && lastGames.length > 0) {
                      const lastGame = lastGames[lastGames.length - 1]
                      // Write game records
                      for (const g of lastGames) {
                        await supabase.from('wcf_player_games').upsert({
                          ...g,
                          wcf_player_id: existing.id,
                        }, { onConflict: 'wcf_player_id,year,game_number' })
                      }
                    }
                    const dateMatch = eventMatch[4].match(/^(\d{2})\.(\d{2})\.(\d{2})$/)
                    let parsedDate: string | null = null
                    if (dateMatch) {
                      const yr = parseInt(dateMatch[3]) >= 80 ? `19${dateMatch[3]}` : `20${dateMatch[3]}`
                      parsedDate = `${yr}-${dateMatch[2]}-${dateMatch[1]}`
                    }
                    lastEvent = {
                      name: eventMatch[3].trim(),
                      url: `https://rank.worldcroquet.org/gcrankdg/${eventMatch[2]}`,
                      date: parsedDate,
                    }
                    lastGames = []
                    continue
                  }

                  const gameMatch = row.match(
                    /<td>\s*(\d+)\s*<\/td><td[^>]*>\s*(<b>)?\s*(beat|lost to)\s*(<\/b>)?\s*<\/td><td[^>]*>.*?pffn=([^&"]+)&pfsn=([^&"]+?)(?:&[^"]*)?">([^<]+)<\/b>?<\/td><td[^>]*>([^<]+)<\/td><td[^>]*>(\d+)<\/td><td[^>]*>(\d+)<\/td><td[^>]*>(\d+)<\/td><td[^>]*>(\d+)<\/td><td[^>]*>([^<]*)<\/td>/
                  )
                  if (gameMatch && lastEvent) {
                    const scoreParts = gameMatch[8].trim().split('-')
                    const egradeVal = parseInt(gameMatch[11])
                    const oppEgradeVal = parseInt(gameMatch[12])
                    lastGames.push({
                      year: now.getFullYear(),
                      game_number: parseInt(gameMatch[1]),
                      event_number: 0,
                      event_name: lastEvent.name,
                      event_url: lastEvent.url,
                      event_date: lastEvent.date,
                      result: gameMatch[3].trim() === 'beat' ? 'win' : 'loss',
                      score: gameMatch[8].trim(),
                      player_score: parseInt(scoreParts[0]) || null,
                      opponent_score: parseInt(scoreParts[1]) || null,
                      opponent_first_name: decodeURIComponent(gameMatch[5].replace(/\+/g, ' ')).trim(),
                      opponent_last_name: decodeURIComponent(gameMatch[6].replace(/\+/g, ' ')).trim(),
                      opponent_wcf_url: `https://rank.worldcroquet.org/gcrankdg/player_full.php?pffn=${gameMatch[5]}&pfsn=${gameMatch[6]}&nt=1`,
                      dgrade_after: parseInt(gameMatch[9]),
                      egrade_after: egradeVal > 0 ? egradeVal : null,
                      opp_dgrade_after: parseInt(gameMatch[10]),
                      opp_egrade_after: oppEgradeVal > 0 ? oppEgradeVal : null,
                      round_detail: gameMatch[13].trim() || null,
                      is_imported: false,
                    })
                  }
                }

                // Process last event
                if (lastEvent && lastGames.length > 0) {
                  for (const g of lastGames) {
                    await supabase.from('wcf_player_games').upsert({
                      ...g,
                      wcf_player_id: existing.id,
                    }, { onConflict: 'wcf_player_id,year,game_number' })
                  }
                  eventName = lastEvent.name
                  eventUrl = lastEvent.url
                  eventDate = lastEvent.date
                }
              } catch {
                // Silent fail — still write basic history record
              }
            }

            await supabase.from('wcf_dgrade_history').insert({
              wcf_player_id: existing.id,
              dgrade_value: player.dgrade,
              egrade_value: egrade,
              world_ranking: player.world_ranking,
              recorded_at: nowISO,
              event_name: eventName,
              event_url: eventUrl,
              event_date: eventDate ? new Date(eventDate).toISOString() : null,
            })
            if (existing.linked_user_id && dgradeChanged) {
              await supabase.from('profiles').update({
                dgrade: player.dgrade,
                dgrade_last_synced_at: nowISO,
              }).eq('id', existing.linked_user_id)
              await supabase.from('dgrade_history').insert({
                user_id: existing.linked_user_id,
                dgrade_value: player.dgrade,
              })
            }
          } else if (existing.linked_user_id) {
            await supabase.from('profiles').update({
              dgrade_last_synced_at: nowISO,
            }).eq('id', existing.linked_user_id)
          }

          await supabase
            .from('wcf_players')
            .update({
              ...player,
              egrade,
              last_synced_at: nowISO,
              ...(dgradeChanged && existing.history_imported ? { history_imported: false } : {}),
            })
            .eq('id', existing.id)
          updated++
        } else {
          const { data: newPlayer, error: insertError } = await supabase
            .from('wcf_players')
            .insert({ ...player, egrade, last_synced_at: nowISO })
            .select('id')
            .maybeSingle()
          if (insertError && insertError.code === '23505') {
            const { data: racePlayer } = await supabase
              .from('wcf_players')
              .select('id, dgrade, linked_user_id')
              .eq('wcf_first_name', player.wcf_first_name)
              .eq('wcf_last_name', player.wcf_last_name)
              .maybeSingle()
            if (racePlayer) {
              await supabase
                .from('wcf_players')
                .update({ ...player, egrade, last_synced_at: nowISO })
                .eq('id', racePlayer.id)
              updated++
            }
          } else if (newPlayer) {
            await supabase.from('wcf_dgrade_history').insert({
              wcf_player_id: newPlayer.id,
              dgrade_value: player.dgrade,
              egrade_value: egrade,
              world_ranking: player.world_ranking,
              recorded_at: nowISO,
            })
            created++
          }
        }
      }))
    }

    if (isMonthly) {
      await writeMonthlySnapshots(nowISO)
      await writeCountrySnapshot(activeYear, snapshotDate)
    }

    await supabase.from('sync_log').update({
      status: 'complete',
      total: players.length,
      created,
      updated,
      completed_at: nowISO,
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

  const { data: log } = await supabase
    .from('sync_log')
    .insert({ status: 'running', started_at: new Date().toISOString() })
    .select('id')
    .single()

  if (!log) {
    return NextResponse.json({ error: 'Failed to create sync log' }, { status: 500 })
  }

  await runSync(log.id)

  return NextResponse.json({ started: true, logId: log.id })
}
