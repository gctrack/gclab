import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BATCH_SIZE = 8
const DELAY_BETWEEN_PLAYERS_MS = 45000 // 45 seconds

async function fetchWithTimeout(url: string, timeoutMs = 20000): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })
    clearTimeout(timeout)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.text()
  } catch (err) {
    clearTimeout(timeout)
    throw err
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function parseProfilePage(html: string): {
  years: number[]
  firstName: string
  lastName: string
  revisedStartingGrade: number | null
  originalStartingGrade: number | null
} {
  const years: number[] = []
  const yearMatches = html.matchAll(/player\.php\?year=(\d{4})&pfn=/g)
  for (const m of yearMatches) {
    const y = parseInt(m[1])
    if (!years.includes(y)) years.push(y)
  }
  years.sort((a, b) => a - b)

  const titleMatch = html.match(/<title>.*?for\s+(\w+)\s+(\w+)/i)
  const firstName = titleMatch?.[1] || ''
  const lastName = titleMatch?.[2] || ''

  let revisedStartingGrade: number | null = null
  let originalStartingGrade: number | null = null
  const revisedMatch = html.match(/revised.*?starting.*?grade.*?(\d{3,4})/i)
  if (revisedMatch) revisedStartingGrade = parseInt(revisedMatch[1])
  const originalMatch = html.match(/original.*?starting.*?grade.*?(\d{3,4})/i)
  if (originalMatch) originalStartingGrade = parseInt(originalMatch[1])

  return { years, firstName, lastName, revisedStartingGrade, originalStartingGrade }
}

function parseYearPage(html: string): {
  games: any[]
  events: { name: string, url: string, date: string, number: number }[]
} {
  const games: any[] = []
  const events: { name: string, url: string, date: string, number: number }[] = []

  const rows = html.split('<tr')
  let currentEvent: { name: string, url: string, date: string, number: number } | null = null

  for (const row of rows) {
    // Event header row
    const eventMatch = row.match(/<b>(\d+)<\/b>[\s\S]*?href="(event\.php[^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<b>(\d{1,2})\.(\d{1,2})\.(\d{2})<\/b>/)
    if (eventMatch) {
      const day = eventMatch[4].padStart(2, '0')
      const month = eventMatch[5].padStart(2, '0')
      const year = parseInt(eventMatch[6]) + 2000
      currentEvent = {
        number: parseInt(eventMatch[1]),
        url: `https://rank.worldcroquet.org/gcrankdg/${eventMatch[2]}`,
        name: eventMatch[3].trim(),
        date: `${year}-${month}-${day}`,
      }
      events.push(currentEvent)
      continue
    }

    // Game row — 9 td columns
    const cells = [...row.matchAll(/<td[^>]*>(.*?)<\/td>/gs)].map(m =>
      m[1].replace(/<[^>]+>/g, '').trim()
    )
    if (cells.length < 5) continue

    const gameNum = parseInt(cells[0])
    if (isNaN(gameNum)) continue

    const resultText = cells[1].toLowerCase()
    const result = resultText.includes('beat') ? 'win' : resultText.includes('lost') ? 'loss' : null
    if (!result) continue

    // Opponent link
    const oppMatch = row.match(/href="(player_full\.php[^"]+)"[^>]*>([^<]+)<\/a>/)
    const opponentName = oppMatch?.[2]?.trim() || cells[2]
    const opponentUrl = oppMatch ? `https://rank.worldcroquet.org/gcrankdg/${oppMatch[1]}` : null
    const oppParts = opponentName.split(' ')
    const oppFirst = oppParts[0] || ''
    const oppLast = oppParts.slice(1).join(' ') || ''

    const score = cells[3] || null
    const scoreParts = score?.split('-').map(Number) || []
    const playerScore = result === 'win' ? Math.max(...scoreParts) : Math.min(...scoreParts)
    const opponentScore = result === 'win' ? Math.min(...scoreParts) : Math.max(...scoreParts)

    const dgradeAfter = cells[4] ? parseInt(cells[4]) : null
    const oppDgradeAfter = cells[5] ? parseInt(cells[5]) : null
    const egradeAfter = cells[6] ? parseInt(cells[6]) || null : null
    const oppEgradeAfter = cells[7] ? parseInt(cells[7]) || null : null
    const roundDetail = cells[8] || null

    games.push({
      game_number: gameNum,
      result,
      score,
      player_score: isNaN(playerScore) ? null : playerScore,
      opponent_score: isNaN(opponentScore) ? null : opponentScore,
      opponent_first_name: oppFirst,
      opponent_last_name: oppLast,
      opponent_wcf_url: opponentUrl,
      dgrade_after: isNaN(dgradeAfter!) ? null : dgradeAfter,
      opp_dgrade_after: isNaN(oppDgradeAfter!) ? null : oppDgradeAfter,
      egrade_after: egradeAfter,
      opp_egrade_after: oppEgradeAfter,
      round_detail: roundDetail,
      event_name: currentEvent?.name || null,
      event_url: currentEvent?.url || null,
      event_date: currentEvent?.date || null,
      event_number: currentEvent?.number || null,
    })
  }

  return { games, events }
}

async function importPlayerHistory(player: {
  id: string
  wcf_first_name: string
  wcf_last_name: string
  wcf_profile_url: string | null
}): Promise<{ success: boolean, games: number, years: number, error?: string }> {
  const profileUrl = player.wcf_profile_url ||
    `https://rank.worldcroquet.org/gcrankdg/player_full.php?pffn=${encodeURIComponent(player.wcf_first_name)}&pfsn=${encodeURIComponent(player.wcf_last_name)}&nt=1`

  let profileHtml: string
  try {
    profileHtml = await fetchWithTimeout(profileUrl)
  } catch (err) {
    return { success: false, games: 0, years: 0, error: `Profile fetch failed: ${err}` }
  }

  const { years, revisedStartingGrade, originalStartingGrade } = parseProfilePage(profileHtml)
  if (years.length === 0) {
    return { success: false, games: 0, years: 0, error: 'No years found on profile page' }
  }

  const startingGrade = revisedStartingGrade || originalStartingGrade

  // Clear existing imported data
  await supabase.from('wcf_player_games').delete()
    .eq('wcf_player_id', player.id).eq('is_imported', true)
  await supabase.from('wcf_dgrade_history').delete()
    .eq('wcf_player_id', player.id).eq('is_imported', true)

  // Write starting grade as first history point
  if (startingGrade) {
    const firstYear = years[0]
    await supabase.from('wcf_dgrade_history').upsert({
      wcf_player_id: player.id,
      dgrade_value: startingGrade,
      recorded_at: `${firstYear - 1}-12-31T12:00:00Z`,
      is_imported: true,
      event_name: 'Starting grade',
    }, { onConflict: 'wcf_player_id,recorded_at' })
  }

  let totalGames = 0

  for (const year of years) {
    const yearUrl = `https://rank.worldcroquet.org/gcrankdg/player.php?year=${year}&pfn=${encodeURIComponent(player.wcf_first_name)}&psn=${encodeURIComponent(player.wcf_last_name)}&nt=1`

    try {
      const yearHtml = await fetchWithTimeout(yearUrl)
      const { games, events } = parseYearPage(yearHtml)

      if (games.length === 0) continue

      // Write games
      const gameRows = games.map(g => ({
        wcf_player_id: player.id,
        year,
        is_imported: true,
        ...g,
      }))
      await supabase.from('wcf_player_games').upsert(gameRows, {
        onConflict: 'wcf_player_id,year,game_number',
      })
      totalGames += games.length

      // Write end-of-event history points
      for (const event of events) {
        // Find last game of this event
        const eventGames = games.filter(g => g.event_name === event.name)
        if (eventGames.length === 0) continue
        const lastGame = eventGames[eventGames.length - 1]
        if (!lastGame.dgrade_after) continue

        await supabase.from('wcf_dgrade_history').upsert({
          wcf_player_id: player.id,
          dgrade_value: lastGame.dgrade_after,
          egrade_value: lastGame.egrade_after || null,
          recorded_at: `${event.date}T12:00:00Z`,
          is_imported: true,
          event_name: event.name,
          event_url: event.url,
          event_date: event.date,
        }, { onConflict: 'wcf_player_id,recorded_at' })
      }
    } catch (err) {
      // Log but continue with other years
      console.error(`Year ${year} failed for ${player.wcf_first_name} ${player.wcf_last_name}: ${err}`)
    }

    // Polite delay between year fetches within a single player
    await sleep(300)
  }

  // Mark as imported
  await supabase.from('wcf_players').update({ history_imported: true })
    .eq('id', player.id)

  return { success: true, games: totalGames, years: years.length }
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()

  // Get next batch of players without history, ordered by world_ranking
  const { data: players, error } = await supabase
    .from('wcf_players')
    .select('id, wcf_first_name, wcf_last_name, wcf_profile_url, world_ranking')
    .eq('history_imported', false)
    .not('world_ranking', 'is', null)
    .order('world_ranking', { ascending: true })
    .limit(BATCH_SIZE)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!players || players.length === 0) {
    return NextResponse.json({
      message: 'All players already imported',
      processed: 0,
    })
  }

  const results: any[] = []

  for (let i = 0; i < players.length; i++) {
    const player = players[i]
    console.log(`Importing ${player.wcf_first_name} ${player.wcf_last_name} (rank #${player.world_ranking})`)

    const result = await importPlayerHistory(player)
    results.push({
      player: `${player.wcf_first_name} ${player.wcf_last_name}`,
      rank: player.world_ranking,
      ...result,
    })

    // Delay between players (skip after last one)
    if (i < players.length - 1) {
      await sleep(DELAY_BETWEEN_PLAYERS_MS)
    }
  }

  // Log to sync_log
  const successful = results.filter(r => r.success).length
  const totalGames = results.reduce((sum, r) => sum + (r.games || 0), 0)

  await supabase.from('sync_log').insert({
    status: 'complete',
    started_at: new Date(startTime).toISOString(),
    completed_at: new Date().toISOString(),
    total: players.length,
    created: successful,
    updated: 0,
    notes: `Batch history import: ${successful}/${players.length} succeeded, ${totalGames} games`,
  })

  // Get remaining count
  const { count: remaining } = await supabase
    .from('wcf_players')
    .select('id', { count: 'exact', head: true })
    .eq('history_imported', false)
    .not('world_ranking', 'is', null)

  return NextResponse.json({
    processed: players.length,
    successful,
    totalGames,
    remaining: remaining || 0,
    estimatedDaysLeft: remaining ? Math.ceil((remaining) / (BATCH_SIZE * 24)) : 0,
    results,
    durationMs: Date.now() - startTime,
  })
}
