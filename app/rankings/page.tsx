'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import GCLabNav from '@/components/GCLabNav'

const COUNTRY_NAMES: Record<string, string> = {
  'AU': 'Australia', 'BE': 'Belgium', 'CA': 'Canada', 'CZ': 'Czech Republic',
  'EG': 'Egypt', 'GB-ENG': 'England', 'DE': 'Germany', 'HK': 'Hong Kong',
  'IE': 'Ireland', 'LV': 'Latvia', 'MX': 'Mexico', 'NZ': 'New Zealand',
  'NO': 'Norway', 'PT': 'Portugal', 'GB-SCT': 'Scotland', 'ZA': 'South Africa',
  'ES': 'Spain', 'SE': 'Sweden', 'CH': 'Switzerland', 'US': 'USA', 'GB-WLS': 'Wales',
  'AF': 'Afghanistan', 'AL': 'Albania', 'DZ': 'Algeria', 'AD': 'Andorra',
  'AO': 'Angola', 'AR': 'Argentina', 'AM': 'Armenia', 'AT': 'Austria',
  'AZ': 'Azerbaijan', 'BS': 'Bahamas', 'BH': 'Bahrain', 'BD': 'Bangladesh',
  'BB': 'Barbados', 'BY': 'Belarus', 'BZ': 'Belize', 'BJ': 'Benin',
  'BT': 'Bhutan', 'BO': 'Bolivia', 'BA': 'Bosnia and Herzegovina', 'BW': 'Botswana',
  'BR': 'Brazil', 'BN': 'Brunei', 'BG': 'Bulgaria', 'BF': 'Burkina Faso',
  'BI': 'Burundi', 'CV': 'Cabo Verde', 'KH': 'Cambodia', 'CM': 'Cameroon',
  'CF': 'Central African Republic', 'TD': 'Chad', 'CL': 'Chile', 'CN': 'China',
  'CO': 'Colombia', 'KM': 'Comoros', 'CG': 'Congo', 'CR': 'Costa Rica',
  'HR': 'Croatia', 'CU': 'Cuba', 'CY': 'Cyprus', 'DK': 'Denmark',
  'DJ': 'Djibouti', 'DM': 'Dominica', 'DO': 'Dominican Republic', 'EC': 'Ecuador',
  'SV': 'El Salvador', 'GQ': 'Equatorial Guinea', 'ER': 'Eritrea', 'EE': 'Estonia',
  'SZ': 'Eswatini', 'ET': 'Ethiopia', 'FJ': 'Fiji', 'FI': 'Finland',
  'FR': 'France', 'GA': 'Gabon', 'GM': 'Gambia', 'GE': 'Georgia',
  'GH': 'Ghana', 'GR': 'Greece', 'GD': 'Grenada', 'GT': 'Guatemala',
  'GN': 'Guinea', 'GW': 'Guinea-Bissau', 'GY': 'Guyana', 'HT': 'Haiti',
  'HN': 'Honduras', 'HU': 'Hungary', 'IS': 'Iceland', 'IN': 'India',
  'ID': 'Indonesia', 'IR': 'Iran', 'IQ': 'Iraq', 'IL': 'Israel',
  'IT': 'Italy', 'JM': 'Jamaica', 'JP': 'Japan', 'JO': 'Jordan',
  'KZ': 'Kazakhstan', 'KE': 'Kenya', 'KI': 'Kiribati', 'KW': 'Kuwait',
  'KG': 'Kyrgyzstan', 'LA': 'Laos', 'LB': 'Lebanon', 'LS': 'Lesotho',
  'LR': 'Liberia', 'LY': 'Libya', 'LI': 'Liechtenstein', 'LT': 'Lithuania',
  'LU': 'Luxembourg', 'MG': 'Madagascar', 'MW': 'Malawi', 'MY': 'Malaysia',
  'MV': 'Maldives', 'ML': 'Mali', 'MT': 'Malta', 'MH': 'Marshall Islands',
  'MR': 'Mauritania', 'MU': 'Mauritius', 'FM': 'Micronesia', 'MD': 'Moldova',
  'MC': 'Monaco', 'MN': 'Mongolia', 'ME': 'Montenegro', 'MA': 'Morocco',
  'MZ': 'Mozambique', 'MM': 'Myanmar', 'NA': 'Namibia', 'NR': 'Nauru',
  'NP': 'Nepal', 'NL': 'Netherlands', 'NI': 'Nicaragua', 'NE': 'Niger',
  'NG': 'Nigeria', 'MK': 'North Macedonia', 'PK': 'Pakistan', 'PW': 'Palau',
  'PA': 'Panama', 'PG': 'Papua New Guinea', 'PY': 'Paraguay', 'PE': 'Peru',
  'PH': 'Philippines', 'PL': 'Poland', 'QA': 'Qatar', 'RO': 'Romania',
  'RU': 'Russia', 'RW': 'Rwanda', 'KN': 'Saint Kitts and Nevis', 'LC': 'Saint Lucia',
  'VC': 'Saint Vincent', 'WS': 'Samoa', 'SM': 'San Marino', 'ST': 'Sao Tome and Principe',
  'SA': 'Saudi Arabia', 'SN': 'Senegal', 'RS': 'Serbia', 'SL': 'Sierra Leone',
  'SG': 'Singapore', 'SK': 'Slovakia', 'SI': 'Slovenia', 'SB': 'Solomon Islands',
  'SO': 'Somalia', 'SS': 'South Sudan', 'LK': 'Sri Lanka', 'SD': 'Sudan',
  'SR': 'Suriname', 'SY': 'Syria', 'TW': 'Taiwan', 'TJ': 'Tajikistan',
  'TZ': 'Tanzania', 'TH': 'Thailand', 'TL': 'Timor-Leste', 'TG': 'Togo',
  'TO': 'Tonga', 'TT': 'Trinidad and Tobago', 'TN': 'Tunisia', 'TR': 'Turkey',
  'TM': 'Turkmenistan', 'TV': 'Tuvalu', 'UG': 'Uganda', 'UA': 'Ukraine',
  'AE': 'United Arab Emirates', 'UY': 'Uruguay', 'UZ': 'Uzbekistan',
  'VU': 'Vanuatu', 'VE': 'Venezuela', 'VN': 'Vietnam', 'YE': 'Yemen',
  'ZM': 'Zambia', 'ZW': 'Zimbabwe',
}

