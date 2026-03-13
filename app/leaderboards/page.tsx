'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import GCLabNav from '@/components/GCLabNav'
import { getFlag, countryName } from '@/lib/countries'

// ── Design tokens (matches Rankings page) ──────────────────────────────────
const G    = '#0d2818'
const LIME = '#4ade80'
const AMBER = '#eab308'

// ── Ball accent colours ─────────────────────────────────────────────────────
const BALL_BLUE   = '#1d8cf8'
const BALL_YELLOW = '#d97706'
const BALL_GREEN  = '#16a34a'
const BALL_RED    = '#dc2626'
const BALL_BLACK  = '#374151'
const BALL_PINK   = '#db2777'

const ML = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
  .ghl   { font-family: 'DM Serif Display', serif; }
  .gsans { font-family: 'DM Sans', sans-serif; }
  .gmono { font-family: 'DM Mono', monospace; }
  .ldr-hero {
    background: white; border: 1px solid #e5e1d8; border-radius: 16px;
    overflow: hidden; transition: box-shadow 0.2s;
  }
  .ldr-hero:hover { box-shadow: 0 8px 28px rgba(13,40,24,0.1); }
  .ldr-card {
    background: #faf9f7; border: 1px solid #e5e1d8; border-radius: 16px; overflow: hidden;
  }
  .ldr-row:hover { background: rgba(13,40,24,0.025) !important; }
  .ldr-section { margin: 40px 0 0; }
  .ldr-divider {
    font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 700;
    letter-spacing: 0.09em; text-transform: uppercase; color: rgba(13,40,24,0.35);
    margin: 0 0 6px; padding-bottom: 8px;
    border-bottom: 1px solid #e5e1d8;
  }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
  @media (max-width: 768px) {
    .ldr-pad { padding: 20px !important; }
    .ldr-header { padding: 20px 20px 0 !important; }
  }
