'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import GCLabNav from '@/components/GCLabNav'
import { getFlag, countryName as getCountryName } from '@/lib/countries'
import { trackEvent } from '@/lib/analytics'

// ── Design tokens (matches dashboard) ────────────────────────────────────────
const G       = '#0d2818'
const LIME    = '#4ade80'
const CREAM   = '#e8e0d0'
const CREAM25 = 'rgba(232,224,208,0.25)'
const AMBER   = '#eab308'

const ML = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
  .ghl   { font-family: 'DM Serif Display', serif; }
  .gmono { font-family: 'DM Mono', monospace; }
  .gsans { font-family: 'DM Sans', sans-serif; }
  .rnk-tab {
    padding: 7px 16px; font-size: 13px; font-weight: 500;
    font-family: 'DM Sans', sans-serif;
    color: rgba(13,40,24,0.5);
    border: 1px solid #ddd8ce; border-bottom: none;
    background: #ede9e1; cursor: pointer;
    border-radius: 8px 8px 0 0; transition: all 0.15s;
  }
  .rnk-tab.on { background: #f5f2ec; color: #0d2818; border-color: #ccc7bc; font-weight: 600; }
  .rnk-tab:hover { background: #f0ece4; color: rgba(13,40,24,0.75); }
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
    .rnk-pad    { padding: 24px 20px !important; }
    .rnk-header { padding: 20px 20px 0 !important; }
    .rnk-tab    { padding: 6px 12px; font-size: 12px; }
  }
`

const TABS = ['Rankings', 'Player History', 'Movers', 'New Players', 'Country Rankings']

// Country codes that belong to each composite region / top-pick value
const REGION_CODES: Record<string, string[]> = {
  'UK':                  ['GB-ENG', 'GB-SCT', 'GB-WLS'],
  'Australasia':         ['AU', 'NZ'],
  'Europe':              ['GB-ENG', 'GB-SCT', 'GB-WLS', 'IE', 'IM', 'JE',
                          'AT', 'BE', 'BA', 'CH', 'CZ', 'DE', 'DK', 'ES', 'FI', 'FR',
                          'GR', 'IT', 'LT', 'LU', 'LV', 'NL', 'NO', 'PL', 'PT', 'RU', 'SE', 'UA'],
  'Mainland Europe':     ['AT', 'BE', 'BA', 'CH', 'CZ', 'DE', 'DK', 'ES', 'FI', 'FR',
                          'GR', 'IT', 'LT', 'LU', 'LV', 'NL', 'NO', 'PL', 'PT', 'RU', 'SE', 'UA'],
  'North America':       ['US', 'CA', 'MX'],
  'UK and Ireland':      ['GB-ENG', 'GB-SCT', 'GB-WLS', 'IE', 'IM', 'JE'],
  'Northern Hemisphere': ['CA', 'MX', 'US',
                          'GB-ENG', 'GB-SCT', 'GB-WLS', 'IE', 'IM', 'JE',
                          'AT', 'BE', 'BA', 'CH', 'CZ', 'DE', 'DK', 'ES', 'FI', 'FR',
                          'GR', 'IT', 'LT', 'LU', 'LV', 'NL', 'NO', 'PL', 'PT', 'RU', 'SE', 'UA',
                          'EG', 'HK', 'IR', 'JP', 'PS'],
  'Southern Hemisphere': ['AU', 'NZ', 'ZA', 'UY', 'MU'],
}
// Individual country codes shown as top picks (excluded from alphabetical list)
const TOP_PICK_CODES = new Set(['AU', 'EG', 'NZ', 'ES', 'US'])
const MOVER_PERIODS = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '1 year', days: 365 },
]
const PAGE_SIZES = [50, 100, 200]
const NEW_PLAYER_PAGE_SIZE = 50
const FIRST_SYNC_DATE = '2026-03-06'
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
  const urlPlayerLoadedRef = useRef(false)

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
  const [rnkSearch, setRnkSearch] = useState('')
  const [rnkSuggestions, setRnkSuggestions] = useState<any[]>([])
  const [highlightedPlayerId, setHighlightedPlayerId] = useState<string | null>(null)
  const highlightRef = useRef<HTMLTableRowElement | null>(null)
  const rnkSearchTimeoutRef = useRef<any>(null)
  const [showColMenu, setShowColMenu] = useState(false)
  const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set(['alltime', 'country', 'dgrade', 'games', 'winpct', 'lastseen']))
  const colMenuRef = useRef<HTMLDivElement>(null)
  const [filterCountry, setFilterCountry] = useState('')
  const [lastSeenYears, setLastSeenYears] = useState<Record<string, number>>({})
  const [countryRanks, setCountryRanks] = useState<Record<string, number>>({})
  const [countryPlayersSort, setCountryPlayersSort] = useState<'active' | 'alltime'>('alltime')

  const [movers, setMovers] = useState<{ gains: any[], losses: any[] }>({ gains: [], losses: [] })
  const [moverPeriod, setMoverPeriod] = useState(7)

  const [newPlayers, setNewPlayers] = useState<any[]>([])
  const [newPlayerDays, setNewPlayerDays] = useState(7)
  const [newPlayerPage, setNewPlayerPage] = useState(0)
  const [newPlayerCountry, setNewPlayerCountry] = useState('')
  const [countryList, setCountryList] = useState<string[]>([])
  const [countryPlayerCounts, setCountryPlayerCounts] = useState<Record<string, number>>({})

  const [countryStats, setCountryStats] = useState<any[]>([])
  const [countrySortKey, setCountrySortKey] = useState('avg_top6_alltime_dgrade')
  const [countrySortDir, setCountrySortDir] = useState<SortDir>('desc')
  const [playerCountSortKey, setPlayerCountSortKey] = useState('total_players')
  const [playerCountSortDir, setPlayerCountSortDir] = useState<SortDir>('desc')
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
  const [historyRange, setHistoryRange] = useState('all')
  const [recentPlayers, setRecentPlayers] = useState<any[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem('gclab_recent_players') || '[]') } catch { return [] }
  })
  const [historyFrom, setHistoryFrom] = useState('')
  const [historyTo, setHistoryTo] = useState('')
  const [peakDgradeAllTime, setPeakDgradeAllTime] = useState<number | null>(null)
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

  useEffect(() => { if (activeTab === 'Rankings') loadRankings() }, [activeTab, activeOnly, rankingsPage, pageSize, sortKey, sortDir, filterCountry])

  // Load country list + player counts on mount for the filter dropdown
  useEffect(() => {
    supabase.from('wcf_players')
      .select('country')
      .then(({ data }) => {
        if (!data) return
        const counts: Record<string, number> = {}
        data.forEach((p: any) => { if (p.country) counts[p.country] = (counts[p.country] || 0) + 1 })
        setCountryPlayerCounts(counts)
        // Sort by player count desc, then alphabetically
        const sorted = Object.keys(counts).sort((a, b) => {
          const diff = counts[b] - counts[a]
          return diff !== 0 ? diff : getCountryName(a).localeCompare(getCountryName(b))
        })
        setCountryList(sorted)
      })
  }, [])

  // Fetch last game year: one query per visible player (parallel, 1 row each)
  // Using parallel queries ensures we always get the correct most-recent game
  // even for players with large game histories.
  useEffect(() => {
    if (rankings.length === 0) { setLastSeenYears({}); return }
    Promise.all(
      rankings.map((p: any) =>
        supabase.from('wcf_player_games')
          .select('event_date')
          .eq('wcf_player_id', p.id)
          .order('event_date', { ascending: false })
          .limit(1)
          .maybeSingle()
          .then(({ data }) => ({ id: p.id, year: data?.event_date ? new Date(data.event_date).getFullYear() : null }))
      )
    ).then(results => {
      const map: Record<string, number> = {}
      for (const r of results) { if (r.year) map[r.id] = r.year }
      setLastSeenYears(map)
    })
  }, [rankings])

  // When a country filter is active, fetch all-time ranks within that country/region
  // so the "All Time" column can show country rank rather than global world rank
  useEffect(() => {
    if (!filterCountry) { setCountryRanks({}); return }
    let q = supabase.from('wcf_players')
      .select('id')
      .order('dgrade', { ascending: false })
    const codes = REGION_CODES[filterCountry]
    if (codes) q = q.in('country', codes)
    else q = q.eq('country', filterCountry)
    q.then(({ data }) => {
      if (!data) return
      const ranks: Record<string, number> = {}
      data.forEach((p: any, i: number) => { ranks[p.id] = i + 1 })
      setCountryRanks(ranks)
    })
  }, [filterCountry])

  // Close column menu when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) setShowColMenu(false)
    }
    if (showColMenu) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showColMenu])
  useEffect(() => { if (activeTab === 'Movers') loadMovers() }, [activeTab, moverPeriod])
  useEffect(() => { if (activeTab === 'New Players') { setNewPlayerPage(0); loadNewPlayers() } }, [activeTab, newPlayerDays, newPlayerCountry])
  useEffect(() => { if (activeTab === 'Country Rankings') loadCountryStats() }, [activeTab])
  // Historical Rankings no longer auto-loads the signed-in user
  useEffect(() => { if (selectedPlayer) fetchHistory(selectedPlayer.id) }, [historyRange, historyFrom, historyTo])

  // Auto-select player from ?player= URL param when navigating to Player History
  useEffect(() => {
    if (activeTab !== 'Player History') return
    if (urlPlayerLoadedRef.current) return
    urlPlayerLoadedRef.current = true
    const playerName = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('player')
      : null
    if (!playerName) return
    ;(async () => {
      const parts = playerName.trim().split(' ')
      let q = supabase
        .from('wcf_players')
        .select('id, wcf_first_name, wcf_last_name, country, dgrade, egrade, world_ranking, wcf_profile_url')
        .limit(1)
      if (parts.length >= 2 && parts[1]) {
        q = q.ilike('wcf_first_name', `%${parts[0]}%`).ilike('wcf_last_name', `%${parts[1]}%`)
      } else {
        q = q.or(`wcf_last_name.ilike.%${playerName}%,wcf_first_name.ilike.%${playerName}%`)
      }
      const { data } = await q
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      if (data?.[0]) handleSelectPlayer(data[0])
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])
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

  const handlePlayerCountSort = (key: string) => {
    const newDir: SortDir = playerCountSortKey === key && playerCountSortDir === 'desc' ? 'asc' : 'desc'
    setPlayerCountSortKey(key)
    setPlayerCountSortDir(newDir)
  }
  const playerCountArrow = (key: string) => playerCountSortKey === key ? (playerCountSortDir === 'desc' ? ' ↓' : ' ↑') : ' ↕'

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
    a.download = `gc-rankings-country-stats-${new Date().toISOString().split('T')[0]}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const downloadCountryPlayersCSV = () => {
    const sorted = [...countryStats].sort((a, b) => (b.avg_top6_dgrade || 0) - (a.avg_top6_dgrade || 0))
    const headers = ['Rank', 'Country', 'Avg Top-6 dGrade',
      'Player 1', 'P1 dGrade', 'Player 2', 'P2 dGrade', 'Player 3', 'P3 dGrade',
      'Player 4', 'P4 dGrade', 'Player 5', 'P5 dGrade', 'Player 6', 'P6 dGrade']
    const rows = sorted.map((row, i) => {
      const players = row.top6_active || []
      const cols: (string | number)[] = [i + 1, getCountryName(row.country), row.avg_top6_dgrade ? Math.round(row.avg_top6_dgrade) : '']
      for (let n = 0; n < 6; n++) {
        const p = players[n]
        cols.push(p ? `${p.first_name} ${p.last_name}` : '')
        cols.push(p ? p.dgrade : '')
      }
      return cols
    })
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `gc-rankings-country-players-${new Date().toISOString().split('T')[0]}.csv`
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
    if (filterCountry) {
      const codes = REGION_CODES[filterCountry]
      if (codes) query = query.in('country', codes)
      else query = query.eq('country', filterCountry)
    }
    if (sortKey === 'egrade') query = query.not('egrade', 'is', null)
    const { data } = await query
    setRankings(data || [])
    setLoading(false)
  }

  const downloadAllCSV = async () => {
    let query = supabase
      .from('wcf_players')
      .select('id, wcf_first_name, wcf_last_name, country, dgrade, egrade, world_ranking, games, win_percentage, last_active_year, wcf_profile_url')
      .order(sortKey, { ascending: sortDir === 'asc' })
    if (activeOnly) query = query.gte('last_active_year', activeYear)
    if (filterCountry) {
      const codes = REGION_CODES[filterCountry]
      if (codes) query = query.in('country', codes)
      else query = query.eq('country', filterCountry)
    }
    if (sortKey === 'egrade') query = query.not('egrade', 'is', null)
    const { data } = await query
    if (!data) return
    const headers = ['Rank', 'All Time Rank', 'First Name', 'Last Name', 'Country', 'dGrade', 'eGrade', 'Games (12mo)', 'Win% (12mo)', 'Last Active']
    const rows = data.map((player: any, i: number) => [
      i + 1, player.world_ranking, player.wcf_first_name, player.wcf_last_name,
      getCountryName(player.country), player.dgrade, player.egrade || '',
      player.games || '', player.win_percentage ? `${player.win_percentage}%` : '',
      player.last_active_year || '',
    ])
    const csv = [headers, ...rows].map(r => r.map((v: any) => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `gc-rankings-${activeOnly ? 'active' : 'alltime'}${filterCountry ? '-' + filterCountry : ''}-all-${new Date().toISOString().split('T')[0]}.csv`
    a.click(); URL.revokeObjectURL(url)
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
    a.download = `gc-rankings-${activeOnly ? 'active' : 'alltime'}-${new Date().toISOString().split('T')[0]}.csv`
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
      .order('created_at', { ascending: false })
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
      .select('id, wcf_first_name, wcf_last_name, country, dgrade, egrade, world_ranking, wcf_profile_url, games, win_percentage')
      .eq('id', wcfPlayerId)
      .single()
    if (player) {
      setSelectedPlayer(player)
      const { data: peakData } = await supabase
        .from('wcf_dgrade_history')
        .select('dgrade_value')
        .eq('wcf_player_id', wcfPlayerId)
        .order('dgrade_value', { ascending: false })
        .limit(1)
      setPeakDgradeAllTime(peakData?.[0]?.dgrade_value || null)
      await fetchHistory(player.id)
    }
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
    trackEvent('player_history_search', { player: `${player.wcf_first_name} ${player.wcf_last_name}` })
    await fetchHistory(player.id)
    // Fetch full player data, peak dgrade, and actual game count from wcf_player_games
    const [{ data: fullPlayer }, { data: peakData }, { count: gameCount }] = await Promise.all([
      supabase.from('wcf_players')
        .select('id, wcf_first_name, wcf_last_name, country, dgrade, egrade, world_ranking, wcf_profile_url, games, win_percentage')
        .eq('id', player.id).single(),
      supabase.from('wcf_dgrade_history')
        .select('dgrade_value').eq('wcf_player_id', player.id)
        .order('dgrade_value', { ascending: false }).limit(1),
      supabase.from('wcf_player_games')
        .select('id', { count: 'exact', head: true })
        .eq('wcf_player_id', player.id),
    ])
    if (fullPlayer) setSelectedPlayer({ ...fullPlayer, games: gameCount ?? fullPlayer.games })
    setPeakDgradeAllTime(peakData?.[0]?.dgrade_value || null)
    // Save to recent players (max 5, no duplicates)
    const updated = [player, ...recentPlayers.filter((p: any) => p.id !== player.id)].slice(0, 5)
    setRecentPlayers(updated)
    try { localStorage.setItem('gclab_recent_players', JSON.stringify(updated)) } catch {}
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
      <GCLabNav role={userRole} currentPath={activeTab === 'Player History' ? '/rankings?tab=Player+History' : '/rankings'}/>

      {/* ── Cream + Lime Accent header ────────────────────────────────────── */}
      <div style={{ background: '#f5f2ec', borderBottom: '1px solid #ddd8ce' }}>
        <div className="rnk-header" style={{ padding: '28px 48px 0', maxWidth: 1100, margin: '0 auto' }}>
          {/* Title row with lime left accent */}
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, marginBottom: 20 }}>
            <div style={{ width: 4, background: LIME, borderRadius: 2, marginRight: 16, flexShrink: 0 }} />
            <div>
              <h1 className="ghl" style={{ fontSize: 'clamp(22px, 2.5vw, 34px)', color: G, fontWeight: 900, margin: '0 0 4px', lineHeight: 1.15 }}>
                Rankings &amp; Stats
              </h1>
              <p className="gsans" style={{ margin: 0, fontSize: 13, color: 'rgba(13,40,24,0.45)' }}>
                WCF Rankings · Last updated {lastSyncDate ? new Date(lastSyncDate).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }) : 'daily'}
              </p>
            </div>
          </div>
          {/* Folder-style tabs */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`rnk-tab${activeTab === tab ? ' on' : ''}`}>
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
            {/* Toolbar — single unified row */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              {/* Left: page size, CSV, columns */}
              <select value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value)); setRankingsPage(0) }}
                style={{ border: '1px solid #d5cfc5', borderRadius: 7, padding: '5px 10px', fontSize: 13, color: G, background: 'white', fontFamily: 'DM Sans, sans-serif' }}>
                {PAGE_SIZES.map(s => <option key={s} value={s}>{s} per page</option>)}
              </select>
              <button onClick={downloadCSV}
                style={{ fontSize: 13, background: 'white', border: '1px solid #d5cfc5', color: '#374151', padding: '5px 12px', borderRadius: 7, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                ↓ Page
              </button>
              <button onClick={downloadAllCSV}
                style={{ fontSize: 13, background: 'white', border: '1px solid #d5cfc5', color: '#374151', padding: '5px 12px', borderRadius: 7, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                ↓ All CSV
              </button>
              <div ref={colMenuRef} style={{ position: 'relative' }}>
                <button onClick={() => setShowColMenu(v => !v)}
                  style={{ fontSize: 13, background: showColMenu ? '#f0f9f4' : 'white', border: `1px solid ${showColMenu ? '#4ade80' : '#d5cfc5'}`, color: showColMenu ? '#16a34a' : '#374151', padding: '5px 12px', borderRadius: 7, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  ⊞ Columns
                </button>
                {showColMenu && (
                  <div style={{ position: 'absolute', top: '110%', left: 0, background: 'white', border: '1px solid #e0dbd2', borderRadius: 10, padding: '10px 14px', zIndex: 50, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 180 }}>
                    {[
                      { key: 'alltime', label: 'All Time Rank' },
                      { key: 'country', label: 'Country' },
                      { key: 'dgrade', label: 'dGrade' },
                      { key: 'egrade', label: 'eGrade' },
                      { key: 'games', label: 'Games (12mo)' },
                      { key: 'winpct', label: 'Win% (12mo)' },
                      { key: 'lastactive', label: 'Last Active (WCF)' },
                      { key: 'lastseen', label: 'Last Game (our DB)' },
                    ].map(col => (
                      <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: G, cursor: 'pointer' }}>
                        <input type="checkbox" checked={visibleCols.has(col.key)}
                          onChange={() => {
                            const next = new Set(visibleCols)
                            next.has(col.key) ? next.delete(col.key) : next.add(col.key)
                            setVisibleCols(next)
                          }} style={{ accentColor: LIME }} />
                        {col.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {/* Spacer */}
              <div style={{ flex: 1 }}/>
              {/* Right: search, country filter, active toggles */}
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Player search */}
                <div style={{ position: 'relative' }}>
                  <input
                    value={rnkSearch}
                    onChange={e => {
                      const v = e.target.value
                      setRnkSearch(v)
                      if (rnkSearchTimeoutRef.current) clearTimeout(rnkSearchTimeoutRef.current)
                      if (v.length < 2) { setRnkSuggestions([]); return }
                      rnkSearchTimeoutRef.current = setTimeout(async () => {
                        const parts = v.trim().split(' ')
                        let q = supabase
                          .from('wcf_players')
                          .select('id, wcf_first_name, wcf_last_name, country, dgrade, world_ranking')
                          .order('dgrade', { ascending: false })
                          .limit(8)
                        if (activeOnly) q = q.gte('last_active_year', activeYear)
                        if (parts.length >= 2 && parts[1]) {
                          q = q.ilike('wcf_first_name', `%${parts[0]}%`).ilike('wcf_last_name', `%${parts[1]}%`)
                        } else {
                          q = q.or(`wcf_last_name.ilike.%${v}%,wcf_first_name.ilike.%${v}%`)
                        }
                        const { data } = await q
                        setRnkSuggestions(data || [])
                      }, 250)
                    }}
                    placeholder="Find any player…"
                    style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #d5cfc5', fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: G, background: 'white', width: 220, outline: 'none' }}
                  />
                  {rnkSuggestions.length > 0 && (
                    <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: 'white', border: '1px solid #e0dbd2', borderRadius: 8, zIndex: 100, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                      {rnkSuggestions.map(p => (
                        <button key={p.id} onClick={async () => {
                          setRnkSearch(`${p.wcf_first_name} ${p.wcf_last_name}`)
                          setRnkSuggestions([])
                          // Find which page this player is on (by counting players ranked above them)
                          let countQ = supabase.from('wcf_players')
                            .select('id', { count: 'exact', head: true })
                            .gt('dgrade', p.dgrade)
                          if (activeOnly) countQ = countQ.gte('last_active_year', activeYear)
                          const { count } = await countQ
                          const targetPage = Math.floor((count || 0) / pageSize)
                          setSortKey('dgrade')
                          setSortDir('desc')
                          setRankingsPage(targetPage)
                          setHighlightedPlayerId(p.id)
                          setTimeout(() => {
                            highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                          }, 400)
                        }}
                        style={{ display: 'block', width: '100%', padding: '7px 12px', textAlign: 'left', background: 'none', border: 'none', fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: G, cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f5f2ec')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                          {getFlag(p.country)} {p.wcf_first_name} {p.wcf_last_name}
                          <span style={{ float: 'right', color: 'rgba(13,40,24,0.4)', fontSize: 11, fontFamily: 'DM Mono, monospace' }}>#{p.world_ranking} · {p.dgrade}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Country filter — matches WCF structure */}
                <select value={filterCountry} onChange={e => { setFilterCountry(e.target.value); setRankingsPage(0) }}
                  style={{ border: '1px solid #d5cfc5', borderRadius: 7, padding: '5px 10px', fontSize: 13, color: filterCountry ? '#16a34a' : 'rgba(13,40,24,0.6)', background: 'white', fontFamily: 'DM Sans, sans-serif', fontWeight: filterCountry ? 600 : 400 }}>
                  <option value="">All Countries</option>
                  {/* Top picks: countries with most players — individual codes */}
                  {(['AU', 'EG', 'NZ', 'ES'] as const).filter(c => countryPlayerCounts[c]).map(c => (
                    <option key={c} value={c}>{getFlag(c)} {getCountryName(c)}</option>
                  ))}
                  {/* UK as composite (ENG + SCT + WLS) */}
                  <option value="UK">🇬🇧 UK</option>
                  {countryPlayerCounts['US'] && <option value="US">🇺🇸 USA</option>}
                  {/* Divider */}
                  <optgroup label="──────────────────" />
                  {/* Regions — selecting returns all countries within that territory */}
                  <option value="Australasia">Australasia</option>
                  <option value="Europe">Europe</option>
                  <option value="Mainland Europe">Mainland Europe</option>
                  <option value="North America">North America</option>
                  <option value="UK and Ireland">UK and Ireland</option>
                  <option value="Northern Hemisphere">Northern Hemisphere</option>
                  <option value="Southern Hemisphere">Southern Hemisphere</option>
                  {/* Divider */}
                  <optgroup label="──────────────────" />
                  {/* Remaining individual countries alphabetically, top picks excluded */}
                  {countryList
                    .filter(c => !TOP_PICK_CODES.has(c))
                    .sort((a, b) => getCountryName(a).localeCompare(getCountryName(b)))
                    .map(c => (
                      <option key={c} value={c}>{getFlag(c)} {getCountryName(c)}</option>
                    ))
                  }
                </select>
                <button onClick={() => { setActiveOnly(true); setRankingsPage(0) }} className={`rnk-pill${activeOnly ? ' on' : ''}`}>
                  Active (12mo)
                </button>
                <button onClick={() => { setActiveOnly(false); setRankingsPage(0) }}
                  className={`rnk-pill${!activeOnly ? ' on' : ''}`}>
                  All Time
                </button>
              </div>
            </div>

            <div className="rnk-card">
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(13,40,24,0.04)', borderBottom: '1px solid #e5e1d8' }}>
                    <th style={TH('left')}>Rank</th>
                    {visibleCols.has('alltime') && <th style={TH('left')}>{filterCountry ? 'All Time*' : 'All Time'}</th>}
                    <th style={TH('left', true)} onClick={() => handleRankingSort('wcf_last_name')}>
                      Player{sortArrow('wcf_last_name')}
                    </th>
                    {visibleCols.has('country') && <th style={TH('left')}>Country</th>}
                    {visibleCols.has('dgrade') && <th style={TH('right', true)} onClick={() => handleRankingSort('dgrade')}>dGrade{sortArrow('dgrade')}</th>}
                    {visibleCols.has('egrade') && <th style={TH('right', true)} onClick={() => handleRankingSort('egrade')}>eGrade{sortArrow('egrade')}</th>}
                    {visibleCols.has('games') && <th style={TH('right', true)} onClick={() => handleRankingSort('games')}>Games (12mo){sortArrow('games')}</th>}
                    {visibleCols.has('winpct') && <th style={TH('right', true)} onClick={() => handleRankingSort('win_percentage')}>Win% (12mo){sortArrow('win_percentage')}</th>}
                    {visibleCols.has('lastactive') && <th style={TH('right')}>Last Active</th>}
                    {visibleCols.has('lastseen') && <th style={TH('right')}>Last Game</th>}
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((player, i) => {
                    const isHighlighted = player.id === highlightedPlayerId
                    return (
                      <tr key={player.id}
                        ref={isHighlighted ? highlightRef : null}
                        className="rnk-row"
                        style={{ borderTop: '1px solid #ede9e2', background: isHighlighted ? 'rgba(74,222,128,0.1)' : 'white', transition: 'background 0.3s' }}>
                        <td style={{ ...TD('left', true), color: G }}>{i + rankingsPage * pageSize + 1}</td>
                        {visibleCols.has('alltime') && <td style={{ ...TD('left', true), color: 'rgba(13,40,24,0.45)' }}>{filterCountry ? (countryRanks[player.id] ?? '—') : player.world_ranking}</td>}
                        <td style={TD('left')}>
                          <a href={`/rankings?tab=Player+History&player=${encodeURIComponent(`${player.wcf_first_name} ${player.wcf_last_name}`)}`} className="rnk-link gsans" style={{ fontWeight: 500 }}>
                            {player.wcf_first_name} {player.wcf_last_name}
                          </a>
                        </td>
                        {visibleCols.has('country') && <td style={{ ...TD('left'), color: G }}><span style={{ marginRight: 4 }}>{getFlag(player.country)}</span>{getCountryName(player.country)}</td>}
                        {visibleCols.has('dgrade') && <td style={{ ...TD('right', true), fontWeight: sortKey === 'dgrade' ? 700 : 400, color: sortKey === 'dgrade' ? G : 'rgba(13,40,24,0.7)', fontSize: 14 }}>{player.dgrade}</td>}
                        {visibleCols.has('egrade') && <td style={{ ...TD('right', true), fontWeight: sortKey === 'egrade' ? 700 : 400, color: sortKey === 'egrade' ? AMBER : 'rgba(13,40,24,0.5)' }}>{player.egrade || '—'}</td>}
                        {visibleCols.has('games') && <td style={{ ...TD('right', true), fontWeight: sortKey === 'games' ? 700 : 400, color: sortKey === 'games' ? G : 'rgba(13,40,24,0.7)' }}>{player.games || '—'}</td>}
                        {visibleCols.has('winpct') && <td style={{ ...TD('right', true), fontWeight: sortKey === 'win_percentage' ? 700 : 400, color: sortKey === 'win_percentage' ? G : 'rgba(13,40,24,0.7)' }}>{player.win_percentage ? `${player.win_percentage}%` : '—'}</td>}
                        {visibleCols.has('lastactive') && <td style={{ ...TD('right'), color: 'rgba(13,40,24,0.45)', fontSize: 12 }}>{player.last_active_year || '—'}</td>}
                        {visibleCols.has('lastseen') && <td style={{ ...TD('right'), color: 'rgba(13,40,24,0.45)', fontSize: 12 }}>{lastSeenYears[player.id] || '—'}</td>}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination — bottom */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => setRankingsPage(p => Math.max(0, p - 1))} disabled={rankingsPage === 0}
                  style={{ fontSize: 13, color: G, padding: '7px 16px', border: '1px solid #d5cfc5', borderRadius: 8, background: 'white', cursor: rankingsPage === 0 ? 'default' : 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: rankingsPage === 0 ? 0.35 : 1 }}>← Previous</button>
                <span className="gsans" style={{ fontSize: 13, color: 'rgba(13,40,24,0.45)' }}>Page {rankingsPage + 1}</span>
                <button onClick={() => setRankingsPage(p => p + 1)} disabled={rankings.length < pageSize}
                  style={{ fontSize: 13, color: G, padding: '7px 16px', border: '1px solid #d5cfc5', borderRadius: 8, background: 'white', cursor: rankings.length < pageSize ? 'default' : 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: rankings.length < pageSize ? 0.35 : 1 }}>Next →</button>
              </div>
              <select value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value)); setRankingsPage(0) }}
                style={{ border: '1px solid #d5cfc5', borderRadius: 7, padding: '5px 10px', fontSize: 13, color: G, background: 'white', fontFamily: 'DM Sans, sans-serif' }}>
                {PAGE_SIZES.map(s => <option key={s} value={s}>{s} per page</option>)}
              </select>
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
            <p className="gsans" style={{ fontSize: 12, color: 'rgba(13,40,24,0.4)', marginBottom: 18 }}>GC Rankings baseline set 6 Mar 2026 — biggest career dGrade gains and losses tracked by daily sync. Games and Win% are for the last 12 months.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Gains */}
              <div>
                <h3 className="ghl" style={{ fontSize: 15, color: '#16a34a', marginBottom: 12, fontWeight: 700 }}>📈 Biggest Gains</h3>
                {movers.gains.length === 0 ? (
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
                        {movers.gains.map((p) => (
                          <tr key={p.id} className="rnk-row" style={{ borderTop: '1px solid #ede9e2', background: 'white' }}>
                            <td style={TD('left')}>
                              <a href={p.wcf_profile_url} target="_blank" rel="noopener noreferrer" className="rnk-link gsans" style={{ fontWeight: 500 }}>
                                {getFlag(p.country)} {p.wcf_first_name} {p.wcf_last_name}
                              </a>
                            </td>
                            <td style={{ ...TD('right', true), fontWeight: 700, color: '#16a34a' }}>+{p.change}</td>
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
              {/* Losses */}
              <div>
                <h3 className="ghl" style={{ fontSize: 15, color: '#dc2626', marginBottom: 12, fontWeight: 700 }}>📉 Biggest Losses</h3>
                {movers.losses.length === 0 ? (
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
                        {movers.losses.map((p) => (
                          <tr key={p.id} className="rnk-row" style={{ borderTop: '1px solid #ede9e2', background: 'white' }}>
                            <td style={TD('left')}>
                              <a href={p.wcf_profile_url} target="_blank" rel="noopener noreferrer" className="rnk-link gsans" style={{ fontWeight: 500 }}>
                                {getFlag(p.country)} {p.wcf_first_name} {p.wcf_last_name}
                              </a>
                            </td>
                            <td style={{ ...TD('right', true), fontWeight: 700, color: '#dc2626' }}>{p.change}</td>
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
            </div>
          </div>
        )}

        {/* ── NEW PLAYERS ── */}
        {activeTab === 'New Players' && !loading && (() => {
          const periodLabel = newPlayerDays === 7 ? '7 days' : newPlayerDays === 30 ? '30 days' : newPlayerDays === 90 ? '90 days' : newPlayerDays === 180 ? '6 months' : '1 year'
          // Country breakdown
          const countryCounts = newPlayers.reduce((acc: Record<string, number>, p) => {
            acc[p.country] = (acc[p.country] || 0) + 1
            return acc
          }, {})
          const countryBreakdown = Object.entries(countryCounts)
            .sort((a, b) => (b[1] as number) - (a[1] as number))
          // Pagination
          const totalPages = Math.ceil(newPlayers.length / NEW_PLAYER_PAGE_SIZE)
          const pageSlice = newPlayers.slice(newPlayerPage * NEW_PLAYER_PAGE_SIZE, (newPlayerPage + 1) * NEW_PLAYER_PAGE_SIZE)
          return (
            <div>
              {/* Filters */}
              <div style={{ display: 'flex', gap: 7, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                {[7, 30, 90, 180, 365].map(d => (
                  <button key={d} onClick={() => setNewPlayerDays(d)} className={`rnk-pill${newPlayerDays === d ? ' on' : ''}`}>
                    {d === 7 ? '7 days' : d === 30 ? '30 days' : d === 90 ? '90 days' : d === 180 ? '6 months' : '1 year'}
                  </button>
                ))}
                <select value={newPlayerCountry} onChange={(e) => setNewPlayerCountry(e.target.value)}
                  style={{ border: '1px solid #d5cfc5', borderRadius: 7, padding: '5px 10px', fontSize: 13, color: G, background: 'white', fontFamily: 'DM Sans, sans-serif' }}>
                  <option value="">All countries</option>
                  {countryList.map(c => <option key={c} value={c}>{getFlag(c)} {getCountryName(c)}</option>)}
                </select>
              </div>

              {/* Hero card */}
              <div className="rnk-card" style={{ padding: '20px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                <div>
                  <div className="gmono" style={{ fontSize: 48, fontWeight: 700, color: G, lineHeight: 1 }}>{newPlayers.length}</div>
                  <div className="gsans" style={{ fontSize: 13, color: 'rgba(13,40,24,0.5)', marginTop: 4 }}>
                    new player{newPlayers.length !== 1 ? 's' : ''} added in the last {periodLabel}
                  </div>
                </div>
                {countryBreakdown.length > 0 && (
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div className="gsans" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(13,40,24,0.4)', marginBottom: 8 }}>By Country</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px' }}>
                      {countryBreakdown.map(([country, count]) => (
                        <div key={country} className="gsans" style={{ fontSize: 13, color: 'rgba(13,40,24,0.7)', whiteSpace: 'nowrap', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{getFlag(country)} {getCountryName(country)}</span>
                          <span className="gmono" style={{ fontWeight: 600, color: G, marginLeft: 6 }}>{count as number}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <p className="gsans" style={{ fontSize: 12, color: 'rgba(13,40,24,0.4)', marginBottom: 16 }}>
                Players first recorded by GC Rankings from 3 Mar 2026 onwards. Sorted by date added.
                {totalPages > 1 && ` Showing ${newPlayerPage * NEW_PLAYER_PAGE_SIZE + 1}–${Math.min((newPlayerPage + 1) * NEW_PLAYER_PAGE_SIZE, newPlayers.length)} of ${newPlayers.length}.`}
              </p>

              {/* Player table */}
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
                    {pageSlice.length === 0 ? (
                      <tr><td colSpan={6} style={{ padding: '20px 16px', textAlign: 'center', color: 'rgba(13,40,24,0.4)', fontFamily: 'DM Sans, sans-serif', fontSize: 13 }}>No new players found for this period.</td></tr>
                    ) : pageSlice.map((player) => (
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 }}>
                  <button onClick={() => setNewPlayerPage(p => Math.max(0, p - 1))} disabled={newPlayerPage === 0}
                    style={{ padding: '5px 14px', borderRadius: 7, border: '1px solid #d5cfc5', background: 'white', fontSize: 13, cursor: newPlayerPage === 0 ? 'default' : 'pointer', color: newPlayerPage === 0 ? 'rgba(13,40,24,0.3)' : G, fontFamily: 'DM Sans, sans-serif' }}>
                    ← Prev
                  </button>
                  <span className="gsans" style={{ fontSize: 13, color: 'rgba(13,40,24,0.5)' }}>Page {newPlayerPage + 1} of {totalPages}</span>
                  <button onClick={() => setNewPlayerPage(p => Math.min(totalPages - 1, p + 1))} disabled={newPlayerPage === totalPages - 1}
                    style={{ padding: '5px 14px', borderRadius: 7, border: '1px solid #d5cfc5', background: 'white', fontSize: 13, cursor: newPlayerPage === totalPages - 1 ? 'default' : 'pointer', color: newPlayerPage === totalPages - 1 ? 'rgba(13,40,24,0.3)' : G, fontFamily: 'DM Sans, sans-serif' }}>
                    Next →
                  </button>
                </div>
              )}
            </div>
          )
        })()}

        {/* ── COUNTRY RANKINGS ── */}
        {activeTab === 'Country Rankings' && !loading && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, alignItems: 'start' }}>

              {/* ── Table 1: Country GC Rankings (first) ── */}
              <div>
                <div style={{ height: 64, marginBottom: 10, overflow: 'hidden', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <h3 className="ghl" style={{ fontSize: 16, color: G, fontWeight: 700, margin: '0 0 2px' }}>Country GC Rankings</h3>
                    <p className="gsans" style={{ fontSize: 12, color: 'rgba(13,40,24,0.4)', margin: 0 }}>Countries ranked by average dGrade of their top six eligible players. Click ▾ for breakdown.</p>
                  </div>
                  <button onClick={downloadCountryCSV}
                    style={{ fontSize: 13, background: 'white', border: '1px solid #d5cfc5', color: '#374151', padding: '5px 12px', borderRadius: 7, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', flexShrink: 0, marginLeft: 12 }}>
                    ↓ CSV
                  </button>
                </div>
                <div className="rnk-card" style={{ overflow: 'visible' }}>
                  <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(13,40,24,0.04)', borderBottom: '1px solid #e5e1d8' }}>
                        <th style={{ ...TH('left'), width: 32 }}>#</th>
                        <th style={TH('left')}>Country</th>
                        <th style={{ ...TH('right', true), color: countrySortKey === 'avg_top6_alltime_dgrade' ? '#16a34a' : undefined }} onClick={() => handleCountrySort('avg_top6_alltime_dgrade')}>All Time Avg{countryArrow('avg_top6_alltime_dgrade')}</th>
                        <th style={{ ...TH('right', true), color: countrySortKey === 'avg_top6_dgrade' ? '#16a34a' : undefined }} onClick={() => handleCountrySort('avg_top6_dgrade')}>Active Avg (12MO){countryArrow('avg_top6_dgrade')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {countryStats.length === 0 ? (
                        <tr><td colSpan={4} style={{ padding: '20px 16px', textAlign: 'center', color: 'rgba(13,40,24,0.4)', fontFamily: 'DM Sans, sans-serif', fontSize: 13 }}>No data available.</td></tr>
                      ) : [...countryStats].sort((a, b) => countrySortDir === 'desc' ? (b[countrySortKey] || 0) - (a[countrySortKey] || 0) : (a[countrySortKey] || 0) - (b[countrySortKey] || 0)).map((row, i) => (
                        <tr key={row.country} className="rnk-row" style={{ borderTop: '1px solid #ede9e2', background: 'white' }}>
                          <td style={{ ...TD('left', true), color: 'rgba(13,40,24,0.35)', fontSize: 12 }}>{i + 1}</td>
                          <td style={{ ...TD('left'), fontWeight: 600, color: G }}>
                            <span style={{ marginRight: 8 }}>{getFlag(row.country)}</span>{getCountryName(row.country)}
                          </td>
                          <td className="relative" style={{ ...TD('right', true), fontWeight: 700, color: countrySortKey === 'avg_top6_alltime_dgrade' ? '#16a34a' : G, position: 'relative' }}>
                            <button onClick={() => setTooltip(tooltip?.country === row.country && tooltip?.type === 'alltime' ? null : { country: row.country, type: 'alltime' })}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit', padding: 0 }}>
                              {row.avg_top6_alltime_dgrade ? Math.round(row.avg_top6_alltime_dgrade) : '—'}
                              {row.top6_alltime && <span style={{ marginLeft: 4, color: 'rgba(13,40,24,0.4)', fontSize: 11 }}>▾</span>}
                            </button>
                            {tooltip?.country === row.country && tooltip?.type === 'alltime' && row.top6_alltime && (
                              <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 200, background: 'white', border: '1px solid #e5e1d8', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', padding: '10px 14px', width: 220, textAlign: 'left' }}>
                                <p className="gsans" style={{ fontSize: 11, fontWeight: 600, color: 'rgba(13,40,24,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Top 6 All Time — {getCountryName(row.country)}</p>
                                {row.top6_alltime.map((p: any, idx: number) => (
                                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0' }}>
                                    <span style={{ color: G, fontFamily: 'DM Sans, sans-serif' }}>{idx + 1}. {p.first_name} {p.last_name}</span>
                                    <span style={{ fontWeight: 700, color: G, fontFamily: 'DM Mono, monospace', marginLeft: 8 }}>{p.dgrade}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="relative" style={{ ...TD('right', true), fontWeight: 600, color: countrySortKey === 'avg_top6_dgrade' ? '#16a34a' : 'rgba(13,40,24,0.7)', position: 'relative' }}>
                            <button onClick={() => setTooltip(tooltip?.country === row.country && tooltip?.type === 'active' ? null : { country: row.country, type: 'active' })}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit', padding: 0 }}>
                              {row.avg_top6_dgrade ? Math.round(row.avg_top6_dgrade) : '—'}
                              {row.top6_active && <span style={{ marginLeft: 4, color: 'rgba(13,40,24,0.4)', fontSize: 11 }}>▾</span>}
                            </button>
                            {tooltip?.country === row.country && tooltip?.type === 'active' && row.top6_active && (
                              <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 200, background: 'white', border: '1px solid #e5e1d8', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', padding: '10px 14px', width: 220, textAlign: 'left' }}>
                                <p className="gsans" style={{ fontSize: 11, fontWeight: 600, color: 'rgba(13,40,24,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Top 6 Active — {getCountryName(row.country)}</p>
                                {row.top6_active.map((p: any, idx: number) => (
                                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0' }}>
                                    <span style={{ color: G, fontFamily: 'DM Sans, sans-serif' }}>{idx + 1}. {p.first_name} {p.last_name}</span>
                                    <span style={{ fontWeight: 700, color: G, fontFamily: 'DM Mono, monospace', marginLeft: 8 }}>{p.dgrade}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── Table 2: Player Counts (second) ── */}
              <div>
                <div style={{ height: 64, marginBottom: 10, overflow: 'hidden' }}>
                  <h3 className="ghl" style={{ fontSize: 16, color: G, fontWeight: 700, margin: '0 0 2px' }}>Player Counts</h3>
                  <p className="gsans" style={{ fontSize: 12, color: 'rgba(13,40,24,0.4)', margin: 0 }}>Total players in the database and recently active players by country.</p>
                </div>
                <div className="rnk-card">
                  <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(13,40,24,0.04)', borderBottom: '1px solid #e5e1d8' }}>
                        <th style={{ ...TH('left'), width: 32 }}>#</th>
                        <th style={TH('left')}>Country</th>
                        <th style={{ ...TH('right', true), color: playerCountSortKey === 'total_players' ? '#16a34a' : undefined }} onClick={() => handlePlayerCountSort('total_players')}>Total{playerCountArrow('total_players')}</th>
                        <th style={{ ...TH('right', true), color: playerCountSortKey === 'active_players' ? '#16a34a' : undefined }} onClick={() => handlePlayerCountSort('active_players')}>Active (12mo){playerCountArrow('active_players')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {countryStats.length === 0 ? (
                        <tr><td colSpan={4} style={{ padding: '20px 16px', textAlign: 'center', color: 'rgba(13,40,24,0.4)', fontFamily: 'DM Sans, sans-serif', fontSize: 13 }}>No data available.</td></tr>
                      ) : [...countryStats].sort((a, b) => playerCountSortDir === 'desc' ? (b[playerCountSortKey] || 0) - (a[playerCountSortKey] || 0) : (a[playerCountSortKey] || 0) - (b[playerCountSortKey] || 0)).map((row, i) => (
                        <tr key={row.country} className="rnk-row" style={{ borderTop: '1px solid #ede9e2', background: 'white' }}>
                          <td style={{ ...TD('left', true), color: 'rgba(13,40,24,0.35)', fontSize: 12 }}>{i + 1}</td>
                          <td style={{ ...TD('left'), fontWeight: 600, color: G }}>
                            <span style={{ marginRight: 8 }}>{getFlag(row.country)}</span>{getCountryName(row.country)}
                          </td>
                          <td style={{ ...TD('right', true), fontWeight: playerCountSortKey === 'total_players' ? 700 : undefined, color: playerCountSortKey === 'total_players' ? '#16a34a' : G }}>{row.total_players}</td>
                          <td style={{ ...TD('right', true), fontWeight: 600, color: playerCountSortKey === 'active_players' ? '#16a34a' : 'rgba(13,40,24,0.7)' }}>{row.active_players}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* ── Country Players Breakdown Table ── */}
            {countryStats.length > 0 && (() => {
              const avgKey = countryPlayersSort === 'alltime' ? 'avg_top6_alltime_dgrade' : 'avg_top6_dgrade'
              const playerKey = countryPlayersSort === 'alltime' ? 'top6_alltime' : 'top6_active'
              const sorted = [...countryStats]
                .filter(r => r[playerKey] && r[playerKey].length > 0)
                .sort((a, b) => (b[avgKey] || 0) - (a[avgKey] || 0))
              return (
                <div style={{ marginTop: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <h3 className="ghl" style={{ fontSize: 16, color: G, fontWeight: 700, margin: '0 0 2px' }}>Country GC Rankings — Player Breakdown</h3>
                      <p className="gsans" style={{ fontSize: 12, color: 'rgba(13,40,24,0.4)', margin: 0 }}>Top 6 eligible players per country, sorted by country rank.</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button onClick={() => setCountryPlayersSort('alltime')} className={`rnk-pill${countryPlayersSort === 'alltime' ? ' on' : ''}`} style={{ fontSize: 12 }}>All Time</button>
                      <button onClick={() => setCountryPlayersSort('active')} className={`rnk-pill${countryPlayersSort === 'active' ? ' on' : ''}`} style={{ fontSize: 12 }}>Active</button>
                      <button onClick={downloadCountryPlayersCSV}
                        style={{ fontSize: 13, background: 'white', border: '1px solid #d5cfc5', color: '#374151', padding: '5px 12px', borderRadius: 7, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                        ↓ CSV
                      </button>
                    </div>
                  </div>
                  <div className="rnk-card" style={{ overflow: 'hidden' }}>
                    {/* Column header */}
                    <div style={{ display: 'grid', gridTemplateColumns: '36px 180px 90px 1fr', background: 'rgba(13,40,24,0.04)', borderBottom: '1px solid #e5e1d8', alignItems: 'center' }}>
                      <div style={{ ...TH('left'), width: 36 }}>#</div>
                      <div style={TH('left')}>Country</div>
                      <div style={{ ...TH('right'), color: '#16a34a' }}>Avg dGrade</div>
                      <div style={TH('left')}>Top 6 Players</div>
                    </div>
                    {sorted.map((row, i) => {
                      const players = (row[playerKey] || []) as any[]
                      return (
                        <div key={row.country} style={{ display: 'grid', gridTemplateColumns: '36px 180px 90px 1fr', borderTop: i === 0 ? 'none' : '1px solid #ede9e2', background: 'white', alignItems: 'start' }}>
                          {/* Rank */}
                          <div style={{ padding: '14px 8px 14px 12px', fontSize: 11, color: 'rgba(13,40,24,0.35)', fontFamily: 'DM Mono, monospace' }}>{i + 1}</div>
                          {/* Country */}
                          <div style={{ padding: '14px 12px', fontWeight: 600, color: G, fontFamily: 'DM Sans, sans-serif', fontSize: 13 }}>
                            <span style={{ marginRight: 6 }}>{getFlag(row.country)}</span>{getCountryName(row.country)}
                          </div>
                          {/* Avg dGrade */}
                          <div style={{ padding: '14px 12px 14px 0', textAlign: 'right', fontWeight: 700, color: '#16a34a', fontFamily: 'DM Mono, monospace', fontSize: 14 }}>
                            {row[avgKey] ? Math.round(row[avgKey]) : '—'}
                          </div>
                          {/* 2×3 player grid */}
                          <div style={{ padding: '10px 12px 10px 4px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px 12px' }}>
                            {[0,1,2,3,4,5].map(n => {
                              const p = players[n]
                              return p ? (
                                <div key={n} style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                  <span className="gsans" style={{ fontSize: 12, color: G, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.first_name} {p.last_name}</span>
                                  <span className="gmono" style={{ fontSize: 11, fontWeight: 700, color: 'rgba(13,40,24,0.55)', flexShrink: 0 }}>{p.dgrade}</span>
                                </div>
                              ) : null
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* ── HISTORICAL RANKINGS ── */}
        {activeTab === 'Player History' && (
          <div>
            {/* Admin import count */}
            {userRole === 'super_admin' && importedCount !== null && totalPlayers !== null && (
              <div className="gsans" style={{ fontSize: 11, color: 'rgba(13,40,24,0.4)', textAlign: 'right', marginBottom: 8 }}>
                📥 {importedCount.toLocaleString()} of {totalPlayers.toLocaleString()} players history imported
              </div>
            )}

            {/* ── Search area ── */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ position: 'relative', maxWidth: 520 }}>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(13,40,24,0.35)', fontSize: 16, pointerEvents: 'none' }}>⌕</span>
                  <input type="text" placeholder="Search any player by name…" value={searchQuery}
                    onChange={(e) => handleSearchQueryChange(e.target.value)}
                    style={{ width: '100%', border: '1.5px solid #ccc7bc', borderRadius: 10, padding: '11px 14px 11px 38px', fontSize: 15, color: G, fontFamily: 'DM Sans, sans-serif', background: 'white', outline: 'none', boxSizing: 'border-box', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                    onFocus={e => (e.target.style.borderColor = LIME)}
                    onBlur={e => (e.target.style.borderColor = '#ccc7bc')}
                  />
                </div>
                {searchSuggestions.length > 0 && (
                  <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, zIndex: 100, background: 'white', border: '1px solid #e0dbd2', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', marginTop: 2, maxHeight: 280, overflowY: 'auto' }}>
                    {searchSuggestions.map((player) => (
                      <button key={player.id} onClick={() => handleSelectPlayer(player)}
                        style={{ width: '100%', textAlign: 'left', padding: '10px 16px', fontSize: 13, background: 'none', border: 'none', borderBottom: '1px solid #f0ece4', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'DM Sans, sans-serif' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f5f2ec')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                        <span style={{ color: G, fontWeight: 500 }}>{player.wcf_first_name} {player.wcf_last_name}</span>
                        <span style={{ color: 'rgba(13,40,24,0.4)', fontSize: 12, fontFamily: 'DM Mono, monospace' }}>{getFlag(player.country)} #{player.world_ranking} · {player.dgrade}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent searches */}
              {!selectedPlayer && recentPlayers.length > 0 && !searchQuery && (
                <div style={{ marginTop: 12 }}>
                  <span className="gsans" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(13,40,24,0.4)', marginRight: 8 }}>Recent:</span>
                  {recentPlayers.map(p => (
                    <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', marginRight: 6, marginBottom: 6, borderRadius: 20, border: '1px solid #d5cfc5', background: 'white', overflow: 'hidden' }}>
                      <button onClick={() => handleSelectPlayer(p)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px 4px 12px', background: 'none', border: 'none', fontSize: 12, color: G, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                        {getFlag(p.country)} {p.wcf_first_name} {p.wcf_last_name}
                      </button>
                      <button onClick={() => {
                        const updated = recentPlayers.filter((r: any) => r.id !== p.id)
                        setRecentPlayers(updated)
                        try { localStorage.setItem('gclab_recent_players', JSON.stringify(updated)) } catch {}
                      }}
                        style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 8px', background: 'none', border: 'none', fontSize: 12, color: 'rgba(13,40,24,0.35)', cursor: 'pointer', lineHeight: 1 }}
                        title="Remove">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ── Empty state ── */}
            {!selectedPlayer && (
              <div className="rnk-card" style={{ padding: '40px 32px', textAlign: 'center' }}>
                {/* Placeholder chart sketch */}
                <svg viewBox="0 0 400 120" style={{ width: '100%', maxWidth: 400, margin: '0 auto 20px', display: 'block', opacity: 0.25 }}>
                  <line x1="40" y1="10" x2="40" y2="90" stroke="#0d2818" strokeWidth="1"/>
                  <line x1="40" y1="90" x2="380" y2="90" stroke="#0d2818" strokeWidth="1"/>
                  {[20,40,60,80].map(y => <line key={y} x1="40" y1={y} x2="380" y2={y} stroke="#0d2818" strokeWidth="0.5" strokeDasharray="4,4"/>)}
                  <polyline points="40,75 90,60 140,50 180,55 220,35 270,20 310,28 360,22" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="40,85 90,80 140,78 180,76 220,72 270,68 310,65 360,60" fill="none" stroke="#2563eb" strokeWidth="1.5" strokeDasharray="3,3"/>
                </svg>
                <p className="ghl" style={{ fontSize: 18, color: G, fontWeight: 700, margin: '0 0 8px' }}>Search for a player</p>
                <p className="gsans" style={{ fontSize: 13, color: 'rgba(13,40,24,0.5)', margin: 0 }}>
                  Type any player's name above to see their full grade history, event results, and ranking progression.
                </p>
              </div>
            )}

            {selectedPlayer && (
              <div>
                {/* Player header — name + micro stats + range buttons */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h3 className="gsans" style={{ fontSize: 22, color: G, fontWeight: 700, margin: '0 0 4px', lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{getFlag(selectedPlayer.country)} {selectedPlayer.wcf_first_name} {selectedPlayer.wcf_last_name}</span>
                      <a href={selectedPlayer.wcf_profile_url} target="_blank" rel="noopener noreferrer"
                        title="View WCF Profile"
                        style={{ fontSize: 14, color: 'rgba(13,40,24,0.28)', textDecoration: 'none', lineHeight: 1, fontWeight: 400 }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#16a34a')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(13,40,24,0.28)')}>↗</a>
                    </h3>
                    <p className="gsans" style={{ fontSize: 13, color: 'rgba(13,40,24,0.5)', margin: 0 }}>
                      {getCountryName(selectedPlayer.country)} · dGrade {selectedPlayer.dgrade} · World #{selectedPlayer.world_ranking || '—'}
                    </p>
                    {userRole === 'super_admin' && manualImportLog.length > 0 && (
                      <div className="gsans" style={{ marginTop: 8, background: '#f0ece4', borderRadius: 6, padding: '8px 12px', fontSize: 11, color: 'rgba(13,40,24,0.55)', maxHeight: 120, overflowY: 'auto' }}>
                        {manualImportLog.map((log, i) => <div key={i}>{log}</div>)}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {/* Range pills */}
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[{ key: '1y', label: '1Y' }, { key: '5y', label: '5Y' }, { key: 'all', label: 'All Time' }, { key: 'custom', label: 'Custom' }].map(r => (
                        <button key={r.key} onClick={() => setHistoryRange(r.key)} className={`rnk-pill${historyRange === r.key ? ' on' : ''}`} style={{ fontSize: 12, padding: '4px 12px' }}>
                          {r.label}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {userRole === 'super_admin' && (
                        <button onClick={() => handleManualImport(selectedPlayer)} disabled={manualImporting}
                          style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(37,99,235,0.3)', color: '#1d4ed8', background: 'rgba(37,99,235,0.05)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', opacity: manualImporting ? 0.5 : 1 }}>
                          {manualImporting ? 'Importing...' : '↻ Re-import'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stat boxes — 5 metrics matching the image layout */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 16 }}>
                  {[
                    { label: 'Total Games', value: selectedPlayer.games != null ? selectedPlayer.games.toLocaleString() : '—', color: G, accent: false },
                    { label: 'Career Win %', value: selectedPlayer.win_percentage != null ? `${selectedPlayer.win_percentage}%` : '—', color: '#16a34a', accent: true },
                    { label: 'Current dGrade', value: selectedPlayer.dgrade ? selectedPlayer.dgrade.toLocaleString() : '—', color: G, accent: false },
                    { label: 'Peak dGrade', value: peakDgradeAllTime ? peakDgradeAllTime.toLocaleString() : (selectedPlayer.dgrade ? selectedPlayer.dgrade.toLocaleString() : '—'), color: AMBER, accent: true },
                    { label: 'World Rank', value: selectedPlayer.world_ranking ? `#${selectedPlayer.world_ranking}` : '—', color: G, accent: false },
                  ].map(stat => (
                    <div key={stat.label} className="rnk-card" style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <div className="gmono" style={{ fontSize: 24, fontWeight: 700, color: stat.color, lineHeight: 1.1 }}>{stat.value}</div>
                      <div className="gsans" style={{ fontSize: 10, color: 'rgba(13,40,24,0.4)', marginTop: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Range + toggle controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
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
                    : `${playerHistory.filter((h: any) => h.is_imported).length} imported events + ${playerHistory.filter((h: any) => !h.is_imported).length} GC Rankings tracked points`}
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
                  const firstSync = syncPoints.length > 0 ? syncPoints[0] : null
                  const lastSync = syncPoints.length > 0 ? syncPoints[syncPoints.length - 1] : null
                  const syncRows = firstSync && lastSync && firstSync.recorded_at !== lastSync.recorded_at
                    ? [firstSync, lastSync]
                    : firstSync ? [firstSync] : []
                  const tableRows = [...eventPoints, ...syncRows].sort(
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
                                    : h.event_name
                                      ? h.event_name
                                      : firstSync && h.recorded_at === firstSync.recorded_at
                                        ? <span style={{ color: 'rgba(13,40,24,0.35)' }}>First Sync {new Date(h.recorded_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                        : <span style={{ color: 'rgba(13,40,24,0.35)' }}>Latest Sync {lastSyncDate ? new Date(lastSyncDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date(h.recorded_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
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
