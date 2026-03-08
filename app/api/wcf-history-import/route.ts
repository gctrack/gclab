import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

// Parse player_full.php to get years, playcode, revised starting grade
function parseProfilePage(html: string): {
  years: number[]
  firstName: string
  lastName: string
  revisedStartingGrade: number | null
  originalStartingGrade: number | null
} {
  const years: number[] = []

  // Extract years from links like player.php?year=2025&pfn=...
  const yearMatches = html.matchAll(/player\.php\?year=(\d{4})&pfn=/g)
  for (const m of yearMatches) {
    const y = parseInt(m[1])
    if (!years.includes(y)) years.push(y)
  }
  years.sort((a, b) => a - b)

  // Extract name from title
  const titleMatch = html.match(/<title>.*?for\s+(\w+)\s+(\w+)/i)
  const firstName = titleMatch?.[1] || ''
  const lastName = titleMatch?.[2] || ''

  // Extract revised starting grade (prefer revised over original)
  const revisedMatch = html.match(/[Rr]evised\s+starting\s+grade[^\d]*(\d+)/i)
  const originalMatch = html.match(/[Oo]riginal\s+starting\s+grade[^\d]*(\d+)/i)

  return {
    years,
    firstName,
    lastName,
    revisedStartingGrade: revisedMatch ? parseInt(revisedMatch[1]) : null,
    originalStartingGrade: originalMatch ? parseInt(originalMatch[1]) : null,
  }
}

// Parse DD.MM.YY date format
function parseEventDate(dateStr: string): string | null {
  const m = dateStr.trim().match(/^(\d{2})\.(\d{2})\.(\d{2})$/)
  if (!m) return null
  const day = m[1], month = m[2], yr = m[3]
  const fullYear = parseInt(yr) >= 80 ? `19${yr}` : `20${yr}`
  return `${fullYear}-${month}-${day}`
}

// Parse player.php?year=YYYY — returns all games grouped by event
function parseYearPage(html: string, year: number): {
  games: any[]
  eventSnapshots: any[]
} {
  const games: any[] = []
  const eventSnapshots: any[] = []

  const rows = html.split('<tr>')
  let currentEvent: {
    number: number
    name: string
    url: string
    date: string | null
  } | null = null
  let lastGameInEvent: any = null

  for (const row of rows) {
    // Event header row — has event number, name, date
    const eventMatch = row.match(
      /<td>&nbsp\s*<\/td><td><b>(\d+)<\/b><\/td><td><b>\s*<a href\s*=\s*"(event\.php\?[^"]+)">\s*([^<]+?)\s*<\/a><\/b><\/td><td><b>(\d{2}\.\d{2}\.\d{2})<\/b>/
    )
    if (eventMatch) {
      // Save snapshot for previous event
      if (currentEvent && lastGameInEvent) {
        eventSnapshots.push({
          event_number: currentEvent.number,
          event_name: currentEvent.name,
          event_url: `https://rank.worldcroquet.org/gcrankdg/${currentEvent.url}`,
          event_date: currentEvent.date,
          dgrade_after: lastGameInEvent.dgrade_after,
          egrade_after: lastGameInEvent.egrade_after,
        })
      }
      currentEvent = {
        number: parseInt(eventMatch[1]),
        name: eventMatch[3].trim(),
        url: eventMatch[2],
        date: parseEventDate(eventMatch[4]),
      }
      lastGameInEvent = null
      continue
    }

    // Game row — has game number, result, opponent, score, grades
    const gameMatch = row.match(
      /<td>\s*(\d+)\s*<\/td><td[^>]*>\s*(<b>)?\s*(beat|lost to)\s*(<\/b>)?\s*<\/td><td[^>]*>.*?pffn=([^&"]+)&pfsn=([^&"]+?)(?:&[^"]*)?">([^<]+)<\/b>?<\/td><td[^>]*>([^<]+)<\/td><td[^>]*>(\d+)<\/td><td[^>]*>(\d+)<\/td><td[^>]*>(\d+)<\/td><td[^>]*>(\d+)<\/td><td[^>]*>([^<]*)<\/td>/
    )
    if (gameMatch && currentEvent) {
      const gameNumber = parseInt(gameMatch[1])
      const resultRaw = gameMatch[3].trim()
      const result = resultRaw === 'beat' ? 'win' : 'loss'
      const oppFirst = decodeURIComponent(gameMatch[5].replace(/\+/g, ' ')).trim()
      const oppLast = decodeURIComponent(gameMatch[6].replace(/\+/g, ' ')).trim()
      const scoreRaw = gameMatch[8].trim()
      const scoreParts = scoreRaw.split('-')
      const playerScore = parseInt(scoreParts[0]) || null
      const oppScore = parseInt(scoreParts[1]) || null
      const dgradeAfter = parseInt(gameMatch[9])
      const oppDgradeAfter = parseInt(gameMatch[10])
      const egradeAfter = parseInt(gameMatch[11])
      const oppEgradeAfter = parseInt(gameMatch[12])
      const roundDetail = gameMatch[13].trim()

      const game = {
        year,
        game_number: gameNumber,
        event_number: currentEvent.number,
        event_name: currentEvent.name,
        event_url: `https://rank.worldcroquet.org/gcrankdg/${currentEvent.url}`,
        event_date: currentEvent.date,
        result,
        score: scoreRaw,
        player_score: playerScore,
        opponent_score: oppScore,
        opponent_first_name: oppFirst,
        opponent_last_name: oppLast,
        opponent_wcf_url: `https://rank.worldcroquet.org/gcrankdg/player_full.php?pffn=${gameMatch[5]}&pfsn=${gameMatch[6]}&nt=1`,
        dgrade_after: dgradeAfter,
        egrade_after: egradeAfter > 0 ? egradeAfter : null,
        opp_dgrade_after: oppDgradeAfter,
        opp_egrade_after: oppEgradeAfter > 0 ? oppEgradeAfter : null,
        round_detail: roundDetail || null,
      }

      games.push(game)
      lastGameInEvent = game
    }
  }

  // Save snapshot for final event
  if (currentEvent && lastGameInEvent) {
    eventSnapshots.push({
      event_number: currentEvent.number,
      event_name: currentEvent.name,
      event_url: `https://rank.worldcroquet.org/gcrankdg/${currentEvent.url}`,
      event_date: currentEvent.date,
      dgrade_after: lastGameInEvent.dgrade_after,
      egrade_after: lastGameInEvent.egrade_after,
    })
  }

  return { games, eventSnapshots }
}

