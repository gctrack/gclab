'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import GCLabNav from '@/components/GCLabNav'

const G      = '#0d2818'
const LIME   = '#4ade80'
const CREAM  = '#e8e0d0'
const CARD   = 'rgba(255,255,255,0.055)'
const BORDER = 'rgba(255,255,255,0.09)'
const RED    = '#ef4444'
const AMBER  = '#eab308'

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
  .ghl   { font-family: 'DM Serif Display', serif; }
  .gmono { font-family: 'DM Mono', monospace; }
  .gsans { font-family: 'DM Sans', sans-serif; }

  .stat-card {
    background: ${CARD};
    border: 1px solid ${BORDER};
    border-radius: 12px;
    padding: 18px 20px;
    transition: border-color 0.2s;
  }
  .stat-card:hover { border-color: rgba(74,222,128,0.2); }

  .game-row {
    display: flex; align-items: center; gap: 12;
    padding: 12px 0;
    border-bottom: 1px solid ${BORDER};
    transition: background 0.1s;
    cursor: pointer;
  }
  .game-row:last-child { border-bottom: none; }
  .game-row:hover { background: rgba(74,222,128,0.03); }

  .log-btn {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    background: ${LIME}; color: ${G};
    border: none; border-radius: 10px;
    padding: 13px 24px;
    font-size: 15px; font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer; transition: opacity 0.15s;
    text-decoration: none;
  }
  .log-btn:hover { opacity: 0.88; }

  .result-dot {
    width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
  }
`

interface GameRow {
  id: string
  game_date: string | null
  player2_name: string
  player1_score: number | null
  player2_score: number | null
  points_to: number
  game_type: string | null
  venue_id: string | null
}

interface Stats {
  total: number
  wins: number
  losses: number
  winPct: number
  avgScore: number
  avgOpponentScore: number
}

function computeStats(games: GameRow[]): Stats {
  const total = games.length
  if (total === 0) return { total: 0, wins: 0, losses: 0, winPct: 0, avgScore: 0, avgOpponentScore: 0 }
  const wins = games.filter(g => (g.player1_score ?? 0) > (g.player2_score ?? 0)).length
  const losses = total - wins
  const avgScore = games.reduce((s, g) => s + (g.player1_score ?? 0), 0) / total
  const avgOpp   = games.reduce((s, g) => s + (g.player2_score ?? 0), 0) / total
  return { total, wins, losses, winPct: Math.round((wins / total) * 100), avgScore: Math.round(avgScore * 10) / 10, avgOpponentScore: Math.round(avgOpp * 10) / 10 }
}

export default function GCLabDashboard() {
  const router  = useRouter()
  const supabase = createClient()

  const [user, setUser]       = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [games, setGames]     = useState<GameRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUser(data.user)

      const [{ data: p }, { data: g }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', data.user.id).single(),
        supabase.from('logged_games')
          .select('id, game_date, player2_name, player1_score, player2_score, points_to, game_type, venue_id')
          .eq('submitted_by', data.user.id)
          .order('game_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(50),
      ])

      setProfile(p)
      setGames(g ?? [])
      setLoading(false)
    })
  }, [])

  const stats = computeStats(games)
  const myName = profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Player' : 'Player'
  const recentGames = games.slice(0, 10)

  const isWin = (g: GameRow) => (g.player1_score ?? 0) > (g.player2_score ?? 0)

  if (loading) return (
    <div style={{ background: G, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: LIME, fontFamily: 'DM Mono, monospace', fontSize: 14 }}>Loading…</div>
    </div>
  )

  return (
    <div style={{ background: G, minHeight: '100vh', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{CSS}</style>
      <GCLabNav />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px 80px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="gmono" style={{ color: LIME, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>GCLab</div>
            <h1 className="ghl" style={{ color: CREAM, fontSize: 28, margin: 0 }}>{myName}</h1>
          </div>
          <a href="/gclab/log" className="log-btn">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke={G} strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Log a game
          </a>
        </div>

        {games.length === 0 ? (
          /* Empty state */
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(74,222,128,0.08)', border: `1px solid rgba(74,222,128,0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="11" stroke={LIME} strokeWidth="1.5" strokeOpacity="0.6"/>
                <path d="M14 9v5l3 3" stroke={LIME} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="ghl" style={{ color: CREAM, fontSize: 22, marginBottom: 10 }}>No games logged yet</div>
            <div style={{ color: 'rgba(232,224,208,0.45)', fontSize: 14, marginBottom: 28 }}>
              Log your first game to start tracking your results.
            </div>
            <a href="/gclab/log" className="log-btn" style={{ display: 'inline-flex' }}>Log your first game</a>
          </div>
        ) : (
          <>
            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 28 }}>
              <StatCard label="Games" value={String(stats.total)} />
              <StatCard label="Wins" value={String(stats.wins)} color={LIME} />
              <StatCard label="Losses" value={String(stats.losses)} color={RED} />
              <StatCard label="Win %" value={`${stats.winPct}%`} color={stats.winPct >= 50 ? LIME : AMBER} />
              <StatCard label="Avg score" value={String(stats.avgScore)} />
            </div>

            {/* Recent games */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="gmono" style={{ color: 'rgba(232,224,208,0.5)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Recent games</span>
                {games.length > 10 && (
                  <a href="/gclab/history" style={{ color: LIME, fontSize: 12, fontFamily: 'DM Mono, monospace', textDecoration: 'none' }}>View all {games.length} →</a>
                )}
              </div>
              <div style={{ padding: '0 20px' }}>
                {recentGames.map(g => (
                  <div key={g.id} className="game-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: `1px solid ${BORDER}`, cursor: 'pointer' }}
                    onClick={() => router.push(`/gclab/game/${g.id}`)}>
                    <div className="result-dot" style={{ background: isWin(g) ? LIME : RED }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: CREAM, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        vs {g.player2_name}
                      </div>
                      <div className="gmono" style={{ color: 'rgba(232,224,208,0.35)', fontSize: 11, marginTop: 2 }}>
                        {g.game_date ? new Date(g.game_date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        {g.game_type ? ` · ${g.game_type}` : ''}
                      </div>
                    </div>
                    <div className="gmono" style={{ color: isWin(g) ? LIME : RED, fontSize: 16, fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {g.player1_score ?? '–'}–{g.player2_score ?? '–'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="stat-card">
      <div className="gmono" style={{ color: 'rgba(232,224,208,0.4)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{label}</div>
      <div className="gmono" style={{ color: color ?? CREAM, fontSize: 26, fontWeight: 500 }}>{value}</div>
    </div>
  )
}
