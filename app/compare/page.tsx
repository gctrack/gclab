// SAVE TO: app/compare/page.tsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import GCLabNav from '@/components/GCLabNav'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend
} from 'recharts'

// ─── Types ───────────────────────────────────────────────────────────────────

type Player = {
  id: string
  wcf_first_name: string
  wcf_last_name: string
  country: string
  dgrade: number
  egrade: number
  world_ranking: number
  games: number
  win_percentage: number
  history_imported: boolean
  wcf_profile_url: string
}

type Game = {
  id: string
  year: number
  event_name: string
  event_date: string
  result: 'win' | 'loss'
  player_score: number
  opponent_score: number
  opponent_first_name: string
  opponent_last_name: string
  dgrade_after: number
  opp_dgrade_after: number
  round_detail: string
}

type HistoryPoint = {
  recorded_at: string
  dgrade_value: number
  is_imported: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const GRADE_BANDS = [
  { label: 'Under 2000', min: 0, max: 1999 },
  { label: '2000–2200', min: 2000, max: 2200 },
  { label: '2201–2399', min: 2201, max: 2399 },
  { label: '2400+', min: 2400, max: 99999 },
]

function getFlag(code: string): string {
  if (!code) return ''
  if (code === 'GB-ENG') return '🏴󠁧󠁢󠁥󠁮󠁧󠁿'
  if (code === 'GB-SCT') return '🏴󠁧󠁢󠁳󠁣󠁴󠁿'
  if (code === 'GB-WLS') return '🏴󠁧󠁢󠁷󠁬󠁳󠁿'
  if (code.length !== 2) return ''
  return code.toUpperCase().split('').map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('')
}

const pct = (wins: number, total: number) =>
  total === 0 ? '—' : `${Math.round((wins / total) * 100)}%`

const winPctNum = (wins: number, total: number) =>
  total === 0 ? 0 : Math.round((wins / total) * 100)

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, a, b, higherIsBetter = true }: {
  label: string; a: string | number; b: string | number; higherIsBetter?: boolean
}) {
  const aNum = parseFloat(String(a))
  const bNum = parseFloat(String(b))
  const aWins = !isNaN(aNum) && !isNaN(bNum) && (higherIsBetter ? aNum > bNum : aNum < bNum)
  const bWins = !isNaN(aNum) && !isNaN(bNum) && (higherIsBetter ? bNum > aNum : bNum < aNum)

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm">
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">{label}</p>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xl font-bold ${aWins ? 'text-green-600' : 'text-gray-700'}`}>{a}</span>
        <span className="text-xs text-gray-300">vs</span>
        <span className={`text-xl font-bold ${bWins ? 'text-blue-600' : 'text-gray-700'}`}>{b}</span>
      </div>
    </div>
  )
}

function BandRow({ label, a, b }: { label: string; a: { w: number; t: number }; b: { w: number; t: number } }) {
  const aPct = winPctNum(a.w, a.t)
  const bPct = winPctNum(b.w, b.t)
  const total = Math.max(aPct, bPct, 1)

  return (
    <div className="py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-500 w-24 shrink-0">{label}</span>
        <div className="flex-1 flex items-center gap-3">
          <span className={`text-sm font-semibold w-10 text-right ${aPct > bPct ? 'text-green-600' : 'text-gray-600'}`}>
            {pct(a.w, a.t)}
          </span>
          <div className="flex-1 relative h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-green-400 rounded-full transition-all"
              style={{ width: `${(aPct / total) * 50}%` }}
            />
            <div
              className="absolute right-0 top-0 h-full bg-blue-400 rounded-full transition-all"
              style={{ width: `${(bPct / total) * 50}%` }}
            />
          </div>
          <span className={`text-sm font-semibold w-10 ${bPct > aPct ? 'text-blue-600' : 'text-gray-600'}`}>
            {pct(b.w, b.t)}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 w-24 shrink-0" />
        <div className="flex-1 flex items-center gap-3">
          <span className="text-xs text-gray-400 w-10 text-right">{a.t}g</span>
          <div className="flex-1" />
          <span className="text-xs text-gray-400 w-10">{b.t}g</span>
        </div>
      </div>
    </div>
  )
}