export async function POST(request: Request) {
  try {
    const { wcf_player_id } = await request.json()
    if (!wcf_player_id) {
      return NextResponse.json({ error: 'wcf_player_id required' }, { status: 400 })
    }

    // Auth check — must be logged in
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')

    // Allow cron secret for batch imports from GitHub Actions
    const isCron = token === process.env.CRON_SECRET
    if (!isCron) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Look up the WCF player
    const { data: player, error: playerError } = await supabase
      .from('wcf_players')
      .select('id, wcf_first_name, wcf_last_name, wcf_profile_url')
      .eq('id', wcf_player_id)
      .single()

    if (playerError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    // Use streaming response to send progress updates
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }

        try {
          send({ step: 'profile', message: 'Fetching WCF profile...' })

          // Fetch profile page
          const profileUrl = `https://rank.worldcroquet.org/gcrankdg/player_full.php?pffn=${encodeURIComponent(player.wcf_first_name)}&pfsn=${encodeURIComponent(player.wcf_last_name)}&nt=1`
          const profileHtml = await fetchWithTimeout(profileUrl)
          const profile = parseProfilePage(profileHtml)

          if (profile.years.length === 0) {
            send({ step: 'error', message: 'No years found on WCF profile' })
            controller.close()
            return
          }

          const startingGrade = profile.revisedStartingGrade || profile.originalStartingGrade
          send({
            step: 'profile_done',
            message: `Found ${profile.years.length} years of history (${profile.years[0]}–${profile.years[profile.years.length - 1]})`,
            years: profile.years,
            startingGrade,
          })

          // Clear existing imported data for re-import
          await supabase
            .from('wcf_player_games')
            .delete()
            .eq('wcf_player_id', wcf_player_id)
            .eq('is_imported', true)

          await supabase
            .from('wcf_dgrade_history')
            .delete()
            .eq('wcf_player_id', wcf_player_id)
            .eq('is_imported', true)

          // Write starting grade as first history point if available
          if (startingGrade && profile.years.length > 0) {
            const startYear = profile.years[0]
            await supabase.from('wcf_dgrade_history').insert({
              wcf_player_id,
              dgrade_value: startingGrade,
              recorded_at: `${startYear}-01-01T00:00:00Z`,
              is_imported: true,
              event_name: 'Starting Grade',
            })
          }

          let totalGames = 0

          // Process each year
          for (const year of profile.years) {
            send({ step: 'year', message: `Importing ${year}...`, year })

            try {
              const yearUrl = `https://rank.worldcroquet.org/gcrankdg/player.php?year=${year}&pfn=${encodeURIComponent(player.wcf_first_name)}&psn=${encodeURIComponent(player.wcf_last_name)}&nt=1&pid=`
              const yearHtml = await fetchWithTimeout(yearUrl)
              const { games, eventSnapshots } = parseYearPage(yearHtml, year)

              if (games.length === 0) {
                send({ step: 'year_done', message: `${year}: No games found`, year, games: 0 })
                continue
              }

              // Write all games for this year
              const gamesWithPlayer = games.map(g => ({ ...g, wcf_player_id }))
              const BATCH = 50
              for (let i = 0; i < gamesWithPlayer.length; i += BATCH) {
                await supabase.from('wcf_player_games').insert(gamesWithPlayer.slice(i, i + BATCH))
              }

              // Write event-level snapshots to dgrade_history
              for (const snapshot of eventSnapshots) {
                if (!snapshot.event_date) continue
                await supabase.from('wcf_dgrade_history').insert({
                  wcf_player_id,
                  dgrade_value: snapshot.dgrade_after,
                  egrade_value: snapshot.egrade_after,
                  recorded_at: `${snapshot.event_date}T12:00:00Z`,
                  is_imported: true,
                  event_name: snapshot.event_name,
                  event_url: snapshot.event_url,
                })
              }

              totalGames += games.length
              send({
                step: 'year_done',
                message: `${year}: ${games.length} games across ${eventSnapshots.length} events`,
                year,
                games: games.length,
                events: eventSnapshots.length,
              })
            } catch (yearErr) {
              send({ step: 'year_error', message: `${year}: Failed — ${String(yearErr)}`, year })
            }

            // Small delay between years to be polite to WCF server
            await new Promise(r => setTimeout(r, 300))
          }

          // Mark player as imported
          await supabase
            .from('wcf_players')
            .update({ history_imported: true })
            .eq('id', wcf_player_id)

          send({
            step: 'complete',
            message: `Import complete — ${totalGames} games across ${profile.years.length} years`,
            totalGames,
            years: profile.years.length,
            startingGrade,
          })

        } catch (err) {
          send({ step: 'error', message: `Import failed: ${String(err)}` })
        }

        controller.close()
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
