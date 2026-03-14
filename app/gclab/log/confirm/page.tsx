'use client'

import React, { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import GCLabNav from '@/components/GCLabNav'

const G     = '#0d2818'
const LIME  = '#4ade80'
const CREAM = '#e8e0d0'
const CARD  = 'rgba(255,255,255,0.055)'
const BORDER = 'rgba(255,255,255,0.09)'

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
  .ghl   { font-family: 'DM Serif Display', serif; }
  .gmono { font-family: 'DM Mono', monospace; }

  .confirm-btn {
    width: 100%; padding: 14px;
    border-radius: 10px;
    font-size: 15px; font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer; transition: opacity 0.15s;
    border: none;
  }
  .confirm-btn:hover { opacity: 0.85; }

  .outline-btn {
    width: 100%; padding: 12px;
    border-radius: 10px;
    border: 1px solid ${BORDER};
    background: rgba(255,255,255,0.04);
    color: rgba(232,224,208,0.6);
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer; transition: all 0.15s;
  }
  .outline-btn:hover { border-color: rgba(74,222,128,0.3); color: ${LIME}; background: rgba(74,222,128,0.06); }

  .result-pill {
    display: inline-block;
    padding: 4px 14px; border-radius: 20px;
    font-size: 13px; font-family: 'DM Mono', monospace;
    font-weight: 500;
  }
`

function ConfirmContent() {
  const params  = useSearchParams()
  const router  = useRouter()

  const gameId     = params.get('id')       ?? ''
  const opponent   = params.get('opponent') ?? 'Opponent'
  const myScore    = parseInt(params.get('myScore')    ?? '0')
  const theirScore = parseInt(params.get('theirScore') ?? '0')
  const pointsTo   = parseInt(params.get('pointsTo')   ?? '13')
  const gameType   = params.get('gameType') ?? 'club'
  const venue      = params.get('venue')    ?? ''
  const opponentId = params.get('opponentId') ?? ''
  const opponentSrc = params.get('opponentSrc') ?? ''
  const venueId    = params.get('venueId') ?? ''

  const iWon = myScore > theirScore
  const resultLabel = iWon ? 'Win' : 'Loss'
  const resultBg    = iWon ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.12)'
  const resultColor = iWon ? LIME : '#ef4444'

  // "Same opponent" keeps opponent + venue + game type, resets scores
  function logSameOpponent() {
    const p = new URLSearchParams({
      prefill_opponent_name: opponent,
      prefill_opponent_id:   opponentId,
      prefill_opponent_src:  opponentSrc,
      prefill_venue_id:      venueId,
      prefill_venue_name:    venue,
      prefill_game_type:     gameType,
      prefill_points_to:     String(pointsTo),
    })
    router.push(`/gclab/log?${p}`)
  }

  // "Different opponent" keeps venue + game type only
  function logDifferentOpponent() {
    const p = new URLSearchParams({
      prefill_venue_id:    venueId,
      prefill_venue_name:  venue,
      prefill_game_type:   gameType,
      prefill_points_to:   String(pointsTo),
    })
    router.push(`/gclab/log?${p}`)
  }

  return (
    <div style={{ background: G, minHeight: '100vh', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{CSS}</style>
      <GCLabNav />

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '40px 16px 80px' }}>

        {/* Result card */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '32px 24px', textAlign: 'center', marginBottom: 28 }}>

          {/* Win / Loss */}
          <div style={{ marginBottom: 16 }}>
            <span className="result-pill" style={{ background: resultBg, color: resultColor }}>
              {resultLabel}
            </span>
          </div>

          {/* Score */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 20 }}>
            <div>
              <div style={{ color: 'rgba(232,224,208,0.45)', fontSize: 11, fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Me</div>
              <div className="gmono" style={{ fontSize: 52, fontWeight: 500, color: iWon ? LIME : CREAM, lineHeight: 1 }}>{myScore}</div>
            </div>
            <div style={{ color: 'rgba(232,224,208,0.2)', fontSize: 28, fontFamily: 'DM Mono, monospace', paddingTop: 20 }}>–</div>
            <div>
              <div style={{ color: 'rgba(232,224,208,0.45)', fontSize: 11, fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{opponent.split(' ')[0]}</div>
              <div className="gmono" style={{ fontSize: 52, fontWeight: 500, color: !iWon ? '#ef4444' : CREAM, lineHeight: 1 }}>{theirScore}</div>
            </div>
          </div>

          {/* Details */}
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Detail label="vs" value={opponent} />
            {venue && <Detail label="Venue" value={venue} />}
            <Detail label="Format" value={`${pointsTo}-pt ${gameType}`} />
          </div>
        </div>

        {/* Check mark */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M4 11.5L9 16.5L18 7" stroke={LIME} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="gmono" style={{ color: LIME, fontSize: 12, letterSpacing: 1 }}>Game logged</div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Primary: same opponent */}
          <button className="confirm-btn" style={{ background: LIME, color: G }} onClick={logSameOpponent}>
            Play {opponent.split(' ')[0]} again
          </button>

          {/* Secondary: different opponent */}
          <button className="confirm-btn" style={{ background: 'rgba(255,255,255,0.06)', color: CREAM, border: `1px solid ${BORDER}` }} onClick={logDifferentOpponent}>
            Log another game
          </button>

          {/* Edit last game */}
          <button className="outline-btn" onClick={() => router.push(`/gclab/log/edit?id=${gameId}`)}>
            Edit this game
          </button>

          {/* Go to history */}
          <button className="outline-btn" onClick={() => router.push('/gclab')}>
            Back to my dashboard
          </button>

        </div>
      </div>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
      <span style={{ color: 'rgba(232,224,208,0.35)', fontFamily: 'DM Mono, monospace' }}>{label}</span>
      <span style={{ color: 'rgba(232,224,208,0.75)' }}>{value}</span>
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense>
      <ConfirmContent />
    </Suspense>
  )
}
