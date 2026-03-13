'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import GCLabNav from '@/components/GCLabNav'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend
} from 'recharts'

// ── Types ──────────────────────────────────────────────────────────────────
type HistPoint = {
  recorded_at: string
  dgrade_value: number
  egrade_value: number | null
  world_ranking: number | null
  event_name: string | null
  is_imported: boolean
}

// ── Helpers ────────────────────────────────────────────────────────────────
const COUNTRY_NAMES: Record<string, string> = {
  'AU':'Australia','BE':'Belgium','CA':'Canada','CZ':'Czech Republic','EG':'Egypt',
  'GB-ENG':'England','DE':'Germany','HK':'Hong Kong','IE':'Ireland','LV':'Latvia',
  'MX':'Mexico','NZ':'New Zealand','NO':'Norway','PT':'Portugal','GB-SCT':'Scotland',
  'ZA':'South Africa','ES':'Spain','SE':'Sweden','CH':'Switzerland','US':'USA',
  'GB-WLS':'Wales','FR':'France','IT':'Italy','NL':'Netherlands','PL':'Poland',
}
function getFlag(code: string): string {
  if (!code) return ''
  if (code === 'GB-ENG') return '🏴󠁧󠁢󠁥󠁮󠁧󠁿'
  if (code === 'GB-SCT') return '🏴󠁧󠁢󠁳󠁣󠁴󠁿'
  if (code === 'GB-WLS') return '🏴󠁧󠁢󠁷󠁬󠁳󠁿'
  if (code.length !== 2) return ''
  return code.toUpperCase().split('').map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('')
}

const DARK_GREEN = '#0d2818'
const CREAM = '#f5f0e8'
const LIME = '#4ade80'