`

// ── Types ───────────────────────────────────────────────────────────────────
type HeroPlayer = {
  name: string; country: string; value: string
  detail?: string; detail2?: string
  opponentName?: string; opponentCountry?: string
  winnerDgrade?: string; oppDgrade?: string
  event?: string; score?: string; date?: string
  countriesPlayed?: string[]
  streakStart?: string; streakEnd?: string
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { year: 'numeric', month: 'short' })
}
function fmtFull(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })
}

// Sharing removed — text formatting wasn't suitable for sharing

// ── Hero Card ───────────────────────────────────────────────────────────────
function HeroCard({ label, sublabel, icon, accentColor, loading, player }: {
  label: string; sublabel: string; icon: string; accentColor: string
  loading: boolean; player?: HeroPlayer
}) {
  return (
    <div className="ldr-hero">
      <div style={{ height: 4, background: accentColor }}/>
      <div style={{ padding: '18px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <p className="gsans" style={{ color: 'rgba(13,40,24,0.45)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 3px' }}>{label}</p>
            <p className="gsans" style={{ color: 'rgba(13,40,24,0.35)', fontSize: 11, margin: 0 }}>{sublabel}</p>
          </div>
          <span style={{ fontSize: 22 }}>{icon}</span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[80, 120, 60].map((w, i) => (
              <div key={i} style={{ height: i === 1 ? 28 : 12, width: `${w}%`, background: '#ede9e2', borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }}/>
            ))}
          </div>
        ) : player ? (
          <div>
            <div className="gmono" style={{ fontSize: 32, fontWeight: 700, color: accentColor, lineHeight: 1, marginBottom: 10 }}>{player.value}</div>

            {player.opponentName ? (
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 15 }}>{getFlag(player.country)}</span>
                  <span className="gsans" style={{ fontSize: 14, fontWeight: 700, color: G }}>{player.name}</span>
                  {player.winnerDgrade && <span className="gmono" style={{ fontSize: 11, color: 'rgba(13,40,24,0.5)' }}>{player.winnerDgrade}</span>}
                </div>
                <div style={{ paddingLeft: 2, marginBottom: 4 }}>
                  <span className="gsans" style={{ fontSize: 11, color: 'rgba(13,40,24,0.35)', fontStyle: 'italic' }}>beat</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 15 }}>{getFlag(player.opponentCountry || '')}</span>
                  <span className="gsans" style={{ fontSize: 14, fontWeight: 500, color: 'rgba(13,40,24,0.65)' }}>{player.opponentName}</span>
                  {player.oppDgrade && <span className="gmono" style={{ fontSize: 11, color: 'rgba(13,40,24,0.4)' }}>{player.oppDgrade}</span>}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                <span style={{ fontSize: 17 }}>{getFlag(player.country)}</span>
                <span className="gsans" style={{ fontSize: 15, fontWeight: 700, color: G }}>{player.name}</span>
                <span className="gsans" style={{ fontSize: 11, color: 'rgba(13,40,24,0.4)' }}>{countryName(player.country)}</span>
              </div>
            )}

            {player.detail && <p className="gsans" style={{ fontSize: 12, color: 'rgba(13,40,24,0.5)', margin: '3px 0 0', lineHeight: 1.5 }}>{player.detail}</p>}
            {player.detail2 && <p className="gsans" style={{ fontSize: 12, color: 'rgba(13,40,24,0.35)', margin: '2px 0 0', lineHeight: 1.5 }}>{player.detail2}</p>}

            {player.countriesPlayed && player.countriesPlayed.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 8 }}>
                {player.countriesPlayed.map(c => <span key={c} title={countryName(c)} style={{ fontSize: 16, lineHeight: 1 }}>{getFlag(c)}</span>)}
              </div>
            )}
            {player.streakStart && player.streakEnd && (
              <div style={{ marginTop: 8, padding: '5px 9px', background: '#f5f2ec', borderRadius: 7, border: '1px solid #e5e1d8' }}>
                <p className="gsans" style={{ fontSize: 10, color: 'rgba(13,40,24,0.4)', margin: 0 }}>Event date range</p>
                <p className="gmono" style={{ fontSize: 11, fontWeight: 600, color: G, margin: '2px 0 0' }}>
                  {fmtDate(player.streakStart)} — {fmtDate(player.streakEnd)}
                </p>
              </div>
            )}
            {player.event && (
              <div style={{ marginTop: 8, padding: '5px 9px', background: '#f5f2ec', borderRadius: 7, border: '1px solid #e5e1d8' }}>
                <p className="gsans" style={{ fontSize: 10, color: 'rgba(13,40,24,0.4)', margin: 0 }}>{player.event}</p>
                {player.score && <p className="gmono" style={{ fontSize: 12, fontWeight: 600, color: G, margin: '2px 0 0' }}>{player.score}</p>}
                {player.date && <p className="gsans" style={{ fontSize: 11, color: 'rgba(13,40,24,0.4)', margin: '2px 0 0' }}>{player.date}</p>}
              </div>
            )}

          </div>
        ) : (
          <p className="gsans" style={{ color: 'rgba(13,40,24,0.35)', fontSize: 13 }}>No data available</p>
        )}
      </div>
    </div>
  )
}

// ── Top-10 Table ─────────────────────────────────────────────────────────────
function LeaderTable({ title, icon, accentColor, rows, loading, renderValue, subText, renderExtra }: {
  title: string; icon: string; accentColor: string; rows: any[]; loading: boolean
  renderValue: (row: any) => React.ReactNode
  subText?: (row: any) => string | null
  renderExtra?: (row: any) => React.ReactNode
}) {
  // Show top 10; mark tied entries at position 10
  const displayed = (() => {
    if (rows.length <= 10) return rows.map((r, i) => ({ ...r, _rank: i + 1 }))
    const ranked = rows.map((r, i) => ({ ...r, _rank: i + 1 }))
    // Find value at position 10 and include all ties
    const val10 = rows[9]
    const tie11 = rows[10]
    if (val10 && tie11) {
      // Can't compare without knowing the value key, so just show up to fetched length
    }
    return ranked
  })()

  return (
    <div className="ldr-card">
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e1d8', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <h3 className="gsans" style={{ margin: 0, fontSize: 14, fontWeight: 600, color: G }}>{title}</h3>
      </div>
      {loading ? (
        <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ height: 34, background: '#ede9e2', borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }}/>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="gsans" style={{ padding: '20px', color: 'rgba(13,40,24,0.35)', fontSize: 13, margin: 0 }}>No data yet — import more player histories to populate this table.</p>
      ) : (
        <div>
          {displayed.map((row, i) => (
            <div key={i} className="ldr-row" style={{
              padding: renderExtra ? '9px 18px 5px' : '9px 18px',
              borderBottom: i < displayed.length - 1 ? '1px solid #ede9e2' : 'none',
              background: 'white',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="gmono" style={{ color: 'rgba(13,40,24,0.3)', fontSize: 11, width: 18, textAlign: 'right', flexShrink: 0 }}>{row._rank}</span>
                <span style={{ fontSize: 15, flexShrink: 0 }}>{getFlag(row.country)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span className="gsans" style={{ fontSize: 13, fontWeight: 600, color: G, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.wcf_first_name} {row.wcf_last_name}
                  </span>
                  {subText && subText(row) && (
                    <span className="gsans" style={{ fontSize: 10, color: 'rgba(13,40,24,0.4)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {subText(row)}
                    </span>
                  )}
                </div>
                <span className="gsans" style={{ fontSize: 11, color: 'rgba(13,40,24,0.35)', flexShrink: 0 }}>{countryName(row.country)}</span>
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

// ── Upset Wins Table ─────────────────────────────────────────────────────────
function UpsetTable({ rows, loading }: { rows: any[]; loading: boolean }) {
  return (
    <div className="ldr-card">
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e1d8', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>⚡</span>
        <h3 className="gsans" style={{ margin: 0, fontSize: 14, fontWeight: 600, color: G }}>Biggest Upset Wins — All Time</h3>
      </div>
      {loading ? (
        <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ height: 50, background: '#ede9e2', borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }}/>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="gsans" style={{ padding: '20px', color: 'rgba(13,40,24,0.35)', fontSize: 13, margin: 0 }}>No data yet.</p>
      ) : (
        <div>
          {rows.map((row, i) => (
            <div key={i} className="ldr-row" style={{
              padding: '10px 18px', borderBottom: i < rows.length - 1 ? '1px solid #ede9e2' : 'none', background: 'white',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: row.event_name ? 4 : 0 }}>
                <span className="gmono" style={{ color: 'rgba(13,40,24,0.3)', fontSize: 11, width: 18, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                <span className="gmono" style={{ fontSize: 13, fontWeight: 700, color: BALL_PINK, flexShrink: 0, minWidth: 42 }}>+{row.gap}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 14 }}>{getFlag(row.country)}</span>
                  <span className="gsans" style={{ fontSize: 13, fontWeight: 700, color: G }}>{row.wcf_first_name} {row.wcf_last_name}</span>
                  <span className="gmono" style={{ fontSize: 11, color: 'rgba(13,40,24,0.45)' }}>{row.winner_dgrade}</span>
                </div>
                <span className="gsans" style={{ fontSize: 11, color: 'rgba(13,40,24,0.35)', fontStyle: 'italic', flexShrink: 0 }}>beat</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 14 }}>{getFlag(row.opponent_country || '')}</span>
                  <span className="gsans" style={{ fontSize: 13, color: 'rgba(13,40,24,0.65)' }}>{row.opponent_name}</span>
                  <span className="gmono" style={{ fontSize: 11, color: 'rgba(13,40,24,0.35)' }}>{row.opp_dgrade}</span>
                </div>
              </div>
              {row.event_name && (
                <div style={{ paddingLeft: 68, display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span className="gsans" style={{ fontSize: 11, color: 'rgba(13,40,24,0.45)' }}>{row.event_name}</span>
                  {row.score && <span className="gmono" style={{ fontSize: 11, fontWeight: 600, color: G }}>{row.score}</span>}
                  {row.event_date && <span className="gsans" style={{ fontSize: 11, color: 'rgba(13,40,24,0.35)' }}>{fmtDate(row.event_date)}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Section Label ────────────────────────────────────────────────────────────
function Section({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="ldr-section">
      <p className="ldr-divider">{title}</p>
      {sub && <p className="gsans" style={{ fontSize: 12, color: 'rgba(13,40,24,0.35)', margin: '0 0 16px' }}>{sub}</p>}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function LeaderboardsPage() {
  const [userProfile, setUserProfile] = useState<any>(null)
  const [signedIn, setSignedIn]       = useState<boolean | null>(null)

  type Hero = { label: string; sublabel: string; icon: string; accentColor: string; loading: boolean; player?: HeroPlayer }
  const [heroStats, setHeroStats] = useState<Hero[]>([
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
    loadHeroStats()
    loadTop10Tables()
  }, [])

  const updateHero = (i: number, player: HeroPlayer | undefined) => {
    setHeroStats(prev => prev.map((h, idx) => idx === i ? { ...h, loading: false, player } : h))
  }

  const loadHeroStats = async () => {
    { const { data } = await supabase.rpc('get_most_games_player'); const r = data?.[0]
      updateHero(0, r ? { name: `${r.wcf_first_name} ${r.wcf_last_name}`, country: r.country, value: Number(r.game_count).toLocaleString(), detail: 'career games played', detail2: `${Number(r.opponent_count).toLocaleString()} unique opponents` } : undefined) }
    { const { data } = await supabase.rpc('get_best_win_rate'); const r = data?.[0]
      updateHero(1, r ? { name: `${r.wcf_first_name} ${r.wcf_last_name}`, country: r.country, value: `${r.win_rate}%`, detail: `${Number(r.win_count).toLocaleString()} wins from ${Number(r.game_count).toLocaleString()} games` } : undefined) }
    { const { data } = await supabase.rpc('get_most_travelled'); const r = data?.[0]
      updateHero(2, r ? { name: `${r.wcf_first_name} ${r.wcf_last_name}`, country: r.country, value: `${r.country_count}`, detail: 'countries played in', countriesPlayed: r.countries_played || [] } : undefined) }
    { const { data } = await supabase.rpc('get_longest_win_streak'); const r = data?.[0]
      updateHero(3, r ? { name: `${r.wcf_first_name} ${r.wcf_last_name}`, country: r.country, value: `${r.streak}`, detail: 'consecutive wins', streakStart: r.streak_start, streakEnd: r.streak_end } : undefined) }
    { const { data } = await supabase.rpc('get_biggest_career_rise'); const r = data?.[0]
      updateHero(4, r ? { name: `${r.wcf_first_name} ${r.wcf_last_name}`, country: r.country, value: `+${r.gain}`, detail: `${r.min_dgrade} → ${r.max_dgrade} dGrade`, detail2: `${Number(r.game_count).toLocaleString()} games · ${r.win_rate}% win rate` } : undefined) }
    { const { data } = await supabase.rpc('get_biggest_upset_win'); const r = data?.[0]
      updateHero(5, r ? { name: `${r.wcf_first_name} ${r.wcf_last_name}`, country: r.country, value: `+${r.gap}`, winnerDgrade: `${r.winner_dgrade}`, oppDgrade: `${r.opp_dgrade}`, opponentName: r.opponent_name, opponentCountry: r.opponent_country || '', event: r.event_name, score: r.score, date: r.event_date ? fmtFull(r.event_date) : '' } : undefined) }
  }

  const loadTop10Tables = async () => {
    setTablesLoading(true)
    const [
      { data: games }, { data: winRate }, { data: travelled }, { data: opponents },
      { data: careerRise }, { data: streak }, { data: eventJump }, { data: upsets },
    ] = await Promise.all([
      supabase.rpc('get_top10_most_games'),        supabase.rpc('get_top10_win_rate'),
      supabase.rpc('get_top10_most_travelled'),    supabase.rpc('get_top10_most_opponents'),
      supabase.rpc('get_top10_career_rise'),       supabase.rpc('get_top10_longest_win_streak'),
      supabase.rpc('get_top10_single_event_jump'), supabase.rpc('get_top10_upset_wins'),
    ])
    setTop10Games(games || []);        setTop10WinRate(winRate || [])
    setTop10Travelled(travelled || []); setTop10Opponents(opponents || [])
    setTop10CareerRise(careerRise || []); setTop10Streak(streak || [])
    setTop10EventJump(eventJump || []); setTop10Upsets(upsets || [])
    setTablesLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f2ec' }}>
      <style dangerouslySetInnerHTML={{ __html: ML }}/>
      <GCLabNav role={userProfile?.role} isSignedIn={signedIn ?? undefined} currentPath="/leaderboards"/>

      {/* ── Cream + Lime header ── */}
      <div style={{ background: '#f5f2ec', borderBottom: '1px solid #ddd8ce' }}>
        <div className="ldr-header" style={{ padding: '28px 48px 28px', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
            <div style={{ width: 4, background: LIME, borderRadius: 2, marginRight: 16, flexShrink: 0 }}/>
            <div>
              <h1 className="ghl" style={{ fontSize: 'clamp(22px, 2.5vw, 34px)', color: G, fontWeight: 900, margin: '0 0 4px', lineHeight: 1.15 }}>
                Record Holders
              </h1>
              <p className="gsans" style={{ margin: 0, fontSize: 13, color: 'rgba(13,40,24,0.45)' }}>
                All-time leaders across every GC metric · based on imported player histories
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="ldr-pad" style={{ padding: '32px 48px 80px', maxWidth: 1100, margin: '0 auto' }}>

        {/* Hero cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
          {heroStats.map((s, i) => <HeroCard key={i} {...s}/>)}
        </div>

        {/* Volume & Games */}
        <Section title="Volume & Games" sub="Who has played the most — and who went on the longest winning tear"/>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))', gap: 18 }}>
          <LeaderTable title="Most Games Played" icon="🎮" accentColor={BALL_BLUE} rows={top10Games} loading={tablesLoading}
            renderValue={row => <span className="gmono" style={{ fontSize: 13, fontWeight: 700, color: BALL_BLUE, flexShrink: 0 }}>{Number(row.game_count).toLocaleString()}</span>}/>
          <LeaderTable title="Longest Win Streak" icon="🔥" accentColor={BALL_RED} rows={top10Streak} loading={tablesLoading}
            renderValue={row => <span className="gmono" style={{ fontSize: 13, fontWeight: 700, color: BALL_RED, flexShrink: 0 }}>{row.streak} wins</span>}/>
        </div>

        {/* Reach & Opponents */}
        <Section title="Reach & Opponents" sub="Who has travelled furthest and faced the widest field"/>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))', gap: 18 }}>
          <LeaderTable title="Most Travelled" icon="✈️" accentColor={BALL_GREEN} rows={top10Travelled} loading={tablesLoading}
            renderValue={row => <span className="gmono" style={{ fontSize: 13, fontWeight: 700, color: BALL_GREEN, flexShrink: 0 }}>{row.country_count} countries</span>}
            renderExtra={row => row.countries_played?.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, paddingLeft: 28, paddingBottom: 5, marginTop: 3 }}>
                {row.countries_played.map((c: string) => <span key={c} title={countryName(c)} style={{ fontSize: 13, lineHeight: 1 }}>{getFlag(c)}</span>)}
              </div>
            ) : null}/>
          <LeaderTable title="Most Unique Opponents" icon="🤝" accentColor={BALL_BLACK} rows={top10Opponents} loading={tablesLoading}
            renderValue={row => <span className="gmono" style={{ fontSize: 13, fontWeight: 700, color: BALL_BLACK, flexShrink: 0 }}>{Number(row.opponent_count).toLocaleString()}</span>}/>
        </div>

        {/* Grade Achievements */}
        <Section title="Grade Achievements" sub="The biggest dGrade rises over a career and within a single event"/>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))', gap: 18 }}>
          <LeaderTable title="Biggest Career Rise" icon="📈" accentColor={BALL_BLACK} rows={top10CareerRise} loading={tablesLoading}
            renderValue={row => (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1, flexShrink: 0 }}>
                <span className="gmono" style={{ fontSize: 13, fontWeight: 700, color: BALL_BLACK }}>+{row.gain}</span>
                <span className="gmono" style={{ fontSize: 10, color: 'rgba(13,40,24,0.35)' }}>{row.min_dgrade}→{row.max_dgrade}</span>
              </div>
            )}/>
          <LeaderTable title="Biggest Single-Event Jump" icon="🚀" accentColor={BALL_BLUE} rows={top10EventJump} loading={tablesLoading}
            subText={row => row.event_name && row.event_date ? `${row.event_name} · ${fmtFull(row.event_date)}` : row.event_name || null}
            renderValue={row => (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1, flexShrink: 0 }}>
                <span className="gmono" style={{ fontSize: 13, fontWeight: 700, color: BALL_BLUE }}>+{row.jump}</span>
                <span className="gmono" style={{ fontSize: 10, color: 'rgba(13,40,24,0.35)' }}>{row.grade_before}→{row.grade_after}</span>
              </div>
            )}/>
        </div>

        {/* Win Rate */}
        <Section title="Best Win Rate" sub="Career win percentage — minimum 100 games"/>
        <div style={{ maxWidth: 540 }}>
          <LeaderTable title="Best Career Win Rate" icon="🏆" accentColor={BALL_YELLOW} rows={top10WinRate} loading={tablesLoading}
            renderValue={row => (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1, flexShrink: 0 }}>
                <span className="gmono" style={{ fontSize: 13, fontWeight: 700, color: BALL_YELLOW }}>{row.win_rate}%</span>
                <span className="gmono" style={{ fontSize: 10, color: 'rgba(13,40,24,0.35)' }}>{Number(row.win_count).toLocaleString()}/{Number(row.game_count).toLocaleString()}</span>
              </div>
            )}/>
        </div>

        {/* Upsets */}
        <Section title="Biggest Upsets" sub="The largest grade-gap victories ever recorded in imported data"/>
        <UpsetTable rows={top10Upsets} loading={tablesLoading}/>

      </div>
    </div>
  )
}
