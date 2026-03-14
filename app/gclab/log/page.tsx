'use client'

import React, { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import GCLabNav from '@/components/GCLabNav'

// ── Palette (matches GCLab dark theme) ───────────────────────────────────────
const G      = '#0d2818'
const LIME   = '#4ade80'
const CREAM  = '#e8e0d0'
const CARD   = 'rgba(255,255,255,0.055)'
const BORDER = 'rgba(255,255,255,0.09)'
const INPUT  = 'rgba(255,255,255,0.07)'
const INPUT_FOCUS = 'rgba(74,222,128,0.15)'

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
  .ghl   { font-family: 'DM Serif Display', serif; }
  .gmono { font-family: 'DM Mono', monospace; }
  .gsans { font-family: 'DM Sans', sans-serif; }

  .log-input {
    background: ${INPUT};
    border: 1px solid ${BORDER};
    border-radius: 8px;
    color: ${CREAM};
    padding: 10px 14px;
    font-size: 15px;
    font-family: 'DM Sans', sans-serif;
    width: 100%;
    outline: none;
    transition: border-color 0.15s, background 0.15s;
  }
  .log-input:focus {
    border-color: rgba(74,222,128,0.5);
    background: ${INPUT_FOCUS};
  }
  .log-input::placeholder { color: rgba(232,224,208,0.3); }

  .score-btn {
    width: 44px; height: 44px;
    border-radius: 8px;
    border: 1px solid ${BORDER};
    background: ${INPUT};
    color: ${CREAM};
    font-size: 20px; font-family: 'DM Mono', monospace;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.12s, border-color 0.12s;
    user-select: none;
  }
  .score-btn:hover { background: rgba(74,222,128,0.1); border-color: rgba(74,222,128,0.35); }
  .score-btn:active { background: rgba(74,222,128,0.2); }

  .score-display {
    width: 64px; height: 64px;
    border-radius: 10px;
    border: 2px solid rgba(74,222,128,0.3);
    background: rgba(74,222,128,0.06);
    color: ${LIME};
    font-size: 28px; font-family: 'DM Mono', monospace; font-weight: 500;
    display: flex; align-items: center; justify-content: center;
  }

  .seg-btn {
    flex: 1; padding: 8px 0; border-radius: 7px;
    border: 1px solid transparent;
    background: transparent;
    color: rgba(232,224,208,0.4);
    font-size: 13px; font-family: 'DM Mono', monospace;
    cursor: pointer; transition: all 0.12s;
  }
  .seg-btn.on {
    background: rgba(74,222,128,0.15);
    border-color: rgba(74,222,128,0.35);
    color: ${LIME};
  }

  .dropdown-item {
    padding: 10px 14px; cursor: pointer;
    transition: background 0.1s;
    border-bottom: 1px solid ${BORDER};
  }
  .dropdown-item:last-child { border-bottom: none; }
  .dropdown-item:hover { background: rgba(74,222,128,0.08); }

  .starts-btn {
    flex: 1; padding: 10px;
    border-radius: 8px;
    border: 1px solid ${BORDER};
    background: ${INPUT};
    color: rgba(232,224,208,0.5);
    font-size: 13px; font-family: 'DM Sans', sans-serif;
    cursor: pointer; transition: all 0.12s;
    text-align: center;
  }
  .starts-btn.on {
    background: rgba(74,222,128,0.12);
    border-color: rgba(74,222,128,0.4);
    color: ${LIME};
  }

  .submit-btn {
    width: 100%; padding: 14px;
    border-radius: 10px;
    border: none;
    background: ${LIME};
    color: ${G};
    font-size: 16px; font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer; transition: opacity 0.15s;
  }
  .submit-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .submit-btn:not(:disabled):hover { opacity: 0.88; }

  .priority-badge {
    font-size: 10px; font-family: 'DM Mono', monospace;
    padding: 2px 6px; border-radius: 4px;
  }
`

// ── Types ────────────────────────────────────────────────────────────────────
interface Opponent {
  id: string
  display_name: string
  first_name: string
  last_name: string
  country: string | null
  dgrade: number | null
  source: 'wcf' | 'recreational'
  priority: number
}

interface VenueResult {
  id: string
  canonical_name: string
  short_name: string | null
  country: string | null
  city: string | null
}

interface FormState {
  opponent: Opponent | null
  opponentSearch: string
  venue: VenueResult | null
  venueSearch: string
  pointsTo: 13 | 19
  gameType: 'club' | 'practice' | 'casual' | 'tournament'
  gameDate: string
  player1Score: number
  player2Score: number
  playerStarts: 'me' | 'opponent' | null  // who started hoop 1
}

// ── Component ────────────────────────────────────────────────────────────────
function LogGameContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Read prefill params (from confirmation "log again" buttons)
  const prefillOpponentName = searchParams.get('prefill_opponent_name')
  const prefillOpponentId   = searchParams.get('prefill_opponent_id')
  const prefillOpponentSrc  = searchParams.get('prefill_opponent_src') as 'wcf' | 'recreational' | null
  const prefillVenueId      = searchParams.get('prefill_venue_id')
  const prefillVenueName    = searchParams.get('prefill_venue_name')
  const prefillGameType     = searchParams.get('prefill_game_type') as FormState['gameType'] | null
  const prefillPointsTo     = searchParams.get('prefill_points_to')

  const prefillOpponent: Opponent | null = prefillOpponentId && prefillOpponentName && prefillOpponentSrc
    ? { id: prefillOpponentId, display_name: prefillOpponentName, first_name: prefillOpponentName.split(' ')[0], last_name: prefillOpponentName.split(' ').slice(1).join(' '), country: null, dgrade: null, source: prefillOpponentSrc, priority: 1 }
    : null

  const prefillVenue: VenueResult | null = prefillVenueId && prefillVenueName
    ? { id: prefillVenueId, canonical_name: prefillVenueName, short_name: null, country: null, city: null }
    : null

  const [form, setForm] = useState<FormState>({
    opponent:       prefillOpponent,
    opponentSearch: prefillOpponentName ?? '',
    venue:          prefillVenue,
    venueSearch:    prefillVenueName ?? '',
    pointsTo:       (prefillPointsTo === '19' ? 19 : 13),
    gameType:       prefillGameType ?? 'club',
    gameDate:       new Date().toISOString().split('T')[0],
    player1Score:   0,
    player2Score:   0,
    playerStarts:   null,
  })

  const [opponentResults, setOpponentResults] = useState<Opponent[]>([])
  const [venueResults, setVenueResults]       = useState<VenueResult[]>([])
  const [showOpponentDrop, setShowOpponentDrop] = useState(false)
  const [showVenueDrop, setShowVenueDrop]       = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Modal state ───────────────────────────────────────────────────────────
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [showAddVenue,  setShowAddVenue]  = useState(false)
  const [addPlayerPrefill, setAddPlayerPrefill] = useState('')
  const [addVenuePrefill,  setAddVenuePrefill]  = useState('')

  const opponentRef = useRef<HTMLDivElement>(null)
  const venueRef    = useRef<HTMLDivElement>(null)

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUser(data.user)
      supabase.from('profiles').select('*').eq('id', data.user.id).single()
        .then(({ data: p }) => setProfile(p))
        .finally(() => setLoading(false))
    })
  }, [])

  // ── Close dropdowns on outside click ─────────────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (opponentRef.current && !opponentRef.current.contains(e.target as Node)) setShowOpponentDrop(false)
      if (venueRef.current    && !venueRef.current.contains(e.target as Node))    setShowVenueDrop(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // ── Opponent search ───────────────────────────────────────────────────────
  const searchOpponents = useCallback(async (term: string) => {
    if (!user || term.trim().length < 2) { setOpponentResults([]); return }
    const { data } = await supabase.rpc('search_opponents', {
      search_term:  term.trim(),
      for_user_id:  user.id,
      user_country: profile?.country ?? null,
    })
    setOpponentResults((data as Opponent[]) ?? [])
  }, [user, profile])

  useEffect(() => {
    if (!form.opponent) {
      const t = setTimeout(() => searchOpponents(form.opponentSearch), 250)
      return () => clearTimeout(t)
    }
  }, [form.opponentSearch, form.opponent, searchOpponents])

  // ── Venue search ──────────────────────────────────────────────────────────
  const searchVenues = useCallback(async (term: string) => {
    if (term.trim().length < 2) { setVenueResults([]); return }
    // Search canonical_name + aliases
    const { data: byName } = await supabase
      .from('venues')
      .select('id, canonical_name, short_name, country, city')
      .ilike('canonical_name', `%${term}%`)
      .limit(8)

    const { data: byAlias } = await supabase
      .from('venue_aliases')
      .select('venue_id, venues(id, canonical_name, short_name, country, city)')
      .ilike('alias', `%${term}%`)
      .limit(8)

    const aliasVenues = (byAlias ?? [])
      .map((a: any) => a.venues)
      .filter(Boolean)

    const all = [...(byName ?? []), ...aliasVenues]
    // dedupe by id
    const seen = new Set<string>()
    const deduped = all.filter(v => { if (seen.has(v.id)) return false; seen.add(v.id); return true })
    setVenueResults(deduped.slice(0, 10))
  }, [])

  useEffect(() => {
    if (!form.venue) {
      const t = setTimeout(() => searchVenues(form.venueSearch), 250)
      return () => clearTimeout(t)
    }
  }, [form.venueSearch, form.venue, searchVenues])

  // ── Score helpers ─────────────────────────────────────────────────────────
  const max = form.pointsTo
  const changeScore = (player: 1 | 2, delta: number) => {
    setForm(f => ({
      ...f,
      player1Score: player === 1 ? Math.max(0, Math.min(max, f.player1Score + delta)) : f.player1Score,
      player2Score: player === 2 ? Math.max(0, Math.min(max, f.player2Score + delta)) : f.player2Score,
    }))
  }

  // ── Validation ────────────────────────────────────────────────────────────
  const myName = profile
    ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || user?.email
    : 'Me'

  const isValid = form.opponent !== null &&
    (form.player1Score === max || form.player2Score === max) &&
    form.player1Score !== form.player2Score

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!user || !isValid) return
    setSubmitting(true)
    setError(null)

    const isWinner = form.player1Score === max
    const payload: Record<string, any> = {
      points_to:       form.pointsTo,
      game_type:       form.gameType,
      game_date:       form.gameDate,
      venue_id:        form.venue?.id ?? null,
      player1_name:    myName,
      player1_user_id: user.id,
      player1_score:   form.player1Score,
      player2_name:    form.opponent!.display_name,
      player2_score:   form.player2Score,
      player1_starts:  form.playerStarts === 'me' ? true : form.playerStarts === 'opponent' ? false : null,
      has_hoops:       false,
      has_shots:       false,
      source:          'manual',
      submitted_by:    user.id,
      visibility:      'private',
      player1_confirmed: true,
      player2_confirmed: false,
    }

    // Link dgrade snapshot from profile
    if (profile?.dgrade) payload.player1_dgrade = profile.dgrade

    // Link opponent identity
    if (form.opponent!.source === 'wcf') {
      payload.player2_wcf_id = form.opponent!.id
    } else {
      payload.player2_rec_id = form.opponent!.id
    }

    const { data: game, error: err } = await supabase
      .from('logged_games')
      .insert(payload)
      .select('id')
      .single()

    setSubmitting(false)
    if (err) { setError(err.message); return }

    // Navigate to confirmation with game data encoded
    const params = new URLSearchParams({
      id:           game.id,
      opponent:     form.opponent!.display_name,
      myScore:      String(form.player1Score),
      theirScore:   String(form.player2Score),
      pointsTo:     String(form.pointsTo),
      gameType:     form.gameType,
      venue:        form.venue?.canonical_name ?? '',
      venueId:      form.venue?.id ?? '',
      opponentId:   form.opponent!.id,
      opponentSrc:  form.opponent!.source,
    })
    router.push(`/gclab/log/confirm?${params}`)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ background: G, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: LIME, fontFamily: 'DM Mono, monospace', fontSize: 14 }}>Loading…</div>
    </div>
  )

  const priorityLabel = (p: number) => p === 1 ? 'played before' : p === 2 ? 'same country' : null
  const priorityColor = (p: number) => p === 1 ? 'rgba(74,222,128,0.15)' : 'rgba(234,179,8,0.12)'
  const priorityText  = (p: number) => p === 1 ? LIME : '#eab308'

  return (
    <div style={{ background: G, minHeight: '100vh', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{CSS}</style>
      <GCLabNav />

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '32px 16px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div className="gmono" style={{ color: LIME, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>GCLab</div>
          <h1 className="ghl" style={{ color: CREAM, fontSize: 28, margin: 0 }}>Log a Game</h1>
        </div>

        {/* ── Opponent ──────────────────────────────────────────────────── */}
        <Section label="Opponent">
          <div ref={opponentRef} style={{ position: 'relative' }}>
            {form.opponent ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: CREAM, fontSize: 15 }}>{form.opponent.display_name}</div>
                  <div className="gmono" style={{ color: 'rgba(232,224,208,0.4)', fontSize: 11 }}>
                    {form.opponent.source === 'wcf' ? `WCF · dGrade ${form.opponent.dgrade ?? '—'}` : 'Recreational'}
                    {form.opponent.country ? ` · ${form.opponent.country}` : ''}
                  </div>
                </div>
                <button onClick={() => { setForm(f => ({ ...f, opponent: null, opponentSearch: '' })); setOpponentResults([]) }}
                  style={{ background: 'none', border: 'none', color: 'rgba(232,224,208,0.4)', cursor: 'pointer', fontSize: 18, padding: '0 4px' }}>×</button>
              </div>
            ) : (
              <input
                className="log-input"
                placeholder="Search by name…"
                value={form.opponentSearch}
                onChange={e => { setForm(f => ({ ...f, opponentSearch: e.target.value })); setShowOpponentDrop(true) }}
                onFocus={() => setShowOpponentDrop(true)}
              />
            )}

            {showOpponentDrop && opponentResults.length > 0 && !form.opponent && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#0f2e1a', border: `1px solid ${BORDER}`, borderRadius: 8, marginTop: 4, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                {opponentResults.map(opp => (
                  <div key={opp.id + opp.source} className="dropdown-item"
                    onClick={() => { setForm(f => ({ ...f, opponent: opp, opponentSearch: opp.display_name })); setShowOpponentDrop(false) }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ color: CREAM, fontSize: 14 }}>{opp.display_name}</span>
                        {opp.dgrade && <span className="gmono" style={{ color: 'rgba(232,224,208,0.4)', fontSize: 11, marginLeft: 8 }}>{opp.dgrade}</span>}
                      </div>
                      {priorityLabel(opp.priority) && (
                        <span className="priority-badge" style={{ background: priorityColor(opp.priority), color: priorityText(opp.priority) }}>
                          {priorityLabel(opp.priority)}
                        </span>
                      )}
                    </div>
                    {opp.country && <div style={{ color: 'rgba(232,224,208,0.35)', fontSize: 11, fontFamily: 'DM Mono, monospace', marginTop: 2 }}>{opp.country} · {opp.source}</div>}
                  </div>
                ))}
                <div className="dropdown-item"
                  onClick={() => { setShowOpponentDrop(false); setAddPlayerPrefill(form.opponentSearch); setShowAddPlayer(true) }}>
                  <span style={{ color: LIME, fontSize: 13 }}>+ Add new player…</span>
                </div>
              </div>
            )}

            {showOpponentDrop && form.opponentSearch.trim().length >= 2 && opponentResults.length === 0 && !form.opponent && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#0f2e1a', border: `1px solid ${BORDER}`, borderRadius: 8, marginTop: 4, overflow: 'hidden' }}>
                <div className="dropdown-item" onClick={() => { setShowOpponentDrop(false); setAddPlayerPrefill(form.opponentSearch); setShowAddPlayer(true) }}>
                  <span style={{ color: LIME, fontSize: 13 }}>+ Add "{form.opponentSearch}" as new player</span>
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* ── Venue ─────────────────────────────────────────────────────── */}
        <Section label="Venue" optional>
          <div ref={venueRef} style={{ position: 'relative' }}>
            {form.venue ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: CREAM, fontSize: 15 }}>{form.venue.canonical_name}</div>
                  <div className="gmono" style={{ color: 'rgba(232,224,208,0.4)', fontSize: 11 }}>
                    {[form.venue.city, form.venue.country].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <button onClick={() => setForm(f => ({ ...f, venue: null, venueSearch: '' }))}
                  style={{ background: 'none', border: 'none', color: 'rgba(232,224,208,0.4)', cursor: 'pointer', fontSize: 18, padding: '0 4px' }}>×</button>
              </div>
            ) : (
              <input
                className="log-input"
                placeholder="Search club or venue…"
                value={form.venueSearch}
                onChange={e => { setForm(f => ({ ...f, venueSearch: e.target.value })); setShowVenueDrop(true) }}
                onFocus={() => setShowVenueDrop(true)}
              />
            )}

            {showVenueDrop && venueResults.length > 0 && !form.venue && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#0f2e1a', border: `1px solid ${BORDER}`, borderRadius: 8, marginTop: 4, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                {venueResults.map(v => (
                  <div key={v.id} className="dropdown-item"
                    onClick={() => { setForm(f => ({ ...f, venue: v, venueSearch: v.canonical_name })); setShowVenueDrop(false) }}>
                    <div style={{ color: CREAM, fontSize: 14 }}>{v.canonical_name}</div>
                    {(v.city || v.country) && <div style={{ color: 'rgba(232,224,208,0.35)', fontSize: 11, fontFamily: 'DM Mono, monospace', marginTop: 2 }}>{[v.city, v.country].filter(Boolean).join(' · ')}</div>}
                  </div>
                ))}
                <div className="dropdown-item" onClick={() => { setShowVenueDrop(false); setAddVenuePrefill(form.venueSearch); setShowAddVenue(true) }}>
                  <span style={{ color: LIME, fontSize: 13 }}>+ Add new venue…</span>
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* ── Game settings ─────────────────────────────────────────────── */}
        <Section label="Game type">
          <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 9, padding: 4, border: `1px solid ${BORDER}` }}>
            {(['club','practice','casual','tournament'] as const).map(t => (
              <button key={t} className={`seg-btn${form.gameType === t ? ' on' : ''}`}
                onClick={() => setForm(f => ({ ...f, gameType: t }))}>
                {t}
              </button>
            ))}
          </div>
        </Section>

        <Section label="Points to">
          <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 9, padding: 4, border: `1px solid ${BORDER}`, maxWidth: 200 }}>
            {([13, 19] as const).map(p => (
              <button key={p} className={`seg-btn${form.pointsTo === p ? ' on' : ''}`}
                onClick={() => setForm(f => ({ ...f, pointsTo: p, player1Score: 0, player2Score: 0 }))}>
                {p} pts
              </button>
            ))}
          </div>
        </Section>

        <Section label="Date">
          <input
            type="date"
            className="log-input"
            value={form.gameDate}
            onChange={e => setForm(f => ({ ...f, gameDate: e.target.value }))}
            style={{ maxWidth: 180, colorScheme: 'dark' }}
          />
        </Section>

        {/* ── Scores ────────────────────────────────────────────────────── */}
        <Section label="Score">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Me */}
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ color: 'rgba(232,224,208,0.5)', fontSize: 12, fontFamily: 'DM Mono, monospace', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Me</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <button className="score-btn" onClick={() => changeScore(1, -1)}>−</button>
                <div className="score-display">{form.player1Score}</div>
                <button className="score-btn" onClick={() => changeScore(1, 1)}>+</button>
              </div>
            </div>

            <div style={{ color: 'rgba(232,224,208,0.25)', fontSize: 20, fontFamily: 'DM Mono, monospace', paddingTop: 24 }}>–</div>

            {/* Opponent */}
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ color: 'rgba(232,224,208,0.5)', fontSize: 12, fontFamily: 'DM Mono, monospace', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                {form.opponent ? form.opponent.first_name : 'Them'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <button className="score-btn" onClick={() => changeScore(2, -1)}>−</button>
                <div className="score-display">{form.player2Score}</div>
                <button className="score-btn" onClick={() => changeScore(2, 1)}>+</button>
              </div>
            </div>
          </div>

          {/* Quick-set final score */}
          <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <div style={{ color: 'rgba(232,224,208,0.35)', fontSize: 11, fontFamily: 'DM Mono, monospace', width: '100%', marginBottom: 2 }}>Quick set</div>
            {[
              { label: `${max}–0`, s1: max, s2: 0 },
              { label: `${max}–1`, s1: max, s2: 1 },
              { label: `${max}–2`, s1: max, s2: 2 },
              { label: `${max}–3`, s1: max, s2: 3 },
              { label: `0–${max}`, s1: 0, s2: max },
              { label: `1–${max}`, s1: 1, s2: max },
              { label: `2–${max}`, s1: 2, s2: max },
              { label: `3–${max}`, s1: 3, s2: max },
            ].map(q => (
              <button key={q.label}
                onClick={() => setForm(f => ({ ...f, player1Score: q.s1, player2Score: q.s2 }))}
                style={{
                  padding: '4px 10px', borderRadius: 6,
                  border: `1px solid ${form.player1Score === q.s1 && form.player2Score === q.s2 ? 'rgba(74,222,128,0.4)' : BORDER}`,
                  background: form.player1Score === q.s1 && form.player2Score === q.s2 ? 'rgba(74,222,128,0.12)' : INPUT,
                  color: form.player1Score === q.s1 && form.player2Score === q.s2 ? LIME : 'rgba(232,224,208,0.5)',
                  fontSize: 12, fontFamily: 'DM Mono, monospace', cursor: 'pointer'
                }}>
                {q.label}
              </button>
            ))}
          </div>
        </Section>

        {/* ── Who started hoop 1 ────────────────────────────────────────── */}
        <Section label="Who played first to hoop 1?" optional>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`starts-btn${form.playerStarts === 'me' ? ' on' : ''}`}
              onClick={() => setForm(f => ({ ...f, playerStarts: f.playerStarts === 'me' ? null : 'me' }))}>
              Me
            </button>
            <button className={`starts-btn${form.playerStarts === 'opponent' ? ' on' : ''}`}
              onClick={() => setForm(f => ({ ...f, playerStarts: f.playerStarts === 'opponent' ? null : 'opponent' }))}>
              {form.opponent?.first_name ?? 'Opponent'}
            </button>
          </div>
          <div style={{ color: 'rgba(232,224,208,0.25)', fontSize: 11, fontFamily: 'DM Mono, monospace', marginTop: 6 }}>
            Determined by coin toss before hoop 1
          </div>
        </Section>

        {/* ── Error ─────────────────────────────────────────────────────── */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: '#ef4444', fontSize: 13, fontFamily: 'DM Mono, monospace', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* ── Submit ────────────────────────────────────────────────────── */}
        <div style={{ marginTop: 8 }}>
          <button className="submit-btn" disabled={!isValid || submitting} onClick={handleSubmit}>
            {submitting ? 'Saving…' : 'Log Game'}
          </button>
          {!isValid && form.opponent && (
            <div style={{ textAlign: 'center', color: 'rgba(232,224,208,0.3)', fontSize: 12, fontFamily: 'DM Mono, monospace', marginTop: 8 }}>
              One player must reach {max} points to submit
            </div>
          )}
        </div>

      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {showAddPlayer && (
        <AddPlayerModal
          prefillName={addPlayerPrefill}
          userCountry={profile?.country ?? null}
          userId={user!.id}
          onSave={(opp) => {
            setForm(f => ({ ...f, opponent: opp, opponentSearch: opp.display_name }))
            setShowAddPlayer(false)
          }}
          onClose={() => setShowAddPlayer(false)}
        />
      )}
      {showAddVenue && (
        <AddVenueModal
          prefillName={addVenuePrefill}
          userCountry={profile?.country ?? null}
          userId={user!.id}
          onSave={(venue) => {
            setForm(f => ({ ...f, venue, venueSearch: venue.canonical_name }))
            setShowAddVenue(false)
          }}
          onClose={() => setShowAddVenue(false)}
        />
      )}

    </div>
  )
}

export default function LogGamePage() {
  return (
    <Suspense>
      <LogGameContent />
    </Suspense>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <label style={{ color: 'rgba(232,224,208,0.7)', fontSize: 12, fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: 1 }}>
          {label}
        </label>
        {optional && <span style={{ color: 'rgba(232,224,208,0.25)', fontSize: 10, fontFamily: 'DM Mono, monospace' }}>optional</span>}
      </div>
      {children}
    </div>
  )
}

// ── Modal backdrop ────────────────────────────────────────────────────────────
function ModalBackdrop({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 0 0' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: '#0f2e1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 520, padding: '24px 20px 40px', maxHeight: '92vh', overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  )
}

// ── Add Player Modal ──────────────────────────────────────────────────────────
function AddPlayerModal({ prefillName, userCountry, userId, onSave, onClose }: {
  prefillName: string
  userCountry: string | null
  userId: string
  onSave: (opp: Opponent) => void
  onClose: () => void
}) {
  const supabase = createClient()
  const nameParts = prefillName.trim().split(' ')
  const [firstName, setFirstName] = useState(nameParts[0] ?? '')
  const [lastName,  setLastName]  = useState(nameParts.slice(1).join(' ') ?? '')
  const [country,   setCountry]   = useState(userCountry ?? '')
  const [dgrade,    setDgrade]    = useState('')
  const [isPublic,  setIsPublic]  = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    if (!firstName.trim() || !lastName.trim()) { setErr('First and last name required'); return }
    setSaving(true); setErr(null)
    const { data, error } = await supabase
      .from('recreational_players')
      .insert({
        first_name:   firstName.trim(),
        last_name:    lastName.trim(),
        country:      country.trim() || null,
        approx_dgrade: dgrade ? parseInt(dgrade) : null,
        is_public:    isPublic,
        created_by:   userId,
      })
      .select('id')
      .single()
    setSaving(false)
    if (error) { setErr(error.message); return }
    onSave({
      id: data.id,
      display_name: `${firstName.trim()} ${lastName.trim()}`,
      first_name: firstName.trim(),
      last_name:  lastName.trim(),
      country:    country.trim() || null,
      dgrade:     dgrade ? parseInt(dgrade) : null,
      source:     'recreational',
      priority:   1,
    })
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <span style={{ color: '#e8e0d0', fontSize: 17, fontFamily: 'DM Serif Display, serif' }}>Add new player</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(232,224,208,0.4)', fontSize: 22, cursor: 'pointer', padding: '0 4px' }}>×</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <ModalLabel>First name *</ModalLabel>
          <input className="log-input" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" />
        </div>
        <div>
          <ModalLabel>Last name *</ModalLabel>
          <input className="log-input" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <ModalLabel>Country</ModalLabel>
          <input className="log-input" value={country} onChange={e => setCountry(e.target.value)} placeholder="CA" maxLength={10} />
        </div>
        <div>
          <ModalLabel>Approx dGrade</ModalLabel>
          <input className="log-input" type="number" value={dgrade} onChange={e => setDgrade(e.target.value)} placeholder="e.g. 1800" min={500} max={3000} />
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => setIsPublic(p => !p)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <div style={{ width: 36, height: 20, borderRadius: 10, background: isPublic ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.08)', border: `1px solid ${isPublic ? 'rgba(74,222,128,0.5)' : 'rgba(255,255,255,0.15)'}`, position: 'relative', transition: 'all 0.15s' }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: isPublic ? '#4ade80' : 'rgba(232,224,208,0.3)', position: 'absolute', top: 2, left: isPublic ? 18 : 2, transition: 'all 0.15s' }} />
          </div>
          <span style={{ color: 'rgba(232,224,208,0.6)', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
            {isPublic ? 'Public — other users can find this player' : 'Private — only visible to you'}
          </span>
        </button>
      </div>

      {err && <div style={{ color: '#ef4444', fontSize: 12, fontFamily: 'DM Mono, monospace', marginBottom: 12 }}>{err}</div>}

      <button className="submit-btn" disabled={saving} onClick={save}>
        {saving ? 'Saving…' : 'Add player'}
      </button>
    </ModalBackdrop>
  )
}

// ── Add Venue Modal ───────────────────────────────────────────────────────────
function AddVenueModal({ prefillName, userCountry, userId, onSave, onClose }: {
  prefillName: string
  userCountry: string | null
  userId: string
  onSave: (venue: VenueResult) => void
  onClose: () => void
}) {
  const supabase = createClient()
  const [name,    setName]    = useState(prefillName)
  const [short,   setShort]   = useState('')
  const [country, setCountry] = useState(userCountry ?? '')
  const [region,  setRegion]  = useState('')
  const [city,    setCity]    = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    if (!name.trim()) { setErr('Venue name required'); return }
    setSaving(true); setErr(null)
    const { data, error } = await supabase
      .from('venues')
      .insert({
        canonical_name: name.trim(),
        short_name:     short.trim() || null,
        country:        country.trim() || null,
        region:         region.trim() || null,
        city:           city.trim() || null,
        created_by:     userId,
        verified:       false,
        source:         'manual',
      })
      .select('id, canonical_name, short_name, country, city')
      .single()
    setSaving(false)
    if (error) { setErr(error.message); return }

    // If a short name was given, add it as an alias
    if (short.trim()) {
      await supabase.from('venue_aliases').insert({
        venue_id:   data.id,
        alias:      short.trim(),
        created_by: userId,
      }).then(() => {})  // best-effort, ignore duplicate errors
    }

    onSave(data as VenueResult)
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <span style={{ color: '#e8e0d0', fontSize: 17, fontFamily: 'DM Serif Display, serif' }}>Add new venue</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(232,224,208,0.4)', fontSize: 22, cursor: 'pointer', padding: '0 4px' }}>×</button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <ModalLabel>Full name *</ModalLabel>
        <input className="log-input" value={name} onChange={e => setName(e.target.value)} placeholder="North Toronto Croquet Club" />
      </div>

      <div style={{ marginBottom: 12 }}>
        <ModalLabel>Short name / abbreviation</ModalLabel>
        <input className="log-input" value={short} onChange={e => setShort(e.target.value)} placeholder="NTCC" />
        <div style={{ color: 'rgba(232,224,208,0.25)', fontSize: 11, fontFamily: 'DM Mono, monospace', marginTop: 4 }}>Added as a searchable alias</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div>
          <ModalLabel>Country</ModalLabel>
          <input className="log-input" value={country} onChange={e => setCountry(e.target.value)} placeholder="CA" maxLength={10} />
        </div>
        <div>
          <ModalLabel>Province / State</ModalLabel>
          <input className="log-input" value={region} onChange={e => setRegion(e.target.value)} placeholder="ON" maxLength={10} />
        </div>
        <div>
          <ModalLabel>City</ModalLabel>
          <input className="log-input" value={city} onChange={e => setCity(e.target.value)} placeholder="Toronto" />
        </div>
      </div>

      {err && <div style={{ color: '#ef4444', fontSize: 12, fontFamily: 'DM Mono, monospace', marginBottom: 12 }}>{err}</div>}

      <button className="submit-btn" disabled={saving} onClick={save}>
        {saving ? 'Saving…' : 'Add venue'}
      </button>
    </ModalBackdrop>
  )
}

function ModalLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ color: 'rgba(232,224,208,0.5)', fontSize: 11, fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{children}</div>
}