const ML = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
  .ghl  { font-family: 'DM Serif Display', serif; }
  .gsans{ font-family: 'DM Sans', sans-serif; }
  .gmono{ font-family: 'DM Mono', monospace; }
  .search-input { outline: none; transition: border-color 0.2s; }
  .search-input:focus { border-color: #4ade80 !important; }
  .suggestion:hover { background: #f0fdf4 !important; }
  .range-btn { transition: all 0.15s; cursor: pointer; border: 1px solid #e5e7eb; }
  .range-btn:hover { border-color: #4ade80; }
  .range-btn.active { background: ${DARK_GREEN} !important; color: white !important; border-color: ${DARK_GREEN} !important; }
`

// ── Player Search ──────────────────────────────────────────────────────────
function PlayerSearch({ onSelect }: { onSelect: (p: any) => void }) {
  const [query, setQuery]           = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [open, setOpen]             = useState(false)
  const supabase = createClient()
  const ref = useRef<HTMLDivElement>(null)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); return }
    const parts = q.trim().split(/\s+/)
    let qb = supabase.from('wcf_players').select('id, wcf_first_name, wcf_last_name, country, dgrade, world_ranking, history_imported').eq('history_imported', true)
    if (parts.length >= 2) {
      qb = qb.ilike('wcf_first_name', `%${parts[0]}%`).ilike('wcf_last_name', `%${parts[1]}%`)
    } else {
      qb = qb.or(`wcf_first_name.ilike.%${q}%,wcf_last_name.ilike.%${q}%`)
    }
    const { data } = await qb.order('dgrade', { ascending: false }).limit(8)
    setSuggestions(data || [])
  }, [])

  useEffect(() => { search(query) }, [query])

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%', maxWidth: 440 }}>
      <input
        className="search-input gsans"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        placeholder="Search player name…"
        style={{
          width: '100%', padding: '11px 16px', borderRadius: 10,
          border: '1px solid #d1d5db', fontSize: 14, background: 'white',
          boxSizing: 'border-box',
        }}
      />
      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: 'white', border: '1px solid #e5e7eb', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 4, overflow: 'hidden',
        }}>
          {suggestions.map(p => (
            <div key={p.id} className="suggestion" onMouseDown={() => { onSelect(p); setQuery(`${p.wcf_first_name} ${p.wcf_last_name}`); setOpen(false) }}
              style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>{getFlag(p.country)}</span>
              <span className="gsans" style={{ flex: 1, fontSize: 14, color: '#111827' }}>{p.wcf_first_name} {p.wcf_last_name}</span>
              <span className="gsans" style={{ fontSize: 12, color: '#9ca3af' }}>{p.country}</span>
              <span className="gmono" style={{ fontSize: 13, fontWeight: 600, color: DARK_GREEN }}>{p.dgrade}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
      <p className="gsans" style={{ color: '#6b7280', fontSize: 11, margin: '0 0 6px' }}>{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} style={{ color: entry.color, margin: '2px 0' }} className="gmono">
          <span style={{ fontSize: 11, textTransform: 'uppercase', marginRight: 6 }}>{entry.name}</span>
          <strong style={{ fontSize: 14 }}>{entry.value}</strong>
        </p>
      ))}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function PlayerHistoryPage() {
  const [userProfile,   setUserProfile]   = useState<any>(null)
  const [signedIn,      setSignedIn]      = useState<boolean | null>(null)
  const [player,        setPlayer]        = useState<any>(null)
  const [history,       setHistory]       = useState<HistPoint[]>([])
  const [loading,       setLoading]       = useState(false)
  const [range,         setRange]         = useState('all')
  const [showDgrade,    setShowDgrade]    = useState(true)
  const [showRanking,   setShowRanking]   = useState(true)

  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setSignedIn(false); return }
      setSignedIn(true)
      const { data: prof } = await supabase.from('profiles').select('role, wcf_player_id').eq('id', user.id).single()
      setUserProfile(prof)
      // Auto-load the logged-in player's history
      if (prof?.wcf_player_id) {
        const { data: wp } = await supabase.from('wcf_players').select('id, wcf_first_name, wcf_last_name, country, dgrade, world_ranking, history_imported').eq('id', prof.wcf_player_id).single()
        if (wp) loadPlayer(wp)
      }
    }
    init()
  }, [])

  const loadPlayer = async (p: any) => {
    setPlayer(p)
    setLoading(true)
    const { data } = await supabase
      .from('wcf_dgrade_history')
      .select('recorded_at, dgrade_value, egrade_value, world_ranking, event_name, is_imported')
      .eq('wcf_player_id', p.id)
      .order('recorded_at', { ascending: true })
    setHistory(data || [])
    setLoading(false)
  }

  // Filter by range
  const filtered = (() => {
    const valid = history.filter(h => h.dgrade_value > 0)
    if (range === 'all') return valid
    const days = range === '1y' ? 365 : range === '2y' ? 730 : range === '5y' ? 1825 : 9999
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days)
    return valid.filter(h => new Date(h.recorded_at) >= cutoff)
  })()

  const chartData = filtered.map(h => ({
    date: new Date(h.recorded_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'short' }),
    dgrade: h.dgrade_value,
    ranking: h.world_ranking,
    event: h.event_name,
  }))

  const peak    = filtered.length ? Math.max(...filtered.map(h => h.dgrade_value)) : null
  const current = filtered.length ? filtered[filtered.length - 1].dgrade_value : null
  const lowest  = filtered.length ? Math.min(...filtered.map(h => h.dgrade_value)) : null
  const firstDate = filtered.length ? new Date(filtered[0].recorded_at).getFullYear() : null
  const years = firstDate ? (new Date().getFullYear() - firstDate + 1) : null

  const RANGES = [
    { id: '1y',  label: '1Y' },
    { id: '2y',  label: '2Y' },
    { id: '5y',  label: '5Y' },
    { id: 'all', label: 'All' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: CREAM }}>
      <style dangerouslySetInnerHTML={{ __html: ML }}/>
      <GCLabNav role={userProfile?.role} isSignedIn={!!signedIn} currentPath="/history"/>

      {/* Header */}
      <div style={{ background: DARK_GREEN, padding: '48px 24px 40px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 20, padding: '4px 14px', marginBottom: 16 }}>
            <span className="gsans" style={{ color: LIME, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Player History</span>
          </div>
          <h1 className="ghl" style={{ color: CREAM, fontSize: 38, margin: '0 0 10px', lineHeight: 1.1 }}>
            {player ? `${player.wcf_first_name} ${player.wcf_last_name}` : 'Grade History'}
          </h1>
          {player ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <span style={{ fontSize: 22 }}>{getFlag(player.country)}</span>
              <span className="gsans" style={{ color: 'rgba(245,240,232,0.6)', fontSize: 14 }}>{COUNTRY_NAMES[player.country] || player.country}</span>
              <span className="gsans" style={{ color: 'rgba(245,240,232,0.35)', fontSize: 14 }}>·</span>
              <span className="gmono" style={{ color: LIME, fontSize: 14, fontWeight: 600 }}>{player.dgrade} dGrade</span>
              {player.world_ranking && <><span className="gsans" style={{ color: 'rgba(245,240,232,0.35)' }}>·</span><span className="gsans" style={{ color: 'rgba(245,240,232,0.6)', fontSize: 14 }}>#{player.world_ranking} World</span></>}
            </div>
          ) : (
            <p className="gsans" style={{ color: 'rgba(245,240,232,0.45)', margin: 0, fontSize: 14 }}>
              Search for any player to view their complete grade history
            </p>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 24px 60px' }}>

        {/* Search */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e5e1d8', padding: '20px 24px', marginBottom: 24 }}>
          <p className="gsans" style={{ color: '#6b7280', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 10px' }}>Search Player</p>
          <PlayerSearch onSelect={loadPlayer}/>
          <p className="gsans" style={{ color: '#9ca3af', fontSize: 11, margin: '8px 0 0' }}>
            Only players with imported history are searchable. Showing your own history by default.
          </p>
        </div>

        {/* Stats row */}
        {player && !loading && filtered.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Current dGrade', value: current?.toString() ?? '—', color: '#16a34a' },
              { label: 'Peak dGrade',    value: peak?.toString() ?? '—',    color: '#2563eb' },
              { label: 'Lowest dGrade',  value: lowest?.toString() ?? '—',  color: '#6b7280' },
              { label: 'Years Tracked',  value: years?.toString() ?? '—',   color: '#7c3aed' },
            ].map(s => (
              <div key={s.label} style={{ background: 'white', borderRadius: 14, border: '1px solid #e5e1d8', padding: '16px 18px' }}>
                <p className="gsans" style={{ color: '#9ca3af', fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 6px' }}>{s.label}</p>
                <p className="gmono" style={{ fontSize: 26, fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Chart */}
        {player && (
          <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e5e1d8', padding: '24px', marginBottom: 24 }}>
            {/* Chart controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 className="gsans" style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111827' }}>dGrade History</h3>
                <p className="gsans" style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>{filtered.length} data points</p>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {/* Toggle dgrade */}
                <button onClick={() => setShowDgrade(!showDgrade)} className="range-btn gsans" style={{
                  padding: '5px 12px', borderRadius: 8, fontSize: 12, background: showDgrade ? '#16a34a' : 'white',
                  color: showDgrade ? 'white' : '#6b7280', fontWeight: 500,
                }}>dGrade</button>
                {/* Toggle ranking */}
                <button onClick={() => setShowRanking(!showRanking)} className="range-btn gsans" style={{
                  padding: '5px 12px', borderRadius: 8, fontSize: 12, background: showRanking ? '#2563eb' : 'white',
                  color: showRanking ? 'white' : '#6b7280', fontWeight: 500,
                }}>World Rank</button>
                {/* Range */}
                <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
                  {RANGES.map(r => (
                    <button key={r.id} onClick={() => setRange(r.id)} className={`range-btn gsans${range === r.id ? ' active' : ''}`}
                      style={{ padding: '5px 10px', borderRadius: 7, fontSize: 12, background: range === r.id ? DARK_GREEN : 'white', color: range === r.id ? 'white' : '#6b7280', fontWeight: 500 }}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {loading ? (
              <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p className="gsans" style={{ color: '#9ca3af' }}>Loading history…</p>
              </div>
            ) : chartData.length === 0 ? (
              <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p className="gsans" style={{ color: '#9ca3af' }}>No data for this range</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} interval="preserveStartEnd"/>
                  {showDgrade && <YAxis yAxisId="dg" domain={['auto','auto']} tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false}/>}
                  {showRanking && <YAxis yAxisId="wr" orientation="right" reversed domain={['auto','auto']} tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false}/>}
                  <Tooltip content={<ChartTooltip/>}/>
                  {showDgrade && (
                    <Line yAxisId="dg" type="monotone" dataKey="dgrade" name="dGrade" stroke="#16a34a" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }}/>
                  )}
                  {showRanking && (
                    <Line yAxisId="wr" type="monotone" dataKey="ranking" name="World Rank" stroke="#2563eb" strokeWidth={1.5} strokeDasharray="4 3" dot={false} activeDot={{ r: 3 }}/>
                  )}
                  {peak && showDgrade && <ReferenceLine yAxisId="dg" y={peak} stroke="#16a34a" strokeDasharray="3 3" strokeOpacity={0.4}/>}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* Empty state */}
        {!player && (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📈</div>
            <h3 className="ghl" style={{ color: '#374151', fontSize: 22, margin: '0 0 8px' }}>Search for a player</h3>
            <p className="gsans" style={{ color: '#9ca3af', fontSize: 14, margin: 0 }}>
              View the complete dGrade and world ranking trajectory for any imported player.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
