'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

function getFlag(code: string) {
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
const FIRST_SYNC_DATE = '2026-03-03'

export default function RankingsPage() {
  const [activeTab, setActiveTab] = useState('Rankings')
  const [loading, setLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)

  // Rankings state
  const [rankings, setRankings] = useState<any[]>([])
  const [activeOnly, setActiveOnly] = useState(true)
  const [rankingsPage, setRankingsPage] = useState(0)
  const [pageSize, setPageSize] = useState(50)

  // Movers state
  const [movers, setMovers] = useState<{ gains: any[], losses: any[] }>({ gains: [], losses: [] })
  const [moverPeriod, setMoverPeriod] = useState(30)

  // New Players state
  const [newPlayers, setNewPlayers] = useState<any[]>([])
  const [newPlayerDays, setNewPlayerDays] = useState(30)
  const [newPlayerCountry, setNewPlayerCountry] = useState('')
  const [countryList, setCountryList] = useState<string[]>([])

  // Country stats state
  const [countryStats, setCountryStats] = useState<any[]>([])
  const [countrySortBy, setCountrySortBy] = useState('active_players')

  // Historical Rankings state
  const [lookupFirst, setLookupFirst] = useState('')
  const [lookupLast, setLookupLast] = useState('')
  const [lookupResults, setLookupResults] = useState<any[]>([])
  const [lookupSearched, setLookupSearched] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null)
  const [playerHistory, setPlayerHistory] = useState<any[]>([])
  const [showDgrade, setShowDgrade] = useState(true)
  const [showRanking, setShowRanking] = useState(false)

  const supabase = createClient()
  const activeYear = new Date().getFullYear() - 1

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
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
    if (activeTab === 'Movers') loadMovers()
    if (activeTab === 'New Players') loadNewPlayers()
    if (activeTab === 'Country Stats') loadCountryStats()
    if (activeTab === 'Historical Rankings' && currentUserProfile?.wcf_player_id) loadCurrentUserHistory()
  }, [activeTab, activeOnly, moverPeriod, newPlayerDays, newPlayerCountry, rankingsPage, pageSize, currentUserProfile])

  const loadRankings = async () => {
    setLoading(true)
    let query = supabase
      .from('wcf_players')
      .select('id, wcf_first_name, wcf_last_name, country, dgrade, world_ranking, games, wins, win_percentage, last_active_year, wcf_profile_url')
      .order('world_ranking', { ascending: true })
      .range(rankingsPage * pageSize, (rankingsPage + 1) * pageSize - 1)
    if (activeOnly) query = query.gte('last_active_year', activeYear)
    const { data } = await query
    setRankings(data || [])
    setLoading(false)
  }

  const loadMovers = async () => {
    setLoading(true)
    const since = new Date()
    since.setDate(since.getDate() - moverPeriod)
    const sinceDate = since < new Date(FIRST_SYNC_DATE) ? FIRST_SYNC_DATE : since.toISOString()
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
      const sorted = [...data].sort((a: any, b: any) => b[countrySortBy] - a[countrySortBy])
      setCountryStats(sorted)
    }
    setLoading(false)
  }

  const loadCurrentUserHistory = async () => {
    if (!currentUserProfile?.wcf_player_id) return
    const { data: player } = await supabase
      .from('wcf_players')
      .select('id, wcf_first_name, wcf_last_name, country, dgrade, world_ranking, wcf_profile_url')
      .eq('id', currentUserProfile.wcf_player_id)
      .single()
    if (player) {
      setSelectedPlayer(player)
      const { data } = await supabase
        .from('wcf_dgrade_history')
        .select('dgrade_value, world_ranking, recorded_at')
        .eq('wcf_player_id', player.id)
        .order('recorded_at', { ascending: true })
      setPlayerHistory(data || [])
    }
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
    const { data } = await supabase
      .from('wcf_dgrade_history')
      .select('dgrade_value, world_ranking, recorded_at')
      .eq('wcf_player_id', player.id)
      .order('recorded_at', { ascending: true })
    setPlayerHistory(data || [])
  }

  const formatDate = (str: string) => new Date(str).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  const renderChart = () => {
    if (playerHistory.length === 0) return <p className="text-sm text-gray-400">No history recorded yet for this player.</p>

    const W = 800
    const H = 220
    const pad = { top: 20, right: 20, bottom: 20, left: 50 }
    const chartW = W - pad.left - pad.right
    const chartH = H - pad.top - pad.bottom

    const dgrades = playerHistory.map(h => h.dgrade_value)
    const rankings = playerHistory.map(h => h.world_ranking)

    const dgradeMin = Math.min(...dgrades) - 30
    const dgradeMax = Math.max(...dgrades) + 30
    const rankMin = Math.min(...rankings) - 5
    const rankMax = Math.max(...rankings) + 5

    const xScale = (i: number) => pad.left + (i / Math.max(playerHistory.length - 1, 1)) * chartW
    const yScaleDgrade = (v: number) => pad.top + chartH - ((v - dgradeMin) / (dgradeMax - dgradeMin)) * chartH
    const yScaleRank = (v: number) => pad.top + chartH - ((v - rankMin) / (rankMax - rankMin)) * chartH

    const dgradePoints = playerHistory.map((h, i) => `${xScale(i)},${yScaleDgrade(h.dgrade_value)}`).join(' ')
    const rankPoints = playerHistory.map((h, i) => `${xScale(i)},${yScaleRank(h.world_ranking)}`).join(' ')

    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 400 }}>
        {showDgrade && <polyline points={dgradePoints} fill="none" stroke="#16a34a" strokeWidth="2" />}
        {showRanking && <polyline points={rankPoints} fill="none" stroke="#2563eb" strokeWidth="2" />}
        {playerHistory.map((h, i) => (
          <g key={i}>
            {showDgrade && <circle cx={xScale(i)} cy={yScaleDgrade(h.dgrade_value)} r="3" fill="#16a34a"><title>{formatDate(h.recorded_at)}: dGrade {h.dgrade_value}</title></circle>}
            {showRanking && <circle cx={xScale(i)} cy={yScaleRank(h.world_ranking)} r="3" fill="#2563eb"><title>{formatDate(h.recorded_at)}: Rank #{h.world_ranking}</title></circle>}
          </g>
        ))}
        <text x={pad.left - 5} y={pad.top + 5} fontSize="9" fill="#9ca3af" textAnchor="end">{showDgrade ? dgradeMax : rankMin}</text>
        <text x={pad.left - 5} y={pad.top + chartH} fontSize="9" fill="#9ca3af" textAnchor="end">{showDgrade ? dgradeMin : rankMax}</text>
      </svg>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <a href="/dashboard" className="text-xl font-bold text-green-600">GCLab</a>
        <a href="/dashboard" className="text-sm text-gray-600 hover:text-green-600">← Dashboard</a>
      </nav>
      <main className="max-w-5xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-bold mb-6">WCF Rankings & Stats</h2>

        <div className="flex gap-2 mb-6 flex-wrap">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                activeTab === tab ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:border-green-500'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading && <p className="text-gray-400 text-sm">Loading...</p>}

        {activeTab === 'Rankings' && !loading && (
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-500">{rankings.length} players shown</p>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(parseInt(e.target.value)); setRankingsPage(0) }}
                  className="border border-gray-300 rounded-md px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {PAGE_SIZES.map(s => <option key={s} value={s}>{s} per page</option>)}
                </select>
              </div>
              <button
                onClick={() => { setActiveOnly(!activeOnly); setRankingsPage(0) }}
                className={`flex items-center gap-2 text-xs px-3 py-1 rounded-full border transition ${
                  activeOnly ? 'bg-green-50 border-green-400 text-green-700' : 'bg-gray-50 border-gray-300 text-gray-500'
                }`}
              >
                <span className={`w-3 h-3 rounded-full ${activeOnly ? 'bg-green-500' : 'bg-gray-300'}`} />
                {activeOnly ? 'Active last 12 months' : 'All time'}
              </button>
            </div>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Rank</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Player</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Country</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">dGrade</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Games (12mo)</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Win% (12mo)</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((player, i) => (
                    <tr key={player.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 text-gray-700">{player.world_ranking}</td>
                      <td className="px-4 py-2">
                        <a href={player.wcf_profile_url} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline font-medium">
                          {player.wcf_first_name} {player.wcf_last_name}
                        </a>
                      </td>
                      <td className="px-4 py-2">
                        <span className="mr-1">{getFlag(player.country)}</span>
                        <span className="text-gray-700">{player.country}</span>
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
              <button
                onClick={() => setRankingsPage(p => Math.max(0, p - 1))}
                disabled={rankingsPage === 0}
                className="text-sm text-gray-600 px-4 py-2 border rounded-md hover:bg-gray-50 disabled:opacity-30"
              >
                ← Previous
              </button>
              <span className="text-sm text-gray-500 py-2">Page {rankingsPage + 1}</span>
              <button
                onClick={() => setRankingsPage(p => p + 1)}
                disabled={rankings.length < pageSize}
                className="text-sm text-gray-600 px-4 py-2 border rounded-md hover:bg-gray-50 disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {activeTab === 'Movers' && !loading && (
          <div>
            <div className="flex gap-2 mb-2 flex-wrap">
              {MOVER_PERIODS.map(p => (
                <button
                  key={p.days}
                  onClick={() => setMoverPeriod(p.days)}
                  className={`px-3 py-1 rounded-full text-sm border transition ${
                    moverPeriod === p.days ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300 hover:border-green-500'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mb-4">GCLab dGrade tracking started 3 Mar 2026. Historical data will grow over time.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-green-700 mb-3">📈 Biggest Gains</h3>
                {movers.gains.length === 0 ? (
                  <p className="text-sm text-gray-400">No changes detected yet for this period.</p>
                ) : (
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-4 py-2 text-gray-600 font-medium">Player</th>
                          <th className="text-right px-4 py-2 text-gray-600 font-medium">Change</th>
                          <th className="text-right px-4 py-2 text-gray-600 font-medium">dGrade</th>
                          <th className="text-right px-4 py-2 text-gray-600 font-medium">Games (12mo)</th>
                          <th className="text-right px-4 py-2 text-gray-600 font-medium">Win% (12mo)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {movers.gains.map((p, i) => (
                          <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-2">
                              <a href={p.wcf_profile_url} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">
                                {getFlag(p.country)} {p.wcf_first_name} {p.wcf_last_name}
                              </a>
                            </td>
                            <td className="px-4 py-2 text-right text-green-600 font-medium">+{p.change}</td>
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
              <div>
                <h3 className="font-semibold text-red-600 mb-3">📉 Biggest Losses</h3>
                {movers.losses.length === 0 ? (
                  <p className="text-sm text-gray-400">No changes detected yet for this period.</p>
                ) : (
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-4 py-2 text-gray-600 font-medium">Player</th>
                          <th className="text-right px-4 py-2 text-gray-600 font-medium">Change</th>
                          <th className="text-right px-4 py-2 text-gray-600 font-medium">dGrade</th>
                          <th className="text-right px-4 py-2 text-gray-600 font-medium">Games (12mo)</th>
                          <th className="text-right px-4 py-2 text-gray-600 font-medium">Win% (12mo)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {movers.losses.map((p, i) => (
                          <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-2">
                              <a href={p.wcf_profile_url} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">
                                {getFlag(p.country)} {p.wcf_first_name} {p.wcf_last_name}
                              </a>
                            </td>
                            <td className="px-4 py-2 text-right text-red-500 font-medium">{p.change}</td>
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
            </div>
          </div>
        )}

        {activeTab === 'New Players' && !loading && (
          <div>
            <div className="flex gap-3 mb-4 flex-wrap items-center">
              {[30, 90, 180, 365].map(d => (
                <button
                  key={d}
                  onClick={() => setNewPlayerDays(d)}
                  className={`px-3 py-1 rounded-full text-sm border transition ${
                    newPlayerDays === d ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300 hover:border-green-500'
                  }`}
                >
                  {d === 30 ? '30 days' : d === 90 ? '90 days' : d === 180 ? '6 months' : '1 year'}
                </button>
              ))}
              <select
                value={newPlayerCountry}
                onChange={(e) => setNewPlayerCountry(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">All countries</option>
                {countryList.map(c => (
                  <option key={c} value={c}>{getFlag(c)} {c}</option>
                ))}
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
                      <td className="px-4 py-2">
                        <span className="mr-1">{getFlag(player.country)}</span>
                        <span className="text-gray-700">{player.country}</span>
                      </td>
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

        {activeTab === 'Country Stats' && !loading && (
          <div>
            <div className="flex gap-2 mb-4 flex-wrap">
              {[
                { key: 'active_players', label: 'Active Players' },
                { key: 'total_players', label: 'Total Players' },
                { key: 'avg_top6_dgrade', label: 'Top 6 Avg dGrade' },
              ].map(s => (
                <button
                  key={s.key}
                  onClick={() => {
                    setCountrySortBy(s.key)
                    const sorted = [...countryStats].sort((a, b) => b[s.key] - a[s.key])
                    setCountryStats(sorted)
                  }}
                  className={`px-3 py-1 rounded-full text-sm border transition ${
                    countrySortBy === s.key ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300 hover:border-green-500'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mb-3">Active = played a ranked game in the last 12 months. Top 6 avg dGrade reflects competitive strength.</p>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Country</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Total Players</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Active (12mo)</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Top 6 Avg dGrade</th>
                  </tr>
                </thead>
                <tbody>
                  {countryStats.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400 text-sm">Loading country data...</td></tr>
                  ) : countryStats.map((row, i) => (
                    <tr key={row.country} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 font-medium">
                        <span className="mr-2">{getFlag(row.country)}</span>{row.country}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-700">{row.total_players}</td>
                      <td className="px-4 py-2 text-right text-gray-700">{row.active_players}</td>
                      <td className="px-4 py-2 text-right font-medium text-gray-800">{row.avg_top6_dgrade ? Math.round(row.avg_top6_dgrade) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'Historical Rankings' && (
          <div>
            {!selectedPlayer && (
              <div className="mb-6">
                {currentUserProfile?.wcf_player_id ? (
                  <p className="text-sm text-gray-500 mb-4">Showing your ranking history. Search below to look up any player.</p>
                ) : (
                  <p className="text-sm text-gray-500 mb-4">Link your WCF record in your profile to see your own history. Or search for any player below.</p>
                )}
                <div className="flex gap-2 flex-wrap">
                  <input
                    type="text"
                    placeholder="First name"
                    value={lookupFirst}
                    onChange={(e) => setLookupFirst(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 w-36 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <input
                    type="text"
                    placeholder="Last name"
                    value={lookupLast}
                    onChange={(e) => setLookupLast(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePlayerSearch()}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 w-36 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    onClick={handlePlayerSearch}
                    className="bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700 transition"
                  >
                    Search
                  </button>
                </div>
              </div>
            )}

            {lookupSearched && lookupResults.length === 0 && !selectedPlayer && (
              <p className="text-sm text-gray-400">No players found.</p>
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
                        <td className="px-4 py-2 text-gray-700">{getFlag(player.country)} {player.country}</td>
                        <td className="px-4 py-2 text-right text-gray-800 font-medium">{player.dgrade}</td>
                        <td className="px-4 py-2 text-right text-gray-700">#{player.world_ranking}</td>
                        <td className="px-4 py-2 text-right">
                          <button onClick={() => handleSelectPlayer(player)} className="text-green-600 hover:underline text-xs">
                            View history →
                          </button>
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
                  <button
                    onClick={() => { setSelectedPlayer(null); setPlayerHistory([]) }}
                    className="text-sm text-gray-500 hover:text-green-600"
                  >
                    ← Back
                  </button>
                  <h3 className="font-semibold text-lg">{getFlag(selectedPlayer.country)} {selectedPlayer.wcf_first_name} {selectedPlayer.wcf_last_name}</h3>
                  <span className="text-sm text-gray-500">{selectedPlayer.country} · dGrade {selectedPlayer.dgrade} · World #{selectedPlayer.world_ranking}</span>
                  <a href={selectedPlayer.wcf_profile_url} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:underline ml-auto">
                    WCF Profile →
                  </a>
                </div>

                <div className="flex gap-3 mb-3">
                  <button
                    onClick={() => setShowDgrade(!showDgrade)}
                    className={`flex items-center gap-2 text-xs px-3 py-1 rounded-full border transition ${
                      showDgrade ? 'bg-green-50 border-green-400 text-green-700' : 'bg-gray-50 border-gray-300 text-gray-400'
                    }`}
                  >
                    <span className="w-3 h-1 bg-green-500 inline-block rounded" /> dGrade
                  </button>
                  <button
                    onClick={() => setShowRanking(!showRanking)}
                    className={`flex items-center gap-2 text-xs px-3 py-1 rounded-full border transition ${
                      showRanking ? 'bg-blue-50 border-blue-400 text-blue-700' : 'bg-gray-50 border-gray-300 text-gray-400'
                    }`}
                  >
                    <span className="w-3 h-1 bg-blue-500 inline-block rounded" /> World Ranking
                  </button>
                </div>

                <p className="text-xs text-gray-400 mb-3">
                  History recorded since GCLab first synced. {playerHistory.length} data point{playerHistory.length !== 1 ? 's' : ''}.
                </p>

                <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
                  {renderChart()}
                </div>

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