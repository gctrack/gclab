'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import GCLabNav from '@/components/GCLabNav'

// ── Types ──────────────────────────────────────────────────────────────────
type HeroStat = {
  label: string
  sublabel: string
  icon: string
  accentColor: string
  loading: boolean
  player?: { name: string; country: string; value: string; detail?: string; event?: string; date?: string; score?: string }
}

// ── Helpers ────────────────────────────────────────────────────────────────
const COUNTRY_NAMES: Record<string, string> = {
  'AU':'Australia','BE':'Belgium','CA':'Canada','CZ':'Czech Republic','EG':'Egypt',
  'GB-ENG':'England','DE':'Germany','HK':'Hong Kong','IE':'Ireland','LV':'Latvia',
  'MX':'Mexico','NZ':'New Zealand','NO':'Norway','PT':'Portugal','GB-SCT':'Scotland',
  'ZA':'South Africa','ES':'Spain','SE':'Sweden','CH':'Switzerland','US':'USA',
  'GB-WLS':'Wales','FR':'France','IT':'Italy','NL':'Netherlands','PL':'Poland',
  'AR':'Argentina','BR':'Brazil','CN':'China','JP':'Japan','IN':'India',
}
const countryName = (c: string) => COUNTRY_NAMES[c] || c

function getFlag(code: string): string {
  if (!code) return ''
  if (code === 'GB-ENG') return '🏴󠁧󠁢󠁥󠁮󠁧󠁿'
  if (code === 'GB-SCT') return '🏴󠁧󠁢󠁳󠁣󠁴󠁿'
  if (code === 'GB-WLS') return '🏴󠁧󠁢󠁷󠁬󠁳󠁿'
  if (code.length !== 2) return ''
  return code.toUpperCase().split('').map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('')
}

const ML = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
  .ghl  { font-family: 'Playfair Display', serif; }
  .gsans{ font-family: 'DM Sans', sans-serif; }
  .gmono{ font-family: 'DM Mono', monospace; }
  .hero-card { transition: transform 0.2s, box-shadow 0.2s; }
  .hero-card:hover { transform: translateY(-3px); box-shadow: 0 12px 36px rgba(0,0,0,0.12) !important; }
  .tab-btn { transition: all 0.15s; cursor: pointer; border: none; }
  .tab-btn:hover { opacity: 0.85; }
  .country-row:hover { background: rgba(0,0,0,0.025) !important; }