function getCountryName(code: string): string {
  return COUNTRY_NAMES[code] || code
}

function getFlag(code: string): string {
  if (!code) return ''
  if (code === 'GB-ENG') return '🏴󠁧󠁢󠁥󠁮󠁧󠁿'
  if (code === 'GB-SCT') return '🏴󠁧󠁢󠁳󠁣󠁴󠁿'
  if (code === 'GB-WLS') return '🏴󠁧󠁢󠁷󠁬󠁳󠁿'
  if (code.length !== 2) return ''
  return code
    .toUpperCase()
    .split('')
    .map(c => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join('')
}

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


const ML_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
  .ghl  { font-family: 'Playfair Display', serif; }
  .gmono{ font-family: 'DM Mono', monospace; }
  .gsans{ font-family: 'DM Sans', sans-serif; }
`

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
  const [historyRange, setHistoryRange] = useState('all')
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
      // Fetch last successful sync date
      const { data: syncLog } = await supabase
        .from('sync_log')
        .select('completed_at')
        .eq('status', 'complete')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single()
      if (syncLog?.completed_at) setLastSyncDate(syncLog.completed_at)

      // Fetch import progress counts (super_admin only — fetched for all but only shown to super_admin)
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
    else {
      setSortKey(key)
      setSortDir(key === 'wcf_last_name' ? 'asc' : 'desc')
    }
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
      i + 1,
      getCountryName(row.country),
      row.total_players,
      row.active_players,
      row.avg_top6_dgrade ? Math.round(row.avg_top6_dgrade) : '',
      row.avg_top6_alltime_dgrade ? Math.round(row.avg_top6_alltime_dgrade) : '',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gclab-country-stats-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
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
      player.world_ranking,
      player.wcf_first_name,
      player.wcf_last_name,
      getCountryName(player.country),
      player.dgrade,
      player.egrade || '',
      player.games || '',
      player.win_percentage ? `${player.win_percentage}%` : '',
      player.last_active_year || '',
      player.wcf_profile_url,
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gclab-rankings-${activeOnly ? 'active' : 'alltime'}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
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
      .select('id, wcf_first_name, wcf_last_name, country, dgrade, egrade, world_ranking, wcf_profile_url, history_imported')
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

    // Filter: keep all imported/event points, but for daily syncs keep only if dgrade changed
    // Also deduplicate: if multiple daily syncs on same day, keep only last
    const MARCH_2026 = new Date('2026-03-01')
    const filtered: any[] = []
    // Ensure data is sorted chronologically
    const sorted = [...data].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())

    // Find the most recent non-imported record — always show this in chart + table
    const lastSyncRecord = [...sorted].reverse().find(h => !h.is_imported)

    let lastDgrade: number | null = null
    let lastRank: number | null = null
    let lastDailyDate: string | null = null

    for (const h of sorted) {
      const isEvent = h.is_imported || (h.event_name && h.event_name !== 'Daily sync')
      const dateStr = h.recorded_at.slice(0, 10)
      const isLastSync = lastSyncRecord && h.recorded_at === lastSyncRecord.recorded_at

      if (isEvent) {
        filtered.push(h)
        lastDgrade = h.dgrade_value
        lastRank = h.world_ranking
        lastDailyDate = null
      } else if (isLastSync || h.dgrade_value !== lastDgrade || h.world_ranking !== lastRank) {
        // Replace same-day duplicate but never remove the lastSync point
        if (lastDailyDate === dateStr && filtered.length > 0 && !filtered[filtered.length - 1].is_imported) {
          const last = filtered[filtered.length - 1]
          const lastIsLastSync = lastSyncRecord && last.recorded_at === lastSyncRecord.recorded_at
          if (!lastIsLastSync) filtered.pop()
        }
        filtered.push(h)
        lastDgrade = h.dgrade_value
        lastRank = h.world_ranking
        lastDailyDate = dateStr
      }
    }

    // Null out world_ranking for points before March 2026
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
        .select('id, wcf_first_name, wcf_last_name, country, dgrade, egrade, world_ranking, wcf_profile_url, history_imported')
        .order('world_ranking', { ascending: true })
        .limit(8)
      if (parts.length >= 2 && parts[1]) {
        query = query
          .ilike('wcf_first_name', `%${parts[0]}%`)
          .ilike('wcf_last_name', `%${parts[1]}%`)
      } else {
        query = query.or(`wcf_last_name.ilike.%${value}%,wcf_first_name.ilike.%${value}%`)
      }
      const { data } = await query
      setSearchSuggestions(data || [])
    }, 250)
  }

  const handleShowMyHistory = () => {
    if (currentUserProfile?.wcf_player_id) {
      setSearchQuery('')
      setSearchSuggestions([])
      setLookupResults([])
      loadPlayerHistory(currentUserProfile.wcf_player_id)
    }
  }

  const handleManualImport = async (player: any) => {
    if (!player?.id) return
    setManualImporting(true)
    setManualImportLog([])
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
            if (event.step === 'complete') {
              setImportedCount(prev => (prev || 0) + 1)
              await fetchHistory(player.id)
            }
          } catch {}
        }
      }
    } finally {
      setManualImporting(false)
    }
  }

  const formatDate = (str: string) => new Date(str).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  const getCompareRow = (country: string) => compareStats.find((r: any) => r.country === country)

  const renderDiff = (current: number, compare: number | undefined) => {
    if (compare === undefined || compare === null) return null
    const diff = current - compare
    if (diff === 0) return <span className="text-gray-400 text-xs ml-1">—</span>
    return <span className={`text-xs ml-1 font-medium ${diff > 0 ? 'text-green-600' : 'text-red-500'}`}>{diff > 0 ? `+${diff}` : diff}</span>
  }

  const renderChart = () => {
    if (playerHistory.length === 0) return <p className="text-sm text-gray-400 py-4">No history recorded yet.</p>

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
    // rankBest = lowest number (e.g. #1), rankWorst = highest number (e.g. #100)
    // On chart: #1 at TOP, higher numbers lower down
    const rankBest = hasRank ? Math.max(1, Math.min(...wranks) - Math.max(2, (Math.max(...wranks) - Math.min(...wranks)) * 0.2)) : 1
    const rankWorst = hasRank ? Math.max(...wranks) + Math.max(2, (Math.max(...wranks) - Math.min(...wranks)) * 0.2) : 100

    // X scale based on actual dates
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

    // Lower rank number = better = higher on chart
    const yRank = (v: number) => {
      if (rankWorst === rankBest) return padT + chartH / 2
      return padT + ((v - rankBest) / (rankWorst - rankBest)) * chartH
    }

    // Year tick marks on x-axis
    const startYear = new Date(dateMin).getFullYear()
    const endYear = new Date(dateMax).getFullYear()
    const yearTicks: { year: number, x: number }[] = []
    for (let y = startYear; y <= endYear; y++) {
      const ts = new Date(`${y}-01-01`).getTime()
      if (ts >= dateMin && ts <= dateMax) {
        yearTicks.push({ year: y, x: padL + ((ts - dateMin) / dateRange) * chartW })
      }
    }
    // Always show start and end year
    const startX = padL
    const endX = padL + chartW

    const gridLines = 5

    // Grade change table: compute diffs
    const historyWithDiff = playerHistory.map((h, i) => ({
      ...h,
      gradeDiff: i === 0 ? null : h.dgrade_value - playerHistory[i - 1].dgrade_value,
    }))

    return (
      <div className="relative" onMouseLeave={() => setChartTooltip(null)}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ minWidth: 400 }}
          onMouseLeave={() => setChartTooltip(null)}
        >
          {/* Grid */}
          {Array.from({ length: gridLines + 1 }).map((_, i) => {
            const y = padT + (i / gridLines) * chartH
            return <line key={i} x1={padL} y1={y} x2={W - padR} y2={y} stroke="#e5e7eb" strokeWidth="1" />
          })}
          <line x1={padL} y1={padT} x2={padL} y2={padT + chartH} stroke="#d1d5db" strokeWidth="1" />
          <line x1={W - padR} y1={padT} x2={W - padR} y2={padT + chartH} stroke="#d1d5db" strokeWidth="1" />
          <line x1={padL} y1={padT + chartH} x2={W - padR} y2={padT + chartH} stroke="#d1d5db" strokeWidth="1" />

          {/* Grade Y axis labels */}
          {(showDgrade || showEgrade) && Array.from({ length: gridLines + 1 }).map((_, i) => {
            const val = Math.round(gradeMax - i * ((gradeMax - gradeMin) / gridLines))
            const y = padT + (i / gridLines) * chartH
            return <text key={i} x={padL - 8} y={y + 4} fontSize="10" fill="#16a34a" textAnchor="end">{val}</text>
          })}

          {/* Rank Y axis labels — #1 at top, higher numbers lower */}
          {hasRank && Array.from({ length: gridLines + 1 }).map((_, i) => {
            const val = Math.round(rankBest + i * ((rankWorst - rankBest) / gridLines))
            const y = padT + (i / gridLines) * chartH
            return <text key={i} x={W - padR + 8} y={y + 4} fontSize="10" fill="#2563eb" textAnchor="start">#{val}</text>
          })}

          {/* X axis — year ticks or monthly ticks for 1y view */}
          {historyRange === '1y' ? (() => {
            const months: { label: string, x: number }[] = []
            const d = new Date(dateMin)
            d.setDate(1)
            d.setMonth(d.getMonth() + 1)
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
          {/* Always label start/end date */}
          <text x={startX} y={H - 12} fontSize="9" fill="#9ca3af" textAnchor="start">
            {new Date(dateMin).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
          </text>
          {dateRange > 0 && (
            <text x={endX} y={H - 12} fontSize="9" fill="#9ca3af" textAnchor="end">
              {new Date(dateMax).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
            </text>
          )}

          {/* Legend */}
          {showDgrade && <text x={padL} y={padT - 12} fontSize="10" fill="#16a34a" fontWeight="500">dGrade</text>}
          {showEgrade && <text x={padL + 54} y={padT - 12} fontSize="10" fill="#d97706" fontWeight="500">eGrade</text>}
          {hasRank && (() => {
            const firstRankPoint = playerHistory.find(h => h.world_ranking)
            const firstRankLabel = firstRankPoint
              ? new Date(firstRankPoint.recorded_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
              : 'Mar 2026'
            return <text x={W - padR} y={padT - 12} fontSize="10" fill="#2563eb" textAnchor="end" fontWeight="500">World Rank Collected Since March 2026</text>
          })()}

          {/* dGrade line */}
          {showDgrade && playerHistory.length > 1 && (
            <polyline
              points={playerHistory.map((h, i) => `${xScale(i)},${yGrade(h.dgrade_value)}`).join(' ')}
              fill="none" stroke="#16a34a" strokeWidth="2"
            />
          )}

          {/* eGrade line — only connect points that have egrade */}
          {showEgrade && (() => {
            const epts = playerHistory
              .map((h, i) => h.egrade_value && h.egrade_value > 0 ? `${xScale(i)},${yGrade(h.egrade_value)}` : null)
              .filter(Boolean)
            return epts.length > 1 ? (
              <polyline points={epts.join(' ')} fill="none" stroke="#d97706" strokeWidth="2" strokeDasharray="4 2" />
            ) : null
          })()}

          {/* World Rank line — only connect points that have rank */}
          {hasRank && (() => {
            const rpts = playerHistory
              .map((h, i) => h.world_ranking ? `${xScale(i)},${yRank(h.world_ranking)}` : null)
              .filter(Boolean)
            return rpts.length > 1 ? (
              <polyline points={rpts.join(' ')} fill="none" stroke="#2563eb" strokeWidth="2" />
            ) : null
          })()}

          {/* Dots with hover — large invisible hit area */}
          {playerHistory.map((h, i) => {
            const cx = xScale(i)
            const label = `${new Date(h.recorded_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}${h.event_name && h.event_name !== 'Daily sync' ? ` · ${h.event_name}` : ''}`
            return (
              <g key={i}
                onMouseEnter={(e) => {
                  const svg = (e.currentTarget as SVGElement).closest('svg')!
                  const rect = svg.getBoundingClientRect()
                  const lines = [label]
                  if (showDgrade) lines.push(`dGrade: ${h.dgrade_value}`)
                  if (showEgrade && h.egrade_value && h.egrade_value > 0) lines.push(`eGrade: ${h.egrade_value}`)
                  if (h.world_ranking) lines.push(`World Rank: #${h.world_ranking}`)
                  setChartTooltip({ x: cx / W * 100, y: yGrade(h.dgrade_value) / H * 100, label: lines.join('\n') })
                }}
                onMouseLeave={() => setChartTooltip(null)}
                style={{ cursor: 'pointer' }}
              >
                {showDgrade && (
                  <circle cx={cx} cy={yGrade(h.dgrade_value)} r={h.is_imported ? 3 : 4}
                    fill={h.is_imported ? '#15803d' : '#16a34a'} opacity={h.is_imported ? 0.7 : 1} />
                )}
                {showEgrade && h.egrade_value && h.egrade_value > 0 && (
                  <circle cx={cx} cy={yGrade(h.egrade_value)} r={h.is_imported ? 3 : 4}
                    fill={h.is_imported ? '#b45309' : '#d97706'} opacity={h.is_imported ? 0.7 : 1} />
                )}
                {h.world_ranking && (
                  <circle cx={cx} cy={yRank(h.world_ranking)} r={4}
                    fill="#2563eb" opacity={0.9} />
                )}
                {/* Large invisible hit area */}
                <circle cx={cx} cy={yGrade(h.dgrade_value)} r={12} fill="transparent" />
              </g>
            )
          })}
        </svg>

        {/* Floating tooltip */}
        {chartTooltip && (
          <div
            className="absolute z-10 bg-gray-900 text-white text-xs rounded-md px-2 py-1.5 pointer-events-none shadow-lg whitespace-pre"
            style={{ left: `${Math.min(chartTooltip.x, 80)}%`, top: `${Math.max(chartTooltip.y - 10, 2)}%`, transform: 'translate(-50%, -100%)' }}
          >
            {chartTooltip.label}
          </div>
        )}
      </div>
    )
  }

  const thBase = "px-4 py-3 text-gray-700 font-semibold"

  return (
    <div style={{ minHeight: '100vh', background: '#f5f2ec' }} onClick={(e) => {
      if (!(e.target as HTMLElement).closest('.relative')) setTooltip(null)
    }}>
      <style dangerouslySetInnerHTML={{ __html: ML_STYLES }}/>
      <GCLabNav role={userRole} isSignedIn={!!currentUserProfile} currentPath="/rankings" />

      {/* Dark ML header */}
      <div style={{ background: '#0d2818', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 100% 0%, rgba(74,222,128,0.06) 0%, transparent 55%)' }}/>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(255,255,255,0.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.012) 1px,transparent 1px)', backgroundSize: '44px 44px' }}/>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '32px 24px 20px', position: 'relative', zIndex: 1 }}>
          <h2 className="ghl" style={{ fontSize: 'clamp(22px, 3vw, 38px)', color: '#e8e0d0', fontWeight: 900, marginBottom: 20, letterSpacing: '-0.5px' }}>
            WCF Rankings & Stats
          </h2>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className="gsans" style={{
                padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                background: activeTab === tab ? 'rgba(74,222,128,0.15)' : 'transparent',
                border: `1px solid ${activeTab === tab ? 'rgba(74,222,128,0.35)' : 'rgba(255,255,255,0.12)'}`,
                color: activeTab === tab ? '#4ade80' : 'rgba(232,224,208,0.5)',
                transition: 'all 0.15s',
              }}>
                {tab}
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: 24, background: 'linear-gradient(180deg, #0d2818 0%, #f5f2ec 100%)' }}/>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-6">
        {loading && <p className="gsans" style={{ color: '#9ca3af', fontSize: 13 }}>Loading...</p>}

        {/* ── RANKINGS ── */}
        {activeTab === 'Rankings' && !loading && (
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm text-gray-500">{rankings.length} players shown</p>
                  {lastSyncDate && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Last updated {new Date(lastSyncDate).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}
                    </p>
                  )}
                </div>
                <select value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value)); setRankingsPage(0) }}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500">
                  {PAGE_SIZES.map(s => <option key={s} value={s}>{s} per page</option>)}
                </select>
                <button onClick={downloadCSV}
                  className="flex items-center gap-1 text-sm bg-white border border-gray-300 text-gray-600 px-3 py-1 rounded-md hover:border-green-500 hover:text-green-600 transition">
                  ↓ Download CSV
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setActiveOnly(true); setRankingsPage(0) }}
                  className={`px-4 py-1 rounded-full text-sm font-medium border transition ${activeOnly ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'}`}>
                  Active last 12 months
                </button>
                <button onClick={() => { setActiveOnly(false); setRankingsPage(0) }}
                  className={`px-4 py-1 rounded-full text-sm font-medium border transition ${!activeOnly ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}>
                  All Time
                </button>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className={`text-left ${thBase}`}>Active Rank</th>
                    <th className={`text-left ${thBase}`}>All Time</th>
                    <th className={thSort('wcf_last_name', 'left')} onClick={() => handleRankingSort('wcf_last_name')}>Player{sortArrow('wcf_last_name')}</th>
                    <th className={`text-left ${thBase}`}>Country</th>
                    <th className={thSort('dgrade')} onClick={() => handleRankingSort('dgrade')}>dGrade{sortArrow('dgrade')}</th>
                    <th className={thSort('egrade')} onClick={() => handleRankingSort('egrade')}>eGrade{sortArrow('egrade')}</th>
                    <th className={thSort('games')} onClick={() => handleRankingSort('games')}>Games (12mo){sortArrow('games')}</th>
                    <th className={thSort('win_percentage')} onClick={() => handleRankingSort('win_percentage')}>Win% (12mo){sortArrow('win_percentage')}</th>
                    <th className={`text-right ${thBase}`}>Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((player, i) => (
                    <tr key={player.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 text-gray-700">{activeOnly ? rankingsPage * pageSize + i + 1 : '—'}</td>
                      <td className="px-4 py-2 text-gray-700">{player.world_ranking}</td>
                      <td className="px-4 py-2">
                        <a href={player.wcf_profile_url} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline font-medium">
                          {player.wcf_first_name} {player.wcf_last_name}
                        </a>
                      </td>
                      <td className="px-4 py-2 text-gray-900"><span className="mr-1">{getFlag(player.country)}</span>{getCountryName(player.country)}</td>
                      <td className="px-4 py-2 text-right font-semibold text-gray-900">{player.dgrade}</td>
                      <td className="px-4 py-2 text-right font-semibold text-amber-600">{player.egrade || '—'}</td>
                      <td className="px-4 py-2 text-right text-gray-700">{player.games || '—'}</td>
                      <td className="px-4 py-2 text-right text-gray-700">{player.win_percentage ? `${player.win_percentage}%` : '—'}</td>
                      <td className="px-4 py-2 text-right text-gray-700">{player.last_active_year || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between mt-4">
              <button onClick={() => setRankingsPage(p => Math.max(0, p - 1))} disabled={rankingsPage === 0}
                className="text-sm text-gray-600 px-4 py-2 border rounded-md hover:bg-gray-50 disabled:opacity-30">← Previous</button>
              <span className="text-sm text-gray-500 py-2">Page {rankingsPage + 1}</span>
              <button onClick={() => setRankingsPage(p => p + 1)} disabled={rankings.length < pageSize}
                className="text-sm text-gray-600 px-4 py-2 border rounded-md hover:bg-gray-50 disabled:opacity-30">Next →</button>
            </div>
          </div>
        )}

        {/* ── MOVERS ── */}
        {activeTab === 'Movers' && !loading && (
          <div>
            <div className="flex gap-2 mb-2 flex-wrap">
              {MOVER_PERIODS.map(p => (
                <button key={p.days} onClick={() => setMoverPeriod(p.days)}
                  className={`px-3 py-1 rounded-full text-sm border transition ${moverPeriod === p.days ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300 hover:border-green-500'}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mb-4">GCLab baseline set 6 Mar 2026 — changes detected by daily sync. Showing moves of 10+ points only. Games and Win% show last 12 months from WCF. Note: all grades are regraded with each WCF entry — your grade can change without playing a game based on the performance of other players who have been regraded.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { title: '📈 Biggest Gains', data: movers.gains, positive: true },
                { title: '📉 Biggest Losses', data: movers.losses, positive: false },
              ].map(({ title, data, positive }) => (
                <div key={title}>
                  <h3 className={`font-semibold mb-3 ${positive ? 'text-green-700' : 'text-red-600'}`}>{title}</h3>
                  {data.length === 0 ? (
                    <p className="text-sm text-gray-400">No changes detected yet.</p>
                  ) : (
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="text-left px-4 py-2 text-gray-700 font-semibold">Player</th>
                            <th className="text-right px-4 py-2 text-gray-700 font-semibold">Change</th>
                            <th className="text-right px-4 py-2 text-gray-700 font-semibold">dGrade</th>
                            <th className="text-right px-4 py-2 text-gray-700 font-semibold">Games (12mo)</th>
                            <th className="text-right px-4 py-2 text-gray-700 font-semibold">Win% (12mo)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.map((p, i) => (
                            <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-4 py-2">
                                <a href={p.wcf_profile_url} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline font-medium">
                                  {getFlag(p.country)} {p.wcf_first_name} {p.wcf_last_name}
                                </a>
                              </td>
                              <td className={`px-4 py-2 text-right font-semibold ${positive ? 'text-green-600' : 'text-red-500'}`}>
                                {positive ? `+${p.change}` : p.change}
                              </td>
                              <td className="px-4 py-2 text-right font-semibold text-gray-900">{p.current_dgrade}</td>
                              <td className="px-4 py-2 text-right text-gray-700">{p.games || '—'}</td>
                              <td className="px-4 py-2 text-right text-gray-700">{p.win_percentage ? `${p.win_percentage}%` : '—'}</td>
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
            <div className="flex gap-3 mb-4 flex-wrap items-center">
              {[30, 90, 180, 365].map(d => (
                <button key={d} onClick={() => setNewPlayerDays(d)}
                  className={`px-3 py-1 rounded-full text-sm border transition ${newPlayerDays === d ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300 hover:border-green-500'}`}>
                  {d === 30 ? '30 days' : d === 90 ? '90 days' : d === 180 ? '6 months' : '1 year'}
                </button>
              ))}
              <select value={newPlayerCountry} onChange={(e) => setNewPlayerCountry(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="">All countries</option>
                {countryList.map(c => <option key={c} value={c}>{getFlag(c)} {getCountryName(c)}</option>)}
              </select>
            </div>
            <p className="text-sm text-gray-700 mb-1">{newPlayers.length} new players found</p>
            <p className="text-xs text-gray-400 mb-3">Showing players first recorded by GCLab from 3 Mar 2026 onwards.</p>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-700 font-semibold">Player</th>
                    <th className="text-left px-4 py-3 text-gray-700 font-semibold">Country</th>
                    <th className="text-right px-4 py-3 text-gray-700 font-semibold">dGrade</th>
                    <th className="text-right px-4 py-3 text-gray-700 font-semibold">eGrade</th>
                    <th className="text-right px-4 py-3 text-gray-700 font-semibold">World Rank</th>
                    <th className="text-right px-4 py-3 text-gray-700 font-semibold">First Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {newPlayers.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400 text-sm">No new players found for this period.</td></tr>
                  ) : newPlayers.map((player, i) => (
                    <tr key={player.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2">
                        <a href={player.wcf_profile_url} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline font-medium">
                          {player.wcf_first_name} {player.wcf_last_name}
                        </a>
                      </td>
                      <td className="px-4 py-2 text-gray-900"><span className="mr-1">{getFlag(player.country)}</span>{getCountryName(player.country)}</td>
                      <td className="px-4 py-2 text-right font-semibold text-gray-900">{player.dgrade}</td>
                      <td className="px-4 py-2 text-right font-semibold text-amber-600">{player.egrade || '—'}</td>
                      <td className="px-4 py-2 text-right text-gray-700">{player.world_ranking}</td>
                      <td className="px-4 py-2 text-right text-gray-500">{formatDate(player.created_at)}</td>
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
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <p className="text-xs text-gray-500">Click column headers to sort. Active = played a ranked game in the last 12 months.</p>
              <div className="flex gap-2">
                <button onClick={downloadCountryCSV}
                  className="flex items-center gap-1 text-sm bg-white border border-gray-300 text-gray-600 px-3 py-1 rounded-md hover:border-green-500 hover:text-green-600 transition">
                  ↓ Download CSV
                </button>
                <button onClick={() => setCompareMode(!compareMode)}
                  className={`px-4 py-1 rounded-full text-sm border transition ${compareMode ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
                  {compareMode ? 'Hide Compare' : 'Compare to Past'}
                </button>
              </div>
            </div>
            {compareMode && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm">
                {availableSnapshots.length === 0 ? (
                  <p className="text-blue-800">No historical snapshots available yet. Monthly snapshots are stored on the 1st of each month. The first snapshot will be taken 1 Apr 2026. Check back in the future to compare periods.</p>
                ) : (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-blue-800">Compare current stats to:</span>
                    <select value={compareDate} onChange={(e) => setCompareDate(e.target.value)}
                      className="border border-blue-300 rounded-md px-2 py-1 text-sm text-gray-800">
                      {availableSnapshots.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-700 font-semibold w-8">#</th>
                    <th className="text-left px-4 py-3 text-gray-700 font-semibold">Country</th>
                    <th className={`text-right ${thCountrySort('total_players')}`} onClick={() => handleCountrySort('total_players')}>Total Players{countryArrow('total_players')}</th>
                    <th className={`text-right ${thCountrySort('active_players')}`} onClick={() => handleCountrySort('active_players')}>Active (12mo){countryArrow('active_players')}</th>
                    <th className={`text-right ${thCountrySort('avg_top6_dgrade')}`} onClick={() => handleCountrySort('avg_top6_dgrade')}>Top 6 Active Avg{countryArrow('avg_top6_dgrade')}</th>
                    <th className={`text-right ${thCountrySort('avg_top6_alltime_dgrade')}`} onClick={() => handleCountrySort('avg_top6_alltime_dgrade')}>Top 6 All Time Avg{countryArrow('avg_top6_alltime_dgrade')}</th>
                  </tr>
                </thead>
                <tbody>
                  {countryStats.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400 text-sm">No data available.</td></tr>
                  ) : countryStats.map((row, i) => {
                    const comp = compareMode ? getCompareRow(row.country) : null
                    const activeKey = `${row.country}-active`
                    const alltimeKey = `${row.country}-alltime`
                    return (
                      <tr key={row.country} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 text-gray-500 text-xs">{i + 1}</td>
                        <td className="px-4 py-2 font-medium text-gray-900">
                          <span className="mr-2">{getFlag(row.country)}</span>{getCountryName(row.country)}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-700">
                          {row.total_players}{comp && renderDiff(row.total_players, comp.total_players)}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-700">
                          {row.active_players}{comp && renderDiff(row.active_players, comp.active_players)}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-gray-900 relative">
                          <button
                            onClick={() => setTooltip(tooltip?.country === row.country && tooltip?.type === 'active' ? null : { country: row.country, type: 'active' })}
                            className="hover:text-green-600 transition"
                          >
                            {row.avg_top6_dgrade ? Math.round(row.avg_top6_dgrade) : '—'}
                            {comp && comp.avg_top6_dgrade && renderDiff(Math.round(row.avg_top6_dgrade), Math.round(comp.avg_top6_dgrade))}
                            {row.top6_active && <span className="ml-1 text-gray-400 text-xs">▾</span>}
                          </button>
                          {tooltip?.country === row.country && tooltip?.type === 'active' && row.top6_active && (
                            <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-56 text-left">
                              <p className="text-xs font-semibold text-gray-500 mb-2">Top 6 Active — {getCountryName(row.country)}</p>
                              {row.top6_active.map((p: any, idx: number) => (
                                <div key={idx} className="flex justify-between text-xs py-0.5">
                                  <span className="text-gray-800">{idx + 1}. {p.first_name} {p.last_name}</span>
                                  <span className="font-semibold text-gray-900 ml-2">{p.dgrade}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-gray-700 relative">
                          <button
                            onClick={() => setTooltip(tooltip?.country === row.country && tooltip?.type === 'alltime' ? null : { country: row.country, type: 'alltime' })}
                            className="hover:text-green-600 transition"
                          >
                            {row.avg_top6_alltime_dgrade ? Math.round(row.avg_top6_alltime_dgrade) : '—'}
                            {row.top6_alltime && <span className="ml-1 text-gray-400 text-xs">▾</span>}
                          </button>
                          {tooltip?.country === row.country && tooltip?.type === 'alltime' && row.top6_alltime && (
                            <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-56 text-left">
                              <p className="text-xs font-semibold text-gray-500 mb-2">Top 6 All Time — {getCountryName(row.country)}</p>
                              {row.top6_alltime.map((p: any, idx: number) => (
                                <div key={idx} className="flex justify-between text-xs py-0.5">
                                  <span className="text-gray-800">{idx + 1}. {p.first_name} {p.last_name}</span>
                                  <span className="font-semibold text-gray-900 ml-2">{p.dgrade}</span>
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
            {/* Gate for non-signed-in users */}
            {!currentUserProfile && (
              <div className="relative mb-6">
                {/* Blurred placeholder chart */}
                <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm" style={{ filter: 'blur(3px)', pointerEvents: 'none', userSelect: 'none' }}>
                  <div className="p-4 border-b border-gray-100">
                    <div className="h-5 w-48 bg-gray-200 rounded mb-2"/>
                    <div className="h-3 w-32 bg-gray-100 rounded"/>
                  </div>
                  <div className="p-4">
                    <svg width="100%" height="200" viewBox="0 0 800 200">
                      <defs>
                        <linearGradient id="blurGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#16a34a" stopOpacity="0.2"/>
                          <stop offset="100%" stopColor="#16a34a" stopOpacity="0"/>
                        </linearGradient>
                      </defs>
                      {[40,80,120,160].map((y: number) => <line key={y} x1="0" y1={y} x2="800" y2={y} stroke="#f0f0f0" strokeWidth="1"/>)}
                      <path d="M0,160 C60,140 120,100 180,90 C240,80 300,60 360,55 C420,50 480,65 540,80 C600,95 660,110 720,130 C760,145 790,155 800,160 L800,200 L0,200 Z" fill="url(#blurGrad)"/>
                      <path d="M0,160 C60,140 120,100 180,90 C240,80 300,60 360,55 C420,50 480,65 540,80 C600,95 660,110 720,130 C760,145 790,155 800,160" fill="none" stroke="#16a34a" strokeWidth="2.5"/>
                      <circle cx="360" cy="55" r="5" fill="#16a34a"/>
                      {/* Fake data table rows */}
                      {[0,1,2,3].map(i => (
                        <g key={i}>
                          <rect x="0" y={170 - i * 0} width="800" height="0" fill="none"/>
                        </g>
                      ))}
                    </svg>
                    <div className="mt-3 space-y-2">
                      {[80, 60, 70, 50].map((w, i) => (
                        <div key={i} className="flex gap-3 items-center">
                          <div className="h-3 rounded bg-gray-200" style={{ width: `${w}%` }}/>
                          <div className="h-3 rounded bg-gray-100 w-16"/>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Overlay CTA */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm rounded-xl z-10">
                  <div className="text-center px-6 py-8 max-w-sm">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Grade History is free</h3>
                    <p className="text-sm text-gray-500 mb-5">Search any player&apos;s full grade history — every movement, every event, plotted over time. Create a free account to unlock it.</p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <a href="/login?mode=signup" className="bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition">
                        Create free account
                      </a>
                      <a href="/login" className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:border-green-500 hover:text-green-700 transition">
                        Sign in
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentUserProfile && (
            <>
            {importedCount !== null && totalPlayers !== null && (
              <div className="text-xs text-gray-400 text-right mb-2">
                📥 {importedCount.toLocaleString()} of {totalPlayers.toLocaleString()} players history imported
              </div>
            )}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Search any player</h3>
              <div className="flex gap-2 flex-wrap items-start">
                <div className="relative flex-1 min-w-48">
                  <input
                    type="text"
                    placeholder="Type a name..."
                    value={searchQuery}
                    onChange={(e) => handleSearchQueryChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  {searchSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
                      {searchSuggestions.map((player) => (
                        <button
                          key={player.id}
                          onClick={() => handleSelectPlayer(player)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between items-center"
                        >
                          <span className="text-gray-900">{player.wcf_first_name} {player.wcf_last_name}</span>
                          <span className="text-gray-400 text-xs">{getFlag(player.country)} #{player.world_ranking} · {player.dgrade}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {currentUserProfile?.wcf_player_id && (
                  <button
                    onClick={handleShowMyHistory}
                    className="px-4 py-2 rounded-md text-sm font-medium bg-green-50 border border-green-300 text-green-700 hover:bg-green-100 transition whitespace-nowrap"
                  >
                    Show My History
                  </button>
                )}
              </div>
            </div>

            {selectedPlayer && (
              <div>
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <h3 className="font-semibold text-lg text-gray-900">{getFlag(selectedPlayer.country)} {selectedPlayer.wcf_first_name} {selectedPlayer.wcf_last_name}</h3>
                  <span className="text-sm text-gray-600">
                    {getCountryName(selectedPlayer.country)} · dGrade {selectedPlayer.dgrade}
                    {selectedPlayer.egrade ? ` · eGrade ${selectedPlayer.egrade}` : ''}
                    {' '}· World #{selectedPlayer.world_ranking}
                  </span>
                  <div className="flex items-center gap-3 ml-auto">
                    {userRole === 'super_admin' && (
                      <button
                        onClick={() => handleManualImport(selectedPlayer)}
                        disabled={manualImporting}
                        className="text-xs px-3 py-1 rounded border border-blue-300 text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition"
                      >
                        {manualImporting ? 'Importing...' : selectedPlayer.history_imported ? '↻ Re-import History' : '↓ Import History'}
                      </button>
                    )}
                    <a href={selectedPlayer.wcf_profile_url} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:underline">WCF Profile →</a>
                  </div>
                  {userRole === 'super_admin' && manualImportLog.length > 0 && (
                    <div className="w-full mt-2 bg-gray-50 rounded p-2 text-xs text-gray-500 max-h-32 overflow-y-auto">
                      {manualImportLog.map((log, i) => <div key={i}>{log}</div>)}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <div className="flex gap-2">
                    {[{ key: '1y', label: '1 Year' }, { key: '5y', label: '5 Years' }, { key: 'all', label: 'All Time' }, { key: 'custom', label: 'Custom' }].map(r => (
                      <button key={r.key} onClick={() => setHistoryRange(r.key)}
                        className={`px-3 py-1 rounded-full text-xs border transition ${historyRange === r.key ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300 hover:border-green-500'}`}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                  {historyRange === 'custom' && (
                    <div className="flex items-center gap-2">
                      <input type="date" value={historyFrom} onChange={(e) => setHistoryFrom(e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-xs text-gray-800" />
                      <span className="text-gray-500 text-xs">to</span>
                      <input type="date" value={historyTo} onChange={(e) => setHistoryTo(e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-xs text-gray-800" />
                    </div>
                  )}
                  <div className="flex gap-2 ml-auto flex-wrap">
                    <button onClick={() => setShowDgrade(!showDgrade)}
                      className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full border transition ${showDgrade ? 'bg-green-50 border-green-400 text-green-700' : 'bg-gray-50 border-gray-300 text-gray-400'}`}>
                      <span className="w-4 h-1 bg-green-500 inline-block rounded" /> dGrade
                    </button>
                    <button onClick={() => setShowEgrade(!showEgrade)}
                      className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full border transition ${showEgrade ? 'bg-amber-50 border-amber-400 text-amber-700' : 'bg-gray-50 border-gray-300 text-gray-400'}`}>
                      <span className="w-4 h-1 bg-amber-500 inline-block rounded" /> eGrade
                    </button>
                    <button onClick={() => setShowRanking(!showRanking)}
                      className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full border transition ${showRanking ? 'bg-blue-50 border-blue-400 text-blue-700' : 'bg-gray-50 border-gray-300 text-gray-400'}`}>
                      <span className="w-4 h-1 bg-blue-500 inline-block rounded" /> World Ranking
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-400 mb-3">
                  {playerHistory.length <= 1
                    ? 'No history recorded yet.'
                    : `${playerHistory.filter((h: any) => h.is_imported).length} imported events + ${playerHistory.filter((h: any) => !h.is_imported).length} GCLab tracked points`}
                  {showRanking && playerHistory.some(h => h.world_ranking) && (() => {
                    const firstRank = playerHistory.find(h => h.world_ranking)
                    const label = firstRank ? new Date(firstRank.recorded_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'Mar 2026'
                    return <span className="ml-2 text-blue-400">· World rank shown from {label}</span>
                  })()}
                </p>

                <div className="bg-white rounded-lg shadow-sm p-4 mb-4">{renderChart()}</div>

                {playerHistory.length > 0 && (() => {
                  // Only show events + most recent sync (last non-imported point)
                  // Event rows: imported events + daily sync points where grade changed
                  const eventPoints = playerHistory.filter((h: any) => h.is_imported || (h.event_name && h.event_name !== 'Daily sync'))
                  const eventPointIds = new Set(eventPoints.map((h: any) => h.id))
                  // Dates that have a regrade — pre-snap null-event rows on these dates always show
                  const regradeDates = new Set(
                    playerHistory
                      .filter((h: any) => h.event_name && h.event_name.includes('(regrade)'))
                      .map((h: any) => h.record_date)
                  )
                  const gradeChangeSync = playerHistory.filter((h: any) => {
                    if (h.is_imported) return false
                    if (eventPointIds.has(h.id)) return false  // already in eventPoints, skip
                    const idx = playerHistory.indexOf(h)
                    if (idx === 0) return false
                    const prev = playerHistory[idx - 1]
                    // Show if grade changed vs previous record
                    if (h.dgrade_value !== prev.dgrade_value) return true
                    // Show if world ranking changed vs previous record
                    if (h.world_ranking && prev.world_ranking && h.world_ranking !== prev.world_ranking) return true
                    // Also show null-event pre-snap on regrade days even if grade matches prev day
                    if (!h.event_name && regradeDates.has(h.record_date)) return true
                    return false
                  })
                  const tableRows = [...eventPoints, ...gradeChangeSync].sort(
                    (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
                  )
                  // Compute grade diffs vs previous entry in chronological order
                  const chronological = [...playerHistory]
                  const getDiff = (h: any) => {
                    const idx = chronological.findIndex(x => x.recorded_at === h.recorded_at)
                    if (idx <= 0) return null
                    return h.dgrade_value - chronological[idx - 1].dgrade_value
                  }
                  return (
                    <div className="bg-white rounded-lg shadow-sm p-4">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-500 border-b">
                            <th className="text-left py-1 font-semibold">Date</th>
                            <th className="text-left py-1 font-semibold">Event</th>
                            <th className="text-right py-1 font-semibold">dGrade</th>
                            <th className="text-right py-1 font-semibold">Change</th>
                            <th className="text-right py-1 font-semibold">eGrade</th>
                            <th className="text-right py-1 font-semibold">World Rank</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Last synced row — only show if no WCF event already exists for today.
                               If the most recent tableRow is from the same calendar date as the last
                               sync, the WCF event row IS today's sync result and is more accurate —
                               the null-event sync record would be stale/redundant so we hide it. */}
                          {lastSyncDate && tableRows[0] && (
                            lastSyncDate.slice(0, 10) !== tableRows[0].recorded_at.slice(0, 10)
                          ) && (
                            <tr className="border-t border-gray-100 bg-gray-50">
                              <td className="py-1.5 text-gray-500">{formatDate(lastSyncDate)}</td>
                              <td className="py-1.5 text-gray-400 italic">Last synced</td>
                              <td className="py-1.5 text-right font-semibold text-gray-900">{tableRows[0]?.dgrade_value || '—'}</td>
                              <td className="py-1.5 text-right"><span className="text-gray-400">—</span></td>
                              <td className="py-1.5 text-right font-semibold text-amber-600">{tableRows[0]?.egrade_value || '—'}</td>
                              <td className="py-1.5 text-right text-gray-600">{tableRows[0]?.world_ranking ? `#${tableRows[0].world_ranking}` : '—'}</td>
                            </tr>
                          )}
                          {tableRows.map((h, i) => {
                            const diff = getDiff(h)
                            const RANK_START = new Date('2026-03-03').getTime()
                            const prevRow = tableRows[i + 1]
                            const thisTime = new Date(h.recorded_at).getTime()
                            const prevTime = prevRow ? new Date(prevRow.recorded_at).getTime() : 0
                            const showMilestone = thisTime >= RANK_START && (!prevRow || prevTime < RANK_START)
                            return (
                              <React.Fragment key={i}>
                                <tr className="border-t border-gray-100">
                                  <td className="py-1.5 text-gray-700">{formatDate(h.recorded_at)}</td>
                                  <td className="py-1.5 text-gray-500">
                                    {h.event_url
                                      ? <a href={h.event_url} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">{h.event_name || '—'}</a>
                                      : h.event_name || <span className="text-gray-400">{h.world_ranking && playerHistory[playerHistory.findIndex((x: any) => x.recorded_at === h.recorded_at) - 1]?.world_ranking !== h.world_ranking ? 'Rank change' : 'Grade change'}</span>}
                                  </td>
                                  <td className="py-1.5 text-right font-semibold text-gray-900">{h.dgrade_value}</td>
                                  <td className="py-1.5 text-right font-semibold">
                                    {diff === null ? <span className="text-gray-400">—</span> :
                                     diff > 0 ? <span className="text-green-600">↑ +{diff}</span> :
                                     diff < 0 ? <span className="text-red-500">↓ {diff}</span> :
                                     <span className="text-gray-400">—</span>}
                                  </td>
                                  <td className="py-1.5 text-right font-semibold text-amber-600">{h.egrade_value || '—'}</td>
                                  <td className="py-1.5 text-right text-gray-600">{h.world_ranking ? `#${h.world_ranking}` : '—'}</td>
                                </tr>
                                {showMilestone && (() => {
                                  const mar3 = new Date('2026-03-03').getTime()
                                  // Grade: last record at or before Mar 3
                                  const gradeAtStart = [...playerHistory]
                                    .filter((r: any) => new Date(r.recorded_at).getTime() <= mar3)
                                    .sort((a: any, b: any) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0]
                                  // World rank: earliest record that has a world_ranking value
                                  // (baseline sync on Mar 2 has the rank before any events)
                                  const firstRankRecord = [...playerHistory]
                                    .filter((r: any) => r.world_ranking)
                                    .sort((a: any, b: any) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())[0]
                                  const initialRank = firstRankRecord?.world_ranking
                                  return (
                                    <tr className="border-t-2 border-blue-200 bg-blue-50">
                                      <td className="py-1.5 text-blue-500 text-xs font-medium">3 Mar 2026</td>
                                      <td className="py-1.5 text-blue-400 italic text-xs">↑ World Ranking tracking began</td>
                                      <td className="py-1.5 text-right font-semibold text-gray-900 text-xs">{gradeAtStart?.dgrade_value || '—'}</td>
                                      <td className="py-1.5 text-right text-xs"><span className="text-gray-400">—</span></td>
                                      <td className="py-1.5 text-right font-semibold text-amber-600 text-xs">{gradeAtStart?.egrade_value || '—'}</td>
                                      <td className="py-1.5 text-right text-gray-600 text-xs">{initialRank ? `#${initialRank}` : '—'}</td>
                                    </tr>
                                  )
                                })()}
                              </React.Fragment>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                })()}
              </div>
            )}
            </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
