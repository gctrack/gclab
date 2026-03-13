'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import GCLabNav from '@/components/GCLabNav'
import { getFlag, countryName as countryFullName } from '@/lib/countries'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend
} from 'recharts'

// ─── Design tokens ────────────────────────────────────────────────────────────

const G     = '#0d2818'
const LIME  = '#4ade80'
const CREAM = '#e8e0d0'
const COL_A = '#15803d'   // player A green
const COL_B = '#1d4ed8'   // player B blue

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
  { label: '1200–1400', min: 1200, max: 1400 },
  { label: '1400–1600', min: 1401, max: 1600 },
  { label: '1600–1800', min: 1601, max: 1800 },
  { label: '1800–2000', min: 1801, max: 2000 },
  { label: '2000–2200', min: 2001, max: 2200 },
  { label: '2200–2400', min: 2201, max: 2400 },
  { label: '2400+',    min: 2401, max: 99999 },
]

const pct = (wins: number, total: number) =>
  total === 0 ? '—' : `${Math.round((wins / total) * 100)}%`

const winPctNum = (wins: number, total: number) =>
  total === 0 ? 0 : Math.round((wins / total) * 100)

// ─── Global styles ────────────────────────────────────────────────────────────

const ML_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
  .ghl  { font-family: 'DM Serif Display', serif; }
  .gmono{ font-family: 'DM Mono', monospace; }
  .gsans{ font-family: 'DM Sans', sans-serif; }

  .cmp-card {
    background: white;
    border: 1px solid #e8e4de;
    border-radius: 14px;
    box-shadow: 0 1px 4px rgba(13,40,24,0.05);
    overflow: hidden;
  }
  .cmp-row:hover { background: #fafaf8; }
  .cmp-section-title {
    font-family: 'DM Sans', sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(13,40,24,0.4);
    margin-bottom: 10px;
  }
  .cmp-pill {
    border: 1.5px solid #d5cfc5;
    background: white;
    border-radius: 20px;
    padding: 4px 12px;
    font-size: 12px;
    font-family: 'DM Sans', sans-serif;
    color: #0d2818;
    cursor: pointer;
    transition: all 0.15s;
  }
  .cmp-pill.on {
    background: #0d2818;
    border-color: #0d2818;
    color: #4ade80;
  }
  .cmp-search {
    background: #fafaf8;
    border: 1.5px solid #ddd8d0;
    border-radius: 10px;
    padding: 10px 36px 10px 12px;
    font-size: 14px;
    color: #0d2818;
    width: 100%;
    outline: none;
    font-family: 'DM Sans', sans-serif;
    transition: border-color 0.15s;
  }
  .cmp-search:focus { border-color: #0d2818; }
  .cmp-suggestion {
    width: 100%;
    text-align: left;
    padding: 10px 14px;
    background: white;
    border: none;
    border-bottom: 1px solid #f0ece6;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-family: 'DM Sans', sans-serif;
  }
  .cmp-suggestion:hover { background: #f8f6f2; }
  .cmp-suggestion:last-child { border-bottom: none; }

  @media print {
    nav, .no-print { display: none !important; }
    body { background: white !important; }
    .cmp-card { box-shadow: none !important; border: 1px solid #ddd !important; break-inside: avoid; }
    .print-break { page-break-before: always; }
  }
`

const TH = (align: 'left' | 'right' | 'center' = 'left') => ({
  textAlign: align as any,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  color: 'rgba(13,40,24,0.4)',
  padding: '10px 12px',
  fontFamily: 'DM Sans, sans-serif',
  borderBottom: '1px solid #e8e4de',
  background: 'rgba(13,40,24,0.025)',
})
const TD = (align: 'left' | 'right' | 'center' = 'left', highlight = false) => ({
  textAlign: align as any,
  padding: '10px 12px',
  fontSize: 13,
  color: highlight ? G : 'rgba(13,40,24,0.7)',
  fontFamily: 'DM Sans, sans-serif',
  borderTop: '1px solid #ede9e2',
})

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, a, b, higherIsBetter = true }: {
  label: string; a: string | number; b: string | number; higherIsBetter?: boolean
}) {
  const aNum = parseFloat(String(a))
  const bNum = parseFloat(String(b))
  const aWins = !isNaN(aNum) && !isNaN(bNum) && (higherIsBetter ? aNum > bNum : aNum < bNum)
  const bWins = !isNaN(aNum) && !isNaN(bNum) && (higherIsBetter ? bNum > aNum : bNum < aNum)

  return (
    <div className="cmp-card" style={{ padding: '14px 16px', textAlign: 'center' }}>
      <p className="gsans" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(13,40,24,0.4)', marginBottom: 10 }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span className="gmono" style={{ fontSize: 18, fontWeight: 700, color: aWins ? COL_A : aWins === false && bWins ? 'rgba(13,40,24,0.45)' : COL_A }}>{a}</span>
        <span className="gsans" style={{ fontSize: 11, color: 'rgba(13,40,24,0.25)' }}>vs</span>
        <span className="gmono" style={{ fontSize: 18, fontWeight: 700, color: bWins ? COL_B : bWins === false && aWins ? 'rgba(13,40,24,0.45)' : COL_B }}>{b}</span>
      </div>
    </div>
  )
}

function BandRow({ label, a, b }: { label: string; a: { w: number; t: number }; b: { w: number; t: number } }) {
  const aPct = winPctNum(a.w, a.t)
  const bPct = winPctNum(b.w, b.t)
  const total = Math.max(aPct, bPct, 1)

  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid #f0ece6' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span className="gsans" style={{ fontSize: 11, color: 'rgba(13,40,24,0.5)', width: 90, flexShrink: 0 }}>{label}</span>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="gmono" style={{ fontSize: 12, fontWeight: 700, width: 36, textAlign: 'right', color: COL_A }}>{pct(a.w, a.t)}</span>
          <div style={{ flex: 1, position: 'relative', height: 6, background: '#f0ece6', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', background: COL_A, borderRadius: 3, width: `${(aPct / total) * 50}%`, opacity: 0.7 }}/>
            <div style={{ position: 'absolute', right: 0, top: 0, height: '100%', background: COL_B, borderRadius: 3, width: `${(bPct / total) * 50}%`, opacity: 0.7 }}/>
          </div>
          <span className="gmono" style={{ fontSize: 12, fontWeight: 700, width: 36, color: COL_B }}>{pct(b.w, b.t)}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ width: 90, flexShrink: 0 }}/>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="gsans" style={{ fontSize: 10, color: 'rgba(13,40,24,0.35)', width: 36, textAlign: 'right' }}>{a.t}g</span>
          <div style={{ flex: 1 }}/>
          <span className="gsans" style={{ fontSize: 10, color: 'rgba(13,40,24,0.35)', width: 36 }}>{b.t}g</span>
        </div>
      </div>
    </div>
  )
}

function PlayerSearch({ label, color, onSelect, selected, exclude, recentPlayers = [] }: {
  label: string
  color: 'green' | 'blue'
  onSelect: (p: Player) => void
  selected: Player | null
  exclude: string | null
  recentPlayers?: Player[]
}) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Player[]>([])
  const [focused, setFocused] = useState(false)
  const timeoutRef = useRef<any>(null)
  const supabase = createClient()
  const accentColor = color === 'green' ? COL_A : COL_B

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
        .order('dgrade', { ascending: false })
        .limit(8)
      if (parts.length >= 2 && parts[1]) {
        q = q.ilike('wcf_first_name', `%${parts[0]}%`).ilike('wcf_last_name', `%${parts[parts.length - 1]}%`)
      } else {
        q = q.or(`wcf_last_name.ilike.%${v}%,wcf_first_name.ilike.%${v}%`)
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

  const showRecent = focused && !query && !selected && recentPlayers.length > 0
  const showSuggestions = suggestions.length > 0 && !selected

  return (
    <div>
      <div className="gsans" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8, color: accentColor }}>
        {label}
      </div>
      <div style={{ position: 'relative' }}>
        <input
          value={query}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => { setFocused(true); if (selected) setQuery('') }}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Search player…"
          className="cmp-search"
          style={{ borderColor: selected ? accentColor : undefined }}
        />
        {selected && (
          <button onClick={handleClear} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', fontSize: 18, color: 'rgba(13,40,24,0.35)', cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
        )}
        {(showRecent || showSuggestions) && (
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 30, background: 'white', border: '1px solid #e8e4de', borderRadius: 10, boxShadow: '0 4px 16px rgba(13,40,24,0.12)', overflow: 'hidden' }}>
            {showRecent && (
              <>
                <div className="gsans" style={{ padding: '6px 14px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(13,40,24,0.35)', background: '#fafaf8', borderBottom: '1px solid #f0ece6' }}>Recent</div>
                {recentPlayers.map(p => (
                  <button key={p.id} className="cmp-suggestion" onClick={() => handleSelect(p)}>
                    <div>
                      <span className="gsans" style={{ fontSize: 13, fontWeight: 500, color: G }}>{getFlag(p.country)} {p.wcf_first_name} {p.wcf_last_name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {p.history_imported && <span style={{ fontSize: 11, color: '#16a34a' }}>●</span>}
                      <span className="gsans" style={{ fontSize: 11, color: 'rgba(13,40,24,0.4)' }}>#{p.world_ranking}</span>
                      <span className="gmono" style={{ fontSize: 12, fontWeight: 700, color: G }}>{p.dgrade}</span>
                    </div>
                  </button>
                ))}
              </>
            )}
            {showSuggestions && suggestions.map(p => (
              <button key={p.id} className="cmp-suggestion" onClick={() => handleSelect(p)}>
                <div>
                  <span className="gsans" style={{ fontSize: 13, fontWeight: 500, color: G }}>{getFlag(p.country)} {p.wcf_first_name} {p.wcf_last_name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {p.history_imported && <span style={{ fontSize: 11, color: '#16a34a' }}>●</span>}
                  <span className="gsans" style={{ fontSize: 11, color: 'rgba(13,40,24,0.4)' }}>#{p.world_ranking}</span>
                  <span className="gmono" style={{ fontSize: 12, fontWeight: 700, color: G }}>{p.dgrade}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {selected && (
        <div className="gsans" style={{ marginTop: 8, fontSize: 12, color: accentColor, display: 'flex', gap: 6, alignItems: 'center' }}>
          <span>{getFlag(selected.country)}</span>
          <span>#{selected.world_ranking}</span>
          <span style={{ color: 'rgba(13,40,24,0.3)' }}>·</span>
          <span>dGrade {selected.dgrade}</span>
          {selected.history_imported && <span style={{ marginLeft: 'auto', color: '#16a34a', fontSize: 11 }}>✓ history</span>}
        </div>
      )}
    </div>
  )
}

// ─── Custom chart tooltip ─────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, nameA, nameB }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'white', border: '1px solid #e8e4de', borderRadius: 8, padding: '8px 12px', boxShadow: '0 2px 8px rgba(13,40,24,0.1)' }}>
      <p className="gsans" style={{ fontSize: 11, color: 'rgba(13,40,24,0.45)', marginBottom: 4 }}>{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} className="gmono" style={{ fontSize: 12, fontWeight: 700, color: entry.color }}>
          {entry.dataKey === 'a' ? nameA : nameB}: {entry.value}
        </p>
      ))}
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="cmp-section-title">{children}</p>
}

// ─── Main page ────────────────────────────────────────────────────────────────

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
  const [oppCountryStatsA, setOppCountryStatsA] = useState<any[]>([])
  const [oppCountryStatsB, setOppCountryStatsB] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [showAllH2H, setShowAllH2H] = useState(false)
  const [winsSortA, setWinsSortA] = useState<'grade' | 'diff'>('grade')
  const [winsSortB, setWinsSortB] = useState<'grade' | 'diff'>('grade')
  const [recentPlayers, setRecentPlayers] = useState<Player[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('gclab_recent_compare_players')
      if (stored) setRecentPlayers(JSON.parse(stored))
    } catch {}
  }, [])

  const saveRecentPlayer = (p: Player) => {
    setRecentPlayers(prev => {
      const filtered = prev.filter(r => r.id !== p.id)
      const updated = [p, ...filtered].slice(0, 6)
      try { localStorage.setItem('gclab_recent_compare_players', JSON.stringify(updated)) } catch {}
      return updated
    })
  }

  const supabase = createClient()

  const sortGames = (games: Game[]) => [...games].sort((a, b) => {
    const da = a.event_date || '', db = b.event_date || ''
    if (da !== db) return da < db ? -1 : 1
    const ea = a.event_name || '', eb = b.event_name || ''
    return ea < eb ? -1 : ea > eb ? 1 : 0
  })

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
      .order('event_date', { ascending: true })
      .order('event_name', { ascending: true })
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

  useEffect(() => {
    const supabase = createClient()
    const buildOppStats = async (games: Game[], setter: (v: any[]) => void) => {
      if (!games.length) { setter([]); return }
      const { data: playerData } = await supabase.from('wcf_players').select('wcf_first_name, wcf_last_name, country')
      if (!playerData) return
      const playerMap: Record<string, string> = {}
      playerData.forEach((p: any) => {
        playerMap[`${p.wcf_first_name.trim()}|||${p.wcf_last_name.trim()}`.toLowerCase()] = p.country
        // Also index by last name only for partial matching
        const lnKey = p.wcf_last_name.trim().toLowerCase()
        if (!playerMap[`ln|||${lnKey}`]) playerMap[`ln|||${lnKey}`] = p.country
      })
      const countryMap: Record<string, { games: number; wins: number }> = {}
      games.forEach((g: Game) => {
        const fullKey = `${(g.opponent_first_name||'').trim()}|||${(g.opponent_last_name||'').trim()}`.toLowerCase()
        const country = playerMap[fullKey]
        if (!country) return
        if (!countryMap[country]) countryMap[country] = { games: 0, wins: 0 }
        countryMap[country].games++
        if (g.result === 'win') countryMap[country].wins++
      })
      setter(Object.entries(countryMap)
        .map(([country, s]) => ({
          country,
          games: s.games,
          wins: s.wins,
          losses: s.games - s.wins,
          winPct: s.games ? Math.round(s.wins / s.games * 100) : null,
        }))
        .sort((a, b) => b.games - a.games))
    }
    buildOppStats(gamesA, setOppCountryStatsA)
    buildOppStats(gamesB, setOppCountryStatsB)
  }, [gamesA, gamesB])

  // ── Derived stats ────────────────────────────────────────────────────────

  const h2hGames = gamesA
    .filter(g => g.opponent_first_name === playerB?.wcf_first_name && g.opponent_last_name === playerB?.wcf_last_name)
    .sort((a, b) => (b.event_date || '').localeCompare(a.event_date || ''))
  const h2hWins = h2hGames.filter(g => g.result === 'win').length
  const h2hLosses = h2hGames.filter(g => g.result === 'loss').length

  const yearStats = (games: Game[]) => {
    const map: Record<number, { w: number; t: number }> = {}
    for (const g of games) {
      const yr = g.year || (g.event_date ? new Date(g.event_date).getFullYear() : null)
      if (!yr) continue
      if (!map[yr]) map[yr] = { w: 0, t: 0 }
      map[yr].t++
      if (g.result === 'win') map[yr].w++
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

  const bandStats = (games: Game[]) => GRADE_BANDS.map(band => {
    const relevant = games.filter(g => g.opp_dgrade_after >= band.min && g.opp_dgrade_after <= band.max)
    const wins = relevant.filter(g => g.result === 'win').length
    return { w: wins, t: relevant.length }
  })
  const bandsA = bandStats(gamesA)
  const bandsB = bandStats(gamesB)

  const recentForm = (games: Game[], n: number) => {
    const sorted = sortGames(games)
    const last = sorted.slice(-n)
    const wins = last.filter(g => g.result === 'win').length
    return { w: wins, t: last.length }
  }

  const peakGrade = (games: Game[]) =>
    games.length ? Math.max(...games.map(g => g.dgrade_after)) : null

  const streaks = (games: Game[]) => {
    const sorted = sortGames(games)
    let maxWin = 0, maxLoss = 0, curWin = 0, curLoss = 0
    for (const g of sorted) {
      if (g.result === 'win') { curWin++; curLoss = 0; maxWin = Math.max(maxWin, curWin) }
      else { curLoss++; curWin = 0; maxLoss = Math.max(maxLoss, curLoss) }
    }
    return { maxWin, maxLoss }
  }
  const streakA = streaks(gamesA)
  const streakB = streaks(gamesB)

  const withBefore = (games: Game[]) => sortGames(games).map((g, i) => {
    const prev = i > 0 ? games[i - 1] : null
    const myGradeBefore = prev?.dgrade_after || g.dgrade_after
    const prevOpp = games.slice(0, i).reverse().find(pg =>
      pg.opponent_first_name === g.opponent_first_name && pg.opponent_last_name === g.opponent_last_name
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

  if (loading || signedIn === null) return (
    <div style={{ minHeight: '100vh', background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(232,224,208,0.3)' }}>
      <style dangerouslySetInnerHTML={{ __html: ML_STYLES }}/>Loading…
    </div>
  )

  if (!signedIn) return (
    <div style={{ minHeight: '100vh', background: '#f5f2ec', display: 'flex', flexDirection: 'column' }}>
      <style dangerouslySetInnerHTML={{ __html: ML_STYLES }}/>
      <GCLabNav role="" isSignedIn={false} currentPath="/compare" />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 480 }}>
          <div style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid #e8e4de', background: 'white', filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none' }}>
            <div style={{ padding: 20, borderBottom: '1px solid #f0ece6', background: '#fafaf8', display: 'flex', gap: 12 }}>
              <div style={{ flex: 1, height: 36, background: '#e8e4de', borderRadius: 8 }}/>
              <div style={{ width: 36, height: 36, background: '#bbf7d0', borderRadius: 8 }}/>
              <div style={{ flex: 1, height: 36, background: '#e8e4de', borderRadius: 8 }}/>
            </div>
            <div style={{ padding: 20 }}>
              <svg width="100%" height="140" viewBox="0 0 600 140">
                <line x1="0" y1="35" x2="600" y2="35" stroke="#e8e4de" strokeWidth="1"/>
                <line x1="0" y1="70" x2="600" y2="70" stroke="#e8e4de" strokeWidth="1"/>
                <line x1="0" y1="105" x2="600" y2="105" stroke="#e8e4de" strokeWidth="1"/>
                <path d="M0,110 C100,90 200,50 300,35 C400,20 500,40 600,60 L600,140 L0,140 Z" fill="rgba(21,128,61,0.1)"/>
                <path d="M0,110 C100,90 200,50 300,35 C400,20 500,40 600,60" fill="none" stroke="#16a34a" strokeWidth="2.5"/>
                <path d="M0,125 C100,115 200,85 300,70 C400,55 500,75 600,95 L600,140 L0,140 Z" fill="rgba(29,78,216,0.07)"/>
                <path d="M0,125 C100,115 200,85 300,70 C400,55 500,75 600,95" fill="none" stroke="#2563eb" strokeWidth="2" strokeDasharray="5 3"/>
              </svg>
            </div>
          </div>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(248,246,242,0.8)', backdropFilter: 'blur(4px)', borderRadius: 18 }}>
            <div style={{ textAlign: 'center', padding: '32px 32px', maxWidth: 360 }}>
              <div style={{ width: 56, height: 56, background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 24 }}>⚔️</div>
              <h2 className="ghl" style={{ fontSize: 22, color: G, marginBottom: 8 }}>Compare any two players</h2>
              <p className="gsans" style={{ fontSize: 13, color: 'rgba(13,40,24,0.55)', marginBottom: 24, lineHeight: 1.6 }}>Head-to-head grade history, win rates, performance trends. Pick any two players and see how they stack up over time.</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href="/login?mode=signup" style={{ background: G, color: LIME, padding: '10px 22px', borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none', fontFamily: 'DM Sans, sans-serif' }}>Create free account</a>
                <a href="/login" style={{ border: '1.5px solid #d5cfc5', color: G, padding: '10px 22px', borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans, sans-serif', textDecoration: 'none' }}>Sign in</a>
              </div>
              <p className="gsans" style={{ fontSize: 11, color: 'rgba(13,40,24,0.35)', marginTop: 12 }}>Free · No credit card · 30 seconds</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f5f2ec' }}>
      <style dangerouslySetInnerHTML={{ __html: ML_STYLES }}/>
      <GCLabNav role={userProfile?.role} isSignedIn={true} currentPath="/compare" />

      {/* Header */}
      <div style={{ background: G, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 80% 0%, rgba(74,222,128,0.07) 0%, transparent 55%)' }}/>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(255,255,255,0.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.012) 1px,transparent 1px)', backgroundSize: '44px 44px' }}/>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '36px 24px 28px', position: 'relative', zIndex: 1 }}>
          <h2 className="ghl" style={{ fontSize: 'clamp(24px,3vw,40px)', color: CREAM, fontWeight: 900, marginBottom: 8, letterSpacing: '-0.5px' }}>Compare Players</h2>
          <p className="gsans" style={{ fontSize: 14, color: 'rgba(232,224,208,0.5)' }}>Head to head stats, grade history and career comparisons.</p>
        </div>
        <div style={{ height: 24, background: 'linear-gradient(180deg, #0d2818 0%, #f5f2ec 100%)' }}/>
      </div>

      <main style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 24px 60px' }}>

        {/* Search + PDF button */}
        <div className="cmp-card no-print" style={{ padding: 24, marginBottom: 24, overflow: 'visible' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: playerA || playerB ? 0 : 0 }}>
            <PlayerSearch label="Player 1" color="green" selected={playerA} recentPlayers={recentPlayers.filter(r => r.id !== playerB?.id)}
              onSelect={(p) => { setPlayerA(p); setGamesA([]); setHistoryA([]); if (p) saveRecentPlayer(p) }}
              exclude={playerB?.id || null} />
            <PlayerSearch label="Player 2" color="blue" selected={playerB} recentPlayers={recentPlayers.filter(r => r.id !== playerA?.id)}
              onSelect={(p) => { setPlayerB(p); setGamesB([]); setHistoryB([]); if (p) saveRecentPlayer(p) }}
              exclude={playerA?.id || null} />
          </div>
          {loadingData && (
            <p className="gsans" style={{ fontSize: 12, color: 'rgba(13,40,24,0.35)', textAlign: 'center', marginTop: 16 }}>Loading player data…</p>
          )}
          {hasData && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => window.print()} className="cmp-pill" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>🖨️</span><span>Print / Save PDF</span>
              </button>
            </div>
          )}
        </div>

        {!playerA && !playerB && (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'rgba(13,40,24,0.3)' }}>
            <p style={{ fontSize: 44, marginBottom: 16 }}>⚔️</p>
            <p className="ghl" style={{ fontSize: 20, color: 'rgba(13,40,24,0.5)', marginBottom: 6 }}>Select two players to compare</p>
            <p className="gsans" style={{ fontSize: 13, color: 'rgba(13,40,24,0.35)' }}>Players with a green dot ● have full history imported</p>
          </div>
        )}

        {(playerA || playerB) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Player name header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="cmp-card" style={{ padding: '16px 20px', borderTop: `3px solid ${COL_A}` }}>
                <p className="ghl" style={{ fontSize: 18, color: COL_A, marginBottom: 2 }}>{nameA}</p>
                {playerA && <p className="gsans" style={{ fontSize: 12, color: 'rgba(13,40,24,0.45)' }}>{getFlag(playerA.country)} {countryFullName(playerA.country)} · #{playerA.world_ranking}</p>}
              </div>
              <div className="cmp-card" style={{ padding: '16px 20px', borderTop: `3px solid ${COL_B}` }}>
                <p className="ghl" style={{ fontSize: 18, color: COL_B, marginBottom: 2 }}>{nameB}</p>
                {playerB && <p className="gsans" style={{ fontSize: 12, color: 'rgba(13,40,24,0.45)' }}>{getFlag(playerB.country)} {countryFullName(playerB.country)} · #{playerB.world_ranking}</p>}
              </div>
            </div>

            {/* Overview stats */}
            <section>
              <SectionTitle>Overview</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                <StatCard label="World Ranking" a={playerA ? `#${playerA.world_ranking}` : '—'} b={playerB ? `#${playerB.world_ranking}` : '—'} higherIsBetter={false} />
                <StatCard label="dGrade" a={playerA?.dgrade ?? '—'} b={playerB?.dgrade ?? '—'} />
                <StatCard label="eGrade" a={playerA?.egrade || '—'} b={playerB?.egrade || '—'} />
                <StatCard label="Win % (career)" a={playerA ? `${playerA.win_percentage}%` : '—'} b={playerB ? `${playerB.win_percentage}%` : '—'} />
                <StatCard label="Total Games" a={playerA?.games ?? '—'} b={playerB?.games ?? '—'} />
                <StatCard label="Peak dGrade" a={peakGrade(gamesA) ?? (playerA?.dgrade ?? '—')} b={peakGrade(gamesB) ?? (playerB?.dgrade ?? '—')} />
                <StatCard label="Win Streak" a={streakA.maxWin || '—'} b={streakB.maxWin || '—'} />
                <StatCard label="Loss Streak" a={streakA.maxLoss || '—'} b={streakB.maxLoss || '—'} higherIsBetter={false} />
              </div>
            </section>

            {/* Head to Head */}
            {bothHaveData && (
              <section>
                <SectionTitle>Head to Head</SectionTitle>
                <div className="cmp-card" style={{ padding: 24 }}>
                  {h2hGames.length === 0 ? (
                    <p className="gsans" style={{ fontSize: 13, color: 'rgba(13,40,24,0.4)', textAlign: 'center', padding: '16px 0' }}>No direct matches found in imported data</p>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 48, marginBottom: 24 }}>
                        <div style={{ textAlign: 'center' }}>
                          <p className="gmono" style={{ fontSize: 48, fontWeight: 700, color: COL_A, lineHeight: 1 }}>{h2hWins}</p>
                          <p className="gsans" style={{ fontSize: 11, color: 'rgba(13,40,24,0.4)', marginTop: 4 }}>{nameA.split(' ')[0]} wins</p>
                        </div>
                        <div className="ghl" style={{ fontSize: 24, color: 'rgba(13,40,24,0.2)' }}>vs</div>
                        <div style={{ textAlign: 'center' }}>
                          <p className="gmono" style={{ fontSize: 48, fontWeight: 700, color: COL_B, lineHeight: 1 }}>{h2hLosses}</p>
                          <p className="gsans" style={{ fontSize: 11, color: 'rgba(13,40,24,0.4)', marginTop: 4 }}>{nameB.split(' ')[0]} wins</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {(showAllH2H ? h2hGames : h2hGames.slice(0, 5)).map(g => (
                          <div key={g.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: g.result === 'win' ? 'rgba(21,128,61,0.06)' : 'rgba(29,78,216,0.06)', gap: 8 }}>
                            <span className="gmono" style={{ fontSize: 12, fontWeight: 700, width: 20, color: g.result === 'win' ? COL_A : COL_B }}>{g.result === 'win' ? 'W' : 'L'}</span>
                            <span className="gsans" style={{ fontSize: 12, color: 'rgba(13,40,24,0.65)', flex: 1 }}>{g.event_name}</span>
                            <span className="gmono" style={{ fontSize: 12, color: 'rgba(13,40,24,0.5)' }}>{g.player_score}–{g.opponent_score}</span>
                            <span className="gsans" style={{ fontSize: 11, color: 'rgba(13,40,24,0.35)', width: 60, textAlign: 'right' }}>{g.event_date?.slice(0, 7)}</span>
                          </div>
                        ))}
                      </div>
                      {h2hGames.length > 5 && (
                        <button onClick={() => setShowAllH2H(p => !p)} className="gsans" style={{ marginTop: 12, fontSize: 12, color: 'rgba(13,40,24,0.4)', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'center' }}>
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
                <SectionTitle>Best Wins</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {([
                    { name: nameA, enriched: gamesAWithBefore, sort: winsSortA, setSort: setWinsSortA, color: COL_A },
                    { name: nameB, enriched: gamesBWithBefore, sort: winsSortB, setSort: setWinsSortB, color: COL_B },
                  ]).map(({ name, enriched, sort, setSort, color }) => {
                    const wins = topWins(enriched, sort)
                    return (
                      <div key={name} className="cmp-card">
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid #ede9e2', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                          <span className="gsans" style={{ fontSize: 13, fontWeight: 600, color }}>{name}</span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {(['grade', 'diff'] as const).map(s => (
                              <button key={s} onClick={() => setSort(s)} className={`cmp-pill${sort === s ? ' on' : ''}`} style={{ padding: '3px 10px', fontSize: 11 }}>
                                {s === 'grade' ? 'Top Grade' : 'Biggest Upset'}
                              </button>
                            ))}
                          </div>
                        </div>
                        {wins.length === 0 ? (
                          <p className="gsans" style={{ fontSize: 13, color: 'rgba(13,40,24,0.4)', padding: 16, textAlign: 'center' }}>No wins on record</p>
                        ) : (
                          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                            <thead>
                              <tr>
                                <th style={{ ...TH('left'), paddingLeft: 12 }}>#</th>
                                <th style={TH('left')}>Opponent</th>
                                <th style={TH('right')}>You</th>
                                <th style={TH('right')}>Them</th>
                                <th style={TH('right')}>Score</th>
                              </tr>
                            </thead>
                            <tbody>
                              {wins.map((g, i) => (
                                <tr key={i} className="cmp-row" style={{ borderTop: '1px solid #ede9e2' }}>
                                  <td style={{ ...TD('left'), paddingLeft: 12, color: 'rgba(13,40,24,0.3)' }}>#{i + 1}</td>
                                  <td style={TD('left')}>
                                    <div className="gsans" style={{ fontWeight: 500, color: G }}>{g.opponent_first_name} {g.opponent_last_name}</div>
                                    {g.event_name && <div className="gsans" style={{ fontSize: 10, color: 'rgba(13,40,24,0.4)', marginTop: 1 }}>{g.event_name}{g.event_date ? ` · ${g.event_date.slice(0, 4)}` : ''}</div>}
                                  </td>
                                  <td style={{ ...TD('right'), ...{ fontFamily: 'DM Mono, monospace' } }}>{g.myGradeBefore}</td>
                                  <td style={{ ...TD('right') }}>
                                    <span className="gmono" style={{ color: '#dc2626', fontWeight: 700 }}>{g.oppGradeBefore}</span>
                                    {g.diff > 0 && <span className="gmono" style={{ fontSize: 10, color: '#f87171', marginLeft: 4 }}>+{g.diff}</span>}
                                  </td>
                                  <td style={{ ...TD('right'), color: '#16a34a', fontFamily: 'DM Mono, monospace', fontWeight: 700 }}>{g.player_score ?? 0}–{g.opponent_score ?? 0}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* dGrade History */}
            {gradeChartData.length > 0 && (
              <section>
                <SectionTitle>dGrade History</SectionTitle>
                <div className="cmp-card" style={{ padding: 24 }}>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={gradeChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0ece6" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(13,40,24,0.35)', fontFamily: 'DM Sans' }} tickLine={false} interval={Math.floor(gradeChartData.length / 6)} />
                      <YAxis tick={{ fontSize: 10, fill: 'rgba(13,40,24,0.35)', fontFamily: 'DM Mono' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} width={48} />
                      <Tooltip content={<ChartTooltip nameA={nameA} nameB={nameB} />} />
                      <Legend formatter={(v) => v === 'a' ? nameA : nameB} wrapperStyle={{ fontFamily: 'DM Sans', fontSize: 12 }} />
                      {playerA && <Line type="monotone" dataKey="a" stroke={COL_A} strokeWidth={2} dot={false} connectNulls name="a" />}
                      {playerB && <Line type="monotone" dataKey="b" stroke={COL_B} strokeWidth={2} dot={false} connectNulls name="b" />}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}

            {/* Win % by Year */}
            {yearChartData.length > 0 && (
              <section>
                <SectionTitle>Win % by Year</SectionTitle>
                <div className="cmp-card" style={{ padding: 24 }}>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={yearChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0ece6" />
                      <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'rgba(13,40,24,0.35)', fontFamily: 'DM Sans' }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: 'rgba(13,40,24,0.35)', fontFamily: 'DM Mono' }} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} width={40} />
                      <ReferenceLine y={50} stroke="#e8e4de" strokeDasharray="4 4" />
                      <Tooltip content={<ChartTooltip nameA={nameA} nameB={nameB} />} formatter={(v: any) => `${v}%`} />
                      <Legend formatter={(v) => v === 'a' ? nameA : nameB} wrapperStyle={{ fontFamily: 'DM Sans', fontSize: 12 }} />
                      {gamesA.length > 0 && <Line type="monotone" dataKey="a" stroke={COL_A} strokeWidth={2} dot={{ r: 3, fill: COL_A }} connectNulls name="a" />}
                      {gamesB.length > 0 && <Line type="monotone" dataKey="b" stroke={COL_B} strokeWidth={2} dot={{ r: 3, fill: COL_B }} connectNulls name="b" />}
                    </LineChart>
                  </ResponsiveContainer>
                  <div style={{ overflowX: 'auto', marginTop: 16 }}>
                    <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={TH('left')}>Year</th>
                          <th style={{ ...TH('right'), color: COL_A }}>{nameA.split(' ')[0]}</th>
                          <th style={TH('right')}>W</th>
                          <th style={TH('right')}>L</th>
                          <th style={TH('right')}>G</th>
                          <th style={{ ...TH('right'), color: COL_B }}>{nameB.split(' ')[0]}</th>
                          <th style={TH('right')}>W</th>
                          <th style={TH('right')}>L</th>
                          <th style={TH('right')}>G</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allYears.map(y => (
                          <tr key={y} className="cmp-row" style={{ borderTop: '1px solid #ede9e2' }}>
                            <td style={{ ...TD('left'), fontWeight: 600 }}>{y}</td>
                            <td style={{ ...TD('right'), fontWeight: 700, fontFamily: 'DM Mono, monospace', color: yearA[y] && yearB[y] && winPctNum(yearA[y].w, yearA[y].t) > winPctNum(yearB[y].w, yearB[y].t) ? COL_A : 'rgba(13,40,24,0.55)' }}>
                              {yearA[y] ? pct(yearA[y].w, yearA[y].t) : '—'}
                            </td>
                            <td style={{ ...TD('right'), fontFamily: 'DM Mono, monospace' }}>{yearA[y]?.w ?? '—'}</td>
                            <td style={{ ...TD('right'), fontFamily: 'DM Mono, monospace' }}>{yearA[y] ? yearA[y].t - yearA[y].w : '—'}</td>
                            <td style={{ ...TD('right'), color: 'rgba(13,40,24,0.4)', fontFamily: 'DM Mono, monospace' }}>{yearA[y]?.t ?? '—'}</td>
                            <td style={{ ...TD('right'), fontWeight: 700, fontFamily: 'DM Mono, monospace', color: yearA[y] && yearB[y] && winPctNum(yearB[y].w, yearB[y].t) > winPctNum(yearA[y].w, yearA[y].t) ? COL_B : 'rgba(13,40,24,0.55)' }}>
                              {yearB[y] ? pct(yearB[y].w, yearB[y].t) : '—'}
                            </td>
                            <td style={{ ...TD('right'), fontFamily: 'DM Mono, monospace' }}>{yearB[y]?.w ?? '—'}</td>
                            <td style={{ ...TD('right'), fontFamily: 'DM Mono, monospace' }}>{yearB[y] ? yearB[y].t - yearB[y].w : '—'}</td>
                            <td style={{ ...TD('right'), color: 'rgba(13,40,24,0.4)', fontFamily: 'DM Mono, monospace' }}>{yearB[y]?.t ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {/* Performance vs Opponent Grade */}
            {hasData && (
              <section>
                <SectionTitle>Performance vs Opponent Grade</SectionTitle>
                <div className="cmp-card" style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span className="gsans" style={{ fontSize: 11, color: 'rgba(13,40,24,0.4)', width: 90 }}>Band</span>
                    <div style={{ flex: 1, display: 'flex', gap: 10 }}>
                      <span className="gsans" style={{ fontSize: 11, fontWeight: 700, color: COL_A, width: 36, textAlign: 'right' }}>{nameA.split(' ')[0]}</span>
                      <div style={{ flex: 1, textAlign: 'center' }}><span className="gsans" style={{ fontSize: 11, color: 'rgba(13,40,24,0.4)' }}>Win %</span></div>
                      <span className="gsans" style={{ fontSize: 11, fontWeight: 700, color: COL_B, width: 36 }}>{nameB.split(' ')[0]}</span>
                    </div>
                  </div>
                  {GRADE_BANDS.map((band, i) => (
                    <BandRow key={band.label} label={band.label} a={bandsA[i]} b={bandsB[i]} />
                  ))}
                </div>
              </section>
            )}

            {/* Recent Form */}
            {hasData && (
              <section>
                <SectionTitle>Recent Form</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {[10, 20, 50].map(n => {
                    const fA = recentForm(gamesA, n)
                    const fB = recentForm(gamesB, n)
                    return (
                      <div key={n} className="cmp-card" style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <p className="gsans" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(13,40,24,0.4)', marginBottom: 10 }}>Last {n} games</p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <span className="gmono" style={{ fontSize: 18, fontWeight: 700, color: fA.t > 0 && winPctNum(fA.w, fA.t) > winPctNum(fB.w, fB.t) ? COL_A : 'rgba(13,40,24,0.45)' }}>
                            {fA.t > 0 ? pct(fA.w, fA.t) : '—'}
                          </span>
                          <span className="gsans" style={{ fontSize: 11, color: 'rgba(13,40,24,0.25)' }}>vs</span>
                          <span className="gmono" style={{ fontSize: 18, fontWeight: 700, color: fB.t > 0 && winPctNum(fB.w, fB.t) > winPctNum(fA.w, fA.t) ? COL_B : 'rgba(13,40,24,0.45)' }}>
                            {fB.t > 0 ? pct(fB.w, fB.t) : '—'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Common Opponents */}
            {commonOpps.length > 0 && (
              <section>
                <SectionTitle>Common Opponents</SectionTitle>
                <div className="cmp-card">
                  <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={TH('left')}>Opponent</th>
                        <th style={{ ...TH('right'), color: COL_A }}>{nameA.split(' ')[0]} Win%</th>
                        <th style={TH('right')}>G</th>
                        <th style={{ ...TH('right'), color: COL_B }}>{nameB.split(' ')[0]} Win%</th>
                        <th style={TH('right')}>G</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commonOpps.map(opp => (
                        <tr key={opp.name} className="cmp-row" style={{ borderTop: '1px solid #ede9e2' }}>
                          <td style={{ ...TD('left'), fontWeight: 500 }}>{opp.name}</td>
                          <td style={{ ...TD('right'), fontWeight: 700, fontFamily: 'DM Mono, monospace', color: winPctNum(opp.a.w, opp.a.t) > winPctNum(opp.b.w, opp.b.t) ? COL_A : 'rgba(13,40,24,0.55)' }}>{pct(opp.a.w, opp.a.t)}</td>
                          <td style={{ ...TD('right'), color: 'rgba(13,40,24,0.4)', fontFamily: 'DM Mono, monospace' }}>{opp.a.t}</td>
                          <td style={{ ...TD('right'), fontWeight: 700, fontFamily: 'DM Mono, monospace', color: winPctNum(opp.b.w, opp.b.t) > winPctNum(opp.a.w, opp.a.t) ? COL_B : 'rgba(13,40,24,0.55)' }}>{pct(opp.b.w, opp.b.t)}</td>
                          <td style={{ ...TD('right'), color: 'rgba(13,40,24,0.4)', fontFamily: 'DM Mono, monospace' }}>{opp.b.t}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Results by Opponent Country */}
            {(oppCountryStatsA.length > 0 || oppCountryStatsB.length > 0) && (
              <section>
                <SectionTitle>Results by Opponent Country</SectionTitle>
                <div className="cmp-card">
                  <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={TH('left')}>Country</th>
                        <th style={{ ...TH('right'), color: COL_A }}>{nameA.split(' ')[0]}</th>
                        <th style={TH('right')}>W</th>
                        <th style={TH('right')}>L</th>
                        <th style={TH('right')}>G</th>
                        <th style={{ ...TH('right'), color: COL_B }}>{nameB.split(' ')[0]}</th>
                        <th style={TH('right')}>W</th>
                        <th style={TH('right')}>L</th>
                        <th style={TH('right')}>G</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const mapA = Object.fromEntries(oppCountryStatsA.map((r: any) => [r.country, r]))
                        const mapB = Object.fromEntries(oppCountryStatsB.map((r: any) => [r.country, r]))
                        const allCountries = Array.from(new Set([
                          ...oppCountryStatsA.map((r: any) => r.country),
                          ...oppCountryStatsB.map((r: any) => r.country),
                        ])).sort((a, b) => ((mapA[a]?.games||0)+(mapB[a]?.games||0)) < ((mapA[b]?.games||0)+(mapB[b]?.games||0)) ? 1 : -1)
                        return allCountries.map(country => {
                          const a = mapA[country], b = mapB[country]
                          return (
                            <tr key={country} className="cmp-row" style={{ borderTop: '1px solid #ede9e2' }}>
                              <td style={{ ...TD('left'), fontWeight: 500 }}>
                                <span style={{ marginRight: 6 }}>{getFlag(country)}</span>{countryFullName(country)}
                              </td>
                              <td style={{ ...TD('right'), fontWeight: 700, fontFamily: 'DM Mono, monospace', color: a && b ? (a.winPct > b.winPct ? COL_A : 'rgba(13,40,24,0.55)') : COL_A }}>{a ? `${a.winPct}%` : '—'}</td>
                              <td style={{ ...TD('right'), fontFamily: 'DM Mono, monospace' }}>{a?.wins ?? '—'}</td>
                              <td style={{ ...TD('right'), fontFamily: 'DM Mono, monospace' }}>{a?.losses ?? '—'}</td>
                              <td style={{ ...TD('right'), color: 'rgba(13,40,24,0.4)', fontFamily: 'DM Mono, monospace' }}>{a?.games ?? '—'}</td>
                              <td style={{ ...TD('right'), fontWeight: 700, fontFamily: 'DM Mono, monospace', color: a && b ? (b.winPct > a.winPct ? COL_B : 'rgba(13,40,24,0.55)') : COL_B }}>{b ? `${b.winPct}%` : '—'}</td>
                              <td style={{ ...TD('right'), fontFamily: 'DM Mono, monospace' }}>{b?.wins ?? '—'}</td>
                              <td style={{ ...TD('right'), fontFamily: 'DM Mono, monospace' }}>{b?.losses ?? '—'}</td>
                              <td style={{ ...TD('right'), color: 'rgba(13,40,24,0.4)', fontFamily: 'DM Mono, monospace' }}>{b?.games ?? '—'}</td>
                            </tr>
                          )
                        })
                      })()}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Results by Country Played In */}
            {(countryStatsA.length > 0 || countryStatsB.length > 0) && (
              <section>
                <SectionTitle>Results by Country Played In</SectionTitle>
                <div className="cmp-card">
                  <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={TH('left')}>Country</th>
                        <th style={{ ...TH('right'), color: COL_A }}>{nameA.split(' ')[0]}</th>
                        <th style={TH('right')}>W</th>
                        <th style={TH('right')}>L</th>
                        <th style={TH('right')}>G</th>
                        <th style={{ ...TH('right'), color: COL_B }}>{nameB.split(' ')[0]}</th>
                        <th style={TH('right')}>W</th>
                        <th style={TH('right')}>L</th>
                        <th style={TH('right')}>G</th>
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
                          const a = mapA[country], b = mapB[country]
                          const aPct = a?.win_percentage ?? null
                          const bPct = b?.win_percentage ?? null
                          return (
                            <tr key={country} className="cmp-row" style={{ borderTop: '1px solid #ede9e2' }}>
                              <td style={{ ...TD('left'), fontWeight: 500 }}>
                                <span style={{ marginRight: 6 }}>{getFlag(country)}</span>{countryFullName(country)}
                              </td>
                              <td style={{ ...TD('right'), fontWeight: 700, fontFamily: 'DM Mono, monospace', color: aPct !== null && bPct !== null && aPct > bPct ? COL_A : 'rgba(13,40,24,0.55)' }}>{aPct !== null ? `${aPct}%` : '—'}</td>
                              <td style={{ ...TD('right'), fontFamily: 'DM Mono, monospace' }}>{a?.wins ?? '—'}</td>
                              <td style={{ ...TD('right'), fontFamily: 'DM Mono, monospace' }}>{a?.losses ?? '—'}</td>
                              <td style={{ ...TD('right'), color: 'rgba(13,40,24,0.4)', fontFamily: 'DM Mono, monospace' }}>{a?.games ?? '—'}</td>
                              <td style={{ ...TD('right'), fontWeight: 700, fontFamily: 'DM Mono, monospace', color: aPct !== null && bPct !== null && bPct > aPct ? COL_B : 'rgba(13,40,24,0.55)' }}>{bPct !== null ? `${bPct}%` : '—'}</td>
                              <td style={{ ...TD('right'), fontFamily: 'DM Mono, monospace' }}>{b?.wins ?? '—'}</td>
                              <td style={{ ...TD('right'), fontFamily: 'DM Mono, monospace' }}>{b?.losses ?? '—'}</td>
                              <td style={{ ...TD('right'), color: 'rgba(13,40,24,0.4)', fontFamily: 'DM Mono, monospace' }}>{b?.games ?? '—'}</td>
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
            {((playerA && !playerA.history_imported) || (playerB && !playerB.history_imported)) && (
              <div style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 12, padding: '14px 18px' }}>
                {playerA && !playerA.history_imported && <p className="gsans" style={{ fontSize: 13, color: '#92400e' }}>⚠️ <strong>{nameA}</strong> has no history imported — detailed stats unavailable.</p>}
                {playerB && !playerB.history_imported && <p className="gsans" style={{ fontSize: 13, color: '#92400e', marginTop: playerA && !playerA.history_imported ? 4 : 0 }}>⚠️ <strong>{nameB}</strong> has no history imported — detailed stats unavailable.</p>}
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  )
}
