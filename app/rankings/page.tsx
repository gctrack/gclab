'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import GCLabNav from '@/components/GCLabNav'
import { getFlag, countryName as getCountryName } from '@/lib/countries'

// ── Design tokens (matches dashboard) ────────────────────────────────────────
const G       = '#0d2818'
const LIME    = '#4ade80'
const CREAM   = '#e8e0d0'
const CREAM25 = 'rgba(232,224,208,0.25)'
const AMBER   = '#eab308'

const ML = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
  .ghl   { font-family: 'Playfair Display', serif; }
  .gmono { font-family: 'DM Mono', monospace; }
  .gsans { font-family: 'DM Sans', sans-serif; }
  .gtab-dark {
    background: transparent;
    border: 1px solid rgba(255,255,255,0.14);
    color: rgba(232,224,208,0.45);
    padding: 5px 14px; border-radius: 6px;
    font-size: 13px; cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: all 0.15s;
  }
  .gtab-dark.on {
    background: rgba(74,222,128,0.15);
    border-color: rgba(74,222,128,0.4);
    color: #4ade80;
  }
  .gtab-dark:hover { border-color: rgba(74,222,128,0.3); color: rgba(232,224,208,0.8); }
  .rnk-card { background: #faf9f7; border: 1px solid #e5e1d8; border-radius: 16px; overflow: hidden; }
  .rnk-row:hover { background: rgba(13,40,24,0.03) !important; }
  .rnk-link { color: #16a34a; text-decoration: none; }
  .rnk-link:hover { text-decoration: underline; }
  .rnk-pill {
    padding: 5px 14px; border-radius: 20px; font-size: 13px; font-weight: 500;
    border: 1px solid #d5cfc5; background: white; color: #374151;
    cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.15s;
  }
  .rnk-pill.on { border-color: #4ade80; background: rgba(74,222,128,0.12); color: #16a34a; }
  @media (max-width: 768px) {
    .rnk-pad  { padding: 24px 20px !important; }
    .rnk-hero { padding: 28px 20px 24px !important; }
  }
`

const TABS = ['Rankings', 'Movers', 'New Players', 'Country Stats', 'Historical Rankings']
const MOVER_PERIODS = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '1 year', days: 365 },
  { label: 'All Time', days: 0 },
]
const PAGE_SIZES = [50, 100, 200]
const FIRST_SYNC_DATE = '2026-03-02'
const NEW_PLAYERS_SINCE = '2026-03-03T00:00:00Z'

type SortKey = 'dgrade' | 'egrade' | 'world_ranking' | 'games' | 'win_percentage' | 'wcf_last_name'
type SortDir = 'asc' | 'desc'

export default function RankingsPage() {
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      return params.get('tab') || 'Rankings'
    }
    return 'Rankings'
  })
  const [loading, setLoading] = useState(false)
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
  const [userRole, setUserRole] = useState('')

  // Historical search autocomplete
  const [searchQuery, setSearchQuery] = useState('')
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([])
  const searchTimeoutRef = useRef<any>(null)

  // Chart tooltip
  const [chartTooltip, setChartTooltip] = useState<{ x: number, y: number, label: string } | null>(null)

  // Ranking type for world rank toggle
  const [rankingType, setRankingType] = useState<'active' | 'alltime'>('active')

  const [rankings, setRankings] = useState<any[]>([])
  const [activeOnly, setActiveOnly] = useState(true)
  const [rankingsPage, setRankingsPage] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const [sortKey, setSortKey] = useState<SortKey>('dgrade')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const [movers, setMovers] = useState<{ gains: any[], losses: any[] }>({ gains: [], losses: [] })
  const [moverPeriod, setMoverPeriod] = useState(7)

  const [newPlayers, setNewPlayers] = useState<any[]>([])
  const [newPlayerDays, setNewPlayerDays] = useState(30)
  const [newPlayerCountry, setNewPlayerCountry] = useState('')
  const [countryList, setCountryList] = useState<string[]>([])

  const [countryStats, setCountryStats] = useState<any[]>([])
  const [countrySortKey, setCountrySortKey] = useState('active_players')
  const [countrySortDir, setCountrySortDir] = useState<SortDir>('desc')
  const [compareMode, setCompareMode] = useState(false)
  const [compareDate, setCompareDate] = useState('')
  const [compareStats, setCompareStats] = useState<any[]>([])
  const [availableSnapshots, setAvailableSnapshots] = useState<string[]>([])
  const [tooltip, setTooltip] = useState<{ country: string, type: 'active' | 'alltime' } | null>(null)

  const [lookupResults, setLookupResults] = useState<any[]>([])
  const [lookupSearched, setLookupSearched] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null)
  const [playerHistory, setPlayerHistory] = useState<any[]>([])
  const [showDgrade, setShowDgrade] = useState(true)
  const [showEgrade, setShowEgrade] = useState(false)
  const [showRanking, setShowRanking] = useState(true)
  const [historyRange, setHistoryRange] = useState('5y')
  const [historyFrom, setHistoryFrom] = useState('')
  const [historyTo, setHistoryTo] = useState('')
  const [lastSyncDate, setLastSyncDate] = useState<string | null>(null)
  const [importedCount, setImportedCount] = useState<number | null>(null)
  const [totalPlayers, setTotalPlayers] = useState<number | null>(null)
  const [manualImportLog, setManualImportLog] = useState<string[]>([])
  const [manualImporting, setManualImporting] = useState(false)

  const supabase = createClient()
  const activeYear = new Date().getFullYear() - 1

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('first_name, last_name, wcf_player_id, role')
          .eq('id', user.id)
          .single()
        if (data) {
          setCurrentUserProfile(data)
          setUserRole(data.role || '')
        }
      }
      const { data: syncLog } = await supabase
        .from('sync_log')
        .select('completed_at')
        .eq('status', 'complete')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single()
      if (syncLog?.completed_at) setLastSyncDate(syncLog.completed_at)

      const { count: imported } = await supabase
        .from('wcf_players')
        .select('id', { count: 'exact', head: true })
        .eq('history_imported', true)
      const { count: total } = await supabase
        .from('wcf_players')
        .select('id', { count: 'exact', head: true })
      setImportedCount(imported || 0)
      setTotalPlayers(total || 0)
    }
    init()
  }, [])

  useEffect(() => { if (activeTab === 'Rankings') loadRankings() }, [activeTab, activeOnly, rankingsPage, pageSize, sortKey, sortDir])
  useEffect(() => { if (activeTab === 'Movers') loadMovers() }, [activeTab, moverPeriod])
  useEffect(() => { if (activeTab === 'New Players') loadNewPlayers() }, [activeTab, newPlayerDays, newPlayerCountry])
  useEffect(() => { if (activeTab === 'Country Stats') loadCountryStats() }, [activeTab])
  useEffect(() => {
    if (activeTab === 'Historical Rankings' && currentUserProfile?.wcf_player_id && !selectedPlayer) {
      loadPlayerHistory(currentUserProfile.wcf_player_id)
    }
  }, [activeTab, currentUserProfile])
  useEffect(() => { if (selectedPlayer) fetchHistory(selectedPlayer.id) }, [historyRange, historyFrom, historyTo])
  useEffect(() => { if (compareMode) loadCompareStats() }, [compareMode, compareDate])

  const handleRankingSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir(key === 'wcf_last_name' ? 'asc' : 'desc') }
    setRankingsPage(0)
  }

  const sortArrow = (key: SortKey) => sortKey === key ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ' ↕'
  const thSort = (key: SortKey, align: 'left' | 'right' = 'right') =>
    `px-4 py-3 font-semibold cursor-pointer select-none text-${align} ${sortKey === key ? 'text-green-600' : 'text-gray-500 hover:text-green-600'}`

  const handleCountrySort = (key: string) => {
    const newDir: SortDir = countrySortKey === key && countrySortDir === 'desc' ? 'asc' : 'desc'
    setCountrySortKey(key)
    setCountrySortDir(newDir)
    const sorted = [...countryStats].sort((a, b) => newDir === 'desc' ? b[key] - a[key] : a[key] - b[key])
    setCountryStats(sorted)
  }

  const countryArrow = (key: string) => countrySortKey === key ? (countrySortDir === 'desc' ? ' ↓' : ' ↑') : ' ↕'
  const thCountrySort = (key: string) =>
    `px-4 py-3 font-semibold cursor-pointer select-none text-right ${countrySortKey === key ? 'text-green-600' : 'text-gray-500 hover:text-green-600'}`

  const downloadCountryCSV = () => {
    const headers = ['Rank', 'Country', 'Total Players', 'Active (12mo)', 'Top 6 Active Avg dGrade', 'Top 6 All Time Avg dGrade']
    const rows = countryStats.map((row, i) => [
      i + 1, getCountryName(row.country), row.total_players, row.active_players,
      row.avg_top6_dgrade ? Math.round(row.avg_top6_dgrade) : '',
      row.avg_top6_alltime_dgrade ? Math.round(row.avg_top6_alltime_dgrade) : '',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `gclab-country-stats-${new Date().toISOString().split('T')[0]}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const loadRankings = async () => {
    setLoading(true)
    let query = supabase
      .from('wcf_players')
      .select('id, wcf_first_name, wcf_last_name, country, dgrade, egrade, world_ranking, games, win_percentage, last_active_year, wcf_profile_url')
      .order(sortKey, { ascending: sortDir === 'asc' })
      .range(rankingsPage * pageSize, (rankingsPage + 1) * pageSize - 1)
    if (activeOnly) query = query.gte('last_active_year', activeYear)
    if (sortKey === 'egrade') query = query.not('egrade', 'is', null)
    const { data } = await query
    setRankings(data || [])
    setLoading(false)
  }

  const downloadCSV = () => {
    const headers = ['Active Rank', 'All Time Rank', 'First Name', 'Last Name', 'Country', 'dGrade', 'eGrade', 'Games (12mo)', 'Win% (12mo)', 'Last Active', 'WCF Profile']
    const rows = rankings.map((player, i) => [
      activeOnly ? rankingsPage * pageSize + i + 1 : '—',
      player.world_ranking, player.wcf_first_name, player.wcf_last_name,
      getCountryName(player.country), player.dgrade, player.egrade || '',
      player.games || '', player.win_percentage ? `${player.win_percentage}%` : '',
      player.last_active_year || '', player.wcf_profile_url,
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `gclab-rankings-${activeOnly ? 'active' : 'alltime'}-${new Date().toISOString().split('T')[0]}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const loadMovers = async () => {
    setLoading(true)
    const sinceDate = moverPeriod === 0
      ? FIRST_SYNC_DATE
      : new Date(Date.now() - moverPeriod * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const { data } = await supabase.rpc('get_movers', { since_date: sinceDate, limit_count: 20 })
    if (data) {
      setMovers({
        gains: data.filter((p: any) => p.change > 0).sort((a: any, b: any) => b.change - a.change).slice(0, 10),
        losses: data.filter((p: any) => p.change < 0).sort((a: any, b: any) => a.change - b.change).slice(0, 10),
      })
    }
    setLoading(false)
  }

  const loadNewPlayers = async () => {
    setLoading(true)
    const since = new Date()
    since.setDate(since.getDate() - newPlayerDays)
    const sinceDate = since < new Date(NEW_PLAYERS_SINCE) ? NEW_PLAYERS_SINCE : since.toISOString()
    let query = supabase
      .from('wcf_players')
      .select('id, wcf_first_name, wcf_last_name, country, dgrade, egrade, world_ranking, wcf_profile_url, created_at')
      .gte('created_at', sinceDate)
      .order('world_ranking', { ascending: true })
    if (newPlayerCountry) query = query.eq('country', newPlayerCountry)
    const { data } = await query
    setNewPlayers(data || [])
    if (!newPlayerCountry) {
      const countries = [...new Set((data || []).map((p: any) => p.country))].sort()
      setCountryList(countries as string[])
    }
    setLoading(false)
  }

  const loadCountryStats = async () => {
    setLoading(true)
    const { data } = await supabase.rpc('get_country_stats', { active_year: activeYear })
    if (data) {
      const sorted = [...data].sort((a: any, b: any) => b[countrySortKey] - a[countrySortKey])
      setCountryStats(sorted)
    }
    const { data: snapshots } = await supabase
      .from('country_stats_snapshots')
      .select('snapshot_date')
      .order('snapshot_date', { ascending: false })
    if (snapshots) {
      const dates = [...new Set(snapshots.map((s: any) => s.snapshot_date))] as string[]
      setAvailableSnapshots(dates)
      if (dates.length > 0 && !compareDate) setCompareDate(dates[0])
    }
    setLoading(false)
  }

  const loadCompareStats = async () => {
    if (!compareDate) return
    const { data } = await supabase.from('country_stats_snapshots').select('*').eq('snapshot_date', compareDate)
    if (data) setCompareStats(data)
  }

  const loadPlayerHistory = async (wcfPlayerId: string) => {
    const { data: player } = await supabase
      .from('wcf_players')
      .select('id, wcf_first_name, wcf_last_name, country, dgrade, egrade, world_ranking, wcf_profile_url')
      .eq('id', wcfPlayerId)
      .single()
    if (player) { setSelectedPlayer(player); await fetchHistory(player.id) }
  }

  const fetchHistory = async (playerId: string) => {
    let query = supabase
      .from('wcf_dgrade_history')
      .select('dgrade_value, egrade_value, world_ranking, recorded_at, event_name, event_url, is_imported')
      .eq('wcf_player_id', playerId)
      .order('recorded_at', { ascending: true })
    const now = new Date()
    if (historyRange === '1y') {
      const from = new Date(now); from.setFullYear(from.getFullYear() - 1)
      query = query.gte('recorded_at', from.toISOString())
    } else if (historyRange === '5y') {
      const from = new Date(now); from.setFullYear(from.getFullYear() - 5)
      query = query.gte('recorded_at', from.toISOString())
    } else if (historyRange === 'custom' && historyFrom) {
      query = query.gte('recorded_at', historyFrom)
      if (historyTo) query = query.lte('recorded_at', historyTo)
    }
    const { data } = await query
    if (!data) { setPlayerHistory([]); return }

    const MARCH_2026 = new Date('2026-03-01')
    const filtered: any[] = []
    const sorted = [...data].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
    const lastSyncRecord = [...sorted].reverse().find(h => !h.is_imported)
    let lastDgrade: number | null = null
    let lastRank: number | null = null
    let lastDailyDate: string | null = null

    for (const h of sorted) {
      const isEvent = h.is_imported || (h.event_name && h.event_name !== 'Daily sync')
      const dateStr = h.recorded_at.slice(0, 10)
      const isLastSync = lastSyncRecord && h.recorded_at === lastSyncRecord.recorded_at
      if (isEvent) {
        filtered.push(h); lastDgrade = h.dgrade_value; lastRank = h.world_ranking; lastDailyDate = null
      } else if (isLastSync || h.dgrade_value !== lastDgrade || h.world_ranking !== lastRank) {
        if (lastDailyDate === dateStr && filtered.length > 0 && !filtered[filtered.length - 1].is_imported) {
          const last = filtered[filtered.length - 1]
          const lastIsLastSync = lastSyncRecord && last.recorded_at === lastSyncRecord.recorded_at
          if (!lastIsLastSync) filtered.pop()
        }
        filtered.push(h); lastDgrade = h.dgrade_value; lastRank = h.world_ranking; lastDailyDate = dateStr
      }
    }

    const processed = filtered.map(h => ({
      ...h,
      world_ranking: new Date(h.recorded_at) >= MARCH_2026 ? h.world_ranking : null,
    }))
    setPlayerHistory(processed)
  }

  const handleSelectPlayer = async (player: any) => {
    setSelectedPlayer(player)
    setLookupResults([])
    setLookupSearched(false)
    setSearchQuery(`${player.wcf_first_name} ${player.wcf_last_name}`)
    setSearchSuggestions([])
    await fetchHistory(player.id)
  }

  const handleSearchQueryChange = (value: string) => {
    setSearchQuery(value)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (value.length < 2) { setSearchSuggestions([]); return }
    searchTimeoutRef.current = setTimeout(async () => {
      const parts = value.trim().split(' ')
      let query = supabase
        .from('wcf_players')
        .select('id, wcf_first_name, wcf_last_name, country, dgrade, egrade, world_ranking, wcf_profile_url')
        .order('world_ranking', { ascending: true })
        .limit(8)
      if (parts.length >= 2 && parts[1]) {
        query = query.ilike('wcf_first_name', `%${parts[0]}%`).ilike('wcf_last_name', `%${parts[1]}%`)
      } else {
        query = query.or(`wcf_last_name.ilike.%${value}%,wcf_first_name.ilike.%${value}%`)
      }
      const { data } = await query
      setSearchSuggestions(data || [])
    }, 250)
  }

  const handleShowMyHistory = () => {
    if (currentUserProfile?.wcf_player_id) {
      setSearchQuery(''); setSearchSuggestions([]); setLookupResults([])
      loadPlayerHistory(currentUserProfile.wcf_player_id)
    }
  }

  const handleManualImport = async (player: any) => {
    if (!player?.id) return
    setManualImporting(true); setManualImportLog([])
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) return
      const response = await fetch('/api/wcf-history-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ wcf_player_id: player.id }),
      })
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) return
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value)
        const lines = text.split('\n').filter(l => l.startsWith('data:'))
        for (const line of lines) {
          try {
            const event = JSON.parse(line.replace('data: ', ''))
            setManualImportLog(prev => [...prev, event.message])
            if (event.step === 'complete') { setImportedCount(prev => (prev || 0) + 1); await fetchHistory(player.id) }
          } catch {}
        }
      }
    } finally { setManualImporting(false) }
  }

  const formatDate = (str: string) => new Date(str).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const getCompareRow = (country: string) => compareStats.find((r: any) => r.country === country)

  const renderDiff = (current: number, compare: number | undefined) => {
    if (compare === undefined || compare === null) return null
    const diff = current - compare
    if (diff === 0) return <span style={{ color: 'rgba(13,40,24,0.35)', fontSize: 11, marginLeft: 4 }}>—</span>
    return <span style={{ fontSize: 11, marginLeft: 4, fontWeight: 600, color: diff > 0 ? '#16a34a' : '#dc2626' }}>{diff > 0 ? `+${diff}` : diff}</span>
  }

  const renderChart = () => {
    if (playerHistory.length === 0) return <p className="gsans" style={{ fontSize: 13, color: 'rgba(13,40,24,0.4)', padding: '16px 0' }}>No history recorded yet.</p>

    const W = 800, H = 300
    const padL = 60, padR = 70, padT = 32, padB = 48
    const chartW = W - padL - padR
    const chartH = H - padT - padB

    const dgrades = playerHistory.map(h => h.dgrade_value)
    const egrades = playerHistory.filter(h => h.egrade_value && h.egrade_value > 0).map(h => h.egrade_value)
    const wranks = playerHistory.filter(h => h.world_ranking).map(h => h.world_ranking)

    const allGrades = [...dgrades, ...(showEgrade && egrades.length > 0 ? egrades : [])]
    const gradeSpread = Math.max(...allGrades) - Math.min(...allGrades)
    const gradeMin = Math.min(...allGrades) - Math.max(50, gradeSpread * 0.15)
    const gradeMax = Math.max(...allGrades) + Math.max(50, gradeSpread * 0.15)

    const hasRank = showRanking && wranks.length > 0
    const rankBest = hasRank ? Math.max(1, Math.min(...wranks) - Math.max(2, (Math.max(...wranks) - Math.min(...wranks)) * 0.2)) : 1
    const rankWorst = hasRank ? Math.max(...wranks) + Math.max(2, (Math.max(...wranks) - Math.min(...wranks)) * 0.2) : 100

    const dates = playerHistory.map(h => new Date(h.recorded_at).getTime())
    const dateMin = Math.min(...dates)
    const dateMax = Math.max(...dates)
    const dateRange = dateMax - dateMin || 1

    const xScale = (i: number) => {
      if (playerHistory.length === 1) return padL + chartW / 2
      return padL + ((dates[i] - dateMin) / dateRange) * chartW
    }
    const yGrade = (v: number) => {
      if (gradeMax === gradeMin) return padT + chartH / 2
      return padT + chartH - ((v - gradeMin) / (gradeMax - gradeMin)) * chartH
    }
    const yRank = (v: number) => {
      if (rankWorst === rankBest) return padT + chartH / 2
      return padT + ((v - rankBest) / (rankWorst - rankBest)) * chartH
    }

    const startYear = new Date(dateMin).getFullYear()
    const endYear = new Date(dateMax).getFullYear()
    const yearTicks: { year: number, x: number }[] = []
    for (let y = startYear; y <= endYear; y++) {
      const ts = new Date(`${y}-01-01`).getTime()
      if (ts >= dateMin && ts <= dateMax) yearTicks.push({ year: y, x: padL + ((ts - dateMin) / dateRange) * chartW })
    }
    const startX = padL
    const endX = padL + chartW
    const gridLines = 5

    return (
      <div style={{ position: 'relative' }} onMouseLeave={() => setChartTooltip(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 400, display: 'block' }} onMouseLeave={() => setChartTooltip(null)}>
          {Array.from({ length: gridLines + 1 }).map((_, i) => {
            const y = padT + (i / gridLines) * chartH
            return <line key={i} x1={padL} y1={y} x2={W - padR} y2={y} stroke="#e5e7eb" strokeWidth="1" />
          })}
          <line x1={padL} y1={padT} x2={padL} y2={padT + chartH} stroke="#d1d5db" strokeWidth="1" />
          <line x1={W - padR} y1={padT} x2={W - padR} y2={padT + chartH} stroke="#d1d5db" strokeWidth="1" />
          <line x1={padL} y1={padT + chartH} x2={W - padR} y2={padT + chartH} stroke="#d1d5db" strokeWidth="1" />

          {(showDgrade || showEgrade) && Array.from({ length: gridLines + 1 }).map((_, i) => {
            const val = Math.round(gradeMax - i * ((gradeMax - gradeMin) / gridLines))
            const y = padT + (i / gridLines) * chartH
            return <text key={i} x={padL - 8} y={y + 4} fontSize="10" fill="#16a34a" textAnchor="end">{val}</text>
          })}
          {hasRank && Array.from({ length: gridLines + 1 }).map((_, i) => {
            const val = Math.round(rankBest + i * ((rankWorst - rankBest) / gridLines))
            const y = padT + (i / gridLines) * chartH
            return <text key={i} x={W - padR + 8} y={y + 4} fontSize="10" fill="#2563eb" textAnchor="start">#{val}</text>
          })}

          {historyRange === '1y' ? (() => {
            const months: { label: string, x: number }[] = []
            const d = new Date(dateMin); d.setDate(1); d.setMonth(d.getMonth() + 1)
            while (d.getTime() <= dateMax) {
              const x = padL + ((d.getTime() - dateMin) / dateRange) * chartW
              months.push({ label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), x })
              d.setMonth(d.getMonth() + 1)
            }
            return months.map(({ label, x }) => (
              <g key={label}>
                <line x1={x} y1={padT + chartH} x2={x} y2={padT + chartH + 4} stroke="#d1d5db" strokeWidth="1" />
                <text x={x} y={H - 28} fontSize="9" fill="#6b7280" textAnchor="middle">{label}</text>
              </g>
            ))
          })() : yearTicks.map(({ year, x }) => (
            <g key={year}>
              <line x1={x} y1={padT + chartH} x2={x} y2={padT + chartH + 4} stroke="#d1d5db" strokeWidth="1" />
              <text x={x} y={H - 28} fontSize="10" fill="#6b7280" textAnchor="middle">{year}</text>
            </g>
          ))}
          <text x={startX} y={H - 12} fontSize="9" fill="#9ca3af" textAnchor="start">
            {new Date(dateMin).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
          </text>
          {dateRange > 0 && (
            <text x={endX} y={H - 12} fontSize="9" fill="#9ca3af" textAnchor="end">
              {new Date(dateMax).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
            </text>
          )}

          {showDgrade && <text x={padL} y={padT - 12} fontSize="10" fill="#16a34a" fontWeight="500">dGrade</text>}
          {showEgrade && <text x={padL + 54} y={padT - 12} fontSize="10" fill="#d97706" fontWeight="500">eGrade</text>}
          {hasRank && (() => {
            const firstRankPoint = playerHistory.find(h => h.world_ranking)
            const firstRankLabel = firstRankPoint ? new Date(firstRankPoint.recorded_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'Mar 2026'
            return <text x={W - padR} y={padT - 12} fontSize="10" fill="#2563eb" textAnchor="end" fontWeight="500">World Rank (from {firstRankLabel})</text>
          })()}

          {showDgrade && playerHistory.length > 1 && (
            <polyline points={playerHistory.map((h, i) => `${xScale(i)},${yGrade(h.dgrade_value)}`).join(' ')} fill="none" stroke="#16a34a" strokeWidth="2" />
          )}
          {showEgrade && (() => {
            const epts = playerHistory.map((h, i) => h.egrade_value && h.egrade_value > 0 ? `${xScale(i)},${yGrade(h.egrade_value)}` : null).filter(Boolean)
            return epts.length > 1 ? <polyline points={epts.join(' ')} fill="none" stroke="#d97706" strokeWidth="2" strokeDasharray="4 2" /> : null
          })()}
          {hasRank && (() => {
            const rpts = playerHistory.map((h, i) => h.world_ranking ? `${xScale(i)},${yRank(h.world_ranking)}` : null).filter(Boolean)
            return rpts.length > 1 ? <polyline points={rpts.join(' ')} fill="none" stroke="#2563eb" strokeWidth="2" /> : null
          })()}

          {playerHistory.map((h, i) => {
            const cx = xScale(i)
            const label = `${new Date(h.recorded_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}${h.event_name && h.event_name !== 'Daily sync' ? ` · ${h.event_name}` : ''}`
            return (
              <g key={i}
                onMouseEnter={(e) => {
                  const lines = [label]
                  if (showDgrade) lines.push(`dGrade: ${h.dgrade_value}`)
                  if (showEgrade && h.egrade_value && h.egrade_value > 0) lines.push(`eGrade: ${h.egrade_value}`)
                  if (h.world_ranking) lines.push(`World Rank: #${h.world_ranking}`)
                  setChartTooltip({ x: cx / W * 100, y: yGrade(h.dgrade_value) / H * 100, label: lines.join('\n') })
                }}
                onMouseLeave={() => setChartTooltip(null)}
                style={{ cursor: 'pointer' }}
              >
                {showDgrade && <circle cx={cx} cy={yGrade(h.dgrade_value)} r={h.is_imported ? 3 : 4} fill={h.is_imported ? '#15803d' : '#16a34a'} opacity={h.is_imported ? 0.7 : 1} />}
                {showEgrade && h.egrade_value && h.egrade_value > 0 && <circle cx={cx} cy={yGrade(h.egrade_value)} r={h.is_imported ? 3 : 4} fill={h.is_imported ? '#b45309' : '#d97706'} opacity={h.is_imported ? 0.7 : 1} />}
                {h.world_ranking && <circle cx={cx} cy={yRank(h.world_ranking)} r={4} fill="#2563eb" opacity={0.9} />}
                <circle cx={cx} cy={yGrade(h.dgrade_value)} r={12} fill="transparent" />
              </g>
            )
          })}
        </svg>
        {chartTooltip && (
          <div style={{
            position: 'absolute', zIndex: 10, background: 'rgba(13,40,24,0.92)',
            color: CREAM, fontSize: 11, borderRadius: 6, padding: '6px 10px',
            pointerEvents: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            whiteSpace: 'pre', fontFamily: 'DM Mono, monospace',
            border: '1px solid rgba(74,222,128,0.2)',
            left: `${Math.min(chartTooltip.x, 80)}%`, top: `${Math.max(chartTooltip.y - 10, 2)}%`,
            transform: 'translate(-50%, -100%)',
          }}>
            {chartTooltip.label}
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Shared th style helper (inline, no Tailwind)
  const TH = (align: 'left' | 'right' = 'left', clickable = false): React.CSSProperties => ({
    padding: '10px 16px',
    color: 'rgba(13,40,24,0.5)',
    fontSize: 11, fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    fontFamily: 'DM Sans, sans-serif',
    textAlign: align,
    cursor: clickable ? 'pointer' : 'default',
    userSelect: 'none' as const,
    whiteSpace: 'nowrap' as const,
  })
  const TD = (align: 'left' | 'right' = 'left', mono = false): React.CSSProperties => ({
    padding: '9px 16px',
    textAlign: align,
    color: 'rgba(13,40,24,0.7)',
    fontFamily: mono ? 'DM Mono, monospace' : 'DM Sans, sans-serif',
    fontSize: 13,
  })

  return (
    <div style={{ minHeight: '100vh', background: '#f5f2ec' }} onClick={(e) => {
      if (!(e.target as HTMLElement).closest('.relative')) setTooltip(null)
    }}>
      <style dangerouslySetInnerHTML={{ __html: ML }}/>
      <GCLabNav role={userRole} currentPath="/rankings"/>

      {/* ── Dark hero header ──────────────────────────────────────────────── */}
      <div style={{ background: G, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 20% 0%, rgba(74,222,128,0.07) 0%, transparent 55%)' }}/>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(255,255,255,0.014) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.014) 1px,transparent 1px)', backgroundSize: '44px 44px' }}/>
        <div className="rnk-hero" style={{ padding: '36px 48px 28px', position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(74,222,128,0.09)', border: '1px solid rgba(74,222,128,0.18)', color: LIME, padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }} className="gsans">
            WCF Rankings
          </div>
          <h1 className="ghl" style={{ fontSize: 'clamp(24px, 3vw, 40px)', color: CREAM, fontWeight: 900, lineHeight: 1.1, marginBottom: 20 }}>
            Rankings & Stats
          </h1>
          {/* Tab pills inside hero */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`gtab-dark${activeTab === tab ? ' on' : ''}`}>
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="rnk-pad" style={{ padding: '32px 48px', maxWidth: 1100, margin: '0 auto' }}>
        {loading && <p className="gsans" style={{ color: CREAM25, fontSize: 14 }}>Loading…</p>}

        {/* ── RANKINGS ── */}
        {activeTab === 'Rankings' && !loading && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <p className="gsans" style={{ fontSize: 13, color: 'rgba(13,40,24,0.5)' }}>{rankings.length} players shown</p>
                <select value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value)); setRankingsPage(0) }}
                  style={{ border: '1px solid #d5cfc5', borderRadius: 7, padding: '5px 10px', fontSize: 13, color: G, background: 'white', fontFamily: 'DM Sans, sans-serif' }}>
                  {PAGE_SIZES.map(s => <option key={s} value={s}>{s} per page</option>)}
                </select>
                <button onClick={downloadCSV}
                  style={{ fontSize: 13, background: 'white', border: '1px solid #d5cfc5', color: '#374151', padding: '5px 12px', borderRadius: 7, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  ↓ CSV
                </button>
              </div>
              <div style={{ display: 'flex', gap: 7 }}>
                <button onClick={() => { setActiveOnly(true); setRankingsPage(0) }} className={`rnk-pill${activeOnly ? ' on' : ''}`}>
                  Active last 12 months
                </button>
                <button onClick={() => { setActiveOnly(false); setRankingsPage(0) }}
                  style={{ padding: '5px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500, border: `1px solid ${!activeOnly ? '#374151' : '#d5cfc5'}`, background: !activeOnly ? '#374151' : 'white', color: !activeOnly ? 'white' : '#374151', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                  All Time
                </button>
              </div>
            </div>

            <div className="rnk-card">
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(13,40,24,0.04)', borderBottom: '1px solid #e5e1d8' }}>
                    <th style={TH('left')}>Active Rank</th>
                    <th style={TH('left')}>All Time</th>
                    <th style={TH('left', true)} onClick={() => handleRankingSort('wcf_last_name')}>
                      Player{sortArrow('wcf_last_name')}
                    </th>
                    <th style={TH('left')}>Country</th>
                    <th style={TH('right', true)} onClick={() => handleRankingSort('dgrade')}>dGrade{sortArrow('dgrade')}</th>
                    <th style={TH('right', true)} onClick={() => handleRankingSort('egrade')}>eGrade{sortArrow('egrade')}</th>
                    <th style={TH('right', true)} onClick={() => handleRankingSort('games')}>Games (12mo){sortArrow('games')}</th>
                    <th style={TH('right', true)} onClick={() => handleRankingSort('win_percentage')}>Win% (12mo){sortArrow('win_percentage')}</th>
                    <th style={TH('right')}>Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((player) => (
                    <tr key={player.id} className="rnk-row" style={{ borderTop: '1px solid #ede9e2', background: 'white' }}>
                      <td style={{ ...TD('left', true), color: G }}>{activeOnly ? rankings.indexOf(player) + rankingsPage * pageSize + 1 : '—'}</td>
                      <td style={{ ...TD('left', true), color: 'rgba(13,40,24,0.45)' }}>{player.world_ranking}</td>
                      <td style={TD('left')}>
                        <a href={player.wcf_profile_url} target="_blank" rel="noopener noreferrer" className="rnk-link gsans" style={{ fontWeight: 500 }}>
                          {player.wcf_first_name} {player.wcf_last_name}
                        </a>
                      </td>
                      <td style={{ ...TD('left'), color: G }}><span style={{ marginRight: 4 }}>{getFlag(player.country)}</span>{getCountryName(player.country)}</td>
                      <td style={{ ...TD('right', true), fontWeight: 700, color: G, fontSize: 14 }}>{player.dgrade}</td>
                      <td style={{ ...TD('right', true), fontWeight: 600, color: AMBER }}>{player.egrade || '—'}</td>
                      <td style={TD('right', true)}>{player.games || '—'}</td>
                      <td style={TD('right', true)}>{player.win_percentage ? `${player.win_percentage}%` : '—'}</td>
                      <td style={{ ...TD('right'), color: 'rgba(13,40,24,0.45)', fontSize: 12 }}>{player.last_active_year || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
              <button onClick={() => setRankingsPage(p => Math.max(0, p - 1))} disabled={rankingsPage === 0}
                style={{ fontSize: 13, color: G, padding: '7px 16px', border: '1px solid #d5cfc5', borderRadius: 8, background: 'white', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: rankingsPage === 0 ? 0.35 : 1 }}>← Previous</button>
              <span className="gsans" style={{ fontSize: 13, color: 'rgba(13,40,24,0.45)' }}>Page {rankingsPage + 1}</span>
              <button onClick={() => setRankingsPage(p => p + 1)} disabled={rankings.length < pageSize}
                style={{ fontSize: 13, color: G, padding: '7px 16px', border: '1px solid #d5cfc5', borderRadius: 8, background: 'white', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: rankings.length < pageSize ? 0.35 : 1 }}>Next →</button>
            </div>
          </div>
        )}

        {/* ── MOVERS ── */}
        {activeTab === 'Movers' && !loading && (
          <div>
            <div style={{ display: 'flex', gap: 7, marginBottom: 10, flexWrap: 'wrap' }}>
              {MOVER_PERIODS.map(p => (
                <button key={p.days} onClick={() => setMoverPeriod(p.days)} className={`rnk-pill${moverPeriod === p.days ? ' on' : ''}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <p className="gsans" style={{ fontSize: 12, color: 'rgba(13,40,24,0.4)', marginBottom: 18 }}>GCLab baseline set 6 Mar 2026 — changes detected by daily sync. Games and Win% show career totals from WCF.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
              {[
                { title: '📈 Biggest Gains', data: movers.gains, positive: true },
                { title: '📉 Biggest Losses', data: movers.losses, positive: false },
              ].map(({ title, data, positive }) => (
                <div key={title}>
                  <h3 className="ghl" style={{ fontSize: 15, color: positive ? '#16a34a' : '#dc2626', marginBottom: 12, fontWeight: 700 }}>{title}</h3>
                  {data.length === 0 ? (
                    <p className="gsans" style={{ fontSize: 13, color: 'rgba(13,40,24,0.4)' }}>No changes detected yet.</p>
                  ) : (
                    <div className="rnk-card">
                      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: 'rgba(13,40,24,0.04)', borderBottom: '1px solid #e5e1d8' }}>
                            <th style={TH('left')}>Player</th>
                            <th style={TH('right')}>Change</th>
                            <th style={TH('right')}>dGrade</th>
                            <th style={TH('right')}>Games</th>
                            <th style={TH('right')}>Win%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.map((p) => (
                            <tr key={p.id} className="rnk-row" style={{ borderTop: '1px solid #ede9e2', background: 'white' }}>
                              <td style={TD('left')}>
                                <a href={p.wcf_profile_url} target="_blank" rel="noopener noreferrer" className="rnk-link gsans" style={{ fontWeight: 500 }}>
                                  {getFlag(p.country)} {p.wcf_first_name} {p.wcf_last_name}
                                </a>
                              </td>
                              <td style={{ ...TD('right', true), fontWeight: 700, color: positive ? '#16a34a' : '#dc2626' }}>
                                {positive ? `+${p.change}` : p.change}
                              </td>
                              <td style={{ ...TD('right', true), fontWeight: 700, color: G }}>{p.current_dgrade}</td>
                              <td style={TD('right', true)}>{p.games || '—'}</td>
                              <td style={TD('right', true)}>{p.win_percentage ? `${p.win_percentage}%` : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── NEW PLAYERS ── */}
        {activeTab === 'New Players' && !loading && (
          <div>
            <div style={{ display: 'flex', gap: 7, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              {[30, 90, 180, 365].map(d => (
                <button key={d} onClick={() => setNewPlayerDays(d)} className={`rnk-pill${newPlayerDays === d ? ' on' : ''}`}>
                  {d === 30 ? '30 days' : d === 90 ? '90 days' : d === 180 ? '6 months' : '1 year'}
                </button>
              ))}
              <select value={newPlayerCountry} onChange={(e) => setNewPlayerCountry(e.target.value)}
                style={{ border: '1px solid #d5cfc5', borderRadius: 7, padding: '5px 10px', fontSize: 13, color: G, background: 'white', fontFamily: 'DM Sans, sans-serif' }}>
                <option value="">All countries</option>
                {countryList.map(c => <option key={c} value={c}>{getFlag(c)} {getCountryName(c)}</option>)}
              </select>
            </div>
            <p className="gsans" style={{ fontSize: 13, color: G, marginBottom: 4 }}>{newPlayers.length} new players found</p>
            <p className="gsans" style={{ fontSize: 12, color: 'rgba(13,40,24,0.4)', marginBottom: 16 }}>Showing players first recorded by GCLab from 3 Mar 2026 onwards.</p>
            <div className="rnk-card">
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(13,40,24,0.04)', borderBottom: '1px solid #e5e1d8' }}>
                    <th style={TH('left')}>Player</th>
                    <th style={TH('left')}>Country</th>
                    <th style={TH('right')}>dGrade</th>
                    <th style={TH('right')}>eGrade</th>
                    <th style={TH('right')}>World Rank</th>
                    <th style={TH('right')}>First Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {newPlayers.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: '20px 16px', textAlign: 'center', color: 'rgba(13,40,24,0.4)', fontFamily: 'DM Sans, sans-serif', fontSize: 13 }}>No new players found for this period.</td></tr>
                  ) : newPlayers.map((player) => (
                    <tr key={player.id} className="rnk-row" style={{ borderTop: '1px solid #ede9e2', background: 'white' }}>
                      <td style={TD('left')}>
                        <a href={player.wcf_profile_url} target="_blank" rel="noopener noreferrer" className="rnk-link gsans" style={{ fontWeight: 500 }}>
                          {player.wcf_first_name} {player.wcf_last_name}
                        </a>
                      </td>
                      <td style={{ ...TD('left'), color: G }}><span style={{ marginRight: 4 }}>{getFlag(player.country)}</span>{getCountryName(player.country)}</td>
                      <td style={{ ...TD('right', true), fontWeight: 700, color: G }}>{player.dgrade}</td>
                      <td style={{ ...TD('right', true), fontWeight: 600, color: AMBER }}>{player.egrade || '—'}</td>
                      <td style={TD('right', true)}>{player.world_ranking}</td>
                      <td style={{ ...TD('right'), color: 'rgba(13,40,24,0.45)', fontSize: 12 }}>{formatDate(player.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── COUNTRY STATS ── */}
        {activeTab === 'Country Stats' && !loading && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
              <p className="gsans" style={{ fontSize: 12, color: 'rgba(13,40,24,0.4)' }}>Click column headers to sort. Active = played a ranked game in the last 12 months.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={downloadCountryCSV}
                  style={{ fontSize: 13, background: 'white', border: '1px solid #d5cfc5', color: '#374151', padding: '5px 12px', borderRadius: 7, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  ↓ CSV
                </button>
                <button onClick={() => setCompareMode(!compareMode)}
                  style={{ padding: '5px 14px', borderRadius: 7, fontSize: 13, fontWeight: 500, border: `1px solid ${compareMode ? '#2563eb' : '#d5cfc5'}`, background: compareMode ? '#2563eb' : 'white', color: compareMode ? 'white' : '#374151', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  {compareMode ? 'Hide Compare' : 'Compare to Past'}
                </button>
              </div>
            </div>
            {compareMode && (
              <div style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                {availableSnapshots.length === 0 ? (
                  <p className="gsans" style={{ fontSize: 13, color: '#1d4ed8' }}>No historical snapshots available yet. Monthly snapshots are stored on the 1st of each month. The first snapshot will be taken 1 Apr 2026.</p>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span className="gsans" style={{ fontSize: 13, color: '#1d4ed8' }}>Compare current stats to:</span>
                    <select value={compareDate} onChange={(e) => setCompareDate(e.target.value)}
                      style={{ border: '1px solid rgba(37,99,235,0.3)', borderRadius: 6, padding: '4px 8px', fontSize: 13, color: G, background: 'white', fontFamily: 'DM Sans, sans-serif' }}>
                      {availableSnapshots.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}
            <div className="rnk-card">
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(13,40,24,0.04)', borderBottom: '1px solid #e5e1d8' }}>
                    <th style={{ ...TH('left'), width: 36 }}>#</th>
                    <th style={TH('left')}>Country</th>
                    <th style={TH('right', true)} onClick={() => handleCountrySort('total_players')}>Total Players{countryArrow('total_players')}</th>
                    <th style={TH('right', true)} onClick={() => handleCountrySort('active_players')}>Active (12mo){countryArrow('active_players')}</th>
                    <th style={TH('right', true)} onClick={() => handleCountrySort('avg_top6_dgrade')}>Top 6 Active Avg{countryArrow('avg_top6_dgrade')}</th>
                    <th style={TH('right', true)} onClick={() => handleCountrySort('avg_top6_alltime_dgrade')}>Top 6 All Time Avg{countryArrow('avg_top6_alltime_dgrade')}</th>
                  </tr>
                </thead>
                <tbody>
                  {countryStats.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: '20px 16px', textAlign: 'center', color: 'rgba(13,40,24,0.4)', fontFamily: 'DM Sans, sans-serif', fontSize: 13 }}>No data available.</td></tr>
                  ) : countryStats.map((row, i) => {
                    const comp = compareMode ? getCompareRow(row.country) : null
                    return (
                      <tr key={row.country} className="rnk-row" style={{ borderTop: '1px solid #ede9e2', background: 'white' }}>
                        <td style={{ ...TD('left', true), color: 'rgba(13,40,24,0.4)', fontSize: 12 }}>{i + 1}</td>
                        <td style={{ ...TD('left'), fontWeight: 600, color: G }}>
                          <span style={{ marginRight: 8 }}>{getFlag(row.country)}</span>{getCountryName(row.country)}
                        </td>
                        <td style={TD('right', true)}>
                          {row.total_players}{comp && renderDiff(row.total_players, comp.total_players)}
                        </td>
                        <td style={TD('right', true)}>
                          {row.active_players}{comp && renderDiff(row.active_players, comp.active_players)}
                        </td>
                        <td style={{ ...TD('right', true), fontWeight: 700, color: G, position: 'relative' }}>
                          <button onClick={() => setTooltip(tooltip?.country === row.country && tooltip?.type === 'active' ? null : { country: row.country, type: 'active' })}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit', padding: 0 }}>
                            {row.avg_top6_dgrade ? Math.round(row.avg_top6_dgrade) : '—'}
                            {comp && comp.avg_top6_dgrade && renderDiff(Math.round(row.avg_top6_dgrade), Math.round(comp.avg_top6_dgrade))}
                            {row.top6_active && <span style={{ marginLeft: 4, color: 'rgba(13,40,24,0.4)', fontSize: 11 }}>▾</span>}
                          </button>
                          {tooltip?.country === row.country && tooltip?.type === 'active' && row.top6_active && (
                            <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 20, background: 'white', border: '1px solid #e5e1d8', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', padding: '10px 14px', width: 220, textAlign: 'left' }}>
                              <p className="gsans" style={{ fontSize: 11, fontWeight: 600, color: 'rgba(13,40,24,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Top 6 Active — {getCountryName(row.country)}</p>
                              {row.top6_active.map((p: any, idx: number) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}>
                                  <span style={{ color: G, fontFamily: 'DM Sans, sans-serif' }}>{idx + 1}. {p.first_name} {p.last_name}</span>
                                  <span style={{ fontWeight: 700, color: G, fontFamily: 'DM Mono, monospace', marginLeft: 8 }}>{p.dgrade}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td style={{ ...TD('right', true), fontWeight: 600, position: 'relative' }}>
                          <button onClick={() => setTooltip(tooltip?.country === row.country && tooltip?.type === 'alltime' ? null : { country: row.country, type: 'alltime' })}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit', padding: 0 }}>
                            {row.avg_top6_alltime_dgrade ? Math.round(row.avg_top6_alltime_dgrade) : '—'}
                            {row.top6_alltime && <span style={{ marginLeft: 4, color: 'rgba(13,40,24,0.4)', fontSize: 11 }}>▾</span>}
                          </button>
                          {tooltip?.country === row.country && tooltip?.type === 'alltime' && row.top6_alltime && (
                            <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 20, background: 'white', border: '1px solid #e5e1d8', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', padding: '10px 14px', width: 220, textAlign: 'left' }}>
                              <p className="gsans" style={{ fontSize: 11, fontWeight: 600, color: 'rgba(13,40,24,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Top 6 All Time — {getCountryName(row.country)}</p>
                              {row.top6_alltime.map((p: any, idx: number) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}>
                                  <span style={{ color: G, fontFamily: 'DM Sans, sans-serif' }}>{idx + 1}. {p.first_name} {p.last_name}</span>
                                  <span style={{ fontWeight: 700, color: G, fontFamily: 'DM Mono, monospace', marginLeft: 8 }}>{p.dgrade}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── HISTORICAL RANKINGS ── */}
        {activeTab === 'Historical Rankings' && (
          <div>
            {userRole === 'super_admin' && importedCount !== null && totalPlayers !== null && (
              <div className="gsans" style={{ fontSize: 11, color: 'rgba(13,40,24,0.4)', textAlign: 'right', marginBottom: 8 }}>
                📥 {importedCount.toLocaleString()} of {totalPlayers.toLocaleString()} players history imported
              </div>
            )}

            {/* Search box */}
            <div className="rnk-card" style={{ padding: '20px 24px', marginBottom: 20 }}>
              <h3 className="ghl" style={{ fontSize: 16, color: G, fontWeight: 700, marginBottom: 12 }}>Search any player</h3>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                  <input type="text" placeholder="Type a name…" value={searchQuery} onChange={(e) => handleSearchQueryChange(e.target.value)}
                    style={{ width: '100%', border: '1px solid #d5cfc5', borderRadius: 8, padding: '9px 14px', fontSize: 14, color: G, fontFamily: 'DM Sans, sans-serif', background: 'white', outline: 'none', boxSizing: 'border-box' }} />
                  {searchSuggestions.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: 'white', border: '1px solid #e5e1d8', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', marginTop: 4, maxHeight: 240, overflowY: 'auto' }}>
                      {searchSuggestions.map((player) => (
                        <button key={player.id} onClick={() => handleSelectPlayer(player)}
                          style={{ width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 13, background: 'none', border: 'none', borderBottom: '1px solid #f0ece4', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'DM Sans, sans-serif' }}>
                          <span style={{ color: G, fontWeight: 500 }}>{player.wcf_first_name} {player.wcf_last_name}</span>
                          <span style={{ color: 'rgba(13,40,24,0.4)', fontSize: 12, fontFamily: 'DM Mono, monospace' }}>{getFlag(player.country)} #{player.world_ranking} · {player.dgrade}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {currentUserProfile?.wcf_player_id && (
                  <button onClick={handleShowMyHistory}
                    style={{ padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', color: '#16a34a', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' }}>
                    Show My History
                  </button>
                )}
              </div>
            </div>

            {selectedPlayer && (
              <div>
                {/* Player header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                  <h3 className="ghl" style={{ fontSize: 18, color: G, fontWeight: 700 }}>{getFlag(selectedPlayer.country)} {selectedPlayer.wcf_first_name} {selectedPlayer.wcf_last_name}</h3>
                  <span className="gsans" style={{ fontSize: 13, color: 'rgba(13,40,24,0.55)' }}>
                    {getCountryName(selectedPlayer.country)} · dGrade {selectedPlayer.dgrade}
                    {selectedPlayer.egrade ? ` · eGrade ${selectedPlayer.egrade}` : ''}
                    {' '}· World #{selectedPlayer.world_ranking}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
                    {userRole === 'super_admin' && (
                      <button onClick={() => handleManualImport(selectedPlayer)} disabled={manualImporting}
                        style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(37,99,235,0.3)', color: '#1d4ed8', background: 'rgba(37,99,235,0.05)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: manualImporting ? 0.5 : 1 }}>
                        {manualImporting ? 'Importing...' : '↻ Re-import History'}
                      </button>
                    )}
                    <a href={selectedPlayer.wcf_profile_url} target="_blank" rel="noopener noreferrer" className="rnk-link gsans" style={{ fontSize: 12 }}>WCF Profile →</a>
                  </div>
                  {userRole === 'super_admin' && manualImportLog.length > 0 && (
                    <div className="gsans" style={{ width: '100%', marginTop: 8, background: '#f0ece4', borderRadius: 6, padding: '8px 12px', fontSize: 11, color: 'rgba(13,40,24,0.55)', maxHeight: 120, overflowY: 'auto' }}>
                      {manualImportLog.map((log, i) => <div key={i}>{log}</div>)}
                    </div>
                  )}
                </div>

                {/* Range + toggle controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[{ key: '1y', label: '1 Year' }, { key: '5y', label: '5 Years' }, { key: 'all', label: 'All Time' }, { key: 'custom', label: 'Custom' }].map(r => (
                      <button key={r.key} onClick={() => setHistoryRange(r.key)} className={`rnk-pill${historyRange === r.key ? ' on' : ''}`} style={{ fontSize: 12, padding: '4px 12px' }}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                  {historyRange === 'custom' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="date" value={historyFrom} onChange={(e) => setHistoryFrom(e.target.value)}
                        style={{ border: '1px solid #d5cfc5', borderRadius: 6, padding: '4px 8px', fontSize: 12, color: G, fontFamily: 'DM Sans, sans-serif' }} />
                      <span className="gsans" style={{ fontSize: 12, color: 'rgba(13,40,24,0.5)' }}>to</span>
                      <input type="date" value={historyTo} onChange={(e) => setHistoryTo(e.target.value)}
                        style={{ border: '1px solid #d5cfc5', borderRadius: 6, padding: '4px 8px', fontSize: 12, color: G, fontFamily: 'DM Sans, sans-serif' }} />
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
                    {[
                      { key: 'showDgrade', label: 'dGrade', color: '#16a34a', state: showDgrade, set: setShowDgrade },
                      { key: 'showEgrade', label: 'eGrade', color: '#d97706', state: showEgrade, set: setShowEgrade },
                      { key: 'showRanking', label: 'World Rank', color: '#2563eb', state: showRanking, set: setShowRanking },
                    ].map(({ key, label, color, state, set }) => (
                      <button key={key} onClick={() => set(!state)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '4px 10px', borderRadius: 20, border: `1px solid ${state ? color : '#d5cfc5'}`, background: state ? `${color}18` : 'white', color: state ? color : 'rgba(13,40,24,0.45)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                        <span style={{ width: 16, height: 2, background: color, display: 'inline-block', borderRadius: 1 }}/> {label}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="gsans" style={{ fontSize: 12, color: 'rgba(13,40,24,0.4)', marginBottom: 12 }}>
                  {playerHistory.length <= 1 ? 'No history recorded yet.'
                    : `${playerHistory.filter((h: any) => h.is_imported).length} imported events + ${playerHistory.filter((h: any) => !h.is_imported).length} GCLab tracked points`}
                  {showRanking && playerHistory.some(h => h.world_ranking) && (() => {
                    const firstRank = playerHistory.find(h => h.world_ranking)
                    const label = firstRank ? new Date(firstRank.recorded_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'Mar 2026'
                    return <span style={{ marginLeft: 8, color: '#2563eb' }}>· World rank shown from {label}</span>
                  })()}
                </p>

                <div className="rnk-card" style={{ padding: 16, marginBottom: 16 }}>{renderChart()}</div>

                {playerHistory.length > 0 && (() => {
                  const eventPoints = playerHistory.filter((h: any) => h.is_imported || (h.event_name && h.event_name !== 'Daily sync'))
                  const syncPoints = playerHistory.filter((h: any) => !h.is_imported && (!h.event_name || h.event_name === 'Daily sync'))
                  const lastSync = syncPoints.length > 0 ? syncPoints[syncPoints.length - 1] : null
                  const tableRows = [...eventPoints, ...(lastSync ? [lastSync] : [])].sort(
                    (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
                  )
                  const chronological = [...playerHistory]
                  const getDiff = (h: any) => {
                    const idx = chronological.findIndex(x => x.recorded_at === h.recorded_at)
                    if (idx <= 0) return null
                    return h.dgrade_value - chronological[idx - 1].dgrade_value
                  }
                  return (
                    <div className="rnk-card">
                      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: 'rgba(13,40,24,0.04)', borderBottom: '1px solid #e5e1d8' }}>
                            {['Date', 'Event', 'dGrade', 'Change', 'eGrade', 'World Rank'].map((h, i) => (
                              <th key={h} style={{ ...TH(i >= 2 ? 'right' : 'left'), padding: '8px 14px' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tableRows.map((h, i) => {
                            const diff = getDiff(h)
                            return (
                              <tr key={i} className="rnk-row" style={{ borderTop: '1px solid #ede9e2', background: 'white' }}>
                                <td style={{ padding: '7px 14px', color: 'rgba(13,40,24,0.65)', fontFamily: 'DM Sans, sans-serif' }}>{formatDate(h.recorded_at)}</td>
                                <td style={{ padding: '7px 14px', color: 'rgba(13,40,24,0.5)', fontFamily: 'DM Sans, sans-serif' }}>
                                  {h.event_url
                                    ? <a href={h.event_url} target="_blank" rel="noopener noreferrer" className="rnk-link">{h.event_name || '—'}</a>
                                    : h.event_name || <span style={{ color: 'rgba(13,40,24,0.35)' }}>{lastSyncDate ? `Last synced ${new Date(lastSyncDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Latest sync'}</span>}
                                </td>
                                <td style={{ padding: '7px 14px', textAlign: 'right', fontWeight: 700, color: G, fontFamily: 'DM Mono, monospace' }}>{h.dgrade_value}</td>
                                <td style={{ padding: '7px 14px', textAlign: 'right', fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>
                                  {diff === null ? <span style={{ color: 'rgba(13,40,24,0.3)' }}>—</span> :
                                   diff > 0 ? <span style={{ color: '#16a34a' }}>↑ +{diff}</span> :
                                   diff < 0 ? <span style={{ color: '#dc2626' }}>↓ {diff}</span> :
                                   <span style={{ color: 'rgba(13,40,24,0.3)' }}>—</span>}
                                </td>
                                <td style={{ padding: '7px 14px', textAlign: 'right', fontWeight: 600, color: AMBER, fontFamily: 'DM Mono, monospace' }}>{h.egrade_value || '—'}</td>
                                <td style={{ padding: '7px 14px', textAlign: 'right', color: 'rgba(13,40,24,0.55)', fontFamily: 'DM Mono, monospace' }}>{h.world_ranking ? `#${h.world_ranking}` : '—'}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
