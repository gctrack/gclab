'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

function getFlag(code: string) {
  if (!code) return ''
  if (code === 'GB-ENG') return '🏴󠁧󠁢󠁥󠁮󠁧󠁿'
  if (code === 'GB-SCT') return '🏴󠁧󠁢󠁳󠁣󠁴󠁿'
  if (code === 'GB-WLS') return '🏴󠁧󠁢󠁷󠁬󠁳󠁿'
  const code2 = code.length === 2 ? code : null
  if (!code2) return ''
  return code2
    .toUpperCase()
    .split('')
    .map(c => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join('')
}

const TABS = ['Rankings', 'Movers', 'New Players', 'Country Stats', 'Player Lookup']
const MOVER_PERIODS = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '1 year', days: 365 },
]

export default function RankingsPage() {
  const [activeTab, setActiveTab] = useState('Rankings')
  const [loading, setLoading] = useState(false)

  // Rankings state
  const [rankings, setRankings] = useState<any[]>([])
  const [activeOnly, setActiveOnly] = useState(true)
  const [rankingsPage, setRankingsPage] = useState(0)
  const PAGE_SIZE = 50

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

  // Player lookup state
  const [lookupFirst, setLookupFirst] = useState('')
  const [lookupLast, setLookupLast] = useState('')
  const [lookupResults, setLookupResults] = useState<any[]>([])
  const [lookupSearched, setLookupSearched] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null)
  const [playerHistory, setPlayerHistory] = useState<any[]>([])

  const supabase = createClient()
  const activeYear = new Date().getFullYear() - 2

  useEffect(() => {
    if (activeTab === 'Rankings') loadRankings()
    if (activeTab === 'Movers') loadMovers()
    if (activeTab === 'New Players') loadNewPlayers()
    if (activeTab === 'Country Stats') loadCountryStats()
  }, [activeTab, activeOnly, moverPeriod, newPlayerDays, newPlayerCountry, rankingsPage])

  const loadRankings = async () => {
    setLoading(true)
    let query = supabase
      .from('wcf_players')
      .select('id, wcf_first_name, wcf_last_name, country, dgrade, world_ranking, games, wins, win_percentage, last_active_year, wcf_profile_url')
      .order('world_ranking', { ascending: true })
      .range(rankingsPage * PAGE_SIZE, (rankingsPage + 1) * PAGE_SIZE - 1)
    if (activeOnly) query = query.gte('last_active_year', activeYear)
    const { data } = await query
    setRankings(data || [])
    setLoading(false)
  }

  const loadMovers = async () => {
    setLoading(true)
    const since = new Date()
    since.setDate(since.getDate() - moverPeriod)
    const { data } = await supabase.rpc('get_movers', { since_date: since.toISOString(), limit_count: 20 })
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
    let query = supabase
      .from('wcf_players')
      .select('id, wcf_first_name, wcf_last_name, country, dgrade, world_ranking, wcf_profile_url, created_at')
      .gte('created_at', since.toISOString())
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
    const { data } = await supabase
      .from('wcf_dgrade_history')
      .select('dgrade_value, world_ranking, recorded_at')
      .eq('wcf_player_id', player.id)
      .order('recorded_at', { ascending: true })
    setPlayerHistory(data || [])
  }

  const formatDate = (str: string) => new Date(str).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

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
                activeTab === tab
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:border-green-500'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading && <p className="text-gray-400 text-sm">Loading...</p>}

        {activeTab === 'Rankings' && !loading && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">{rankings.length} players shown</p>
              <button
                onClick={() => { setActiveOnly(!activeOnly); setRankingsPage(0) }}
                className={`flex items-center gap-2 text-xs px-3 py-1 rounded-full border transition ${
                  activeOnly ? 'bg-green-50 border-green-400 text-green-700' : 'bg-gray-50 border-gray-300 text-gray-500'
                }`}
              >
                <span className={`w-3 h-3 rounded-full ${activeOnly ? 'bg-green-500' : 'bg-gray-300'}`} />
                {activeOnly ? `Active last 2 years` : 'All time'}
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
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Games</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Win%</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Last</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((player, i) => (
                    <tr key={player.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 text-gray-500">{player.world_ranking}</td>
                      <td className="px-4 py-2">
                        <a href={player.wcf_profile_url} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline font-medium">
                          {player.wcf_first_name} {player.wcf_last_name}
                        </a>
                      </td>
                      <td className="px-4 py-2">
                        <span className="mr-1">{getFlag(player.country)}</span>
                        <span className="text-gray-600">{player.country}</span>
                      </td>
                      <td className="px-4 py-2 text-right font-medium">{player.dgrade}</td>
                      <td className="px-4 py-2 text-right text-gray-500">{player.games}</td>
                      <td className="px-4 py-2 text-right text-gray-500">{player.win_percentage}%</td>
                      <td className="px-4 py-2 text-right text-gray-500">{player.last_active_year}</td>
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
                disabled={rankings.length < PAGE_SIZE}
                className="text-sm text-gray-600 px-4 py-2 border rounded-md hover:bg-gray-50 disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {activeTab === 'Movers' && !loading && (
          <div>
            <div className="flex gap-2 mb-4 flex-wrap">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-green-700 mb-3">📈 Biggest Gains</h3>
                {movers.gains.length === 0 ? (
                  <p className="text-sm text-gray-400">No data yet for this period</p>
                ) : (
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-4 py-2 text-gray-600 font-medium">Player</th>
                          <th className="text-right px-4 py-2 text-gray-600 font-medium">Change</th>
                          <th className="text-right px-4 py-2 text-gray-600 font-medium">Now</th>
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
                            <td className="px-4 py-2 text-right text-gray-600">{p.current_dgrade}</td>
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
                  <p className="text-sm text-gray-400">No data yet for this period</p>
                ) : (
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-4 py-2 text-gray-600 font-medium">Player</th>
                          <th className="text-right px-4 py-2 text-gray-600 font-medium">Change</th>
                          <th className="text-right px-4 py-2 text-gray-600 font-medium">Now</th>
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
                            <td className="px-4 py-2 text-right text-gray-600">{p.current_dgrade}</td>
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
            <p className="text-sm text-gray-500 mb-3">{newPlayers.length} new players found</p>
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
                  {newPlayers.map((player, i) => (
                    <tr key={player.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2">
                        <a href={player.wcf_profile_url} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline font-medium">
                          {player.wcf_first_name} {player.wcf_last_name}
                        </a>
                      </td>
                      <td className="px-4 py-2">
                        <span className="mr-1">{getFlag(player.country)}</span>
                        <span className="text-gray-600">{player.country}</span>
                      </td>
                      <td className="px-4 py-2 text-right font-medium">{player.dgrade}</td>
                      <td className="px-4 py-2 text-right text-gray-500">{player.world_ranking}</td>
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
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Country</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Total Players</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Active (2yr)</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Top 6 Avg dGrade</th>
                  </tr>
                </thead>
                <tbody>
                  {countryStats.map((row, i) => (
                    <tr key={row.country} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 font-medium">
                        <span className="mr-2">{getFlag(row.country)}</span>{row.country}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-600">{row.total_players}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{row.active_players}</td>
                      <td className="px-4 py-2 text-right font-medium">{row.avg_top6_dgrade ? Math.round(row.avg_top6_dgrade) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'Player Lookup' && (
          <div>
            <div className="flex gap-2 mb-4 flex-wrap">
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

            {lookupSearched && lookupResults.length === 0 && (
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
                        <td className="px-4 py-2 font-medium">{player.wcf_first_name} {player.wcf_last_name}</td>
                        <td className="px-4 py-2">{getFlag(player.country)} {player.country}</td>
                        <td className="px-4 py-2 text-right">{player.dgrade}</td>
                        <td className="px-4 py-2 text-right text-gray-500">#{player.world_ranking}</td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => handleSelectPlayer(player)}
                            className="text-green-600 hover:underline text-xs"
                          >
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
                <div className="flex items-center gap-3 mb-4">
                  <button onClick={() => setSelectedPlayer(null)} className="text-sm text-gray-500 hover:text-green-600">← Back</button>
                  <h3 className="font-semibold text-lg">{getFlag(selectedPlayer.country)} {selectedPlayer.wcf_first_name} {selectedPlayer.wcf_last_name}</h3>
                  <span className="text-sm text-gray-500">{selectedPlayer.country} · dGrade {selectedPlayer.dgrade} · World #{selectedPlayer.world_ranking}</span>
                  <a href={selectedPlayer.wcf_profile_url} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:underline ml-auto">WCF Profile →</a>
                </div>

                {playerHistory.length === 0 ? (
                  <p className="text-sm text-gray-400">No dGrade history recorded yet for this player.</p>
                ) : (
                  <div>
                    <p className="text-xs text-gray-400 mb-3">History recorded since GCLab first synced this player. {playerHistory.length} data points.</p>
                    <div className="bg-white rounded-lg shadow-sm p-4">
                      <div className="overflow-x-auto">
                        <svg viewBox={`0 0 800 200`} className="w-full" style={{ minWidth: 400 }}>
                          {(() => {
                            const vals = playerHistory.map(h => h.dgrade_value)
                            const min = Math.min(...vals) - 50
                            const max = Math.max(...vals) + 50
                            const range = max - min
                            const w = 800
                            const h = 200
                            const pad = 40
                            const points = playerHistory.map((h, i) => {
                              const x = pad + (i / Math.max(playerHistory.length - 1, 1)) * (w - pad * 2)
                              const y = h + pad - ((h.dgrade_value - min) / range) * (h - pad * 2)
                              return { x, y, ...h }
                            })
                            const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
                            return (
                              <>
                                <polyline points={points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#16a34a" strokeWidth="2" />
                                {points.map((p, i) => (
                                  <g key={i}>
                                    <circle cx={p.x} cy={p.y} r="3" fill="#16a34a" />
                                    <title>{formatDate(p.recorded_at)}: {p.dgrade_value}</title>
                                  </g>
                                ))}
                                <text x={pad} y={h - 5} fontSize="10" fill="#9ca3af">{max}</text>
                                <text x={pad} y={h - pad + 15} fontSize="10" fill="#9ca3af">{min}</text>
                              </>
                            )
                          })()}
                        </svg>
                      </div>
                      <div className="mt-4 border-t pt-3">
                        <table className="w-full text-xs text-gray-600">
                          <thead>
                            <tr className="text-gray-400">
                              <th className="text-left py-1">Date</th>
                              <th className="text-right py-1">dGrade</th>
                              <th className="text-right py-1">World Rank</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[...playerHistory].reverse().map((h, i) => (
                              <tr key={i} className="border-t border-gray-50">
                                <td className="py-1">{formatDate(h.recorded_at)}</td>
                                <td className="py-1 text-right font-medium">{h.dgrade_value}</td>
                                <td className="py-1 text-right text-gray-400">#{h.world_ranking}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
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