'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

type SyncRun = {
  id: string
  status: 'running' | 'complete' | 'error'
  started_at: string
  completed_at: string | null
  total: number | null
  created: number | null
  updated: number | null
  error: string | null
}

type ChangeEvent = {
  id: number
  sync_log_id: string
  event_type: 'grade_change' | 'new_games' | 'new_player' | 'error'
  wcf_player_id: string | null
  player_name: string | null
  country: string | null
  detail: Record<string, any> | null
  created_at: string
}

const EVENT_META = {
  grade_change: { label: 'Grade change', bg: '#f0fdf4', border: '#bbf7d0', dot: '#16a34a', text: '#15803d' },
  new_games:    { label: 'New games',    bg: '#eff6ff', border: '#bfdbfe', dot: '#2563eb', text: '#1d4ed8' },
  new_player:   { label: 'New player',   bg: '#fefce8', border: '#fde68a', dot: '#d97706', text: '#b45309' },
  error:        { label: 'Error',        bg: '#fef2f2', border: '#fecaca', dot: '#dc2626', text: '#b91c1c' },
}

const FLAG_URL = (code: string) =>
  `https://flagcdn.com/20x15/${code.toLowerCase().replace('gb-', '')}.png`

function countryToEmoji(code: string | null): string {
  if (!code) return ''
  const map: Record<string, string> = {
    'AU': '🇦🇺', 'NZ': '🇳🇿', 'GB-ENG': '󠁧󠁢󠁥󠁮󠁧󠁿', 'GB-SCT': '󠁧󠁢󠁳󠁣󠁴󠁿', 'GB-WLS': '󠁧󠁢󠁷󠁬󠁳󠁿',
    'US': '🇺🇸', 'IE': '🇮🇪', 'ZA': '🇿🇦', 'EG': '🇪🇬', 'SE': '🇸🇪', 'NO': '🇳🇴',
    'DE': '🇩🇪', 'CH': '🇨🇭', 'ES': '🇪🇸', 'PT': '🇵🇹', 'BE': '🇧🇪', 'CZ': '🇨🇿',
    'LV': '🇱🇻', 'CA': '🇨🇦', 'MX': '🇲🇽', 'HK': '🇭🇰',
  }
  return map[code] ?? ''
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return '…'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  const s = Math.round(ms / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

function GradeDiff({ diff }: { diff: number }) {
  const up = diff > 0
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 2,
      padding: '1px 6px', borderRadius: 4, fontSize: 12, fontWeight: 600,
      background: up ? '#f0fdf4' : '#fef2f2',
      color: up ? '#15803d' : '#b91c1c',
      border: `1px solid ${up ? '#bbf7d0' : '#fecaca'}`,
    }}>
      {up ? '▲' : '▼'} {up ? '+' : ''}{diff}
    </span>
  )
}

function ChangeDetail({ ev }: { ev: ChangeEvent }) {
  const d = ev.detail || {}
  if (ev.event_type === 'grade_change') {
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 500, color: '#6b7280', fontSize: 13 }}>
          {d.dgrade_before} → {d.dgrade_after}
        </span>
        <GradeDiff diff={d.diff} />
        {d.event_name && (
          <span style={{ fontSize: 12, color: '#9ca3af' }}>via {d.event_name}</span>
        )}
      </span>
    )
  }
  if (ev.event_type === 'new_games') {
    return (
      <span style={{ fontSize: 13, color: '#6b7280' }}>
        +{d.games_added} game{d.games_added !== 1 ? 's' : ''}
        {d.event_name && <span style={{ color: '#9ca3af' }}> · {d.event_name}</span>}
      </span>
    )
  }
  if (ev.event_type === 'new_player') {
    return (
      <span style={{ fontSize: 13, color: '#6b7280' }}>
        dGrade {d.dgrade} · Rank #{d.world_ranking}
      </span>
    )
  }
  if (ev.event_type === 'error') {
    return (
      <span style={{ fontSize: 12, color: '#b91c1c', fontFamily: 'monospace', wordBreak: 'break-all' }}>
        {d.message || 'Unknown error'}
      </span>
    )
  }
  return null
}