function PlayerSearch({ label, color, onSelect, selected, exclude }: {
  label: string
  color: 'green' | 'blue'
  onSelect: (p: Player) => void
  selected: Player | null
  exclude: string | null
}) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Player[]>([])
  const timeoutRef = useRef<any>(null)
  const supabase = createClient()

  useEffect(() => {
    if (selected) setQuery(`${selected.wcf_first_name} ${selected.wcf_last_name}`)
  }, [selected])

  const handleChange = (v: string) => {
    setQuery(v)
    if (selected) return
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (v.length < 2) { setSuggestions([]); return }
    timeoutRef.current = setTimeout(async () => {
      const parts = v.trim().split(' ')
      let q = supabase
        .from('wcf_players')
        .select('id, wcf_first_name, wcf_last_name, country, dgrade, egrade, world_ranking, games, win_percentage, history_imported, wcf_profile_url')
        .order('world_ranking', { ascending: true, nullsFirst: false })
        .limit(8)
      if (parts.length >= 2) {
        q = q.ilike('wcf_first_name', `%${parts[0]}%`).ilike('wcf_last_name', `%${parts[parts.length - 1]}%`)
      } else {
        q = q.or(`wcf_first_name.ilike.%${v}%,wcf_last_name.ilike.%${v}%`)
      }
      const { data } = await q
      setSuggestions((data || []).filter((p: Player) => p.id !== exclude))
    }, 250)
  }

  const handleSelect = (p: Player) => {
    onSelect(p)
    setQuery(`${p.wcf_first_name} ${p.wcf_last_name}`)
    setSuggestions([])
  }

  const handleClear = () => {
    setQuery('')
    setSuggestions([])
    onSelect(null as any)
  }

  const accent = color === 'green' ? 'ring-green-500 border-green-300' : 'ring-blue-500 border-blue-300'
  const badge = color === 'green' ? 'bg-green-600' : 'bg-blue-600'

  return (
    <div className="relative">
      <div className={`text-xs font-semibold uppercase tracking-wide mb-2 ${color === 'green' ? 'text-green-700' : 'text-blue-700'}`}>
        {label}
      </div>
      <div className="relative">
        <input
          value={query}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => selected && setQuery('')}
          placeholder="Search player..."
          className={`w-full border rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 ${selected ? `${accent} bg-white` : 'border-gray-300 focus:ring-green-500'}`}
        />
        {selected && (
          <button onClick={handleClear} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        )}
      </div>
      {suggestions.length > 0 && !selected && (
        <div className="absolute top-full left-0 right-0 z-20 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-64 overflow-y-auto">
          {suggestions.map(p => (
            <button key={p.id} onClick={() => handleSelect(p)}
              className="w-full text-left px-3 py-2.5 hover:bg-gray-50 flex items-center justify-between gap-2 border-b border-gray-50 last:border-0">
              <div>
                <span className="text-sm font-medium text-gray-900">{p.wcf_first_name} {p.wcf_last_name}</span>
                <span className="text-xs text-gray-400 ml-2">{getFlag(p.country)} {p.country}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {p.history_imported && <span className="text-xs text-green-500" title="History imported">●</span>}
                <span className="text-xs text-gray-400">#{p.world_ranking}</span>
                <span className="text-xs font-semibold text-gray-700">{p.dgrade}</span>
              </div>
            </button>
          ))}
        </div>
      )}
      {selected && (
        <div className={`mt-2 flex items-center gap-2 text-xs px-2 py-1 rounded-md ${color === 'green' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
          <span>{getFlag(selected.country)}</span>
          <span>#{selected.world_ranking}</span>
          <span>·</span>
          <span>dGrade {selected.dgrade}</span>
          {selected.history_imported && <span className="ml-auto">✓ history</span>}
        </div>
      )}
    </div>
  )
}

// ─── Custom chart tooltip ─────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, nameA, nameB }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} style={{ color: entry.color }} className="font-medium">
          {entry.dataKey === 'a' ? nameA : nameB}: {entry.value}
        </p>
      ))}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────


const ML_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
  .ghl  { font-family: 'Playfair Display', serif; }
  .gmono{ font-family: 'DM Mono', monospace; }
  .gsans{ font-family: 'DM Sans', sans-serif; }
`

export default function ComparePage() {
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [playerA, setPlayerA] = useState<Player | null>(null)
  const [playerB, setPlayerB] = useState<Player | null>(null)
  const [gamesA, setGamesA] = useState<Game[]>([])
  const [gamesB, setGamesB] = useState<Game[]>([])
  const [historyA, setHistoryA] = useState<HistoryPoint[]>([])
  const [historyB, setHistoryB] = useState<HistoryPoint[]>([])
  const [countryStatsA, setCountryStatsA] = useState<any[]>([])
  const [countryStatsB, setCountryStatsB] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [showAllH2H, setShowAllH2H] = useState(false)
  const [winsSortA, setWinsSortA] = useState<'grade' | 'diff'>('grade')
  const [winsSortB, setWinsSortB] = useState<'grade' | 'diff'>('grade')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setSignedIn(false); setLoading(false); return }
      setSignedIn(true)
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setUserProfile(data)
      setLoading(false)
    }
    init()
  }, [])

  const fetchPlayerData = useCallback(async (player: Player, setter: (g: Game[]) => void, historySetter: (h: HistoryPoint[]) => void, countryStatsSetter: (c: any[]) => void) => {
    if (!player.history_imported) return
    const { data: games } = await supabase
      .from('wcf_player_games')
      .select('id, year, event_name, event_date, result, player_score, opponent_score, opponent_first_name, opponent_last_name, dgrade_after, opp_dgrade_after, round_detail')
      .eq('wcf_player_id', player.id)
      .eq('is_imported', true)
      .order('event_date', { ascending: true })
    setter(games || [])

    const { data: history } = await supabase
      .from('wcf_dgrade_history')
      .select('recorded_at, dgrade_value, is_imported')
      .eq('wcf_player_id', player.id)
      .order('recorded_at', { ascending: true })
    historySetter(history || [])

    const { data: countryStats } = await supabase
      .from('wcf_player_country_stats')
      .select('country, games, wins, losses, win_percentage')
      .eq('wcf_player_id', player.id)
      .order('games', { ascending: false })
    if (countryStats) countryStatsSetter(countryStats)
  }, [])

  useEffect(() => {
    if (!playerA && !playerB) return
    setLoadingData(true)
    const promises = []
    if (playerA) promises.push(fetchPlayerData(playerA, setGamesA, setHistoryA, setCountryStatsA))
    else { setGamesA([]); setHistoryA([]); setCountryStatsA([]) }
    if (playerB) promises.push(fetchPlayerData(playerB, setGamesB, setHistoryB, setCountryStatsB))
    else { setGamesB([]); setHistoryB([]); setCountryStatsB([]) }
    Promise.all(promises).then(() => setLoadingData(false))
  }, [playerA, playerB])

  // ── Derived stats ────────────────────────────────────────────────────────

  // Head to head
  const h2hGames = gamesA.filter(g =>
    g.opponent_first_name === playerB?.wcf_first_name &&
    g.opponent_last_name === playerB?.wcf_last_name
  )
  const h2hWins = h2hGames.filter(g => g.result === 'win').length
  const h2hLosses = h2hGames.filter(g => g.result === 'loss').length

  // Win % by year
  const yearStats = (games: Game[]) => {
    const map: Record<number, { w: number; t: number }> = {}
    for (const g of games) {
      if (!map[g.year]) map[g.year] = { w: 0, t: 0 }
      map[g.year].t++
      if (g.result === 'win') map[g.year].w++
    }
    return map
  }
  const yearA = yearStats(gamesA)
  const yearB = yearStats(gamesB)
  const allYears = Array.from(new Set([...Object.keys(yearA), ...Object.keys(yearB)]))
    .map(Number).sort((a, b) => a - b)

  const yearChartData = allYears.map(y => ({
    year: String(y),
    a: yearA[y] ? winPctNum(yearA[y].w, yearA[y].t) : null,
    b: yearB[y] ? winPctNum(yearB[y].w, yearB[y].t) : null,
  }))

  // Performance vs grade bands
  const bandStats = (games: Game[]) => GRADE_BANDS.map(band => {
    const relevant = games.filter(g => g.opp_dgrade_after >= band.min && g.opp_dgrade_after <= band.max)
    const wins = relevant.filter(g => g.result === 'win').length
    return { w: wins, t: relevant.length }
  })
  const bandsA = bandStats(gamesA)
  const bandsB = bandStats(gamesB)

  // Recent form (last 10/20/50)
  const recentForm = (games: Game[], n: number) => {
    const last = [...games].slice(-n)
    const wins = last.filter(g => g.result === 'win').length
    return { w: wins, t: last.length }
  }

  // Peak dGrade
  const peakGrade = (games: Game[]) =>
    games.length ? Math.max(...games.map(g => g.dgrade_after)) : null

  // Streaks
  const streaks = (games: Game[]) => {
    let maxWin = 0, maxLoss = 0, curWin = 0, curLoss = 0
    for (const g of games) {
      if (g.result === 'win') { curWin++; curLoss = 0; maxWin = Math.max(maxWin, curWin) }
      else { curLoss++; curWin = 0; maxLoss = Math.max(maxLoss, curLoss) }
    }
    return { maxWin, maxLoss }
  }
  const streakA = streaks(gamesA)
  const streakB = streaks(gamesB)

  // Best wins — with pre-game grades (same logic as dashboard)
  const withBefore = (games: Game[]) => games.map((g, i) => {
    const prev = i > 0 ? games[i - 1] : null
    const myGradeBefore = prev?.dgrade_after || g.dgrade_after
    const prevOpp = games.slice(0, i).reverse().find(pg =>
      pg.opponent_first_name === g.opponent_first_name &&
      pg.opponent_last_name === g.opponent_last_name
    )
    const oppGradeBefore = prevOpp?.opp_dgrade_after || g.opp_dgrade_after
    return { ...g, myGradeBefore, oppGradeBefore, diff: (oppGradeBefore || 0) - (myGradeBefore || 0) }
  })
  const gamesAWithBefore = withBefore(gamesA)
  const gamesBWithBefore = withBefore(gamesB)
  const topWins = (enriched: typeof gamesAWithBefore, sortBy: 'grade' | 'diff') => {
    const wins = enriched.filter(g => g.result === 'win' && g.oppGradeBefore)
    if (sortBy === 'grade') return [...wins].sort((a, b) => (b.oppGradeBefore || 0) - (a.oppGradeBefore || 0)).slice(0, 5)
    return [...wins].filter(g => g.diff > 0).sort((a, b) => b.diff - a.diff).slice(0, 5)
  }

  // Common opponents
  const commonOpponents = () => {
    if (!gamesA.length || !gamesB.length) return []
    const oppMapA: Record<string, { w: number; t: number }> = {}
    for (const g of gamesA) {
      const key = `${g.opponent_first_name} ${g.opponent_last_name}`
      if (!oppMapA[key]) oppMapA[key] = { w: 0, t: 0 }
      oppMapA[key].t++
      if (g.result === 'win') oppMapA[key].w++
    }
    const oppMapB: Record<string, { w: number; t: number }> = {}
    for (const g of gamesB) {
      const key = `${g.opponent_first_name} ${g.opponent_last_name}`
      if (!oppMapB[key]) oppMapB[key] = { w: 0, t: 0 }
      oppMapB[key].t++
      if (g.result === 'win') oppMapB[key].w++
    }
    return Object.keys(oppMapA)
      .filter(k => oppMapB[k])
      .map(k => ({ name: k, a: oppMapA[k], b: oppMapB[k] }))
      .sort((x, y) => Math.min(y.a.t, y.b.t) - Math.min(x.a.t, x.b.t))
      .slice(0, 10)
  }
  const commonOpps = commonOpponents()

  // dGrade chart overlay
  const gradeChartData = (() => {
    if (!historyA.length && !historyB.length) return []
    const allDates = new Set([
      ...historyA.map(h => h.recorded_at.slice(0, 10)),
      ...historyB.map(h => h.recorded_at.slice(0, 10)),
    ])
    const mapA = new Map(historyA.map(h => [h.recorded_at.slice(0, 10), h.dgrade_value]))
    const mapB = new Map(historyB.map(h => [h.recorded_at.slice(0, 10), h.dgrade_value]))
    let lastA: number | null = null, lastB: number | null = null
    return Array.from(allDates).sort().map(date => {
      if (mapA.has(date)) lastA = mapA.get(date)!
      if (mapB.has(date)) lastB = mapB.get(date)!
      return { date: date.slice(0, 7), a: lastA, b: lastB }
    }).filter((_, i, arr) => i === 0 || arr[i].date !== arr[i - 1].date)
  })()

  const hasData = gamesA.length > 0 || gamesB.length > 0
  const bothHaveData = gamesA.length > 0 && gamesB.length > 0
  const nameA = playerA ? `${playerA.wcf_first_name} ${playerA.wcf_last_name}` : 'Player A'
  const nameB = playerB ? `${playerB.wcf_first_name} ${playerB.wcf_last_name}` : 'Player B'

  if (loading || signedIn === null) return <div style={{ minHeight: "100vh", background: "#0d2818", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(232,224,208,0.3)" }}><style dangerouslySetInnerHTML={{ __html: ML_STYLES }}/>Loading…</div>

  if (!signedIn) return (
    <div style={{ minHeight: "100vh", background: "#f5f2ec", display: "flex", flexDirection: "column" }}>
      <style dangerouslySetInnerHTML={{ __html: ML_STYLES }}/>
      <GCLabNav role="" isSignedIn={false} currentPath="/compare" />
      <div className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="relative w-full max-w-lg">
          <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm" style={{ filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none' }}>
            <div className="p-5 border-b border-gray-100 bg-gray-50 flex gap-3">
              <div className="flex-1 h-9 bg-gray-200 rounded-lg"/>
              <div className="w-8 h-9 bg-green-200 rounded-lg"/>
              <div className="flex-1 h-9 bg-gray-200 rounded-lg"/>
            </div>
            <div className="p-5 bg-white">
              <svg width="100%" height="160" viewBox="0 0 600 160">
                <defs>
                  <linearGradient id="cg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#16a34a" stopOpacity="0.25"/><stop offset="100%" stopColor="#16a34a" stopOpacity="0.02"/></linearGradient>
                  <linearGradient id="cg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2"/><stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02"/></linearGradient>
                </defs>
                {([30,70,110,150] as number[]).map((y) => <line key={y} x1="0" y1={y} x2="600" y2={y} stroke="#e5e7eb" strokeWidth="1"/>)}
                <path d="M0,130 C60,110 120,70 180,55 C240,40 300,35 360,45 C420,55 480,80 540,100 C570,110 590,120 600,125 L600,160 L0,160 Z" fill="url(#cg1)"/>
                <path d="M0,130 C60,110 120,70 180,55 C240,40 300,35 360,45 C420,55 480,80 540,100 C570,110 590,120 600,125" fill="none" stroke="#16a34a" strokeWidth="2.5"/>
                <path d="M0,145 C60,135 120,100 180,85 C240,70 300,65 360,75 C420,85 480,105 540,120 C570,128 590,135 600,138 L600,160 L0,160 Z" fill="url(#cg2)"/>
                <path d="M0,145 C60,135 120,100 180,85 C240,70 300,65 360,75 C420,85 480,105 540,120 C570,128 590,135 600,138" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="5 3"/>
                <circle cx="300" cy="35" r="5" fill="#16a34a"/>
                <circle cx="300" cy="65" r="5" fill="#3b82f6"/>
              </svg>
            </div>
            <div className="p-5 border-t border-gray-100 grid grid-cols-3 gap-3">
              {[{c:'bg-green-50',w:'w-16'},{c:'bg-blue-50',w:'w-20'},{c:'bg-gray-50',w:'w-14'}].map(({c,w},i) => (
                <div key={i} className={`${c} rounded-lg p-3`}><div className={`h-6 ${w} bg-white/80 rounded mb-1`}/><div className="h-3 w-12 bg-white/60 rounded"/></div>
              ))}
            </div>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm rounded-2xl">
            <div className="text-center px-8 py-10 max-w-sm">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5 text-2xl">⚔️</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Compare any two players</h2>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">Head-to-head grade history, win rates, performance trends. Pick any two players and see how they stack up over time.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a href="/login?mode=signup" className="bg-green-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition text-center">Create free account</a>
                <a href="/login" className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:border-green-500 hover:text-green-700 transition text-center">Sign in</a>
              </div>
              <p className="text-xs text-gray-400 mt-4">Free · No credit card · 30 seconds</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: "#f5f2ec" }}>
      <style dangerouslySetInnerHTML={{ __html: ML_STYLES }}/>
      <GCLabNav role={userProfile?.role} isSignedIn={true} currentPath="/compare" />

      {/* Dark ML header with player search */}
      <div style={{ background: "#0d2818", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse at 80% 0%, rgba(74,222,128,0.07) 0%, transparent 55%)" }}/>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "linear-gradient(rgba(255,255,255,0.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.012) 1px,transparent 1px)", backgroundSize: "44px 44px" }}/>
        <div style={{ maxWidth: "80rem", margin: "0 auto", padding: "36px 24px 32px", position: "relative", zIndex: 1 }}>
          <h2 className="ghl" style={{ fontSize: "clamp(24px,3vw,40px)", color: "#e8e0d0", fontWeight: 900, marginBottom: 8, letterSpacing: "-0.5px" }}>Compare Players</h2>
          <p className="gsans" style={{ fontSize: 14, color: "rgba(232,224,208,0.5)", marginBottom: 24 }}>Head to head stats, grade history and career comparisons.</p>
          <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 24 }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <PlayerSearch label="Player 1" color="green" selected={playerA}
                onSelect={(p) => { setPlayerA(p); setGamesA([]); setHistoryA([]) }}
                exclude={playerB?.id || null} />
              <PlayerSearch label="Player 2" color="blue" selected={playerB}
                onSelect={(p) => { setPlayerB(p); setGamesB([]); setHistoryB([]) }}
                exclude={playerA?.id || null} />
            </div>
            {loadingData && (
              <p className="gsans" style={{ fontSize: 12, color: "rgba(232,224,208,0.35)", textAlign: "center", marginTop: 16 }}>Loading player data...</p>
            )}
          </div>
        </div>
        <div style={{ height: 24, background: "linear-gradient(180deg, #0d2818 0%, #f5f2ec 100%)" }}/>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">

        {/* Placeholder */}
        {!playerA && !playerB && (
          <div className="text-center py-20 text-gray-300">
            <p className="text-5xl mb-4">⚔️</p>
            <p className="text-lg font-medium text-gray-400">Select two players to compare</p>
            <p className="text-sm mt-1">Players with a green dot have full history imported</p>
          </div>
        )}

        {(playerA || playerB) && (
          <div className="space-y-6">

            {/* Overview cards */}
            <section>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Overview</h3>

              {/* Player name headers */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="text-center">
                  <p className="font-semibold text-green-700 truncate">{nameA}</p>
                  {playerA && <p className="text-xs text-gray-400">{getFlag(playerA.country)} {playerA.country}</p>}
                </div>
                <div className="text-center">
                  <p className="font-semibold text-blue-700 truncate">{nameB}</p>
                  {playerB && <p className="text-xs text-gray-400">{getFlag(playerB.country)} {playerB.country}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <StatCard label="World Ranking" a={playerA ? `#${playerA.world_ranking}` : '—'} b={playerB ? `#${playerB.world_ranking}` : '—'} higherIsBetter={false} />
                <StatCard label="dGrade" a={playerA?.dgrade ?? '—'} b={playerB?.dgrade ?? '—'} />
                <StatCard label="eGrade" a={playerA?.egrade || '—'} b={playerB?.egrade || '—'} />
                <StatCard label="Win % (career)" a={playerA ? `${playerA.win_percentage}%` : '—'} b={playerB ? `${playerB.win_percentage}%` : '—'} />
                <StatCard label="Total Games" a={playerA?.games ?? '—'} b={playerB?.games ?? '—'} />
                <StatCard label="Peak dGrade" a={peakGrade(gamesA) ?? (playerA?.dgrade ?? '—')} b={peakGrade(gamesB) ?? (playerB?.dgrade ?? '—')} />
                <StatCard label="Longest Win Streak" a={streakA.maxWin || '—'} b={streakB.maxWin || '—'} />
                <StatCard label="Longest Loss Streak" a={streakA.maxLoss || '—'} b={streakB.maxLoss || '—'} higherIsBetter={false} />
              </div>
            </section>

            {/* Head to Head */}
            {bothHaveData && (
              <section>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Head to Head</h3>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                  {h2hGames.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">No direct matches found in imported data</p>
                  ) : (
                    <>
                      {/* H2H summary */}
                      <div className="flex items-center justify-center gap-8 mb-6">
                        <div className="text-center">
                          <p className="text-4xl font-bold text-green-600">{h2hWins}</p>
                          <p className="text-xs text-gray-400 mt-1">{nameA.split(' ')[0]} wins</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-semibold text-gray-300">—</p>
                        </div>
                        <div className="text-center">
                          <p className="text-4xl font-bold text-blue-600">{h2hLosses}</p>
                          <p className="text-xs text-gray-400 mt-1">{nameB.split(' ')[0]} wins</p>
                        </div>
                      </div>

                      {/* H2H game log */}
                      <div className="space-y-1.5">
                        {(showAllH2H ? h2hGames : h2hGames.slice(-5)).map(g => (
                          <div key={g.id} className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg ${g.result === 'win' ? 'bg-green-50' : 'bg-blue-50'}`}>
                            <span className={`font-semibold w-8 ${g.result === 'win' ? 'text-green-700' : 'text-blue-700'}`}>
                              {g.result === 'win' ? 'W' : 'L'}
                            </span>
                            <span className="text-gray-600 flex-1">{g.event_name}</span>
                            <span className="text-gray-500 font-mono">{g.player_score}–{g.opponent_score}</span>
                            <span className="text-gray-400 ml-3 w-16 text-right">{g.event_date?.slice(0, 7)}</span>
                          </div>
                        ))}
                      </div>
                      {h2hGames.length > 5 && (
                        <button onClick={() => setShowAllH2H(p => !p)}
                          className="mt-3 text-xs text-gray-400 hover:text-gray-600 w-full text-center">
                          {showAllH2H ? 'Show less' : `Show all ${h2hGames.length} matches`}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </section>
            )}

            {/* Best Wins */}
            {(gamesA.length > 0 || gamesB.length > 0) && (
              <section>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Best Wins</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {([
                    { name: nameA, enriched: gamesAWithBefore, sort: winsSortA, setSort: setWinsSortA, color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-100' },
                    { name: nameB, enriched: gamesBWithBefore, sort: winsSortB, setSort: setWinsSortB, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-100' },
                  ]).map(({ name, enriched, sort, setSort, color, bg, border }) => {
                    const wins = topWins(enriched, sort)
                    return (
                      <div key={name} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className={`px-4 py-3 border-b ${border} ${bg} flex items-center justify-between gap-2 flex-wrap`}>
                          <span className={`font-semibold text-sm ${color}`}>{name}</span>
                          <div className="flex gap-1.5">
                            {(['grade', 'diff'] as const).map(s => (
                              <button key={s} onClick={() => setSort(s)}
                                className={`text-xs px-2.5 py-1 rounded-full border transition ${sort === s ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}>
                                {s === 'grade' ? 'Top Grade' : 'Biggest Upset'}
                              </button>
                            ))}
                          </div>
                        </div>
                        {wins.length === 0 ? (
                          <p className="text-sm text-gray-400 p-4 text-center">No wins on record</p>
                        ) : (
                          <div>
                            <div className="grid grid-cols-[20px_1fr_56px_56px_48px] px-4 py-2 bg-gray-50 border-b border-gray-100">
                              {['', 'Opponent', 'You', 'Them', 'Score'].map(h => (
                                <span key={h} className="text-xs text-gray-400 uppercase tracking-wide font-medium">{h}</span>
                              ))}
                            </div>
                            {wins.map((g, i) => (
                              <div key={i} className="grid grid-cols-[20px_1fr_56px_56px_48px] px-4 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 items-center">
                                <span className="text-xs text-gray-300 font-mono">#{i+1}</span>
                                <div>
                                  <div className="text-sm text-gray-800 font-medium">{g.opponent_first_name} {g.opponent_last_name}</div>
                                  {g.event_name && <div className="text-xs text-gray-400 mt-0.5">{g.event_name}{g.event_date ? ` · ${g.event_date.slice(0,4)}` : ''}</div>}
                                </div>
                                <span className="text-xs font-mono text-gray-600">{g.myGradeBefore}</span>
                                <div>
                                  <span className="text-xs font-mono text-red-500 font-semibold">{g.oppGradeBefore}</span>
                                  {g.diff > 0 && <span className="text-xs font-mono text-red-400 ml-1">-{g.diff}</span>}
                                </div>
                                <span className="text-xs font-mono text-green-600 font-semibold">{g.player_score ?? 0}–{g.opponent_score ?? 0}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* dGrade chart */}
            {gradeChartData.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">dGrade History</h3>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={gradeChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false}
                        interval={Math.floor(gradeChartData.length / 6)} />
                      <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false}
                        domain={['auto', 'auto']} width={45} />
                      <Tooltip content={<ChartTooltip nameA={nameA} nameB={nameB} />} />
                      <Legend formatter={(v) => v === 'a' ? nameA : nameB} />
                      {playerA && <Line type="monotone" dataKey="a" stroke="#16a34a" strokeWidth={2} dot={false} connectNulls name="a" />}
                      {playerB && <Line type="monotone" dataKey="b" stroke="#2563eb" strokeWidth={2} dot={false} connectNulls name="b" />}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}

            {/* Win % by year */}
            {yearChartData.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Win % by Year</h3>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={yearChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false}
                        domain={[0, 100]} tickFormatter={v => `${v}%`} width={40} />
                      <ReferenceLine y={50} stroke="#e5e7eb" strokeDasharray="4 4" />
                      <Tooltip content={<ChartTooltip nameA={nameA} nameB={nameB} />} formatter={(v: any) => `${v}%`} />
                      <Legend formatter={(v) => v === 'a' ? nameA : nameB} />
                      {gamesA.length > 0 && <Line type="monotone" dataKey="a" stroke="#16a34a" strokeWidth={2} dot={{ r: 3, fill: '#16a34a' }} connectNulls name="a" />}
                      {gamesB.length > 0 && <Line type="monotone" dataKey="b" stroke="#2563eb" strokeWidth={2} dot={{ r: 3, fill: '#2563eb' }} connectNulls name="b" />}
                    </LineChart>
                  </ResponsiveContainer>
                  {/* Year table */}
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left text-gray-400 font-medium py-1.5 pr-4">Year</th>
                          <th className="text-right text-green-600 font-medium py-1.5 px-2">{nameA.split(' ')[0]}</th>
                          <th className="text-right text-gray-400 font-medium py-1.5 px-2">Games</th>
                          <th className="text-right text-blue-600 font-medium py-1.5 px-2">{nameB.split(' ')[0]}</th>
                          <th className="text-right text-gray-400 font-medium py-1.5 pl-2">Games</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allYears.map(y => (
                          <tr key={y} className="border-b border-gray-50 last:border-0">
                            <td className="py-1.5 pr-4 text-gray-500 font-medium">{y}</td>
                            <td className={`text-right px-2 font-semibold ${yearA[y] && yearB[y] && winPctNum(yearA[y].w, yearA[y].t) > winPctNum(yearB[y].w, yearB[y].t) ? 'text-green-600' : 'text-gray-600'}`}>
                              {yearA[y] ? pct(yearA[y].w, yearA[y].t) : '—'}
                            </td>
                            <td className="text-right px-2 text-gray-400">{yearA[y]?.t ?? '—'}</td>
                            <td className={`text-right px-2 font-semibold ${yearA[y] && yearB[y] && winPctNum(yearB[y].w, yearB[y].t) > winPctNum(yearA[y].w, yearA[y].t) ? 'text-blue-600' : 'text-gray-600'}`}>
                              {yearB[y] ? pct(yearB[y].w, yearB[y].t) : '—'}
                            </td>
                            <td className="text-right pl-2 text-gray-400">{yearB[y]?.t ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {/* Performance by opponent grade band */}
            {hasData && (
              <section>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Performance vs Opponent Grade</h3>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-3 px-1">
                    <span className="w-24">Band</span>
                    <div className="flex-1 flex items-center gap-3">
                      <span className="w-10 text-right text-green-600 font-medium">{nameA.split(' ')[0]}</span>
                      <span className="flex-1 text-center">Win %</span>
                      <span className="w-10 text-blue-600 font-medium">{nameB.split(' ')[0]}</span>
                    </div>
                  </div>
                  {GRADE_BANDS.map((band, i) => (
                    <BandRow key={band.label} label={band.label} a={bandsA[i]} b={bandsB[i]} />
                  ))}
                </div>
              </section>
            )}

            {/* Recent form */}
            {hasData && (
              <section>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Recent Form</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[10, 20, 50].map(n => {
                    const fA = recentForm(gamesA, n)
                    const fB = recentForm(gamesB, n)
                    return (
                      <div key={n} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Last {n} games</p>
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-lg font-bold ${winPctNum(fA.w, fA.t) > winPctNum(fB.w, fB.t) ? 'text-green-600' : 'text-gray-600'}`}>
                            {fA.t >= n ? pct(fA.w, fA.t) : fA.t > 0 ? pct(fA.w, fA.t) : '—'}
                          </span>
                          <span className="text-xs text-gray-300">vs</span>
                          <span className={`text-lg font-bold ${winPctNum(fB.w, fB.t) > winPctNum(fA.w, fA.t) ? 'text-blue-600' : 'text-gray-600'}`}>
                            {fB.t >= n ? pct(fB.w, fB.t) : fB.t > 0 ? pct(fB.w, fB.t) : '—'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Common opponents */}
            {commonOpps.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Common Opponents</h3>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left text-xs text-gray-400 font-medium py-2.5 px-4">Opponent</th>
                        <th className="text-right text-xs text-green-600 font-medium py-2.5 px-3">{nameA.split(' ')[0]}</th>
                        <th className="text-right text-xs text-gray-400 font-medium py-2.5 px-3">G</th>
                        <th className="text-right text-xs text-blue-600 font-medium py-2.5 px-3">{nameB.split(' ')[0]}</th>
                        <th className="text-right text-xs text-gray-400 font-medium py-2.5 px-4">G</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commonOpps.map(opp => (
                        <tr key={opp.name} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                          <td className="py-2.5 px-4 text-gray-700 font-medium">{opp.name}</td>
                          <td className={`text-right px-3 font-semibold ${winPctNum(opp.a.w, opp.a.t) > winPctNum(opp.b.w, opp.b.t) ? 'text-green-600' : 'text-gray-500'}`}>
                            {pct(opp.a.w, opp.a.t)}
                          </td>
                          <td className="text-right px-3 text-gray-400 text-xs">{opp.a.t}</td>
                          <td className={`text-right px-3 font-semibold ${winPctNum(opp.b.w, opp.b.t) > winPctNum(opp.a.w, opp.a.t) ? 'text-blue-600' : 'text-gray-500'}`}>
                            {pct(opp.b.w, opp.b.t)}
                          </td>
                          <td className="text-right px-4 text-gray-400 text-xs">{opp.b.t}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Results by Country */}
            {(countryStatsA.length > 0 || countryStatsB.length > 0) && (
              <section>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Results by Country</h3>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left text-xs text-gray-400 font-medium py-2.5 px-4">Country</th>
                        <th className="text-right text-xs text-green-600 font-medium py-2.5 px-3">{nameA.split(' ')[0]}</th>
                        <th className="text-right text-xs text-gray-400 font-medium py-2.5 px-3">G</th>
                        <th className="text-right text-xs text-blue-600 font-medium py-2.5 px-3">{nameB.split(' ')[0]}</th>
                        <th className="text-right text-xs text-gray-400 font-medium py-2.5 px-4">G</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const mapA = Object.fromEntries(countryStatsA.map(r => [r.country, r]))
                        const mapB = Object.fromEntries(countryStatsB.map(r => [r.country, r]))
                        const allCountries = Array.from(new Set([
                          ...countryStatsA.map(r => r.country),
                          ...countryStatsB.map(r => r.country),
                        ])).sort((a, b) => {
                          const totalA = (mapA[a]?.games || 0) + (mapB[a]?.games || 0)
                          const totalB = (mapA[b]?.games || 0) + (mapB[b]?.games || 0)
                          return totalB - totalA
                        })
                        return allCountries.map(country => {
                          const a = mapA[country]
                          const b = mapB[country]
                          const aPct = a?.win_percentage ?? null
                          const bPct = b?.win_percentage ?? null
                          return (
                            <tr key={country} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                              <td className="py-2.5 px-4 text-gray-700 font-medium">
                                <span className="mr-1.5">{getFlag(country)}</span>{country}
                              </td>
                              <td className={`text-right px-3 font-semibold ${aPct !== null && bPct !== null && aPct > bPct ? 'text-green-600' : 'text-gray-500'}`}>
                                {aPct !== null ? `${aPct}%` : '—'}
                              </td>
                              <td className="text-right px-3 text-gray-400 text-xs">{a?.games ?? '—'}</td>
                              <td className={`text-right px-3 font-semibold ${aPct !== null && bPct !== null && bPct > aPct ? 'text-blue-600' : 'text-gray-500'}`}>
                                {bPct !== null ? `${bPct}%` : '—'}
                              </td>
                              <td className="text-right px-4 text-gray-400 text-xs">{b?.games ?? '—'}</td>
                            </tr>
                          )
                        })
                      })()}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* No history notice */}
            {(playerA && !playerA.history_imported) || (playerB && !playerB.history_imported) ? (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-700">
                {playerA && !playerA.history_imported && <p>⚠️ <strong>{nameA}</strong> has no history imported — detailed stats unavailable.</p>}
                {playerB && !playerB.history_imported && <p>⚠️ <strong>{nameB}</strong> has no history imported — detailed stats unavailable.</p>}
              </div>
            ) : null}

          </div>
        )}
      </main>
    </div>
  )
}
