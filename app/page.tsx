'use client'

import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

  @keyframes gclab-blink  { 0%,100%{opacity:1} 50%{opacity:0.2} }
  @keyframes f1 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
  @keyframes f2 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-9px)} }
  @keyframes f3 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }

  .f1 { animation: f1 3.2s ease-in-out infinite; }
  .f2 { animation: f2 3.8s ease-in-out infinite 0.5s; }
  .f3 { animation: f3 2.9s ease-in-out infinite 1s; }
  .gblink { animation: gclab-blink 2.2s ease-in-out infinite; }

  .ghl  { font-family: 'Playfair Display', serif; }
  .gmono{ font-family: 'DM Mono', monospace; }

  .gbtn {
    display: inline-flex; align-items: center; gap: 8px;
    background: #4ade80; color: #0d2818;
    padding: 14px 28px; border-radius: 8px;
    font-weight: 700; font-size: 15px; text-decoration: none;
    transition: all 0.2s; font-family: 'DM Sans', sans-serif;
  }
  .gbtn:hover { background: #86efac; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(74,222,128,0.28); }

  .gbtn-sm {
    display: inline-flex; align-items: center; gap: 6px;
    background: #4ade80; color: #0d2818;
    padding: 7px 16px; border-radius: 6px;
    font-weight: 700; font-size: 13px; text-decoration: none;
    transition: all 0.2s; font-family: 'DM Sans', sans-serif;
  }
  .gbtn-sm:hover { background: #86efac; transform: translateY(-1px); }

  .gbtn-outline {
    display: inline-flex; align-items: center; gap: 6px;
    background: transparent; color: rgba(232,224,208,0.75);
    padding: 7px 16px; border-radius: 6px;
    font-weight: 500; font-size: 13px; text-decoration: none;
    transition: all 0.2s; font-family: 'DM Sans', sans-serif;
    border: 1px solid rgba(232,224,208,0.2);
  }
  .gbtn-outline:hover { color: #e8e0d0; border-color: rgba(232,224,208,0.45); }

  .gbtn-ghost { color: rgba(232,224,208,0.6); font-size: 15px; text-decoration: none; transition: color 0.2s; }
  .gbtn-ghost:hover { color: #e8e0d0; }

  .gfc {
    background: #fff; border-radius: 16px; padding: 30px 26px;
    border: 1px solid #e5e1d8; transition: all 0.25s;
    position: relative; overflow: hidden;
  }
  .gfc::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: linear-gradient(90deg, #4ade80, #86efac);
    opacity: 0; transition: opacity 0.25s;
  }
  .gfc:hover { transform: translateY(-4px); box-shadow: 0 12px 36px rgba(13,40,24,0.09); }
  .gfc:hover::before { opacity: 1; }

  .gcc {
    border: 1px solid rgba(255,255,255,0.08); border-radius: 16px;
    padding: 30px 26px; position: relative; overflow: hidden;
    background: rgba(255,255,255,0.025); transition: border-color 0.25s;
  }
  .gcc:hover { border-color: rgba(74,222,128,0.25); }

  .gtab { background: transparent; border: 1px solid rgba(255,255,255,0.12); color: rgba(232,224,208,0.45); padding: 5px 12px; border-radius: 6px; font-size: 12px; cursor: default; font-family: 'DM Mono', monospace; }
  .gtab.on { background: rgba(74,222,128,0.15); border-color: rgba(74,222,128,0.4); color: #4ade80; }

  .gtr { display: grid; grid-template-columns: 52px 1fr 90px 90px 90px; padding: 13px 24px; align-items: center; gap: 12px; border-bottom: 1px solid rgba(255,255,255,0.044); transition: background 0.15s; }
  .gtr:last-child { border-bottom: none; }
  .gtr:not(.gth):hover { background: rgba(255,255,255,0.03); }
  .gth { background: rgba(0,0,0,0.22); cursor: default; }

  .g-nav-link {
    color: rgba(232,224,208,0.72); text-decoration: none; font-size: 13px;
    font-family: 'DM Sans', sans-serif; transition: color 0.15s;
    padding: 4px 2px;
  }
  .g-nav-link:hover { color: #e8e0d0; }

  @media (max-width: 900px) {
    .g-hero-r { display: none !important; }
    .g-hero { grid-template-columns: 1fr !important; min-height: auto !important; }
    .g-fg, .g-cg { grid-template-columns: 1fr !important; }
    .gtr { grid-template-columns: 40px 1fr 76px 76px; }
    .gtr > *:last-child { display: none; }
    .g-cs { grid-template-columns: repeat(3,1fr) !important; }
    .g-cs > *:nth-child(4), .g-cs > *:nth-child(5) { display: none; }
    .g-nav-links { display: none !important; }
    .g-section { padding: 60px 24px !important; }
  }
`

function Logo({ scale = 1 }: { scale?: number }) {
  const w = Math.round(44 * scale), h = Math.round(52 * scale)
  return (
    <svg width={w} height={h} viewBox="0 0 44 52" fill="none">
      <rect x="13" y="2" width="18" height="8" rx="2" fill="rgba(74,222,128,0.1)" stroke="#4ade80" strokeWidth="1.6"/>
      <path d="M13 10 L2 44 Q0 50 4 51 L40 51 Q44 50 42 44 L31 10 Z" fill="rgba(74,222,128,0.08)" stroke="#4ade80" strokeWidth="1.6" strokeLinejoin="round"/>
      <circle cx="14" cy="40" r="6.5" fill="#ef4444"/><circle cx="12" cy="38" r="2" fill="rgba(255,255,255,0.32)"/>
      <circle cx="30" cy="40" r="6.5" fill="#3b82f6"/><circle cx="28" cy="38" r="2" fill="rgba(255,255,255,0.32)"/>
      <circle cx="22" cy="29" r="6.5" fill="#eab308"/><circle cx="20" cy="27" r="2" fill="rgba(255,255,255,0.32)"/>
    </svg>
  )
}

function Beaker() {
  return (
    <svg width="230" height="280" viewBox="0 0 230 280" fill="none">
      <rect x="78" y="14" width="74" height="24" rx="6" fill="rgba(74,222,128,0.09)" stroke="#4ade80" strokeWidth="2.2"/>
      <path d="M78 38 L18 238 Q8 264 24 270 L206 270 Q222 264 212 238 L152 38 Z" fill="rgba(74,222,128,0.07)" stroke="#4ade80" strokeWidth="2.5" strokeLinejoin="round"/>
      <line x1="154" y1="120" x2="172" y2="120" stroke="rgba(74,222,128,0.35)" strokeWidth="1.5"/>
      <line x1="160" y1="155" x2="178" y2="155" stroke="rgba(74,222,128,0.35)" strokeWidth="1.5"/>
      <line x1="168" y1="190" x2="186" y2="190" stroke="rgba(74,222,128,0.35)" strokeWidth="1.5"/>
      <g className="f1">
        <circle cx="82" cy="230" r="28" fill="#ef4444"/>
        <circle cx="72" cy="220" r="9" fill="rgba(255,255,255,0.28)"/>
      </g>
      <g className="f2">
        <circle cx="148" cy="230" r="28" fill="#3b82f6"/>
        <circle cx="138" cy="220" r="9" fill="rgba(255,255,255,0.28)"/>
      </g>
      <g className="f3">
        <circle cx="115" cy="186" r="28" fill="#eab308"/>
        <circle cx="105" cy="176" r="9" fill="rgba(255,255,255,0.28)"/>
      </g>
    </svg>
  )
}

const FEATURES = [
  { icon: '🏆', title: 'World Rankings',  desc: 'All WCF players ranked. Filter by country, sort by dGrade or world ranking. Live data, no login needed.', free: true },
  { icon: '🌍', title: 'Country Stats',   desc: 'National rankings, total and active player counts per country, top players and average grade trends.', free: true },
  { icon: '📊', title: 'Movers',          desc: 'Weekly and monthly biggest grade climbers and fallers from across the world rankings.', free: true },
  { icon: '📈', title: 'Grade History',   desc: 'Your complete career arc — every dGrade movement plotted from day one. See your full trajectory at a glance.', free: false },
  { icon: '⚔️', title: 'Compare Players', desc: 'Head to head records, win rate by year, performance vs grade bands, common opponents.', free: false },
  { icon: '🎯', title: 'Career Stats',    desc: 'Win rate by year, best wins, longest streaks, performance by opponent grade range.', free: false },
]

const COMING = [
  { badge: '⚗️ Performance', icon: '🎯', title: 'Performance Grading',  desc: "Shot-by-shot success metrics beyond the WCF grade. Hoop conversion rates, tactical decision scoring and consistency under pressure." },
  { badge: '⌚ Mobile',       icon: '⌚', title: 'Apple Watch App',      desc: "Record shot outcomes live on your wrist during a match. Tap to log, sync automatically to GCLab. Real-time game data without breaking your focus." },
  { badge: '📚 Training',    icon: '🧪', title: 'Training Guides',      desc: "Data-driven practice plans built from your weak spots. Targeted drills, progress tracking and grade improvement predictions." },
  { badge: '🔬 Insights',    icon: '🔍', title: 'Deep Game Insights',   desc: "With shot-by-shot data we'll answer the questions that matter. Does hoop 2 really matter? Is the Huneycutt Gambit actually effective? What conversion averages do you need to compete with the world's best?" },
  { badge: '👥 Clubs',       icon: '🏌️', title: 'Club Pages',           desc: "Club-level leaderboards, member grade trends and collective performance dashboards. See how your club is tracking nationally." },
  { badge: '✨ AI',          icon: '🤖', title: 'AI Match Insights',    desc: "Smart analysis of your playing patterns, opponent tendencies and tactical recommendations tailored to your grade level and style." },
]

// Diamond SVG shape for event markers
const EventMarkers = () => (
  <>
    {([[265, 106], [460, 60], [645, 134]] as [number, number][]).map(([x, y]) => (
      <g key={x}>
        <line x1={x} y1={y + 10} x2={x} y2={215} stroke="rgba(234,179,8,0.18)" strokeWidth="1" strokeDasharray="2 3"/>
        <polygon
          points={`${x},${y} ${x + 5},${y + 6} ${x},${y + 12} ${x - 5},${y + 6}`}
          fill="#eab308" opacity="0.8"
        />
      </g>
    ))}
  </>
)

export default function HomePage() {
  const [playerCount, setPlayerCount] = useState(11420)
  const [countryCount, setCountryCount] = useState(60)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('wcf_players').select('*', { count: 'exact', head: true })
      .then(({ count }) => { if (count) setPlayerCount(count) })
    supabase.from('wcf_players').select('country')
      .then(({ data }) => {
        if (data) setCountryCount(new Set(data.map((r: any) => r.country).filter(Boolean)).size)
      })
  }, [])

  const green = '#0d2818', lime = '#4ade80', cream = '#e8e0d0'

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }}/>

      {/* ── NAV ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', height: 48,
        background: '#111f12',
        borderBottom: '2px solid #16a34a',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <Logo scale={0.6}/>
          <span className="ghl" style={{ fontSize: 17, color: cream, fontWeight: 700, letterSpacing: '-0.3px' }}>GCLab</span>
        </Link>

        <div className="g-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link href="/rankings"    className="g-nav-link">Rankings</Link>
          <Link href="/leaderboards" className="g-nav-link">Leaderboards</Link>
          <Link href="/compare"     className="g-nav-link">Compare</Link>
          <Link href="/rankings?tab=historical" className="g-nav-link">Historical</Link>
        </div>

        <div className="g-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/login?mode=signup" className="gbtn-sm">Sign Up Free</Link>
          <Link href="/login" className="gbtn-outline">Sign In</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="g-hero g-section" style={{ background: green, minHeight: '86vh', display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', padding: '80px 48px', gap: 40, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 68% 50%, rgba(74,222,128,0.07) 0%, transparent 55%)' }}/>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(255,255,255,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.018) 1px,transparent 1px)', backgroundSize: '44px 44px' }}/>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.22)', color: lime, padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 500, letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 28 }}>
            <span className="gblink" style={{ width: 6, height: 6, background: lime, borderRadius: '50%', display: 'inline-block' }}/>
            Golf Croquet Analytics
          </div>
          <h1 className="ghl" style={{ fontSize: 'clamp(48px,5.5vw,82px)', lineHeight: 1.04, fontWeight: 900, letterSpacing: -1, color: cream, marginBottom: 22 }}>
            Your game.<br/><em style={{ fontStyle: 'normal', color: lime }}>Measured.</em><br/>Mastered.
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.65, color: 'rgba(232,224,208,0.6)', maxWidth: 440, marginBottom: 40, fontWeight: 300 }}>
            World rankings, grade history and head‑to‑head stats for every competitive golf croquet player on earth.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <Link href="/rankings" className="gbtn">
              Explore Rankings
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
            </Link>
            <Link href="/login?mode=signup" className="gbtn-ghost">Create free account →</Link>
          </div>
        </div>

        <div className="g-hero-r" style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle,rgba(74,222,128,0.11) 0%,transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }}/>
            <Beaker/>
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            {[
              { num: playerCount.toLocaleString(), label: 'Players tracked', accent: true },
              { num: `${countryCount}+`,           label: 'Countries',       accent: false },
              { num: 'Daily',                      label: 'WCF sync',        accent: false },
            ].map(({ num, label, accent }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: '16px 22px', textAlign: 'center', minWidth: 110 }}>
                <div className="gmono" style={{ fontSize: 26, fontWeight: 500, color: accent ? lime : cream, lineHeight: 1 }}>{num}</div>
                <div style={{ fontSize: 10, color: 'rgba(232,224,208,0.38)', marginTop: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CHART PREVIEW ── */}
      <section className="g-section" style={{ background: green, padding: '80px 48px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: lime, fontWeight: 600, marginBottom: 10 }}>Grade History · Requires free account</p>
          <h2 className="ghl" style={{ fontSize: 'clamp(30px,3.5vw,52px)', color: cream, lineHeight: 1.08, fontWeight: 900, marginBottom: 8 }}>See your career at a glance</h2>
          <p style={{ color: 'rgba(232,224,208,0.42)', fontSize: 15, marginBottom: 36, fontWeight: 300 }}>Every grade movement, every event — plotted from day one.</p>

          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: cream }}>🏴󠁧󠁢󠁥󠁮󠁧󠁿 Your Name</div>
                <div style={{ fontSize: 12, color: 'rgba(232,224,208,0.42)', marginTop: 3 }}>England · dGrade 1978 · World #433</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['1Y', '5Y', 'All Time'].map(t => <button key={t} className={`gtab${t === 'All Time' ? ' on' : ''}`}>{t}</button>)}
              </div>
            </div>

            {/* Stat strip */}
            <div className="g-cs" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {[{ v: '1978', l: 'Current dGrade', g: false }, { v: '2,014', l: 'Peak dGrade', g: true }, { v: '#433', l: 'World Rank', g: false }, { v: '62%', l: 'Career Win %', g: true }, { v: '847', l: 'Career Games', g: false }].map(({ v, l, g }) => (
                <div key={l} style={{ padding: '14px 20px', borderRight: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
                  <div className="gmono" style={{ fontSize: 20, fontWeight: 500, color: g ? lime : cream, lineHeight: 1 }}>{v}</div>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(232,224,208,0.35)', marginTop: 5 }}>{l}</div>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div style={{ padding: '24px 28px 12px' }}>
              <svg width="100%" height="240" viewBox="0 0 880 240" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="gDg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4ade80" stopOpacity="0.18"/><stop offset="100%" stopColor="#4ade80" stopOpacity="0"/></linearGradient>
                  <linearGradient id="gEg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa" stopOpacity="0.12"/><stop offset="100%" stopColor="#60a5fa" stopOpacity="0"/></linearGradient>
                </defs>

                {[40, 80, 120, 160, 200].map(y => <line key={y} x1="0" y1={y} x2="880" y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>)}
                {([['2100', 38], ['2000', 78], ['1900', 118], ['1800', 158], ['1700', 198]] as [string, number][]).map(([l, y]) => <text key={l} x="8" y={y} fill="rgba(255,255,255,0.2)" fontSize="10" fontFamily="DM Mono,monospace">{l}</text>)}
                {([['2015', 60], ['2017', 185], ['2019', 310], ['2021', 435], ['2022', 560], ['2024', 685], ['2026', 820]] as [string, number][]).map(([y, x]) => <text key={y} x={x} y="232" fill="rgba(255,255,255,0.22)" fontSize="10" fontFamily="DM Sans,sans-serif" textAnchor="middle">{y}</text>)}

                {/* eGrade */}
                <path d="M60,185 C80,180 100,172 130,165 C155,158 175,148 200,138 C225,128 240,115 265,102 C290,89 310,82 340,75 C365,70 385,68 410,65 C430,63 445,62 460,64 C480,67 495,72 515,80 C535,88 550,94 575,100 C600,106 620,110 645,118 C665,124 680,130 700,138 C720,146 735,155 755,160 C775,165 795,168 820,170 L820,215 L60,215 Z" fill="url(#gEg)"/>
                <path d="M60,185 C80,180 100,172 130,165 C155,158 175,148 200,138 C225,128 240,115 265,102 C290,89 310,82 340,75 C365,70 385,68 410,65 C430,63 445,62 460,64 C480,67 495,72 515,80 C535,88 550,94 575,100 C600,106 620,110 645,118 C665,124 680,130 700,138 C720,146 735,155 755,160 C775,165 795,168 820,170" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeOpacity="0.5" strokeDasharray="4 3"/>

                {/* dGrade */}
                <path d="M60,192 C80,186 100,178 130,170 C155,162 175,150 200,140 C225,130 240,118 265,106 C290,94 310,85 340,78 C365,72 385,68 410,63 C430,59 445,57 460,60 C480,64 495,70 515,78 C535,86 550,96 575,108 C600,118 620,126 645,134 C665,140 680,148 700,156 C720,164 735,172 755,178 C775,183 795,187 820,190 L820,215 L60,215 Z" fill="url(#gDg)"/>
                <path d="M60,192 C80,186 100,178 130,170 C155,162 175,150 200,140 C225,130 240,118 265,106 C290,94 310,85 340,78 C365,72 385,68 410,63 C430,59 445,57 460,60 C480,64 495,70 515,78 C535,86 550,96 575,108 C600,118 620,126 645,134 C665,140 680,148 700,156 C720,164 735,172 755,178 C775,183 795,187 820,190" fill="none" stroke="#4ade80" strokeWidth="2.2"/>

                {/* Peak marker */}
                <line x1="460" y1="57" x2="460" y2="215" stroke="rgba(74,222,128,0.2)" strokeWidth="1" strokeDasharray="3 3"/>
                <circle cx="460" cy="57" r="5" fill="#4ade80"/>
                <circle cx="460" cy="57" r="9" fill="none" stroke="#4ade80" strokeWidth="1.5" strokeOpacity="0.4"/>
                <rect x="468" y="44" width="72" height="20" rx="4" fill="rgba(13,40,24,0.9)" stroke="rgba(74,222,128,0.35)" strokeWidth="1"/>
                <text x="504" y="57" fill="#4ade80" fontSize="10" fontFamily="DM Mono,monospace" textAnchor="middle" fontWeight="500">Peak 2,014</text>

                {/* Current grade dot */}
                <circle cx="820" cy="190" r="5" fill="#4ade80"/>
                <circle cx="820" cy="190" r="9" fill="none" stroke="#4ade80" strokeWidth="1.5" strokeOpacity="0.35"/>

                {/* Event markers — diamond shape, no text */}
                <EventMarkers/>
              </svg>

              {/* Legend */}
              <div style={{ display: 'flex', gap: 20, marginTop: 10, flexWrap: 'wrap' }}>
                {[
                  { l: 'dGrade',     c: '#4ade80', shape: 'line'    },
                  { l: 'eGrade',     c: '#60a5fa', shape: 'dashed'  },
                  { l: 'Peak grade', c: '#4ade80', shape: 'dot'     },
                  { l: 'Event',      c: '#eab308', shape: 'diamond' },
                ].map(({ l, c, shape }) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(232,224,208,0.45)' }}>
                    {shape === 'dot'     && <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }}/>}
                    {shape === 'line'    && <span style={{ display: 'inline-block', width: 20, height: 2, background: c }}/>}
                    {shape === 'dashed'  && <span style={{ display: 'inline-block', width: 20, height: 0, borderTop: `2px dashed ${c}`, opacity: 0.6 }}/>}
                    {shape === 'diamond' && (
                      <svg width="10" height="12" viewBox="0 0 10 12">
                        <polygon points="5,0 10,6 5,12 0,6" fill={c} opacity="0.8"/>
                      </svg>
                    )}
                    {l}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <Link href="/login?mode=signup" className="gbtn">See Your Grade History →</Link>
            <span style={{ color: 'rgba(232,224,208,0.32)', fontSize: 13 }}>Free account · 30 seconds to set up</span>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="g-section" style={{ background: '#f5f2ec', padding: '80px 48px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#16a34a', fontWeight: 600, marginBottom: 10 }}>Available now</p>
          <h2 className="ghl" style={{ fontSize: 'clamp(30px,3.5vw,50px)', color: green, lineHeight: 1.08, fontWeight: 900, marginBottom: 56, maxWidth: 560 }}>Everything you need to understand your game</h2>
          <div className="g-fg" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
            {FEATURES.map(({ icon, title, desc, free }) => (
              <div key={title} className="gfc">
                <div style={{ fontSize: 26, marginBottom: 14 }}>{icon}</div>
                <h3 className="ghl" style={{ fontSize: 19, color: green, fontWeight: 700, marginBottom: 9 }}>{title}</h3>
                <p style={{ fontSize: 13, lineHeight: 1.65, color: '#6b7280', fontWeight: 300 }}>{desc}</p>
                <span style={{ display: 'inline-block', marginTop: 14, fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: free ? '#f0fdf4' : '#f9fafb', color: free ? '#16a34a' : '#6b7280' }}>
                  {free ? 'Free · No signup' : 'Requires Free Account'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMING SOON ── */}
      <section className="g-section" style={{ background: green, padding: '80px 48px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: lime, fontWeight: 600, marginBottom: 10 }}>On the horizon</p>
          <h2 className="ghl" style={{ fontSize: 'clamp(30px,3.5vw,52px)', color: cream, lineHeight: 1.08, fontWeight: 900, marginBottom: 16 }}>Coming soon</h2>
          <p style={{ color: 'rgba(232,224,208,0.42)', fontSize: 15, marginBottom: 48, fontWeight: 300 }}>We&apos;re building the most complete analytics platform in the game.</p>
          <div className="g-cg" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
            {COMING.map(({ badge, icon, title, desc }) => (
              <div key={title} className="gcc">
                <span style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 600, color: 'rgba(232,224,208,0.28)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Coming Soon</span>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.18)', color: 'rgba(74,222,128,0.65)', padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 14 }}>{badge}</div>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{icon}</div>
                <h3 className="ghl" style={{ fontSize: 19, color: 'rgba(232,224,208,0.85)', fontWeight: 700, marginBottom: 10 }}>{title}</h3>
                <p style={{ fontSize: 13, lineHeight: 1.65, color: 'rgba(232,224,208,0.38)', fontWeight: 300 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: 'linear-gradient(135deg,#0a2014 0%,#1a4030 50%,#0a2014 100%)', padding: '100px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%,rgba(74,222,128,0.1) 0%,transparent 60%)', pointerEvents: 'none' }}/>
        <div style={{ position: 'relative', maxWidth: 560, margin: '0 auto' }}>
          <h2 className="ghl" style={{ fontSize: 'clamp(36px,4vw,64px)', color: cream, fontWeight: 900, lineHeight: 1.08, marginBottom: 18 }}>Ready to go deeper?</h2>
          <p style={{ fontSize: 18, color: 'rgba(232,224,208,0.5)', maxWidth: 460, margin: '0 auto 40px', fontWeight: 300, lineHeight: 1.65 }}>
            Create a free account to unlock grade history, head‑to‑head comparisons and your complete career statistics.
          </p>
          <Link href="/login?mode=signup" className="gbtn" style={{ fontSize: 16, padding: '15px 32px' }}>Create Free Account →</Link>
          <p style={{ fontSize: 12, color: 'rgba(232,224,208,0.22)', marginTop: 16 }}>No credit card required · Takes 30 seconds</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#060f09', padding: '28px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Logo scale={0.65}/>
          <span className="ghl" style={{ fontSize: 16, color: 'rgba(232,224,208,0.55)', fontWeight: 700 }}>GCLab</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <a href="mailto:admin@gclab.app" style={{ fontSize: 12, color: 'rgba(232,224,208,0.3)', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(232,224,208,0.6)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(232,224,208,0.3)')}>
            admin@gclab.app
          </a>
          <span style={{ fontSize: 12, color: 'rgba(232,224,208,0.22)' }}>© 2026 GCLab · Golf Croquet Analytics</span>
        </div>
      </footer>
    </>
  )
}