function FilterPill({
  label, active, count, color, onClick
}: {
  label: string, active: boolean, count: number, color: string, onClick: () => void
}) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 12px', borderRadius: 20, border: `1.5px solid ${active ? color : '#e5e7eb'}`,
      background: active ? color + '18' : 'white', cursor: 'pointer', fontSize: 13,
      color: active ? color : '#6b7280', fontWeight: active ? 600 : 400,
      transition: 'all 0.15s',
    }}>
      {label}
      <span style={{
        background: active ? color : '#f3f4f6', color: active ? 'white' : '#9ca3af',
        fontSize: 11, fontWeight: 700, borderRadius: 10, padding: '0 5px', lineHeight: '18px',
        minWidth: 18, textAlign: 'center',
      }}>{count}</span>
    </button>
  )
}

export default function SyncActivityLog() {
  const [runs, setRuns] = useState<SyncRun[]>([])
  const [changes, setChanges] = useState<ChangeEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const [{ data: runsData }, { data: changesData }] = await Promise.all([
      supabase
        .from('sync_log')
        .select('id, status, started_at, completed_at, total, created, updated, error')
        .gte('started_at', cutoff)
        .order('started_at', { ascending: false })
        .limit(50),
      supabase
        .from('sync_change_log')
        .select('id, sync_log_id, event_type, wcf_player_id, player_name, country, detail, created_at')
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false })
        .limit(500),
    ])

    setRuns(runsData || [])
    setChanges(changesData || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 60_000) // refresh every minute
    return () => clearInterval(interval)
  }, [load])

  const filteredChanges = changes.filter(c => {
    if (activeFilter && c.event_type !== activeFilter) return false
    if (selectedRunId && c.sync_log_id !== selectedRunId) return false
    return true
  })

  const counts = {
    grade_change: changes.filter(c => c.event_type === 'grade_change').length,
    new_games:    changes.filter(c => c.event_type === 'new_games').length,
    new_player:   changes.filter(c => c.event_type === 'new_player').length,
    error:        changes.filter(c => c.event_type === 'error').length,
  }

  const latestRun = runs[0]

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>
            Sync Activity Log
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#9ca3af' }}>
            Last 7 days · auto-refreshes every minute
          </p>
        </div>
        <button onClick={load} disabled={loading} style={{
          padding: '7px 14px', borderRadius: 8, border: '1.5px solid #e5e7eb',
          background: 'white', cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: 13, color: '#374151', fontWeight: 500,
          opacity: loading ? 0.5 : 1,
        }}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>

      {/* Latest run summary */}
      {latestRun && (
        <div style={{
          background: latestRun.status === 'error' ? '#fef2f2' : latestRun.status === 'running' ? '#eff6ff' : '#faf9f7',
          border: `1.5px solid ${latestRun.status === 'error' ? '#fecaca' : latestRun.status === 'running' ? '#bfdbfe' : '#ede9e2'}`,
          borderRadius: 12, padding: '14px 18px', marginBottom: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: latestRun.status === 'error' ? '#dc2626' : latestRun.status === 'running' ? '#2563eb' : '#16a34a',
              boxShadow: latestRun.status === 'running' ? '0 0 0 3px #bfdbfe' : undefined,
            }} />
            <span style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>
              Latest sync — {latestRun.status === 'running' ? 'in progress…' : latestRun.status}
            </span>
            <span style={{ fontSize: 13, color: '#9ca3af' }}>
              {formatDate(latestRun.started_at)} at {formatTime(latestRun.started_at)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
            {latestRun.total != null && (
              <span><b style={{ color: '#111827' }}>{latestRun.total.toLocaleString()}</b> <span style={{ color: '#9ca3af' }}>players</span></span>
            )}
            {latestRun.created != null && latestRun.created > 0 && (
              <span><b style={{ color: '#d97706' }}>+{latestRun.created}</b> <span style={{ color: '#9ca3af' }}>new</span></span>
            )}
            {latestRun.updated != null && (
              <span><b style={{ color: '#111827' }}>{latestRun.updated}</b> <span style={{ color: '#9ca3af' }}>updated</span></span>
            )}
            <span><b style={{ color: '#111827' }}>{formatDuration(latestRun.started_at, latestRun.completed_at)}</b> <span style={{ color: '#9ca3af' }}>duration</span></span>
          </div>
          {latestRun.error && (
            <div style={{ width: '100%', fontSize: 12, color: '#b91c1c', fontFamily: 'monospace', marginTop: 4 }}>
              {latestRun.error}
            </div>
          )}
        </div>
      )}

      {/* Sync run selector */}
      {runs.length > 1 && (
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500, whiteSpace: 'nowrap' }}>Filter by run:</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedRunId(null)}
              style={{
                padding: '3px 10px', borderRadius: 6, border: `1px solid ${selectedRunId === null ? '#374151' : '#e5e7eb'}`,
                background: selectedRunId === null ? '#374151' : 'white', cursor: 'pointer',
                fontSize: 12, color: selectedRunId === null ? 'white' : '#6b7280',
              }}
            >All</button>
            {runs.slice(0, 10).map(r => (
              <button
                key={r.id}
                onClick={() => setSelectedRunId(selectedRunId === r.id ? null : r.id)}
                style={{
                  padding: '3px 10px', borderRadius: 6,
                  border: `1px solid ${selectedRunId === r.id ? '#374151' : r.status === 'error' ? '#fecaca' : '#e5e7eb'}`,
                  background: selectedRunId === r.id ? '#374151' : r.status === 'error' ? '#fef2f2' : 'white',
                  cursor: 'pointer', fontSize: 12,
                  color: selectedRunId === r.id ? 'white' : r.status === 'error' ? '#b91c1c' : '#6b7280',
                }}
              >
                {formatDate(r.started_at)} {formatTime(r.started_at)}
                {r.status === 'error' && ' ⚠'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Event type filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(Object.entries(EVENT_META) as [string, typeof EVENT_META[keyof typeof EVENT_META]][]).map(([type, meta]) => (
          <FilterPill
            key={type}
            label={meta.label}
            active={activeFilter === type}
            count={counts[type as keyof typeof counts]}
            color={meta.dot}
            onClick={() => setActiveFilter(activeFilter === type ? null : type)}
          />
        ))}
        {(activeFilter || selectedRunId) && (
          <button onClick={() => { setActiveFilter(null); setSelectedRunId(null) }} style={{
            padding: '4px 12px', borderRadius: 20, border: '1.5px solid #e5e7eb',
            background: 'white', cursor: 'pointer', fontSize: 13, color: '#9ca3af',
          }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Change events list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 14 }}>Loading…</div>
      ) : filteredChanges.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 14,
          background: '#faf9f7', borderRadius: 12, border: '1.5px solid #ede9e2',
        }}>
          {changes.length === 0
            ? 'No sync activity in the last 7 days. Changes will appear here after the next sync runs.'
            : 'No events match the current filter.'}
        </div>
      ) : (
        <div style={{
          background: '#faf9f7', border: '1.5px solid #ede9e2',
          borderRadius: 12, overflow: 'hidden',
        }}>
          {filteredChanges.map((ev, idx) => {
            const meta = EVENT_META[ev.event_type]
            return (
              <div key={ev.id} style={{
                display: 'grid',
                gridTemplateColumns: '20px 140px 1fr auto',
                gap: 12, alignItems: 'center',
                padding: '11px 16px',
                borderBottom: idx < filteredChanges.length - 1 ? '1px solid #ede9e2' : undefined,
                background: 'white',
              }}>
                {/* Event type dot */}
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: meta.dot, margin: '0 auto',
                }} />

                {/* Player name + country */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {countryToEmoji(ev.country)} {ev.player_name || '—'}
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
                    <span style={{
                      display: 'inline-block', padding: '0 5px', borderRadius: 4,
                      background: meta.bg, color: meta.text,
                      border: `1px solid ${meta.border}`, fontSize: 10, fontWeight: 600,
                    }}>{meta.label}</span>
                  </div>
                </div>

                {/* Detail */}
                <div><ChangeDetail ev={ev} /></div>

                {/* Timestamp */}
                <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {formatDate(ev.created_at)}<br />{formatTime(ev.created_at)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {filteredChanges.length > 0 && (
        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 10, textAlign: 'right' }}>
          Showing {filteredChanges.length} event{filteredChanges.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
