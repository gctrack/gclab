'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import GCLabNav from '@/components/GCLabNav'
import WcfMatchBanner from '@/components/WcfMatchBanner'

const G    = '#0d2818'
const LIME = '#4ade80'
const CREAM = '#e8e0d0'
const CREAM60 = 'rgba(232,224,208,0.6)'
const CREAM25 = 'rgba(232,224,208,0.25)'
const CREAM10 = 'rgba(232,224,208,0.1)'
const AMBER = '#eab308'
const RED   = '#ef4444'
const CARD_BG = 'rgba(255,255,255,0.055)'
const CARD_BORDER = 'rgba(255,255,255,0.09)'

const ML = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
  .ghl  { font-family: 'Playfair Display', serif; }
  .gmono{ font-family: 'DM Mono', monospace; }
  .gsans{ font-family: 'DM Sans', sans-serif; }
  .dash-stat-card { transition: border-color 0.2s; }
  .dash-stat-card:hover { border-color: rgba(74,222,128,0.25) !important; }
  .dash-light-card { background: white; border: 1px solid #e5e1d8; border-radius: 16px; overflow: hidden; }
  .dash-row:hover { background: rgba(13,40,24,0.03) !important; }
  @media (max-width: 900px) {
    .dash-hero-grid { grid-template-columns: repeat(3,1fr) !important; }
    .dash-cols { grid-template-columns: 1fr !important; }
    .dash-section { padding: 24px !important; }
    .dash-pad { padding: 24px !important; }
  }
  @media (max-width: 600px) {
    .dash-hero-grid { grid-template-columns: repeat(2,1fr) !important; }
  }
`

const GRADE_BANDS = [
  { label: 'Under 1500', min: 0,    max: 1499, color: '#94a3b8' },
  { label: '1500–1700',  min: 1500, max: 1699, color: '#60a5fa' },
  { label: '1700–1900',  min: 1700, max: 1899, color: LIME },
  { label: '1900–2100',  min: 1900, max: 2099, color: AMBER },
  { label: '2100+',      min: 2100, max: 9999, color: RED },
]

function pct(w: number, t: number): number | null {
  return t === 0 ? null : Math.round(w / t * 100)
}

function pctColor(p: number) {
  return p >= 60 ? LIME : p >= 40 ? AMBER : RED
}

function getFlag(code: string): string {
  if (!code) return ''
  if (code === 'GB-ENG') return '🏴󠁧󠁢󠁥󠁮󠁧󠁿'
  if (code === 'GB-SCT') return '🏴󠁧󠁢󠁳󠁣󠁴󠁿'
  if (code === 'GB-WLS') return '🏴󠁧󠁢󠁷󠁬󠁳󠁿'
  if (code.length !== 2) return ''
  return code.toUpperCase().split('').map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('')
}

// ─── Career SVG Chart ────────────────────────────────────────────────────────

function CareerChart({ history }: { history: any[] }) {
  const valid = history.filter((h: any) => h.dgrade_value > 0)
  if (!valid.length) return (
    <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: CREAM25, fontSize: 13 }} className="gsans">
      No grade history yet
    </div>
  )

  const W = 880, H = 210
  const PL = 50, PR = 20, PT = 16, PB = 28
  const CW = W - PL - PR, CH = H - PT - PB

  const times  = valid.map((h: any) => new Date(h.recorded_at).getTime())
  const grades = valid.map((h: any) => h.dgrade_value as number)
  const minT = Math.min(...times), maxT = Math.max(...times)
  const rawMin = Math.min(...grades), rawMax = Math.max(...grades)
  const span = rawMax - rawMin
  const padG = Math.max(60, span * 0.18)
  const minG = rawMin - padG, maxG = rawMax + padG

  const xf = (t: number) => PL + (maxT === minT ? CW / 2 : (t - minT) / (maxT - minT) * CW)
  const yf = (g: number) => PT + (1 - (g - minG) / (maxG - minG)) * CH

  const pts = valid.map((h: any) =>
    `${xf(new Date(h.recorded_at).getTime()).toFixed(1)},${yf(h.dgrade_value).toFixed(1)}`
  )
  const lineD = `M${pts.join(' L')}`
  const lastX = xf(times[times.length - 1])
  const firstX = xf(times[0])
  const botY = PT + CH
  const areaD = `${lineD} L${lastX.toFixed(1)},${botY} L${firstX.toFixed(1)},${botY} Z`

  const peakG = Math.max(...grades)
  const peakIdx = grades.indexOf(peakG)
  const peakX = xf(times[peakIdx])
  const peakY = yf(peakG)
  const labelX = Math.min(peakX + 12, W - 82)

  // Y ticks
  const step = span > 600 ? 200 : span > 300 ? 100 : span > 100 ? 50 : 25
  const yTicks: number[] = []
  for (let g = Math.ceil(rawMin / step) * step; g <= rawMax + padG; g += step) {
    if (g > minG && g < maxG) yTicks.push(g)
  }

  // Year ticks
  const minY = new Date(minT).getFullYear()
  const maxY = new Date(maxT).getFullYear()
  const allYears: number[] = []
  for (let y = minY; y <= maxY; y++) allYears.push(y)
  const skip = Math.ceil(allYears.length / 10)

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="cgrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={LIME} stopOpacity="0.2"/>
          <stop offset="100%" stopColor={LIME} stopOpacity="0.01"/>
        </linearGradient>
      </defs>
      {/* Grid */}
      {yTicks.map(g => (
        <g key={g}>
          <line x1={PL} y1={yf(g)} x2={W - PR} y2={yf(g)} stroke="rgba(255,255,255,0.048)" strokeWidth="1"/>
          <text x={PL - 6} y={yf(g) + 4} fill="rgba(255,255,255,0.22)" fontSize="9" fontFamily="DM Mono,monospace" textAnchor="end">{g}</text>
        </g>
      ))}
      {/* Area + line */}
      <path d={areaD} fill="url(#cgrad)"/>
      <path d={lineD} fill="none" stroke={LIME} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round"/>
      {/* Peak */}
      <line x1={peakX} y1={peakY} x2={peakX} y2={botY} stroke="rgba(74,222,128,0.14)" strokeWidth="1" strokeDasharray="3 3"/>
      <circle cx={peakX} cy={peakY} r="5" fill={LIME}/>
      <circle cx={peakX} cy={peakY} r="9" fill="none" stroke={LIME} strokeWidth="1.5" strokeOpacity="0.4"/>
      <rect x={labelX} y={peakY - 14} width={70} height={20} rx={4} fill="rgba(13,40,24,0.92)" stroke="rgba(74,222,128,0.3)" strokeWidth="1"/>
      <text x={labelX + 35} y={peakY + 1} fill={LIME} fontSize="10" fontFamily="DM Mono,monospace" textAnchor="middle" fontWeight="500">Peak {peakG}</text>
      {/* Current dot */}
      <circle cx={lastX} cy={yf(grades[grades.length - 1])} r="4.5" fill={LIME}/>
      <circle cx={lastX} cy={yf(grades[grades.length - 1])} r="8" fill="none" stroke={LIME} strokeWidth="1.5" strokeOpacity="0.35"/>
      {/* Year labels */}
      {allYears.filter((_, i) => i % skip === 0).map(y => {
        const x = xf(new Date(y, 6, 1).getTime())
        if (x < PL || x > W - PR + 10) return null
        return <text key={y} x={x} y={H - 4} fill="rgba(255,255,255,0.22)" fontSize="10" fontFamily="DM Sans,sans-serif" textAnchor="middle">{y}</text>
      })}
    </svg>
  )
}

// ─── Win by Year SVG bars ────────────────────────────────────────────────────

function YearBars({ data }: { data: { year: number; w: number; t: number }[] }) {
  if (!data.length) return null
  const W = 760, H = 140
  const PL = 8, PR = 8, PT = 22, PB = 22
  const CW = W - PL - PR, CH = H - PT - PB
  const n = data.length
  const barW = Math.max(8, Math.min(44, CW / n - 6))
  const gapW = (CW - barW * n) / (n + 1)
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {/* 50% reference */}
      <line x1={PL} y1={PT + CH / 2} x2={W - PR} y2={PT + CH / 2} stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="4 3"/>
      <text x={PL + 2} y={PT + CH / 2 - 4} fill="rgba(255,255,255,0.22)" fontSize="9" fontFamily="DM Mono,monospace">50%</text>
      {data.map(({ year, w, t }, i) => {
        const p = pct(w, t)
        if (p === null) return null
        const c = pctColor(p)
        const bH = (p / 100) * CH
        const x = PL + gapW + i * (barW + gapW)
        const y = PT + CH - bH
        return (
          <g key={year}>
            <rect x={x} y={y} width={barW} height={bH} rx={3} fill={c} fillOpacity="0.7"/>
            <text x={x + barW / 2} y={y - 4} fill={c} fontSize="9" fontFamily="DM Mono,monospace" textAnchor="middle" fontWeight="500">{p}%</text>
            <text x={x + barW / 2} y={H - 10} fill="rgba(255,255,255,0.35)" fontSize="9" fontFamily="DM Sans,sans-serif" textAnchor="middle">{year}</text>
            <text x={x + barW / 2} y={H - 1} fill="rgba(255,255,255,0.18)" fontSize="8" fontFamily="DM Mono,monospace" textAnchor="middle">{t}g</text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Dark stat card ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent = false }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className="dash-stat-card" style={{
      background: CARD_BG,
      border: `1px solid ${CARD_BORDER}`,
      borderRadius: 14, padding: '18px 20px',
    }}>
      <div className="gmono" style={{ fontSize: 26, fontWeight: 500, color: accent ? LIME : CREAM, lineHeight: 1 }}>{value}</div>
      <div className="gsans" style={{ fontSize: 10, color: CREAM25, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
      {sub && <div className="gsans" style={{ fontSize: 11, color: 'rgba(74,222,128,0.6)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

// ─── WCF link prompt ────────────────────────────────────────────────────────

function WcfLinkPrompt() {
  return (
    <div style={{
      background: 'rgba(74,222,128,0.08)',
      border: '1px solid rgba(74,222,128,0.2)',
      borderRadius: 16, padding: '28px 32px',
      display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
    }}>
      <div style={{ fontSize: 36 }}>🔗</div>
      <div style={{ flex: 1, minWidth: 220 }}>
        <div className="ghl" style={{ fontSize: 20, color: CREAM, fontWeight: 700, marginBottom: 6 }}>Link your WCF profile</div>
        <div className="gsans" style={{ fontSize: 14, color: CREAM60, lineHeight: 1.6 }}>
          Connect your World Croquet Federation record to unlock your full career stats — grade history, win rates, best wins and more.
        </div>
      </div>
      <a href="/profile" style={{
        background: LIME, color: G, padding: '10px 22px', borderRadius: 8,
        fontSize: 14, fontWeight: 700, textDecoration: 'none',
        fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap',
      }}>
        Go to My Profile →
      </a>
    </div>
  )
}

function WcfImportPrompt({ wcfPlayerId }: { wcfPlayerId: string }) {
  return (
    <div style={{
      background: 'rgba(234,179,8,0.08)',
      border: '1px solid rgba(234,179,8,0.2)',
      borderRadius: 16, padding: '24px 28px',
      display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
    }}>
      <div style={{ fontSize: 30 }}>📥</div>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div className="ghl" style={{ fontSize: 17, color: CREAM, fontWeight: 700, marginBottom: 4 }}>Import your full career history</div>
        <div className="gsans" style={{ fontSize: 13, color: CREAM60, lineHeight: 1.55 }}>
          Your profile is linked. Import your WCF history to unlock deep stats — win rates by year, grade band performance, your biggest upsets and more.
        </div>
      </div>
      <a href="/profile" style={{
        background: AMBER, color: '#1a1a00', padding: '9px 20px', borderRadius: 8,
        fontSize: 13, fontWeight: 700, textDecoration: 'none',
        fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap',
      }}>
        Import History →
      </a>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [user,         setUser]         = useState<any>(null)
  const [profile,      setProfile]      = useState<any>(null)
  const [wcfPlayer,    setWcfPlayer]    = useState<any>(null)
  const [games,        setGames]        = useState<any[]>([])
  const [history,      setHistory]      = useState<any[]>([])
  const [countryStats, setCountryStats] = useState<any[]>([])
  const [loading,      setLoading]      = useState(true)
  const [signedIn,     setSignedIn]     = useState<boolean | null>(null)

  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) { setSignedIn(false); setLoading(false); return }
      setSignedIn(true)
      setUser(u)

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', u.id).single()
      setProfile(prof)

      if (prof?.wcf_player_id) {
        const { data: wcf } = await supabase
          .from('wcf_players')
          .select('dgrade, egrade, world_ranking, games, win_percentage, history_imported, country, wcf_first_name, wcf_last_name')
          .eq('id', prof.wcf_player_id)
          .single()
        setWcfPlayer(wcf)

        if (wcf?.history_imported) {
          const [{ data: gms }, { data: hist }, { data: cs }] = await Promise.all([
            supabase
              .from('wcf_player_games')
              .select('year, result, player_score, opponent_score, opponent_first_name, opponent_last_name, dgrade_after, opp_dgrade_after, event_name, event_date, round_detail')
              .eq('wcf_player_id', prof.wcf_player_id)
              .eq('is_imported', true)
              .order('event_date', { ascending: true }),
            supabase
              .from('wcf_dgrade_history')
              .select('recorded_at, dgrade_value, is_imported')
              .eq('wcf_player_id', prof.wcf_player_id)
              .order('recorded_at', { ascending: true }),
            supabase
              .from('wcf_player_country_stats')
              .select('country, games, wins, losses, win_percentage')
              .eq('wcf_player_id', prof.wcf_player_id)
              .order('games', { ascending: false }),
          ])
          setGames(gms || [])
          setHistory(hist || [])
          setCountryStats(cs || [])
        }
      }
      setLoading(false)
    }
    init()
  }, [])

  const handleWcfLinked = async () => {
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(data)
  }

  // ── Auth gate ──────────────────────────────────────────────────────────────

  if (loading || signedIn === null) return (
    <div style={{ minHeight: '100vh', background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', color: CREAM25 }} className="gsans">
      Loading…
    </div>
  )

  if (!signedIn) return (
    <div style={{ minHeight: '100vh', background: '#f5f2ec', display: 'flex', flexDirection: 'column' }}>
      <style dangerouslySetInnerHTML={{ __html: ML }}/>
      <GCLabNav role="" isSignedIn={false} currentPath="/dashboard"/>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 520 }}>
          {/* Blurred background */}
          <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid #e5e1d8', background: 'white', filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0ede8', background: '#faf9f7' }}>
              <div style={{ height: 22, width: 160, background: '#e5e1d8', borderRadius: 4, marginBottom: 8 }}/>
              <div style={{ height: 14, width: 100, background: '#ede9e2', borderRadius: 4 }}/>
            </div>
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
              {[{ c: '#dcfce7' }, { c: '#dbeafe' }, { c: '#fef3c7' }, { c: '#f3e8ff' }].map(({ c }, i) => (
                <div key={i} style={{ background: c, borderRadius: 12, padding: 16 }}>
                  <div style={{ height: 22, width: 64, background: 'rgba(255,255,255,0.7)', borderRadius: 4, marginBottom: 6 }}/>
                  <div style={{ height: 11, width: 88, background: 'rgba(255,255,255,0.5)', borderRadius: 4 }}/>
                </div>
              ))}
            </div>
          </div>
          {/* Overlay */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(6px)', borderRadius: 20 }}>
            <div style={{ textAlign: 'center', padding: '32px 40px', maxWidth: 360 }}>
              <div style={{ width: 56, height: 56, background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: 24 }}>🎯</div>
              <h2 className="ghl" style={{ fontSize: 22, color: G, marginBottom: 8, fontWeight: 900 }}>Your personal dashboard</h2>
              <p className="gsans" style={{ fontSize: 14, color: '#6b7280', marginBottom: 22, lineHeight: 1.6 }}>Track your grade, career stats, win rates and more. Free to set up in 30 seconds.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <a href="/login?mode=signup" style={{ background: G, color: LIME, padding: '11px 20px', borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: 'none', textAlign: 'center', fontFamily: 'DM Sans, sans-serif' }}>Create free account</a>
                <a href="/login" style={{ border: '1px solid #d1d5db', color: '#374151', padding: '11px 20px', borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: 'none', textAlign: 'center', fontFamily: 'DM Sans, sans-serif' }}>Sign in</a>
              </div>
              <p className="gsans" style={{ fontSize: 11, color: '#9ca3af', marginTop: 14 }}>Free · No credit card · 30 seconds</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // ── Computed stats ─────────────────────────────────────────────────────────

  const hasWcf     = !!profile?.wcf_player_id
  const hasHistory = hasWcf && wcfPlayer?.history_imported && games.length > 0

  const totalGames      = games.length
  const totalWins       = games.filter((g: any) => g.result === 'win').length
  const overallPct      = pct(totalWins, totalGames)
  const peakDgrade      = games.length ? Math.max(...games.map((g: any) => g.dgrade_after || 0)) : 0
  const yearsSet        = new Set(games.map((g: any) => g.year))
  const yearsActive     = yearsSet.size
  const countriesPlayed = countryStats.length

  // Win by year
  const yearMap: Record<number, { w: number; t: number }> = {}
  for (const g of games) {
    if (!yearMap[g.year]) yearMap[g.year] = { w: 0, t: 0 }
    yearMap[g.year].t++
    if (g.result === 'win') yearMap[g.year].w++
  }
  const yearData = Object.entries(yearMap)
    .map(([y, v]) => ({ year: Number(y), w: v.w, t: v.t }))
    .sort((a, b) => a.year - b.year)

  // Win by grade band
  const bandData = GRADE_BANDS.map(band => {
    const rel  = games.filter((g: any) => g.opp_dgrade_after >= band.min && g.opp_dgrade_after <= band.max)
    const wins = rel.filter((g: any) => g.result === 'win').length
    return { ...band, w: wins, t: rel.length }
  }).filter(b => b.t > 0)

  // Biggest upset (win with largest grade gap in favour of opponent)
  const biggestUpset = games
    .filter((g: any) => g.result === 'win' && g.opp_dgrade_after && g.dgrade_after)
    .map((g: any) => ({ ...g, diff: g.opp_dgrade_after - g.dgrade_after }))
    .filter((g: any) => g.diff > 0)
    .sort((a: any, b: any) => b.diff - a.diff)[0] || null

  // Streaks
  let maxWin = 0, maxLoss = 0, curW = 0, curL = 0, curStreak = 0, curStreakType = ''
  for (const g of games) {
    if (g.result === 'win') { curW++; curL = 0; maxWin = Math.max(maxWin, curW) }
    else                    { curL++; curW = 0; maxLoss = Math.max(maxLoss, curL) }
  }
  if (games.length) {
    const last = games[games.length - 1]
    curStreakType = last.result === 'win' ? 'W' : 'L'
    curStreak = last.result === 'win' ? curW : curL
  }

  // Recent form (last 10 games)
  const recentForm = [...games].slice(-10)

  // Best wins by opponent grade
  const bestWins = games
    .filter((g: any) => g.result === 'win' && g.opp_dgrade_after)
    .sort((a: any, b: any) => b.opp_dgrade_after - a.opp_dgrade_after)
    .slice(0, 5)

  // Hero stat values
  const heroStats = [
    { label: 'Total Games',      value: hasHistory ? totalGames.toLocaleString() : (wcfPlayer?.games ?? '—'),      accent: false },
    { label: 'Career Win %',     value: hasHistory ? (overallPct !== null ? `${overallPct}%` : '—') : (wcfPlayer?.win_percentage ? `${Math.round(wcfPlayer.win_percentage * 100) / 100}%` : '—'), accent: overallPct !== null && overallPct >= 50 },
    { label: 'Current dGrade',   value: wcfPlayer?.dgrade ?? profile?.dgrade ?? '—',    accent: false },
    { label: 'Peak dGrade',      value: hasHistory && peakDgrade ? peakDgrade.toLocaleString() : '—', accent: hasHistory && peakDgrade > 0 },
    { label: 'World Rank',       value: wcfPlayer?.world_ranking ? `#${wcfPlayer.world_ranking}` : '—', accent: false },
    { label: 'Countries Faced',  value: hasHistory && countriesPlayed ? countriesPlayed : yearsActive ? `${yearsActive}yr` : '—', accent: false },
  ]

  const displayName = profile?.first_name
    ? `${profile.first_name}${profile.last_name ? ' ' + profile.last_name : ''}`
    : user?.email?.split('@')[0] || 'Player'

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#f5f2ec' }}>
      <style dangerouslySetInnerHTML={{ __html: ML }}/>
      <GCLabNav role={profile?.role} isSignedIn={true} currentPath="/dashboard"/>

      {/* ── DARK HERO ZONE ─────────────────────────────────────────────────── */}
      <div style={{ background: G, position: 'relative', overflow: 'hidden' }}>
        {/* Background glow */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 80% 0%, rgba(74,222,128,0.07) 0%, transparent 55%)' }}/>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(255,255,255,0.014) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.014) 1px,transparent 1px)', backgroundSize: '44px 44px' }}/>

        {/* Header */}
        <div className="dash-pad" style={{ padding: '40px 48px 20px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(74,222,128,0.09)', border: '1px solid rgba(74,222,128,0.18)', color: LIME, padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }} className="gsans">
            My Dashboard
          </div>
          <h1 className="ghl" style={{ fontSize: 'clamp(28px, 3.5vw, 48px)', color: CREAM, fontWeight: 900, lineHeight: 1.08, marginBottom: 6 }}>
            Welcome back, {displayName}
          </h1>
          {wcfPlayer && (
            <div className="gsans" style={{ fontSize: 13, color: CREAM60, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span>{getFlag(wcfPlayer.country)} {wcfPlayer.wcf_first_name} {wcfPlayer.wcf_last_name}</span>
              {wcfPlayer.dgrade && <span>· dGrade <strong style={{ color: LIME }}>{wcfPlayer.dgrade}</strong></span>}
              {wcfPlayer.world_ranking && <span>· World <strong style={{ color: CREAM }}>#{wcfPlayer.world_ranking}</strong></span>}
            </div>
          )}
        </div>

        {/* WCF link / import prompts */}
        {!hasWcf && (
          <div className="dash-pad" style={{ padding: '0 48px 28px', position: 'relative', zIndex: 1 }}>
            {profile && !profile.wcf_player_id && profile.first_name && profile.last_name && (
              <WcfMatchBanner userId={user.id} firstName={profile.first_name} lastName={profile.last_name} onLinked={handleWcfLinked}/>
            )}
            {!(profile?.first_name) && <WcfLinkPrompt/>}
          </div>
        )}
        {hasWcf && !wcfPlayer?.history_imported && (
          <div className="dash-pad" style={{ padding: '0 48px 24px', position: 'relative', zIndex: 1 }}>
            <WcfImportPrompt wcfPlayerId={profile.wcf_player_id}/>
          </div>
        )}

        {/* Hero stat cards */}
        <div className="dash-pad dash-hero-grid" style={{ padding: '0 48px 32px', display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10, position: 'relative', zIndex: 1 }}>
          {heroStats.map(s => (
            <StatCard key={s.label} label={s.label} value={s.value} accent={s.accent}/>
          ))}
        </div>

        {/* Career chart */}
        {hasHistory && history.length > 1 && (
          <div className="dash-pad" style={{ padding: '0 48px 0', position: 'relative', zIndex: 1 }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, overflow: 'hidden' }}>
              {/* Chart header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div className="ghl" style={{ fontSize: 16, color: CREAM, fontWeight: 700 }}>Grade History</div>
                  <div className="gsans" style={{ fontSize: 11, color: CREAM25, marginTop: 2 }}>Your complete career arc</div>
                </div>
                <div style={{ display: 'flex', gap: 20 }}>
                  {[
                    { label: 'Current', val: wcfPlayer?.dgrade, highlight: false },
                    { label: 'Peak',    val: peakDgrade || '—',  highlight: true  },
                    { label: 'Years',   val: yearsActive,        highlight: false },
                  ].map(({ label, val, highlight }) => (
                    <div key={label} style={{ textAlign: 'center' }}>
                      <div className="gmono" style={{ fontSize: 18, fontWeight: 500, color: highlight ? LIME : CREAM, lineHeight: 1 }}>{val || '—'}</div>
                      <div className="gsans" style={{ fontSize: 10, color: CREAM25, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Chart */}
              <div style={{ padding: '16px 16px 8px' }}>
                <CareerChart history={history}/>
              </div>
              {/* Legend */}
              <div style={{ padding: '8px 24px 16px', display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                {[
                  { label: 'dGrade', color: LIME, dash: false },
                  { label: 'Peak grade', color: LIME, dot: true },
                ].map(({ label, color, dash, dot }: any) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: CREAM25 }} className="gsans">
                    {dot
                      ? <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }}/>
                      : <span style={{ width: 18, height: 2, background: color, display: 'inline-block', borderRadius: 1 }}/>
                    }
                    {label}
                  </div>
                ))}
                <a href="/rankings?tab=Historical+Rankings" style={{ marginLeft: 'auto', fontSize: 11, color: LIME, textDecoration: 'none', fontFamily: 'DM Sans, sans-serif' }}>
                  Full historical chart →
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Spacer */}
        <div style={{ height: 40 }}/>
      </div>

      {/* ── LIGHT STATS SECTION ───────────────────────────────────────────── */}
      <div className="dash-section" style={{ background: '#f5f2ec', padding: '40px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          {hasHistory ? (
            <>
              {/* ── Win Rate by Year + Grade Band ─────────────────────────── */}
              <div className="dash-cols" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

                {/* Win by Year */}
                <div className="dash-light-card">
                  <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid #f0ede8' }}>
                    <h3 className="ghl" style={{ fontSize: 17, color: G, fontWeight: 700, marginBottom: 2 }}>Win Rate by Year</h3>
                    <p className="gsans" style={{ fontSize: 12, color: '#9ca3af' }}>Annual win percentage across your career</p>
                  </div>
                  <div style={{ padding: '16px 20px 8px' }}>
                    <YearBars data={yearData}/>
                  </div>
                  {/* Year table */}
                  <div style={{ borderTop: '1px solid #f0ede8' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px 70px', padding: '8px 20px', background: 'rgba(13,40,24,0.04)' }}>
                      {['Year', 'W', 'L', 'Win %'].map(h => (
                        <span key={h} className="gsans" style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
                      ))}
                    </div>
                    {yearData.slice(-6).reverse().map(({ year, w, t }) => {
                      const p = pct(w, t)
                      return (
                        <div key={year} className="dash-row" style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px 70px', padding: '8px 20px', borderTop: '1px solid #f7f4f0' }}>
                          <span className="gmono" style={{ fontSize: 13, color: G }}>{year}</span>
                          <span className="gmono" style={{ fontSize: 13, color: '#16a34a' }}>{w}</span>
                          <span className="gmono" style={{ fontSize: 13, color: '#dc2626' }}>{t - w}</span>
                          <span className="gmono" style={{ fontSize: 13, color: p !== null ? pctColor(p) : '#9ca3af' }}>{p !== null ? `${p}%` : '—'}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Win by Grade Band */}
                <div className="dash-light-card">
                  <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid #f0ede8' }}>
                    <h3 className="ghl" style={{ fontSize: 17, color: G, fontWeight: 700, marginBottom: 2 }}>Performance vs Grade Band</h3>
                    <p className="gsans" style={{ fontSize: 12, color: '#9ca3af' }}>How you perform against different opponent grades</p>
                  </div>
                  <div style={{ padding: '20px 24px' }}>
                    {bandData.length === 0 && (
                      <p className="gsans" style={{ fontSize: 13, color: '#9ca3af' }}>No opponent grade data yet</p>
                    )}
                    {bandData.map(band => {
                      const p = pct(band.w, band.t)
                      return (
                        <div key={band.label} style={{ marginBottom: 18 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                            <span className="gsans" style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{band.label}</span>
                            <span className="gsans" style={{ fontSize: 12, color: '#9ca3af' }}>{band.w}W – {band.t - band.w}L ({band.t} games)</span>
                          </div>
                          <div style={{ height: 10, background: '#f0ede8', borderRadius: 5, overflow: 'hidden' }}>
                            <div style={{ width: `${p || 0}%`, height: '100%', background: p !== null ? pctColor(p) : '#e5e7eb', borderRadius: 5, transition: 'width 0.6s ease' }}/>
                          </div>
                          {p !== null && (
                            <div className="gmono" style={{ fontSize: 11, color: pctColor(p), marginTop: 3, textAlign: 'right' }}>{p}%</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* ── Biggest Upset + Recent Form ───────────────────────────── */}
              <div className="dash-cols" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

                {/* Biggest Upset */}
                <div className="dash-light-card">
                  <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid #f0ede8' }}>
                    <h3 className="ghl" style={{ fontSize: 17, color: G, fontWeight: 700, marginBottom: 2 }}>🏆 Biggest Upset</h3>
                    <p className="gsans" style={{ fontSize: 12, color: '#9ca3af' }}>Your best win against a higher-graded opponent</p>
                  </div>
                  {biggestUpset ? (
                    <div style={{ padding: '24px' }}>
                      <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1px solid #bbf7d0', borderRadius: 12, padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                          <div>
                            <div className="ghl" style={{ fontSize: 20, color: G, fontWeight: 900 }}>
                              +{biggestUpset.diff} dGrade gap
                            </div>
                            <div className="gsans" style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>Grade advantage to opponent</div>
                          </div>
                          <div style={{ background: '#16a34a', color: 'white', borderRadius: 8, padding: '4px 10px', fontSize: 13, fontWeight: 700 }} className="gmono">
                            {biggestUpset.player_score}–{biggestUpset.opponent_score}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
                          <span className="gmono" style={{ fontSize: 22, color: G, fontWeight: 700 }}>{biggestUpset.dgrade_after}</span>
                          <span className="gsans" style={{ fontSize: 13, color: '#6b7280' }}>You</span>
                          <span style={{ color: '#9ca3af', fontSize: 14 }}>vs</span>
                          <span className="gmono" style={{ fontSize: 22, color: '#dc2626', fontWeight: 700 }}>{biggestUpset.opp_dgrade_after}</span>
                          <span className="gsans" style={{ fontSize: 13, color: '#6b7280' }}>
                            {biggestUpset.opponent_first_name} {biggestUpset.opponent_last_name}
                          </span>
                        </div>
                        {biggestUpset.event_name && (
                          <div className="gsans" style={{ fontSize: 11, color: '#6b7280' }}>
                            {biggestUpset.event_name}
                            {biggestUpset.event_date && ` · ${new Date(biggestUpset.event_date).getFullYear()}`}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '32px 24px', textAlign: 'center', color: '#9ca3af' }} className="gsans">
                      No upset wins found yet
                    </div>
                  )}
                </div>

                {/* Recent Form + Streaks */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Recent Form */}
                  <div className="dash-light-card" style={{ flex: 1 }}>
                    <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid #f0ede8' }}>
                      <h3 className="ghl" style={{ fontSize: 17, color: G, fontWeight: 700, marginBottom: 2 }}>Recent Form</h3>
                      <p className="gsans" style={{ fontSize: 12, color: '#9ca3af' }}>Last {recentForm.length} games</p>
                    </div>
                    <div style={{ padding: '18px 24px' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {recentForm.map((g: any, i: number) => (
                          <div key={i} title={`${g.result === 'win' ? 'W' : 'L'} ${g.player_score}–${g.opponent_score} vs ${g.opponent_first_name} ${g.opponent_last_name}`} style={{
                            width: 36, height: 36, borderRadius: 8,
                            background: g.result === 'win' ? '#dcfce7' : '#fee2e2',
                            border: `1px solid ${g.result === 'win' ? '#bbf7d0' : '#fecaca'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, fontWeight: 700,
                            color: g.result === 'win' ? '#16a34a' : '#dc2626',
                            fontFamily: 'DM Mono, monospace',
                          }}>
                            {g.result === 'win' ? 'W' : 'L'}
                          </div>
                        ))}
                      </div>
                      {curStreak > 1 && (
                        <div className="gsans" style={{ marginTop: 12, fontSize: 13, color: curStreakType === 'W' ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                          Current streak: {curStreak} {curStreakType === 'W' ? 'wins' : 'losses'} in a row
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Streaks */}
                  <div className="dash-light-card">
                    <div style={{ padding: '16px 24px', display: 'flex', gap: 16 }}>
                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <div className="gmono" style={{ fontSize: 32, fontWeight: 500, color: '#16a34a', lineHeight: 1 }}>{maxWin}</div>
                        <div className="gsans" style={{ fontSize: 10, color: '#9ca3af', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Win streak</div>
                      </div>
                      <div style={{ width: 1, background: '#f0ede8' }}/>
                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <div className="gmono" style={{ fontSize: 32, fontWeight: 500, color: '#dc2626', lineHeight: 1 }}>{maxLoss}</div>
                        <div className="gsans" style={{ fontSize: 10, color: '#9ca3af', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Loss streak</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Best Wins + Country Breakdown ─────────────────────────── */}
              <div className="dash-cols" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

                {/* Best Wins */}
                <div className="dash-light-card">
                  <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid #f0ede8' }}>
                    <h3 className="ghl" style={{ fontSize: 17, color: G, fontWeight: 700, marginBottom: 2 }}>Best Wins</h3>
                    <p className="gsans" style={{ fontSize: 12, color: '#9ca3af' }}>Highest-graded opponents you've beaten</p>
                  </div>
                  {bestWins.length === 0 ? (
                    <div style={{ padding: '24px', color: '#9ca3af' }} className="gsans">No wins recorded yet</div>
                  ) : (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 72px 60px', padding: '8px 20px', background: 'rgba(13,40,24,0.04)' }}>
                        {['', 'Opponent', 'Opp Grade', 'Score'].map(h => (
                          <span key={h} className="gsans" style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
                        ))}
                      </div>
                      {bestWins.map((g: any, i: number) => (
                        <div key={i} className="dash-row" style={{ display: 'grid', gridTemplateColumns: '32px 1fr 72px 60px', padding: '9px 20px', borderTop: '1px solid #f7f4f0', alignItems: 'center' }}>
                          <span className="gmono" style={{ fontSize: 12, color: '#9ca3af' }}>#{i + 1}</span>
                          <div>
                            <div className="gsans" style={{ fontSize: 13, color: G, fontWeight: 500 }}>
                              {g.opponent_first_name} {g.opponent_last_name}
                            </div>
                            {g.event_name && (
                              <div className="gsans" style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>{g.event_name}</div>
                            )}
                          </div>
                          <span className="gmono" style={{ fontSize: 13, color: '#dc2626', fontWeight: 600 }}>{g.opp_dgrade_after}</span>
                          <span className="gmono" style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>{g.player_score}–{g.opponent_score}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Country Breakdown */}
                <div className="dash-light-card">
                  <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid #f0ede8' }}>
                    <h3 className="ghl" style={{ fontSize: 17, color: G, fontWeight: 700, marginBottom: 2 }}>Opponents by Country</h3>
                    <p className="gsans" style={{ fontSize: 12, color: '#9ca3af' }}>Nations you've faced · {countriesPlayed} countries</p>
                  </div>
                  {countryStats.length === 0 ? (
                    <div style={{ padding: '24px', color: '#9ca3af' }} className="gsans">No country data yet</div>
                  ) : (
                    <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 52px 52px 60px', padding: '8px 20px', background: 'rgba(13,40,24,0.04)', position: 'sticky', top: 0 }}>
                        {['Country', 'G', 'W', 'Win%'].map(h => (
                          <span key={h} className="gsans" style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
                        ))}
                      </div>
                      {countryStats.slice(0, 20).map((cs: any) => {
                        const p = cs.win_percentage ? Math.round(cs.win_percentage) : pct(cs.wins, cs.games)
                        return (
                          <div key={cs.country} className="dash-row" style={{ display: 'grid', gridTemplateColumns: '1fr 52px 52px 60px', padding: '8px 20px', borderTop: '1px solid #f7f4f0', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <span style={{ fontSize: 16 }}>{getFlag(cs.country)}</span>
                              <span className="gsans" style={{ fontSize: 12, color: G }}>{cs.country}</span>
                            </div>
                            <span className="gmono" style={{ fontSize: 12, color: '#6b7280' }}>{cs.games}</span>
                            <span className="gmono" style={{ fontSize: 12, color: '#16a34a' }}>{cs.wins}</span>
                            <span className="gmono" style={{ fontSize: 12, color: p !== null ? pctColor(p) : '#9ca3af' }}>{p !== null ? `${p}%` : '—'}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* No history yet — show basic profile quick links */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
              {[
                { href: '/profile',  icon: '👤', title: 'My Profile',        desc: 'Update details and link WCF',   color: '#f0fdf4' },
                { href: '/rankings', icon: '🏆', title: 'Rankings',          desc: 'WCF world rankings',            color: '#eff6ff' },
                { href: '/compare',  icon: '⚔️',  title: 'Compare Players',  desc: 'Head to head stats',            color: '#fdf4ff' },
              ].map(({ href, icon, title, desc, color }) => (
                <a key={href} href={href} style={{ background: color, border: '1px solid #e5e7eb', borderRadius: 14, padding: '20px 22px', textDecoration: 'none', display: 'block', transition: 'box-shadow 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(13,40,24,0.1)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}>
                  <div style={{ fontSize: 24, marginBottom: 10 }}>{icon}</div>
                  <div className="ghl" style={{ fontSize: 16, color: G, fontWeight: 700, marginBottom: 4 }}>{title}</div>
                  <div className="gsans" style={{ fontSize: 12, color: '#6b7280' }}>{desc}</div>
                </a>
              ))}
            </div>
          )}

          {/* Admin link */}
          {['admin', 'super_admin'].includes(profile?.role) && (
            <a href="/admin" style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.15)',
              borderRadius: 12, padding: '14px 20px', textDecoration: 'none',
            }}>
              <span>⚙️</span>
              <span className="gsans" style={{ fontSize: 14, color: '#7c3aed', fontWeight: 600 }}>Admin Panel</span>
            </a>
          )}

        </div>
      </div>
    </div>
  )
}
