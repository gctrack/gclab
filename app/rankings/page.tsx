'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

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
]
const PAGE_SIZES = [50, 100, 200]
const FIRST_SYNC_DATE = '2026-03-02'

type SortKey = 'dgrade' | 'world_ranking' | 'games' | 'win_percentage'
type SortDir = 'asc' | 'desc'

export default function RankingsPage() {
  const [activeTab, setActiveTab] = useState('Rankings')
  const [loading, setLoading] = useState(false)
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)

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

  const [lookupFirst, setLookupFirst] = useState('')
  const [lookupLast, setLookupLast] = useState('')
  const [lookupResults, setLookupResults] = useState<any[]>([])
  const [lookupSearched, setLookupSearched] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null)
  const [playerHistory, setPlayerHistory] = useState<any[]>([])
  const [showDgrade, setShowDgrade] = useState(true)
  const [showRanking, setShowRanking] = useState(true)
  const [historyRange, setHistoryRange] = useState('5y')
  const [historyFrom, setHistoryFrom] = useState('')
  const [historyTo, setHistoryTo] = useState('')

  const supabase = createClient()
  const activeYear = new Date().getFullYear() - 1

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('first_name, last_name, wcf_player_id')
          .eq('id', user.id)
          .single()
        if (data) setCurrentUserProfile(data)
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (activeTab === 'Rankings') loadRankings()
  }, [activeTab, activeOnly, rankingsPage, pageSize, sortKey, sortDir])

  useEffect(() => {
    if (activeTab === 'Movers') loadMovers()
  }, [activeTab, moverPeriod])

  useEffect(() => {
    if (activeTab === 'New Players') loadNewPlayers()
  }, [activeTab, newPlayerDays, newPlayerCountry])

  useEffect(() => {
    if (activeTab === 'Country Stats') loadCountryStats()
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'Historical Rankings' && currentUserProfile?.wcf_player_id && !selectedPlayer) {
      loadPlayerHistory(currentUserProfile.wcf_player_id)
    }
  }, [activeTab, currentUserProfile])

  useEffect(() => {
    if (selectedPlayer) fetchHistory(selectedPlayer.id)
  }, [historyRange, historyFrom, historyTo])

  useEffect(() => {
    if (compareMode) loadCompareStats()
  }, [compareMode, compareDate])

  const handleRankingSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
    setRankingsPage(0)
  }

  const sortArrow = (key: SortKey) => sortKey === key ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''

  const handleCountrySort = (key: string) => {
    const newDir: SortDir = countrySortKey === key && countrySortDir === 'desc' ? 'asc' : 'desc'
    setCountrySortKey(key)
    setCountrySortDir(newDir)
    const sorted = [...countryStats].sort((a, b) => newDir === 'desc' ? b[key] - a[key] : a[key] - b[key])
    setCountryStats(sorted)
  }

  const countryArrow = (key: string) => countrySortKey === key ? (countrySortDir === 'desc' ? ' ↓' : ' ↑') : ''

  const loadRankings = async () => {
    setLoading(true)
    let query = supabase
      .from('wcf_players')
      .select('id, wcf_first_name, wcf_last_name, country, dgrade, world_ranking, games, win_percentage, last_active_year, wcf_profile_url')
      .order(sortKey, { ascending: sortDir === 'asc' })
      .range(rankingsPage * pageSize, (rankingsPage + 1) * pageSize - 1)
    if (activeOnly) query = query.gte('last_active_year', activeYear)
    const { data } = await query
    setRankings(data || [])
    setLoading(false)
  }

  const loadMovers = async () => {
    setLoading(true)
    const { data } = await supabase.rpc('get_movers', { since_date: FIRST_SYNC_DATE, limit_count: 20 })
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
    const sinceDate = since < new Date(FIRST_SYNC_DATE) ? FIRST_SYNC_DATE : since.toISOString()
    let query = supabase
      .from('wcf_players')
      .select('id, wcf_first_name, wcf_last_name, country, dgrade, world_ranking, wcf_profile_url, created_at')
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
    const { data } = await supabase
      .from('country_stats_snapshots')
      .select('*')
      .eq('snapshot_date', compareDate)
    if (data) setCompareStats(data)
  }

  const loadPlayerHistory = async (wcfPlayerId: string) => {
    const { data: player } = await supabase
      .from('wcf_players')
      .select('id, wcf_first_name, wcf_last_name, country, dgrade, world_ranking, wcf_profile_url')
      .eq('id', wcfPlayerId)
      .single()
    if (player) {
      setSelectedPlayer(player)
      await fetchHistory(player.id)
    }
  }

  const fetchHistory = async (playerId: string) => {
    let query = supabase
      .from('wcf_dgrade_history')
      .select('dgrade_value, world_ranking, recorded_at')
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
    setPlayerHistory(data || [])
  }

  const handlePlayerSearch = async () => {
    if (!lookupLast) return
    setLookupSearched(true)
    setSelectedPlayer(null)
    setPlayerHistory([])
    const { data } = await supabase
      .from('wcf_players')
      .select('id, wcf_first_name, wcf_last_name, country, dgrade, world_ranking, wcf_profile_url')
      .ilike('wcf_last_name', `%${lookupLast}%`)
      .order('world_ranking', { ascending: true })
      .limit(20)
    const filtered = lookupFirst
      ? (data || []).filter((p: any) => p.wcf_first_name.toLowerCase().startsWith(lookupFirst.charAt(0).toLowerCase()))
      : data || []
    setLookupResults(filtered)
  }

  const handleSelectPlayer = async (player: any) => {
    setSelectedPlayer(player)
    setLookupResults([])
    setLookupSearched(false)
    await fetchHistory(player.id)
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
    if (playerHistory.length === 1) return (
  <svg viewBox="0 0 800 240" className="w-full" style={{ minWidth: 400 }}>
    {showDgrade && <circle cx="400" cy="100" r="5" fill="#16a34a"><title>{formatDate(playerHistory[0].recorded_at)}: dGrade {playerHistory[0].dgrade_value}</title></circle>}
    {showDgrade && <text x="412" y="104" fontSize="11" fill="#16a34a">dGrade: {playerHistory[0].dgrade_value}</text>}
    {showRanking && <circle cx="400" cy="140" r="5" fill="#2563eb"><title>{formatDate(playerHistory[0].recorded_at)}: Rank #{playerHistory[0].world_ranking}</title></circle>}
    {showRanking && <text x="412" y="144" fontSize="11" fill="#2563eb">World Rank: #{playerHistory[0].world_ranking}</text>}
    <text x="400" y="200" fontSize="10" fill="#9ca3af" textAnchor="middle">More data points will appear as daily syncs accumulate</text>
  </svg>
)

    const W = 800, H = 240
    const padL = 55, padR = 55, padT = 20, padB = 30
    const chartW = W - padL - padR
    const chartH = H - padT - padB

    const dgrades = playerHistory.map(h => h.dgrade_value)
    const wranks = playerHistory.map(h => h.world_ranking)

    const dgradeMin = Math.min(...dgrades) - 50
    const dgradeMax = Math.max(...dgrades) + 50
    const rankMin = Math.max(1, Math.min(...wranks) - 10)
    const rankMax = Math.max(...wranks) + 10

    const xScale = (i: number) => padL + (i / Math.max(playerHistory.length - 1, 1)) * chartW
    const yDgrade = (v: number) => padT + chartH - ((v - dgradeMin) / (dgradeMax - dgradeMin)) * chartH
    const yRank = (v: number) => padT + chartH - ((rankMax - v) / (rankMax - rankMin)) * chartH

    const gridLines = 5

    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 400 }}>
        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const y = padT + (i / gridLines) * chartH
          return <line key={i} x1={padL} y1={y} x2={W - padR} y2={y} stroke="#e5e7eb" strokeWidth="1" />
        })}

        {showDgrade && Array.from({ length: gridLines + 1 }).map((_, i) => {
          const val = Math.round(dgradeMax - i * ((dgradeMax - dgradeMin) / gridLines))
          const y = padT + (i / gridLines) * chartH
          return <text key={i} x={padL - 6} y={y + 4} fontSize="9" fill="#6b7280" textAnchor="end">{val}</text>
        })}

        {showRanking && Array.from({ length: gridLines + 1 }).map((_, i) => {
          const val = Math.round(rankMin + i * ((rankMax - rankMin) / gridLines))
          const y = padT + chartH - (i / gridLines) * chartH
          return <text key={i} x={W - padR + 6} y={y + 4} fontSize="9" fill="#2563eb" textAnchor="start">#{val}</text>
        })}

        {showDgrade && (
          <polyline
            points={playerHistory.map((h, i) => `${xScale(i)},${yDgrade(h.dgrade_value)}`).join(' ')}
            fill="none" stroke="#16a34a" strokeWidth="2"
          />
        )}
        {showRanking && (
          <polyline
            points={playerHistory.map((h, i) => `${xScale(i)},${yRank(h.world_ranking)}`).join(' ')}
            fill="none" stroke="#2563eb" strokeWidth="2"
          />
        )}

        {playerHistory.map((h, i) => (
          <g key={i}>
            {showDgrade && <circle cx={xScale(i)} cy={yDgrade(h.dgrade_value)} r="3" fill="#16a34a"><title>{formatDate(h.recorded_at)}: dGrade {h.dgrade_value}</title></circle>}
            {showRanking && <circle cx={xScale(i)} cy={yRank(h.world_ranking)} r="3" fill="#2563eb"><title>{formatDate(h.recorded_at)}: Rank #{h.world_ranking}</title></circle>}
          </g>
        ))}

        {showDgrade && <text x={padL} y={H - 5} fontSize="9" fill="#16a34a">dGrade</text>}
        {showRanking && <text x={W - padR} y={H - 5} fontSize="9" fill="#2563eb" textAnchor="end">World Rank</text>}
      </svg>
    )
  }

  const thClass = "px-4 py-3 text-gray-600 font-medium"
  const thClickClass = "px-4 py-3 text-gray-600 font-medium cursor-pointer hover:text-green-600 select-none"

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <a href="/dashboard" className="text-xl font-bold text-green-600">GCLab</a>
        <a href="/dashboard" className="text-sm text-gray-600 hover:text-green-600">← Dashboard</a>
      </nav>
      <main className="max-w-5xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-bold mb-6 text-gray-900">WCF Rankings & Stats</h2>

        <div className="flex gap-2 mb-6 flex-wrap">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${activeTab === tab ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:border-green-500'}`}>
              {tab}
            </button>
          ))}
        </div>

        {loading && <p className="text-gray-400 text-sm">Loading...</p>}

        {/* RANKINGS TAB */}
        {activeTab === 'Rankings' && !loading && (
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-500">{rankings.length} players shown</p>
                <select value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value)); setRankingsPage(0) }}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500">
                  {PAGE_SIZES.map(s => <option key={s} value={s}>{s} per page</option>)}
                </select>
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
                    <th className={`text-left ${thClass}`}>Active Rank</th>
                    <th className={`text-left ${thClass}`}>All Time Rank</th>
                    <th className={`text-left ${thClass}`}>Player</th>
                    <th className={`text-left ${thClass}`}>Country</th>
                    <th className={`text-right ${thClickClass}`} onClick={() => handleRankingSort('dgrade')}>dGrade{sortArrow('dgrade')}</th>
                    <th className={`text-right ${thClickClass}`} onClick={() => handleRankingSort('games')}>Games (12mo){sortArrow('games')}</th>
                    <th className={`text-right ${thClickClass}`} onClick={() => handleRankingSort('win_percentage')}>Win% (12mo){sortArrow('win_percentage')}</th>
                    <th className={`text-right ${thClass}`}>Last Active</th>
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
                      <td className="px-4 py-2">
                        <span className="mr-1">{getFlag(player.country)}</span>
                        <span className="text-gray-800">{getCountryName(player.country)}</span>
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-gray-800">{player.dgrade}</td>
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

        {/* MOVERS TAB */}
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
            <p className="text-xs text-gray-400 mb-4">GCLab dGrade tracking started 2 Mar 2026. Data will grow richer over time as daily syncs accumulate.</p>
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
                            <th className="text-left px-4 py-2 text-gray-600 font-medium">Player</th>
                            <th className="text-right px-4 py-2 text-gray-600 font-medium">Change</th>
                            <th className="text-right px-4 py-2 text-gray-600 font-medium">dGrade</th>
                            <th className="text-right px-4 py-2 text-gray-600 font-medium">Games</th>
                            <th className="text-right px-4 py-2 text-gray-600 font-medium">Win%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.map((p, i) => (
                            <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-4 py-2">
                                <a href={p.wcf_profile_url} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">
                                  {getFlag(p.country)} {p.wcf_first_name} {p.wcf_last_name}
                                </a>
                              </td>
                              <td className={`px-4 py-2 text-right font-medium ${positive ? 'text-green-600' : 'text-red-500'}`}>
                                {positive ? `+${p.change}` : p.change}
                              </td>
                              <td className="px-4 py-2 text-right text-gray-800 font-medium">{p.current_dgrade}</td>
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

        {/* NEW PLAYERS TAB */}
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
            <p className="text-sm text-gray-500 mb-1">{newPlayers.length} new players found</p>
            <p className="text-xs text-gray-400 mb-3">Showing players first recorded by GCLab from 3 Mar 2026 onwards.</p>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Player</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Country</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">dGrade</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">World Rank</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">First Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {newPlayers.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400 text-sm">No new players found for this period.</td></tr>
                  ) : newPlayers.map((player, i) => (
                    <tr key={player.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2">
                        <a href={player.wcf_profile_url} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline font-medium">
                          {player.wcf_first_name} {player.wcf_last_name}
                        </a>
                      </td>
                      <td className="px-4 py-2"><span className="mr-1">{getFlag(player.country)}</span><span className="text-gray-800">{getCountryName(player.country)}</span></td>
                      <td className="px-4 py-2 text-right font-medium text-gray-800">{player.dgrade}</td>
                      <td className="px-4 py-2 text-right text-gray-700">{player.world_ranking}</td>
                      <td className="px-4 py-2 text-right text-gray-400">{formatDate(player.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* COUNTRY STATS TAB */}
        {activeTab === 'Country Stats' && !loading && (
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <p className="text-xs text-gray-400">Click column headers to sort. Active = played a ranked game in the last 12 months.</p>
              <button onClick={() => setCompareMode(!compareMode)}
                className={`px-4 py-1 rounded-full text-sm border transition ${compareMode ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
                {compareMode ? 'Hide Compare' : 'Compare to Past'}
              </button>
            </div>

            {compareMode && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm">
                {availableSnapshots.length === 0 ? (
                  <p className="text-blue-700">No historical snapshots available yet. Monthly snapshots are stored on the 1st of each month starting April 2026. Check back in the future to compare periods.</p>
                ) : (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-blue-700">Compare current stats to:</span>
                    <select value={compareDate} onChange={(e) => setCompareDate(e.target.value)}
                      className="border border-blue-300 rounded-md px-2 py-1 text-sm text-gray-700">
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
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Country</th>
                    <th className={`text-right ${thClickClass}`} onClick={() => handleCountrySort('total_players')}>Total Players{countryArrow('total_players')}</th>
                    <th className={`text-right ${thClickClass}`} onClick={() => handleCountrySort('active_players')}>Active (12mo){countryArrow('active_players')}</th>
                    <th className={`text-right ${thClickClass}`} onClick={() => handleCountrySort('avg_top6_dgrade')}>Top 6 Avg dGrade{countryArrow('avg_top6_dgrade')}</th>
                  </tr>
                </thead>
                <tbody>
                  {countryStats.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400 text-sm">No data available.</td></tr>
                  ) : countryStats.map((row, i) => {
                    const comp = compareMode ? getCompareRow(row.country) : null
                    return (
                      <tr key={row.country} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 font-medium text-gray-800">
                          <span className="mr-2">{getFlag(row.country)}</span>{getCountryName(row.country)}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-700">
                          {row.total_players}{comp && renderDiff(row.total_players, comp.total_players)}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-700">
                          {row.active_players}{comp && renderDiff(row.active_players, comp.active_players)}
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-gray-800">
                          {row.avg_top6_dgrade ? Math.round(row.avg_top6_dgrade) : '—'}
                          {comp && comp.avg_top6_dgrade && renderDiff(Math.round(row.avg_top6_dgrade), Math.round(comp.avg_top6_dgrade))}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* HISTORICAL RANKINGS TAB */}
        {activeTab === 'Historical Rankings' && (
          <div>
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <h3 className="font-medium text-gray-800 mb-3">Search any player</h3>
              <div className="flex gap-2 flex-wrap">
                <input type="text" placeholder="First name" value={lookupFirst}
                  onChange={(e) => setLookupFirst(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 w-36 focus:outline-none focus:ring-2 focus:ring-green-500" />
                <input type="text" placeholder="Last name" value={lookupLast}
                  onChange={(e) => setLookupLast(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePlayerSearch()}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 w-36 focus:outline-none focus:ring-2 focus:ring-green-500" />
                <button onClick={handlePlayerSearch}
                  className="bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700 transition">
                  Search
                </button>
              </div>
            </div>

            {lookupSearched && lookupResults.length === 0 && !selectedPlayer && (
              <p className="text-sm text-gray-400 mb-4">No players found.</p>
            )}

            {!selectedPlayer && lookupResults.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 text-gray-600 font-medium">Player</th>
                      <th className="text-left px-4 py-3 text-gray-600 font-medium">Country</th>
                      <th className="text-right px-4 py-3 text-gray-600 font-medium">dGrade</th>
                      <th className="text-right px-4 py-3 text-gray-600 font-medium">Rank</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lookupResults.map((player, i) => (
                      <tr key={player.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 font-medium text-gray-800">{player.wcf_first_name} {player.wcf_last_name}</td>
                        <td className="px-4 py-2 text-gray-800">{getFlag(player.country)} {getCountryName(player.country)}</td>
                        <td className="px-4 py-2 text-right text-gray-800 font-medium">{player.dgrade}</td>
                        <td className="px-4 py-2 text-right text-gray-700">#{player.world_ranking}</td>
                        <td className="px-4 py-2 text-right">
                          <button onClick={() => handleSelectPlayer(player)} className="text-green-600 hover:underline text-xs">View history →</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selectedPlayer && (
              <div>
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <button onClick={() => { setSelectedPlayer(null); setPlayerHistory([]) }}
                    className="text-sm text-gray-500 hover:text-green-600">← Back to search</button>
                  <h3 className="font-semibold text-lg">{getFlag(selectedPlayer.country)} {selectedPlayer.wcf_first_name} {selectedPlayer.wcf_last_name}</h3>
                  <span className="text-sm text-gray-500">{getCountryName(selectedPlayer.country)} · dGrade {selectedPlayer.dgrade} · World #{selectedPlayer.world_ranking}</span>
                  <a href={selectedPlayer.wcf_profile_url} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:underline ml-auto">WCF Profile →</a>
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
                      <input type="date" value={historyFrom} onChange={(e) => setHistoryFrom(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-xs" />
                      <span className="text-gray-400 text-xs">to</span>
                      <input type="date" value={historyTo} onChange={(e) => setHistoryTo(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-xs" />
                    </div>
                  )}
                  <div className="flex gap-2 ml-auto">
                    <button onClick={() => setShowDgrade(!showDgrade)}
                      className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full border transition ${showDgrade ? 'bg-green-50 border-green-400 text-green-700' : 'bg-gray-50 border-gray-300 text-gray-400'}`}>
                      <span className="w-4 h-1 bg-green-500 inline-block rounded" /> dGrade
                    </button>
                    <button onClick={() => setShowRanking(!showRanking)}
                      className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full border transition ${showRanking ? 'bg-blue-50 border-blue-400 text-blue-700' : 'bg-gray-50 border-gray-300 text-gray-400'}`}>
                      <span className="w-4 h-1 bg-blue-500 inline-block rounded" /> World Ranking
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-400 mb-3">
                  History recorded since GCLab first synced on 2 Mar 2026. {playerHistory.length} data point{playerHistory.length !== 1 ? 's' : ''}. Monthly snapshots taken on the 1st of each month.
                </p>

                <div className="bg-white rounded-lg shadow-sm p-4 mb-4">{renderChart()}</div>

                {playerHistory.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm p-4">
                    <table className="w-full text-xs text-gray-600">
                      <thead>
                        <tr className="text-gray-400 border-b">
                          <th className="text-left py-1">Date</th>
                          <th className="text-right py-1">dGrade</th>
                          <th className="text-right py-1">World Rank</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...playerHistory].reverse().map((h, i) => (
                          <tr key={i} className="border-t border-gray-50">
                            <td className="py-1">{formatDate(h.recorded_at)}</td>
                            <td className="py-1 text-right font-medium text-gray-800">{h.dgrade_value}</td>
                            <td className="py-1 text-right text-gray-500">#{h.world_ranking}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}