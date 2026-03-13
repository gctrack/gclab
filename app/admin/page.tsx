'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import GCLabNav from '@/components/GCLabNav'

const supabase = createClient()

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Constants ─────────────────────────────────────────────────────────────────

const G    = '#0d2818'
const LIME = '#4ade80'

const ML = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
  .ghl  { font-family: 'DM Serif Display', serif; }
  .gmono{ font-family: 'DM Mono', monospace; }
  .gsans{ font-family: 'DM Sans', sans-serif; }
  .adm-row:hover { background: rgba(13,40,24,0.02) !important; }
`

const EVENT_META = {
  grade_change: { label: 'Grade change', bg: '#f0fdf4', border: '#bbf7d0', dot: '#16a34a', text: '#15803d' },
  new_games:    { label: 'New games',    bg: '#eff6ff', border: '#bfdbfe', dot: '#2563eb', text: '#1d4ed8' },
  new_player:   { label: 'New player',   bg: '#fefce8', border: '#fde68a', dot: '#d97706', text: '#b45309' },
  error:        { label: 'Error',        bg: '#fef2f2', border: '#fecaca', dot: '#dc2626', text: '#b91c1c' },
}

function countryToEmoji(code: string | null): string {
  if (!code) return ''
  const map: Record<string, string> = {
    'AU': '🇦🇺', 'NZ': '🇳🇿', 'GB-ENG': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'GB-SCT': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'GB-WLS': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
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

// ── Sub-components ────────────────────────────────────────────────────────────

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
        <span className="gmono" style={{ fontWeight: 500, color: '#374151', fontSize: 13 }}>
          {d.dgrade_before} → {d.dgrade_after}
        </span>
        <GradeDiff diff={d.diff} />
        {d.event_name && (
          <span className="gsans" style={{ fontSize: 12, color: '#9ca3af' }}>via {d.event_name}</span>
        )}
      </span>
    )
  }
  if (ev.event_type === 'new_games') {
    return (
      <span className="gsans" style={{ fontSize: 13, color: '#6b7280' }}>
        +{d.games_added} game{d.games_added !== 1 ? 's' : ''}
        {d.event_name && <span style={{ color: '#9ca3af' }}> · {d.event_name}</span>}
      </span>
    )
  }
  if (ev.event_type === 'new_player') {
    return (
      <span className="gsans" style={{ fontSize: 13, color: '#6b7280' }}>
        dGrade {d.dgrade} · Rank #{d.world_ranking}
      </span>
    )
  }
  if (ev.event_type === 'error') {
    return (
      <span className="gmono" style={{ fontSize: 12, color: '#b91c1c', wordBreak: 'break-all' }}>
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
    <button onClick={onClick} className="gsans" style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 12px', borderRadius: 20, border: `1.5px solid ${active ? color : '#e5e7eb'}`,
      background: active ? color + '18' : 'white', cursor: 'pointer', fontSize: 13,
      color: active ? color : '#6b7280', fontWeight: active ? 600 : 400,
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

// ── Sync Activity Log Section ─────────────────────────────────────────────────

function SyncActivityLog() {
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

    // Schedule next auto-refresh at 8:00 AM
    const scheduleNext = () => {
      const now = new Date()
      const next8am = new Date()
      next8am.setHours(8, 0, 0, 0)
      if (next8am <= now) next8am.setDate(next8am.getDate() + 1)
      const msUntil8am = next8am.getTime() - now.getTime()
      return setTimeout(() => {
        load()
        // After firing, schedule the next day
        const daily = setInterval(load, 24 * 60 * 60 * 1000)
        return () => clearInterval(daily)
      }, msUntil8am)
    }

    const timeout = scheduleNext()
    return () => clearTimeout(timeout)
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
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 className="ghl" style={{ margin: 0, fontSize: 20, fontWeight: 700, color: G }}>
            Sync Activity Log
          </h2>
          <p className="gsans" style={{ margin: '3px 0 0', fontSize: 13, color: '#9ca3af' }}>
            Last 7 days · auto-refreshes at 8am daily
          </p>
        </div>
        <button onClick={load} disabled={loading} className="gsans" style={{
          padding: '7px 14px', borderRadius: 8, border: '1.5px solid #e5e7eb',
          background: 'white', cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: 13, color: '#374151', fontWeight: 500,
          opacity: loading ? 0.5 : 1,
        }}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>

      {/* Latest run summary banner */}
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
            }} />
            <span className="gsans" style={{ fontWeight: 600, fontSize: 14, color: G }}>
              Latest sync — {latestRun.status === 'running' ? 'in progress…' : latestRun.status}
            </span>
            <span className="gsans" style={{ fontSize: 13, color: '#9ca3af' }}>
              {formatDate(latestRun.started_at)} at {formatTime(latestRun.started_at)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
            {latestRun.total != null && (
              <span className="gsans"><b className="gmono" style={{ color: G }}>{latestRun.total.toLocaleString()}</b> <span style={{ color: '#9ca3af' }}>players</span></span>
            )}
            {latestRun.created != null && latestRun.created > 0 && (
              <span className="gsans"><b className="gmono" style={{ color: '#d97706' }}>+{latestRun.created}</b> <span style={{ color: '#9ca3af' }}>new</span></span>
            )}
            {latestRun.updated != null && (
              <span className="gsans"><b className="gmono" style={{ color: G }}>{latestRun.updated}</b> <span style={{ color: '#9ca3af' }}>updated</span></span>
            )}
            <span className="gsans"><b className="gmono" style={{ color: G }}>{formatDuration(latestRun.started_at, latestRun.completed_at)}</b> <span style={{ color: '#9ca3af' }}>duration</span></span>
          </div>
          {latestRun.error && (
            <div className="gmono" style={{ width: '100%', fontSize: 12, color: '#b91c1c', marginTop: 4 }}>
              {latestRun.error}
            </div>
          )}
        </div>
      )}

      {/* Sync run selector */}
      {runs.length > 1 && (
        <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="gsans" style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500, whiteSpace: 'nowrap' }}>Filter by run:</span>
          <button
            onClick={() => setSelectedRunId(null)}
            className="gsans"
            style={{
              padding: '3px 10px', borderRadius: 6,
              border: `1px solid ${selectedRunId === null ? G : '#e5e7eb'}`,
              background: selectedRunId === null ? G : 'white', cursor: 'pointer',
              fontSize: 12, color: selectedRunId === null ? 'white' : '#6b7280',
            }}
          >All</button>
          {runs.slice(0, 14).map(r => (
            <button
              key={r.id}
              onClick={() => setSelectedRunId(selectedRunId === r.id ? null : r.id)}
              className="gsans"
              style={{
                padding: '3px 10px', borderRadius: 6,
                border: `1px solid ${selectedRunId === r.id ? G : r.status === 'error' ? '#fecaca' : '#e5e7eb'}`,
                background: selectedRunId === r.id ? G : r.status === 'error' ? '#fef2f2' : 'white',
                cursor: 'pointer', fontSize: 12,
                color: selectedRunId === r.id ? 'white' : r.status === 'error' ? '#b91c1c' : '#6b7280',
              }}
            >
              {formatDate(r.started_at)} {formatTime(r.started_at)}{r.status === 'error' ? ' ⚠' : ''}
            </button>
          ))}
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
          <button onClick={() => { setActiveFilter(null); setSelectedRunId(null) }} className="gsans" style={{
            padding: '4px 12px', borderRadius: 20, border: '1.5px solid #e5e7eb',
            background: 'white', cursor: 'pointer', fontSize: 13, color: '#9ca3af',
          }}>
            Clear filters
          </button>
        )}
      </div>

      {/* Events list */}
      {loading ? (
        <div className="gsans" style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 14 }}>Loading…</div>
      ) : filteredChanges.length === 0 ? (
        <div className="gsans" style={{
          textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 14,
          background: '#faf9f7', borderRadius: 12, border: '1.5px solid #ede9e2',
        }}>
          {changes.length === 0
            ? 'No activity yet — changes will appear here after the next sync runs.'
            : 'No events match the current filter.'}
        </div>
      ) : (
        <div style={{ background: 'white', border: '1.5px solid #ede9e2', borderRadius: 12, overflow: 'hidden' }}>
          {filteredChanges.map((ev, idx) => {
            const meta = EVENT_META[ev.event_type]
            return (
              <div key={ev.id} className="adm-row" style={{
                display: 'grid',
                gridTemplateColumns: '10px 180px 1fr auto',
                gap: 14, alignItems: 'center',
                padding: '11px 18px',
                borderBottom: idx < filteredChanges.length - 1 ? '1px solid #f3f0eb' : undefined,
              }}>
                {/* Dot */}
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: meta.dot }} />

                {/* Player */}
                <div style={{ minWidth: 0 }}>
                  <div className="gsans" style={{ fontSize: 13, fontWeight: 600, color: G, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {countryToEmoji(ev.country)} {ev.player_name || '—'}
                  </div>
                  <span style={{
                    display: 'inline-block', marginTop: 2, padding: '0 5px', borderRadius: 4,
                    background: meta.bg, color: meta.text,
                    border: `1px solid ${meta.border}`, fontSize: 10, fontWeight: 600,
                  }}>{meta.label}</span>
                </div>

                {/* Detail */}
                <div><ChangeDetail ev={ev} /></div>

                {/* Timestamp */}
                <div className="gsans" style={{ fontSize: 11, color: '#9ca3af', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {formatDate(ev.created_at)}<br />{formatTime(ev.created_at)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {filteredChanges.length > 0 && (
        <p className="gsans" style={{ fontSize: 12, color: '#9ca3af', marginTop: 10, textAlign: 'right' }}>
          {filteredChanges.length} event{filteredChanges.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}

// ── Main Admin Page ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'sync' | 'users' | 'import' | 'analytics'>('sync')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      setLoading(false)
    }
    init()
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0ece4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
        Loading…
      </div>
    )
  }

  const isAdmin = ['admin', 'super_admin'].includes(profile?.role)
  if (!isAdmin) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0ece4', display: 'flex', flexDirection: 'column' }}>
        <style dangerouslySetInnerHTML={{ __html: ML }} />
        <GCLabNav role={profile?.role} isSignedIn={!!profile} currentPath="/admin" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="gsans" style={{ textAlign: 'center', color: '#9ca3af', fontSize: 15 }}>
            You don't have permission to view this page.
          </div>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'sync',      label: '⚡ Sync Log' },
    { id: 'import',    label: '📥 Import Queue' },
    { id: 'users',     label: '👥 Users' },
    { id: 'analytics', label: '📊 Analytics' },
  ] as const

  return (
    <div style={{ minHeight: '100vh', background: '#f0ece4' }}>
      <style dangerouslySetInnerHTML={{ __html: ML }} />
      <GCLabNav role={profile?.role} isSignedIn={true} currentPath="/admin" />

      {/* Page header */}
      <div style={{ background: G, padding: '36px 48px 0', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 90% 0%, rgba(74,222,128,0.07) 0%, transparent 55%)' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#c4b5fd', padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }} className="gsans">
            Admin Panel
          </div>
          <h1 className="ghl" style={{ fontSize: 32, color: '#e8e0d0', fontWeight: 900, margin: '0 0 6px' }}>
            GC Rankings Admin
          </h1>
          <p className="gsans" style={{ fontSize: 14, color: 'rgba(232,224,208,0.5)', margin: '0 0 28px' }}>
            Sync monitoring, imports, user management
          </p>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4 }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="gsans"
                style={{
                  padding: '10px 20px', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer',
                  fontSize: 14, fontWeight: activeTab === tab.id ? 600 : 400,
                  background: activeTab === tab.id ? '#f0ece4' : 'rgba(255,255,255,0.07)',
                  color: activeTab === tab.id ? G : 'rgba(232,224,208,0.6)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 48px 60px' }}>

        {activeTab === 'sync' && (
          <SyncActivityLog />
        )}

        {activeTab === 'import' && (
          <ImportQueueSection />
        )}

        {activeTab === 'users' && (
          <UsersSection />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsSection />
        )}

      </div>
    </div>
  )
}

// ── Analytics Section ─────────────────────────────────────────────────────────

const FEATURE_LABELS: Record<string, string> = {
  player_history_search: '🔍 Player History',
  compare_run:           '⚖️ Compare',
  thread_created:        '💬 Thread Created',
  post_created:          '📝 Post Reply',
  dashboard_view:        '📊 Dashboard',
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ background: 'white', border: '1.5px solid #ede9e2', borderRadius: 12, padding: '18px 22px' }}>
      <div className="gmono" style={{ fontSize: 28, fontWeight: 500, color: G, lineHeight: 1 }}>{value}</div>
      <div className="gsans" style={{ fontSize: 11, color: '#9ca3af', marginTop: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      {sub && <div className="gsans" style={{ fontSize: 12, color: '#d97706', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

function TableCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', border: '1.5px solid #ede9e2', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #f3f0eb', background: 'rgba(13,40,24,0.03)' }}>
        <span className="gsans" style={{ fontWeight: 600, fontSize: 14, color: G }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

function TRow({ cols, header }: { cols: (string | number)[]; header?: boolean }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: `1fr repeat(${cols.length - 1}, auto)`,
      gap: 16, padding: '9px 18px', alignItems: 'center',
      borderBottom: '1px solid #f3f0eb',
      background: header ? 'rgba(13,40,24,0.03)' : undefined,
    }}>
      {cols.map((c, i) => (
        <span key={i} className={header ? 'gsans' : i === 0 ? 'gsans' : 'gmono'} style={{
          fontSize: header ? 10 : 13,
          color: header ? '#9ca3af' : i === 0 ? G : '#374151',
          textTransform: header ? 'uppercase' : undefined,
          letterSpacing: header ? '0.06em' : undefined,
          fontWeight: header ? undefined : i === 0 ? 500 : 600,
          textAlign: i === 0 ? 'left' : 'right',
          whiteSpace: 'nowrap',
        }}>{c}</span>
      ))}
    </div>
  )
}

function AnalyticsSection() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [compareSearch, setCompareSearch] = useState('')
  const [days, setDays] = useState(30)

  const load = useCallback(async (d: number) => {
    setLoading(true)
    const cutoff = new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('analytics_events')
      .select('event_name, user_id, properties, created_at')
      .gte('created_at', cutoff)
      .limit(5000)
    setEvents(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load(days) }, [days, load])

  // ── Aggregations ────────────────────────────────────────────────────────────

  const featureCounts = useMemo(() => {
    const map: Record<string, { total: number; users: Set<string> }> = {}
    events.forEach(e => {
      if (!map[e.event_name]) map[e.event_name] = { total: 0, users: new Set() }
      map[e.event_name].total++
      if (e.user_id) map[e.event_name].users.add(e.user_id)
    })
    return Object.entries(map)
      .map(([name, v]) => ({ name, total: v.total, unique: v.users.size }))
      .sort((a, b) => b.total - a.total)
  }, [events])

  const topSearched = useMemo(() => {
    const map: Record<string, { count: number; searchers: Set<string> }> = {}
    events.filter(e => e.event_name === 'player_history_search').forEach(e => {
      const p = e.properties?.player; if (!p) return
      if (!map[p]) map[p] = { count: 0, searchers: new Set() }
      map[p].count++
      if (e.user_id) map[p].searchers.add(e.user_id)
    })
    return Object.entries(map)
      .map(([name, v]) => ({ name, count: v.count, unique: v.searchers.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
  }, [events])

  const compareEvents = useMemo(() => events.filter(e => e.event_name === 'compare_run'), [events])

  const topDuos = useMemo(() => {
    const map: Record<string, number> = {}
    compareEvents.forEach(e => {
      const a = e.properties?.player_a, b = e.properties?.player_b
      if (!a || !b) return
      const key = [a, b].sort().join(' ↔ ')
      map[key] = (map[key] || 0) + 1
    })
    return Object.entries(map)
      .map(([pair, count]) => ({ pair, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
  }, [compareEvents])

  // Player-specific compare lookup: show all partners of the searched player
  const playerCompareResults = useMemo(() => {
    const q = compareSearch.trim().toLowerCase()
    if (!q) return []
    const map: Record<string, number> = {}
    compareEvents.forEach(e => {
      const a = e.properties?.player_a || ''
      const b = e.properties?.player_b || ''
      const aMatch = a.toLowerCase().includes(q)
      const bMatch = b.toLowerCase().includes(q)
      if (!aMatch && !bMatch) return
      const partner = aMatch ? b : a
      if (!partner) return
      map[partner] = (map[partner] || 0) + 1
    })
    return Object.entries(map)
      .map(([partner, count]) => ({ partner, count }))
      .sort((a, b) => b.count - a.count)
  }, [compareEvents, compareSearch])

  const totalEvents = events.length
  const uniqueUsers = new Set(events.filter(e => e.user_id).map(e => e.user_id)).size
  const topFeature = featureCounts[0]
  const topPlayer  = topSearched[0]

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 className="ghl" style={{ margin: 0, fontSize: 20, fontWeight: 700, color: G }}>Analytics</h2>
          <p className="gsans" style={{ margin: '3px 0 0', fontSize: 13, color: '#9ca3af' }}>
            Feature usage · last {days} days
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)} className="gsans" style={{
              padding: '6px 14px', borderRadius: 8, border: `1.5px solid ${days === d ? G : '#e5e7eb'}`,
              background: days === d ? G : 'white', color: days === d ? 'white' : '#374151',
              cursor: 'pointer', fontSize: 13, fontWeight: days === d ? 600 : 400,
            }}>{d}d</button>
          ))}
          <button onClick={() => load(days)} disabled={loading} className="gsans" style={{
            padding: '6px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb',
            background: 'white', cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: 13, color: '#374151', opacity: loading ? 0.5 : 1,
          }}>↻</button>
        </div>
      </div>

      {loading ? (
        <div className="gsans" style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>Loading…</div>
      ) : (
        <>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            <StatCard label="Total Events" value={totalEvents.toLocaleString()} />
            <StatCard label="Unique Users" value={uniqueUsers.toLocaleString()} />
            <StatCard
              label="Top Feature"
              value={topFeature ? (FEATURE_LABELS[topFeature.name] ?? topFeature.name) : '—'}
              sub={topFeature ? `${topFeature.total} uses` : undefined}
            />
            <StatCard
              label="Most Searched Player"
              value={topPlayer?.name ?? '—'}
              sub={topPlayer ? `${topPlayer.count} searches` : undefined}
            />
          </div>

          {/* Row 1: Feature usage + Most searched players */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

            <TableCard title="Feature Usage">
              <TRow cols={['Feature', 'Uses', 'Users']} header />
              {featureCounts.length === 0 ? (
                <div className="gsans" style={{ padding: '20px 18px', color: '#9ca3af', fontSize: 13 }}>No events yet.</div>
              ) : featureCounts.map(f => (
                <TRow key={f.name} cols={[FEATURE_LABELS[f.name] ?? f.name, f.total, f.unique]} />
              ))}
            </TableCard>

            <TableCard title="Most Searched Players">
              <TRow cols={['Player', 'Searches', 'By']} header />
              {topSearched.length === 0 ? (
                <div className="gsans" style={{ padding: '20px 18px', color: '#9ca3af', fontSize: 13 }}>No searches yet.</div>
              ) : topSearched.map(p => (
                <TRow key={p.name} cols={[p.name, p.count, `${p.unique} users`]} />
              ))}
            </TableCard>
          </div>

          {/* Row 2: Compare — top duos + player lookup */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            <TableCard title="Most Compared Duos">
              <TRow cols={['Pairing', 'Times']} header />
              {topDuos.length === 0 ? (
                <div className="gsans" style={{ padding: '20px 18px', color: '#9ca3af', fontSize: 13 }}>No compare runs yet.</div>
              ) : topDuos.map(d => (
                <TRow key={d.pair} cols={[d.pair, d.count]} />
              ))}
            </TableCard>

            <div>
              <TableCard title="Compare — Player Lookup">
                <div style={{ padding: '12px 18px', borderBottom: '1px solid #f3f0eb' }}>
                  <input
                    value={compareSearch}
                    onChange={e => setCompareSearch(e.target.value)}
                    placeholder="Type a player name…"
                    className="gsans"
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: 8,
                      border: '1.5px solid #e5e7eb', fontSize: 13, color: G,
                      background: '#fafaf9', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                  {compareSearch && (
                    <p className="gsans" style={{ fontSize: 12, color: '#9ca3af', margin: '6px 0 0' }}>
                      {playerCompareResults.length > 0
                        ? `${compareEvents.filter(e => (e.properties?.player_a || '').toLowerCase().includes(compareSearch.toLowerCase()) || (e.properties?.player_b || '').toLowerCase().includes(compareSearch.toLowerCase())).length} total comparisons involving this player`
                        : 'No comparisons found for this player.'}
                    </p>
                  )}
                </div>
                {compareSearch && playerCompareResults.length > 0 && (
                  <>
                    <TRow cols={['Compared against', 'Times']} header />
                    {playerCompareResults.map(r => (
                      <TRow key={r.partner} cols={[r.partner, r.count]} />
                    ))}
                  </>
                )}
                {!compareSearch && (
                  <div className="gsans" style={{ padding: '20px 18px', color: '#9ca3af', fontSize: 13 }}>
                    Search for a player to see all their head-to-head pairings.
                  </div>
                )}
              </TableCard>
            </div>
          </div>

          <p className="gsans" style={{ fontSize: 12, color: '#9ca3af', marginTop: 12, textAlign: 'right' }}>
            {totalEvents.toLocaleString()} events loaded · max 5,000 per query
          </p>
        </>
      )}
    </div>
  )
}

// ── Import Queue Section (placeholder until you need more) ────────────────────

function ImportQueueSection() {
  const [stats, setStats] = useState<{ pending: number; imported: number; total: number } | null>(null)

  useEffect(() => {
    const load = async () => {
      const [{ count: total }, { count: imported }] = await Promise.all([
        supabase.from('wcf_players').select('*', { count: 'exact', head: true }),
        supabase.from('wcf_players').select('*', { count: 'exact', head: true }).eq('history_imported', true),
      ])
      setStats({
        total: total || 0,
        imported: imported || 0,
        pending: (total || 0) - (imported || 0),
      })
    }
    load()
  }, [])

  return (
    <div>
      <h2 className="ghl" style={{ fontSize: 20, fontWeight: 700, color: G, marginBottom: 20 }}>Import Queue</h2>
      {stats ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, maxWidth: 600 }}>
          {[
            { label: 'Total Players', value: stats.total.toLocaleString(), color: G },
            { label: 'History Imported', value: stats.imported.toLocaleString(), color: '#16a34a' },
            { label: 'Pending Import', value: stats.pending.toLocaleString(), color: '#d97706' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'white', border: '1.5px solid #ede9e2', borderRadius: 12, padding: '20px 22px' }}>
              <div className="gmono" style={{ fontSize: 28, fontWeight: 500, color, lineHeight: 1 }}>{value}</div>
              <div className="gsans" style={{ fontSize: 11, color: '#9ca3af', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="gsans" style={{ color: '#9ca3af' }}>Loading…</div>
      )}
      <p className="gsans" style={{ fontSize: 13, color: '#9ca3af', marginTop: 20 }}>
        Batch import runs 4×/hour automatically via GitHub Actions.
      </p>
    </div>
  )
}

// ── Users Section ─────────────────────────────────────────────────────────────

function UsersSection() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role, dgrade, created_at, wcf_player_id')
        .order('created_at', { ascending: false })
        .limit(100)
      setUsers(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const updateRole = async (userId: string, role: string) => {
    await supabase.from('profiles').update({ role }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
  }

  return (
    <div>
      <h2 className="ghl" style={{ fontSize: 20, fontWeight: 700, color: G, marginBottom: 20 }}>
        Users ({users.length})
      </h2>
      {loading ? (
        <div className="gsans" style={{ color: '#9ca3af' }}>Loading…</div>
      ) : (
        <div style={{ background: 'white', border: '1.5px solid #ede9e2', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 120px', padding: '10px 18px', background: 'rgba(13,40,24,0.04)', borderBottom: '1px solid #ede9e2' }}>
            {['Name', 'dGrade', 'WCF', 'Role'].map(h => (
              <span key={h} className="gsans" style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
            ))}
          </div>
          {users.map((u, idx) => (
            <div key={u.id} className="adm-row" style={{
              display: 'grid', gridTemplateColumns: '1fr 80px 80px 120px',
              padding: '10px 18px', alignItems: 'center',
              borderBottom: idx < users.length - 1 ? '1px solid #f3f0eb' : undefined,
            }}>
              <div>
                <div className="gsans" style={{ fontSize: 13, fontWeight: 600, color: G }}>
                  {u.first_name || ''} {u.last_name || ''}
                  {!u.first_name && !u.last_name && <span style={{ color: '#9ca3af' }}>Anonymous</span>}
                </div>
                <div className="gsans" style={{ fontSize: 11, color: '#9ca3af' }}>
                  {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <span className="gmono" style={{ fontSize: 13, color: '#374151' }}>{u.dgrade || '—'}</span>
              <span style={{ fontSize: 13 }}>{u.wcf_player_id ? '✅' : '—'}</span>
              <select
                value={u.role || 'user'}
                onChange={e => updateRole(u.id, e.target.value)}
                className="gsans"
                style={{
                  fontSize: 12, padding: '4px 8px', borderRadius: 6,
                  border: '1px solid #e5e7eb', background: 'white', color: '#374151', cursor: 'pointer',
                }}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
