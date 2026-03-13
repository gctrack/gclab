'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import GCLabNav from '@/components/GCLabNav'
import { getFlag, countryName } from '@/lib/countries'

// ── Types ──────────────────────────────────────────────────────────────────
type HeroStat = {
  label: string
  sublabel: string
  icon: string
  accentColor: string
  loading: boolean
  player?: {
    name: string
    country: string
    value: string
    detail?: string
    detail2?: string
    detail3?: string
    event?: string
    date?: string
    score?: string
    opponentName?: string
    opponentCountry?: string
    winnerDgrade?: string
    oppDgrade?: string
    countriesPlayed?: string[]
    streakStart?: string
    streakEnd?: string
  }
}

// ── Croquet ball accent colors ─────────────────────────────────────────────
const BALL_BLUE   = '#1d8cf8'
const BALL_YELLOW = '#f5c518'
const BALL_GREEN  = '#22c55e'
const BALL_RED    = '#dc2626'
const BALL_BLACK  = '#1a1a1a'
const BALL_PINK   = '#f472b6'

// ── Helpers ────────────────────────────────────────────────────────────────
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-CA', { year: 'numeric', month: 'short' })
}

function formatFullDate(d: string) {
  return new Date(d).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
}

const ML = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
  .ghl  { font-family: 'DM Serif Display', serif; }
  .gsans{ font-family: 'DM Sans', sans-serif; }
  .gmono{ font-family: 'DM Mono', monospace; }
  .hero-card { transition: transform 0.2s, box-shadow 0.2s; }
  .hero-card:hover { transform: translateY(-3px); box-shadow: 0 12px 36px rgba(0,0,0,0.12) !important; }
  .tab-btn { transition: all 0.15s; cursor: pointer; border: none; }
  .tab-btn:hover { opacity: 0.85; }
  .tbl-row:hover { background: rgba(0,0,0,0.025) !important; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
`

const DARK_GREEN = '#0d2818'
const CREAM = '#f5f0e8'

// ── Hero Card ──────────────────────────────────────────────────────────────
function HeroCard({ stat }: { stat: HeroStat }) {
  const { label, sublabel, icon, accentColor, loading, player } = stat
  return (
    <div className="hero-card" style={{
      background: 'white', borderRadius: 20, border: '1px solid #e5e1d8',
      boxShadow: '0 4px 16px rgba(0,0,0,0.07)', overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ height: 4, background: accentColor }}/>
      <div style={{ padding: '20px 22px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <p className="gsans" style={{ color: '#6b7280', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 4px' }}>{label}</p>
            <p className="gsans" style={{ color: '#9ca3af', fontSize: 11, margin: 0 }}>{sublabel}</p>
          </div>
          <div style={{ fontSize: 26 }}>{icon}</div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[80, 120, 60].map((w, i) => (
              <div key={i} style={{ height: i === 1 ? 32 : 14, width: `${w}%`, background: '#f3f4f6', borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }}/>
            ))}
          </div>
        ) : player ? (
          <div>
            <div className="gmono" style={{ fontSize: 34, fontWeight: 700, color: accentColor, lineHeight: 1, marginBottom: 8 }}>
              {player.value}
            </div>

            {player.opponentName ? (
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 16 }}>{getFlag(player.country)}</span>
                  <span className="gsans" style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{player.name}</span>
                  {player.winnerDgrade && <span className="gmono" style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{player.winnerDgrade}</span>}
                  <span className="gsans" style={{ fontSize: 11, color: '#9ca3af' }}>{countryName(player.country)}</span>
                </div>
                <div style={{ paddingLeft: 2, marginBottom: 6 }}>
                  <span className="gsans" style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>beat</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>{getFlag(player.opponentCountry || '')}</span>
                  <span className="gsans" style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{player.opponentName}</span>
                  {player.oppDgrade && <span className="gmono" style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>{player.oppDgrade}</span>}
                  <span className="gsans" style={{ fontSize: 11, color: '#9ca3af' }}>{countryName(player.opponentCountry || '')}</span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                <span style={{ fontSize: 18 }}>{getFlag(player.country)}</span>
                <span className="gsans" style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{player.name}</span>
                <span className="gsans" style={{ fontSize: 12, color: '#9ca3af' }}>{countryName(player.country)}</span>
              </div>
            )}

            {player.detail && <p className="gsans" style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0', lineHeight: 1.5 }}>{player.detail}</p>}
            {player.detail2 && <p className="gsans" style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0', lineHeight: 1.5 }}>{player.detail2}</p>}
            {player.detail3 && <p className="gsans" style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0', lineHeight: 1.5 }}>{player.detail3}</p>}

            {player.countriesPlayed && player.countriesPlayed.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                {player.countriesPlayed.map(c => (
                  <span key={c} title={countryName(c)} style={{ fontSize: 18, lineHeight: 1 }}>{getFlag(c)}</span>
                ))}
              </div>
            )}

            {player.streakStart && player.streakEnd && (
              <div style={{ marginTop: 8, padding: '6px 10px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                <p className="gsans" style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>Event date range</p>
                <p className="gmono" style={{ fontSize: 12, fontWeight: 600, color: '#374151', margin: '2px 0 0' }}>
                  {formatDate(player.streakStart)} — {formatDate(player.streakEnd)}
                </p>
              </div>
            )}

            {player.event && (
              <div style={{ marginTop: 8, padding: '7px 10px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                <p className="gsans" style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>{player.event}</p>
                {player.score && <p className="gmono" style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '2px 0 0' }}>{player.score}</p>}
                {player.date && <p className="gsans" style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>{player.date}</p>}
              </div>
            )}
          </div>
        ) : (
          <p className="gsans" style={{ color: '#9ca3af', fontSize: 13 }}>No data available</p>
        )}
      </div>
    </div>
  )
}

// ── Section Divider ────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ margin: '48px 0 20px' }}>
      <p className="gsans" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9ca3af', margin: '0 0 8px' }}>{title}</p>
      <div style={{ height: 1, background: '#e5e1d8' }}/>
      {subtitle && <p className="gsans" style={{ fontSize: 12, color: '#9ca3af', margin: '6px 0 0' }}>{subtitle}</p>}
    </div>
  )
}

// ── Generic Top-10 Table ───────────────────────────────────────────────────
function LeaderTable({ title, icon, accentColor, rows, loading, renderValue, subText, renderExtra }: {
  title: string
  icon: string
  accentColor: string
  rows: any[]
  loading: boolean
  renderValue: (row: any) => React.ReactNode
  subText?: (row: any) => string | null
  renderExtra?: (row: any) => React.ReactNode
}) {
  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e5e1d8', overflow: 'hidden' }}>
      <div style={{ height: 3, background: accentColor }}/>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e1d8', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <h3 className="gsans" style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827' }}>{title}</h3>
      </div>
      {loading ? (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ height: 36, background: '#f3f4f6', borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }}/>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="gsans" style={{ padding: '20px', color: '#9ca3af', fontSize: 13, margin: 0 }}>No data yet — import more players to populate this table.</p>
      ) : (
        <div>
          {rows.map((row, i) => (
            <div key={i} className="tbl-row" style={{
              padding: renderExtra ? '10px 20px 6px' : '10px 20px',
              borderBottom: i < rows.length - 1 ? '1px solid #f3f4f6' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="gmono" style={{ color: '#9ca3af', fontSize: 12, width: 20, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{getFlag(row.country)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span className="gsans" style={{ fontSize: 13, fontWeight: 600, color: '#111827', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.wcf_first_name} {row.wcf_last_name}
                  </span>
                  {subText && subText(row) && (
                    <span className="gsans" style={{ fontSize: 10, color: '#9ca3af', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {subText(row)}
                    </span>
                  )}
                </div>
                <span className="gsans" style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>{countryName(row.country)}</span>
                {renderValue(row)}
              </div>
              {renderExtra && renderExtra(row)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Upset Wins Table ───────────────────────────────────────────────────────
function UpsetTable({ rows, loading }: { rows: any[]; loading: boolean }) {
  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e5e1d8', overflow: 'hidden' }}>
      <div style={{ height: 3, background: BALL_PINK }}/>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e1d8', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>⚡</span>
        <h3 className="gsans" style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827' }}>Biggest Upset Wins — All Time</h3>
      </div>
      {loading ? (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ height: 52, background: '#f3f4f6', borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }}/>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="gsans" style={{ padding: '20px', color: '#9ca3af', fontSize: 13, margin: 0 }}>No data yet — import more players to populate this table.</p>
      ) : (
        <div>
          {rows.map((row, i) => (
            <div key={i} className="tbl-row" style={{
              padding: '12px 20px',
              borderBottom: i < rows.length - 1 ? '1px solid #f3f4f6' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: row.event_name ? 5 : 0 }}>
                <span className="gmono" style={{ color: '#9ca3af', fontSize: 12, width: 20, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                <span className="gmono" style={{ fontSize: 14, fontWeight: 700, color: BALL_PINK, flexShrink: 0, minWidth: 44 }}>+{row.gap}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 15 }}>{getFlag(row.country)}</span>
                  <span className="gsans" style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{row.wcf_first_name} {row.wcf_last_name}</span>
                  <span className="gmono" style={{ fontSize: 11, color: '#374151' }}>{row.winner_dgrade}</span>
                </div>
                <span className="gsans" style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic', flexShrink: 0 }}>beat</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 15 }}>{getFlag(row.opponent_country || '')}</span>
                  <span className="gsans" style={{ fontSize: 13, color: '#374151' }}>{row.opponent_name}</span>
                  <span className="gmono" style={{ fontSize: 11, color: '#9ca3af' }}>{row.opp_dgrade}</span>
                </div>
              </div>
              {row.event_name && (
                <div style={{ paddingLeft: 72, display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span className="gsans" style={{ fontSize: 11, color: '#6b7280' }}>{row.event_name}</span>
                  {row.score && <span className="gmono" style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{row.score}</span>}
                  {row.event_date && (
                    <span className="gsans" style={{ fontSize: 11, color: '#9ca3af' }}>{formatDate(row.event_date)}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Country Stat Tables ────────────────────────────────────────────────────
function CountryTable({ title, data, valueLabel }: { title: string; data: {country:string;value:number}[]; valueLabel: string }) {
  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e5e1d8', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e1d8' }}>
        <h3 className="gsans" style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827' }}>{title}</h3>
      </div>
      <div>
        {data.slice(0, 15).map((row, i) => (
          <div key={row.country} className="tbl-row" style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px',
            borderBottom: i < Math.min(data.length, 15) - 1 ? '1px solid #f3f4f6' : 'none',
          }}>
            <span className="gmono" style={{ color: '#9ca3af', fontSize: 12, width: 22, textAlign: 'right' }}>{i + 1}</span>
            <span style={{ fontSize: 18 }}>{getFlag(row.country)}</span>
            <span className="gsans" style={{ flex: 1, fontSize: 14, color: '#374151' }}>{countryName(row.country)}</span>
            <span className="gmono" style={{ fontSize: 14, fontWeight: 600, color: DARK_GREEN }}>{row.value.toLocaleString()}</span>
            <span className="gsans" style={{ fontSize: 11, color: '#9ca3af', width: 50 }}>{valueLabel}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── New Players Table ──────────────────────────────────────────────────────
function NewPlayersTable({ players }: { players: any[] }) {
  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e5e1d8', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e1d8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 className="gsans" style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827' }}>🆕 Newly Registered Players</h3>
        <span className="gsans" style={{ fontSize: 12, color: '#9ca3af' }}>Last 60 days</span>
      </div>
      {players.length === 0 ? (
        <p className="gsans" style={{ padding: '20px', color: '#9ca3af', fontSize: 13, margin: 0 }}>Loading…</p>
      ) : (
        <div>
          {players.map((p, i) => (
            <div key={p.id} className="tbl-row" style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px',
              borderBottom: i < players.length - 1 ? '1px solid #f3f4f6' : 'none',
            }}>
              <span style={{ fontSize: 18 }}>{getFlag(p.country)}</span>
              <span className="gsans" style={{ flex: 1, fontSize: 14, color: '#111827', fontWeight: 500 }}>
                {p.wcf_first_name} {p.wcf_last_name}
              </span>
              <span className="gsans" style={{ fontSize: 12, color: '#6b7280' }}>{countryName(p.country)}</span>
              <span className="gmono" style={{ fontSize: 13, fontWeight: 600, color: DARK_GREEN, width: 48, textAlign: 'right' }}>{p.dgrade || '—'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function LeaderboardsPage() {
  const [userProfile, setUserProfile] = useState<any>(null)
  const [signedIn, setSignedIn]       = useState<boolean | null>(null)
  const [tab, setTab]                 = useState<'records' | 'countries' | 'new'>('records')

  const [heroStats, setHeroStats] = useState<HeroStat[]>([
    { label: 'Most Games Played',   sublabel: 'Career total',                  icon: '🎮', accentColor: BALL_BLUE,   loading: true },
    { label: 'Best Win Rate',       sublabel: 'Min 100 games · career %',      icon: '🏆', accentColor: BALL_YELLOW, loading: true },
    { label: 'Most Travelled',      sublabel: 'Countries played in',           icon: '✈️', accentColor: BALL_GREEN,  loading: true },
    { label: 'Longest Win Streak',  sublabel: 'Consecutive wins',              icon: '🔥', accentColor: BALL_RED,    loading: true },
    { label: 'Biggest Career Rise', sublabel: 'All-time dGrade gain',          icon: '📈', accentColor: BALL_BLACK,  loading: true },
    { label: 'Biggest Upset Win',   sublabel: 'Winner vs opponent dGrade gap', icon: '⚡', accentColor: BALL_PINK,   loading: true },
  ])

  const [top10Games,      setTop10Games]      = useState<any[]>([])
  const [top10WinRate,    setTop10WinRate]    = useState<any[]>([])
  const [top10Travelled,  setTop10Travelled]  = useState<any[]>([])
  const [top10Opponents,  setTop10Opponents]  = useState<any[]>([])
  const [top10CareerRise, setTop10CareerRise] = useState<any[]>([])
  const [top10Streak,     setTop10Streak]     = useState<any[]>([])
  const [top10EventJump,  setTop10EventJump]  = useState<any[]>([])
  const [top10Upsets,     setTop10Upsets]     = useState<any[]>([])
  const [tablesLoading,   setTablesLoading]   = useState(true)

  const [totalByCountry,  setTotalByCountry]  = useState<{country:string;value:number}[]>([])
  const [activeByCountry, setActiveByCountry] = useState<{country:string;value:number}[]>([])
  const [newPlayers,      setNewPlayers]      = useState<any[]>([])

  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setSignedIn(true)
        const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        setUserProfile(data)
      } else setSignedIn(false)
    }
    init()
  }, [])

  useEffect(() => {
    loadHeroStats()
    loadTop10Tables()
    loadCountryStats()
    loadNewPlayers()
  }, [])

  const updateHero = (i: number, player: HeroStat['player']) => {
    setHeroStats(prev => prev.map((h, idx) => idx === i ? { ...h, loading: false, player } : h))
  }

  const loadHeroStats = async () => {
    { const { data } = await supabase.rpc('get_most_games_player'); const r = data?.[0]
      if (r) updateHero(0, { name: `${r.wcf_first_name} ${r.wcf_last_name}`, country: r.country, value: Number(r.game_count).toLocaleString(), detail: 'career games played', detail2: `${Number(r.opponent_count).toLocaleString()} unique opponents` })
      else updateHero(0, undefined) }
    { const { data } = await supabase.rpc('get_best_win_rate'); const r = data?.[0]
      if (r) updateHero(1, { name: `${r.wcf_first_name} ${r.wcf_last_name}`, country: r.country, value: `${r.win_rate}%`, detail: `${Number(r.win_count).toLocaleString()} wins from ${Number(r.game_count).toLocaleString()} games` })
      else updateHero(1, undefined) }
    { const { data } = await supabase.rpc('get_most_travelled'); const r = data?.[0]
      if (r) updateHero(2, { name: `${r.wcf_first_name} ${r.wcf_last_name}`, country: r.country, value: `${r.country_count}`, detail: 'countries played in', countriesPlayed: r.countries_played || [] })
      else updateHero(2, undefined) }
    { const { data } = await supabase.rpc('get_longest_win_streak'); const r = data?.[0]
      if (r) updateHero(3, { name: `${r.wcf_first_name} ${r.wcf_last_name}`, country: r.country, value: `${r.streak}`, detail: 'consecutive wins', streakStart: r.streak_start, streakEnd: r.streak_end })
      else updateHero(3, undefined) }
    { const { data } = await supabase.rpc('get_biggest_career_rise'); const r = data?.[0]
      if (r) updateHero(4, { name: `${r.wcf_first_name} ${r.wcf_last_name}`, country: r.country, value: `+${r.gain}`, detail: `${r.min_dgrade} → ${r.max_dgrade} dGrade`, detail2: `${Number(r.game_count).toLocaleString()} games · ${r.win_rate}% win rate` })
      else updateHero(4, undefined) }
    { const { data } = await supabase.rpc('get_biggest_upset_win'); const r = data?.[0]
      if (r) updateHero(5, { name: `${r.wcf_first_name} ${r.wcf_last_name}`, country: r.country, value: `+${r.gap}`, winnerDgrade: `${r.winner_dgrade}`, oppDgrade: `${r.opp_dgrade}`, opponentName: r.opponent_name, opponentCountry: r.opponent_country || '', event: r.event_name, score: r.score, date: r.event_date ? formatFullDate(r.event_date) : '' })
      else updateHero(5, undefined) }
  }

  const loadTop10Tables = async () => {
    setTablesLoading(true)
    const [
      { data: games }, { data: winRate }, { data: travelled }, { data: opponents },
      { data: careerRise }, { data: streak }, { data: eventJump }, { data: upsets },
    ] = await Promise.all([
      supabase.rpc('get_top10_most_games'),      supabase.rpc('get_top10_win_rate'),
      supabase.rpc('get_top10_most_travelled'),  supabase.rpc('get_top10_most_opponents'),
      supabase.rpc('get_top10_career_rise'),     supabase.rpc('get_top10_longest_win_streak'),
      supabase.rpc('get_top10_single_event_jump'), supabase.rpc('get_top10_upset_wins'),
    ])
    setTop10Games(games || []);      setTop10WinRate(winRate || [])
    setTop10Travelled(travelled || []); setTop10Opponents(opponents || [])
    setTop10CareerRise(careerRise || []); setTop10Streak(streak || [])
    setTop10EventJump(eventJump || []); setTop10Upsets(upsets || [])
    setTablesLoading(false)
  }

  const loadCountryStats = async () => {
    const { data: total } = await supabase.rpc('get_players_by_country')
    if (total) setTotalByCountry(total.map((r: any) => ({ country: r.country, value: Number(r.total) })))
    const { data: active } = await supabase.rpc('get_active_players_by_country')
    if (active) setActiveByCountry(active.map((r: any) => ({ country: r.country, value: Number(r.total) })))
  }

  const loadNewPlayers = async () => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 60)
    const { data } = await supabase.from('wcf_players').select('id, wcf_first_name, wcf_last_name, country, dgrade, created_at')
      .gte('created_at', cutoff.toISOString()).order('created_at', { ascending: false }).limit(30)
    setNewPlayers(data || [])
  }

  const TABS = [
    { id: 'records',   label: '🏅 Record Holders' },
    { id: 'countries', label: '🌍 Players by Country' },
    { id: 'new',       label: '🆕 New Players' },
  ] as const

  return (
    <div style={{ minHeight: '100vh', background: CREAM, fontFamily: 'DM Sans, sans-serif' }}>
      <style dangerouslySetInnerHTML={{ __html: ML }}/>
      <GCLabNav role={userProfile?.role} isSignedIn={signedIn ?? undefined} currentPath="/leaderboards"/>

      <div style={{ background: DARK_GREEN, padding: '48px 24px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 20, padding: '4px 14px', marginBottom: 16 }}>
            <span className="gsans" style={{ color: '#4ade80', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Stats & Leaderboards</span>
          </div>
          <h1 className="ghl" style={{ color: '#f5f0e8', fontSize: 40, margin: '0 0 10px', lineHeight: 1.1 }}>Record Holders</h1>
          <p className="gsans" style={{ color: 'rgba(245,240,232,0.55)', margin: 0, fontSize: 15 }}>The all-time leaders across every metric in Golf Croquet.</p>
        </div>
      </div>

      <div style={{ background: 'white', borderBottom: '1px solid #e5e1d8', position: 'sticky', top: 52, zIndex: 10 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', padding: '0 24px' }}>
          {TABS.map(t => (
            <button key={t.id} className="tab-btn gsans" onClick={() => setTab(t.id)} style={{
              padding: '14px 20px', fontSize: 13, fontWeight: 600, background: 'none',
              color: tab === t.id ? DARK_GREEN : '#9ca3af',
              borderBottom: tab === t.id ? `2px solid ${DARK_GREEN}` : '2px solid transparent',
              marginBottom: -1,
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 80px' }}>
        {tab === 'records' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
              {heroStats.map((stat, i) => <HeroCard key={i} stat={stat}/>)}
            </div>

            <SectionHeader title="Volume & Games" subtitle="Who has played the most — and who went on the longest winning tear" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))', gap: 20 }}>
              <LeaderTable title="Most Games Played" icon="🎮" accentColor={BALL_BLUE} rows={top10Games} loading={tablesLoading}
                renderValue={(row) => <span className="gmono" style={{ fontSize: 14, fontWeight: 700, color: BALL_BLUE, flexShrink: 0 }}>{Number(row.game_count).toLocaleString()}</span>}/>
              <LeaderTable title="Longest Win Streak" icon="🔥" accentColor={BALL_RED} rows={top10Streak} loading={tablesLoading}
                renderValue={(row) => <span className="gmono" style={{ fontSize: 14, fontWeight: 700, color: BALL_RED, flexShrink: 0 }}>{row.streak} wins</span>}/>
            </div>

            <SectionHeader title="Reach & Opponents" subtitle="Who has travelled furthest and faced the widest field" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))', gap: 20 }}>
              <LeaderTable title="Most Travelled" icon="✈️" accentColor={BALL_GREEN} rows={top10Travelled} loading={tablesLoading}
                renderValue={(row) => <span className="gmono" style={{ fontSize: 14, fontWeight: 700, color: BALL_GREEN, flexShrink: 0 }}>{row.country_count} countries</span>}
                renderExtra={(row) => row.countries_played?.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, paddingLeft: 30, paddingBottom: 6, marginTop: 4 }}>
                    {row.countries_played.map((c: string) => <span key={c} title={countryName(c)} style={{ fontSize: 14, lineHeight: 1 }}>{getFlag(c)}</span>)}
                  </div>
                ) : null}/>
              <LeaderTable title="Most Unique Opponents" icon="🤝" accentColor="#6b7280" rows={top10Opponents} loading={tablesLoading}
                renderValue={(row) => <span className="gmono" style={{ fontSize: 14, fontWeight: 700, color: '#374151', flexShrink: 0 }}>{Number(row.opponent_count).toLocaleString()}</span>}/>
            </div>

            <SectionHeader title="Grade Achievements" subtitle="The biggest dGrade rises over a career and within a single event" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))', gap: 20 }}>
              <LeaderTable title="Biggest Career Rise" icon="📈" accentColor={BALL_BLACK} rows={top10CareerRise} loading={tablesLoading}
                renderValue={(row) => (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1, flexShrink: 0 }}>
                    <span className="gmono" style={{ fontSize: 14, fontWeight: 700, color: BALL_BLACK }}>+{row.gain}</span>
                    <span className="gmono" style={{ fontSize: 10, color: '#9ca3af' }}>{row.min_dgrade}→{row.max_dgrade}</span>
                  </div>
                )}/>
              <LeaderTable title="Biggest Single-Event Jump" icon="🚀" accentColor="#0284c7" rows={top10EventJump} loading={tablesLoading}
                subText={(row) => row.event_name && row.event_date ? `${row.event_name} · ${formatFullDate(row.event_date)}` : row.event_name || null}
                renderValue={(row) => (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1, flexShrink: 0 }}>
                    <span className="gmono" style={{ fontSize: 14, fontWeight: 700, color: '#0284c7' }}>+{row.jump}</span>
                    <span className="gmono" style={{ fontSize: 10, color: '#9ca3af' }}>{row.grade_before}→{row.grade_after}</span>
                  </div>
                )}/>
            </div>

            <SectionHeader title="Best Win Rate" subtitle="Career win percentage — minimum 100 games" />
            <div style={{ maxWidth: 560 }}>
              <LeaderTable title="Best Career Win Rate" icon="🏆" accentColor={BALL_YELLOW} rows={top10WinRate} loading={tablesLoading}
                renderValue={(row) => (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1, flexShrink: 0 }}>
                    <span className="gmono" style={{ fontSize: 14, fontWeight: 700, color: BALL_YELLOW }}>{row.win_rate}%</span>
                    <span className="gmono" style={{ fontSize: 10, color: '#9ca3af' }}>{Number(row.win_count).toLocaleString()}/{Number(row.game_count).toLocaleString()}</span>
                  </div>
                )}/>
            </div>

            <SectionHeader title="Biggest Upsets" subtitle="The largest grade-gap victories ever recorded in imported data" />
            <UpsetTable rows={top10Upsets} loading={tablesLoading}/>
          </>
        )}

        {tab === 'countries' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <CountryTable title="🌍 Total Ranked Players by Country" data={totalByCountry} valueLabel="players"/>
            <CountryTable title="⚡ Active Players by Country (last 12 months)" data={activeByCountry} valueLabel="active"/>
          </div>
        )}

        {tab === 'new' && (
          <div style={{ maxWidth: 640 }}>
            <NewPlayersTable players={newPlayers}/>
          </div>
        )}
      </div>
    </div>
  )
}