`

const DARK_GREEN = '#0d2818'
const CREAM = '#f5f0e8'

// ── Hero Card ──────────────────────────────────────────────────────────────
function HeroCard({ stat }: { stat: HeroStat }) {
  const { label, sublabel, icon, accentColor, loading, player } = stat

  return (
    <div className="hero-card" style={{
      background: 'white', borderRadius: 20,
      border: '1px solid #e5e1d8',
      boxShadow: '0 4px 16px rgba(0,0,0,0.07)',
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      {/* Accent top strip */}
      <div style={{ height: 4, background: accentColor }}/>

      <div style={{ padding: '20px 22px 22px' }}>
        {/* Header */}
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
            {/* Big value */}
            <div className="gmono" style={{ fontSize: 34, fontWeight: 700, color: accentColor, lineHeight: 1, marginBottom: 8 }}>
              {player.value}
            </div>
            {/* Player name + flag */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: player.detail ? 10 : 0 }}>
              <span style={{ fontSize: 18 }}>{getFlag(player.country)}</span>
              <span className="gsans" style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{player.name}</span>
              <span className="gsans" style={{ fontSize: 12, color: '#9ca3af' }}>{countryName(player.country)}</span>
            </div>
            {/* Detail line */}
            {player.detail && (
              <p className="gsans" style={{ fontSize: 12, color: '#6b7280', margin: '6px 0 0', lineHeight: 1.5 }}>{player.detail}</p>
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

// ── Country Stat Tables ────────────────────────────────────────────────────
function CountryTable({ title, data, valueLabel }: { title: string; data: {country:string; value:number}[]; valueLabel: string }) {
  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e5e1d8', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e1d8' }}>
        <h3 className="gsans" style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827' }}>{title}</h3>
      </div>
      <div>
        {data.slice(0, 15).map((row, i) => (
          <div key={row.country} className="country-row" style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 20px',
            borderBottom: i < data.length - 1 ? '1px solid #f3f4f6' : 'none',
          }}>
            <span className="gmono" style={{ color: '#9ca3af', fontSize: 12, width: 22, textAlign: 'right' }}>{i+1}</span>
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
            <div key={p.id} className="country-row" style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 20px',
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
    { label: 'Most Games Played',    sublabel: 'All WCF imported records', icon: '🎮', accentColor: '#2563eb', loading: true },
    { label: 'Best Win Rate',        sublabel: 'Minimum 100 games played', icon: '🏆', accentColor: '#16a34a', loading: true },
    { label: 'Most Travelled',       sublabel: 'Countries played in',      icon: '✈️', accentColor: '#ea580c', loading: true },
    { label: 'Most Opponents',       sublabel: 'Unique opponents faced',   icon: '🤝', accentColor: '#7c3aed', loading: true },
    { label: 'Biggest Career Rise',  sublabel: 'Largest all-time dGrade gain', icon: '📈', accentColor: '#0891b2', loading: true },
    { label: 'Biggest Upset Win',    sublabel: 'Largest grade gap victory', icon: '⚡', accentColor: '#dc2626', loading: true },
  ])

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
    loadCountryStats()
    loadNewPlayers()
  }, [])

  const updateHero = (i: number, player: HeroStat['player']) => {
    setHeroStats(prev => prev.map((h, idx) => idx === i ? { ...h, loading: false, player } : h))
  }

  const loadHeroStats = async () => {
    // 0 — Most Games (from actual wcf_player_games count via RPC)
    {
      const { data } = await supabase.rpc('get_most_games_player')
      const r = data?.[0]
      if (r) updateHero(0, { name: `${r.wcf_first_name} ${r.wcf_last_name}`, country: r.country, value: Number(r.game_count).toLocaleString(), detail: 'imported games' })
      else updateHero(0, undefined)
    }

    // 1 — Best Win Rate (min 100 games, using wcf_players fields)
    {
      const { data } = await supabase.from('wcf_players').select('wcf_first_name, wcf_last_name, country, win_percentage, games').gte('games', 100).order('win_percentage', { ascending: false }).limit(1)
      if (data?.[0]) updateHero(1, { name: `${data[0].wcf_first_name} ${data[0].wcf_last_name}`, country: data[0].country, value: `${data[0].win_percentage}%`, detail: `${data[0].games} career games` })
      else updateHero(1, undefined)
    }

    // 2 — Most Travelled (via RPC)
    {
      const { data } = await supabase.rpc('get_most_travelled')
      const r = data?.[0]
      if (r) updateHero(2, { name: `${r.wcf_first_name} ${r.wcf_last_name}`, country: r.country, value: `${r.country_count}`, detail: 'countries played in' })
      else updateHero(2, undefined)
    }

    // 3 — Most Unique Opponents (via RPC)
    {
      const { data } = await supabase.rpc('get_most_unique_opponents')
      const r = data?.[0]
      if (r) updateHero(3, { name: `${r.wcf_first_name} ${r.wcf_last_name}`, country: r.country, value: `${r.opponent_count}`, detail: 'unique opponents' })
      else updateHero(3, undefined)
    }

    // 4 — Biggest Career Rise (via RPC)
    {
      const { data } = await supabase.rpc('get_biggest_career_rise')
      const r = data?.[0]
      if (r) updateHero(4, { name: `${r.wcf_first_name} ${r.wcf_last_name}`, country: r.country, value: `+${r.gain}`, detail: `${r.min_dgrade} → ${r.max_dgrade} dGrade` })
      else updateHero(4, undefined)
    }

    // 5 — Biggest Upset Win (via RPC)
    {
      const { data } = await supabase.rpc('get_biggest_upset_win')
      const r = data?.[0]
      if (r) updateHero(5, {
        name: `${r.wcf_first_name} ${r.wcf_last_name}`,
        country: r.country,
        value: `+${r.gap}`,
        detail: `Beat ${r.opponent_name} (${r.opp_dgrade} dGrade) · Winner was ${r.winner_dgrade}`,
        event: r.event_name,
        score: r.score,
        date: r.event_date ? new Date(r.event_date).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' }) : '',
      })
      else updateHero(5, undefined)
    }
  }

    const loadCountryStats = async () => {
    // Use RPCs to get accurate counts across all 11k+ players
    const { data: total } = await supabase.rpc('get_players_by_country')
    if (total) setTotalByCountry(total.map((r: any) => ({ country: r.country, value: Number(r.total) })))

    const { data: active } = await supabase.rpc('get_active_players_by_country')
    if (active) setActiveByCountry(active.map((r: any) => ({ country: r.country, value: Number(r.total) })))
  }

    const loadNewPlayers = async () => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 60)
    const { data } = await supabase
      .from('wcf_players')
      .select('id, wcf_first_name, wcf_last_name, country, dgrade, created_at')
      .gte('created_at', cutoff.toISOString())
      .order('created_at', { ascending: false })
      .limit(30)
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
      <GCLabNav role={userProfile?.role} isSignedIn={!!signedIn} currentPath="/leaderboards"/>

      {/* Header */}
      <div style={{ background: DARK_GREEN, padding: '48px 24px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 20, padding: '4px 14px', marginBottom: 16 }}>
            <span className="gsans" style={{ color: '#4ade80', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Stats & Leaderboards</span>
          </div>
          <h1 className="ghl" style={{ color: '#f5f0e8', fontSize: 40, margin: '0 0 10px', lineHeight: 1.1 }}>Record Holders</h1>
          <p className="gsans" style={{ color: 'rgba(245,240,232,0.55)', margin: 0, fontSize: 15 }}>The all-time leaders across every metric in Golf Croquet.</p>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ background: 'white', borderBottom: '1px solid #e5e1d8', position: 'sticky', top: 52, zIndex: 10 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', gap: 0, padding: '0 24px' }}>
          {TABS.map(t => (
            <button key={t.id} className="tab-btn gsans" onClick={() => setTab(t.id)}
              style={{
                padding: '14px 20px', fontSize: 13, fontWeight: 600,
                background: 'none', color: tab === t.id ? DARK_GREEN : '#9ca3af',
                borderBottom: tab === t.id ? `2px solid ${DARK_GREEN}` : '2px solid transparent',
                marginBottom: -1,
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 60px' }}>

        {/* ── Record Holders ── */}
        {tab === 'records' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {heroStats.map((stat, i) => <HeroCard key={i} stat={stat}/>)}
          </div>
        )}

        {/* ── Players by Country ── */}
        {tab === 'countries' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <CountryTable
              title="🌍 Total Ranked Players by Country"
              data={totalByCountry}
              valueLabel="players"
            />
            <CountryTable
              title="⚡ Active Players by Country (last 12 months)"
              data={activeByCountry}
              valueLabel="active"
            />
          </div>
        )}

        {/* ── New Players ── */}
        {tab === 'new' && (
          <div style={{ maxWidth: 640 }}>
            <NewPlayersTable players={newPlayers}/>
          </div>
        )}
      </div>
    </div>
  )
}
