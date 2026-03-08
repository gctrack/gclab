// SAVE TO: app/admin/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import GCLabNav from '@/components/GCLabNav'

type ImportStep = { type: string; message: string }

const ROLES = ['user', 'club_manager', 'admin', 'super_admin']

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<any>(null)
  const [syncHistory, setSyncHistory] = useState<any[]>([])

  // Player history import
  const [playerSearch, setPlayerSearch] = useState('')
  const [playerSuggestions, setPlayerSuggestions] = useState<any[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null)
  const [importing, setImporting] = useState(false)
  const [importSteps, setImportSteps] = useState<ImportStep[]>([])
  const [importResult, setImportResult] = useState<any>(null)
  const importLogRef = useRef<HTMLDivElement>(null)

  // User management
  const [users, setUsers] = useState<any[]>([])
  const [userTotal, setUserTotal] = useState(0)
  const [userSearch, setUserSearch] = useState('')
  const [userPage, setUserPage] = useState(0)
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [userActionMsg, setUserActionMsg] = useState<{ id: string; msg: string; ok: boolean } | null>(null)
  const [savingUser, setSavingUser] = useState(false)
  const userSearchRef = useRef<any>(null)

  const pollRef = useRef<any>(null)
  const searchTimeoutRef = useRef<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (!data || !['admin', 'super_admin'].includes(data.role)) { router.push('/dashboard'); return }
        setUser(user)
        setProfile(data)
        await loadSyncHistory()
        if (data.role === 'super_admin') await loadUsers(0, '')
        setLoading(false)
      } catch { router.push('/dashboard') }
    }
    init()
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (importLogRef.current) importLogRef.current.scrollTop = importLogRef.current.scrollHeight
  }, [importSteps])

  const loadSyncHistory = async () => {
    const { data } = await supabase.from('sync_log').select('*').order('started_at', { ascending: false }).limit(10)
    if (data) setSyncHistory(data)
  }

  const loadUsers = async (page: number, search: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const params = new URLSearchParams({ page: String(page), pageSize: '20', search })
    const res = await fetch(`/api/admin/users?${params}`, { headers: { Authorization: `Bearer ${session.access_token}` } })
    const data = await res.json()
    if (data.profiles) { setUsers(data.profiles); setUserTotal(data.total || 0) }
  }

  const pollSyncStatus = (logId: string) => {
    pollRef.current = setInterval(async () => {
      const { data } = await supabase.from('sync_log').select('*').eq('id', logId).single()
      if (data) {
        setSyncStatus(data)
        if (data.status === 'complete' || data.status === 'error') {
          clearInterval(pollRef.current); setSyncing(false); await loadSyncHistory()
        }
      }
    }, 5000)
  }

  const handleWcfSync = async () => {
    setSyncing(true); setSyncStatus({ status: 'running' })
    try {
      const res = await fetch('/api/wcf-sync', { headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET}` } })
      const data = await res.json()
      if (data.logId) pollSyncStatus(data.logId)
      else { setSyncing(false); setSyncStatus({ status: 'error', error: data.error }) }
    } catch { setSyncing(false); setSyncStatus({ status: 'error', error: 'Request failed' }) }
  }

  const handlePlayerSearchChange = (value: string) => {
    setPlayerSearch(value); setSelectedPlayer(null)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (value.length < 2) { setPlayerSuggestions([]); return }
    searchTimeoutRef.current = setTimeout(async () => {
      const parts = value.trim().split(' ')
      let query = supabase.from('wcf_players').select('id, wcf_first_name, wcf_last_name, country, dgrade, world_ranking, history_imported').order('world_ranking', { ascending: true }).limit(8)
      if (parts.length >= 2) query = query.ilike('wcf_last_name', `%${parts[parts.length - 1]}%`).ilike('wcf_first_name', `%${parts[0]}%`)
      else query = query.or(`wcf_last_name.ilike.%${value}%,wcf_first_name.ilike.%${value}%`)
      const { data } = await query
      setPlayerSuggestions(data || [])
    }, 300)
  }

  const handleSelectPlayer = (player: any) => {
    setSelectedPlayer(player); setPlayerSearch(`${player.wcf_first_name} ${player.wcf_last_name}`)
    setPlayerSuggestions([]); setImportSteps([]); setImportResult(null)
  }

  const handleImportPlayerHistory = async () => {
    if (!selectedPlayer) return
    setImporting(true); setImportSteps([]); setImportResult(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setImporting(false); return }
      const response = await fetch('/api/wcf-history-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ wcf_player_id: selectedPlayer.id }),
      })
      if (!response.ok || !response.body) { setImportSteps([{ type: 'error', message: 'Import request failed' }]); setImporting(false); return }
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            setImportSteps(prev => [...prev, { type: data.step, message: data.message }])
            if (data.step === 'complete') { setImportResult(data); setSelectedPlayer((p: any) => ({ ...p, history_imported: true })) }
          } catch { }
        }
      }
    } catch (err) { setImportSteps(prev => [...prev, { type: 'error', message: String(err) }]) }
    setImporting(false)
  }

  const handleUserSearchChange = (value: string) => {
    setUserSearch(value)
    if (userSearchRef.current) clearTimeout(userSearchRef.current)
    userSearchRef.current = setTimeout(() => { setUserPage(0); loadUsers(0, value) }, 300)
  }

  const handleExpandUser = (userId: string, userData: any) => {
    if (expandedUser === userId) { setExpandedUser(null); setEditingUser(null) }
    else { setExpandedUser(userId); setEditingUser({ ...userData }) }
  }

  const handleSaveUser = async (userId: string) => {
    setSavingUser(true)
    const { data: { session } } = await supabase.auth.getSession(); if (!session) return
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(editingUser),
    })
    const data = await res.json()
    if (data.profile) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...data.profile } : u))
      setUserActionMsg({ id: userId, msg: 'Saved successfully', ok: true })
    } else { setUserActionMsg({ id: userId, msg: data.error || 'Save failed', ok: false }) }
    setSavingUser(false)
    setTimeout(() => setUserActionMsg(null), 3000)
  }

  const handleResetPassword = async (userId: string) => {
    const { data: { session } } = await supabase.auth.getSession(); if (!session) return
    const res = await fetch(`/api/admin/users/${userId}/reset-password`, { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } })
    const data = await res.json()
    if (data.success) setUserActionMsg({ id: userId, msg: `Password reset email sent to ${data.email}`, ok: true })
    else setUserActionMsg({ id: userId, msg: data.error || 'Failed', ok: false })
    setTimeout(() => setUserActionMsg(null), 4000)
  }

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}? This cannot be undone.`)) return
    const { data: { session } } = await supabase.auth.getSession(); if (!session) return
    const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` } })
    const data = await res.json()
    if (data.success) { setUsers(prev => prev.filter(u => u.id !== userId)); setUserTotal(prev => prev - 1); setExpandedUser(null) }
    else setUserActionMsg({ id: userId, msg: data.error || 'Delete failed', ok: false })
  }

  const stepIcon = (type: string) => {
    if (type === 'complete') return '✅'
    if (type === 'error' || type === 'year_error') return '❌'
    if (type === 'year_done') return '✓'
    if (type === 'year') return '⟳'
    return '•'
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50 relative">
      <GCLabNav role={profile?.role} />
      <div className="max-w-6xl mx-auto px-6 py-10 flex gap-8">

        {/* Sidebar */}
        <aside className="hidden lg:block w-48 shrink-0">
          <div className="sticky top-8 bg-white rounded-lg shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Admin</p>
            <nav className="space-y-1">
              {[
                { label: 'Overview', href: '#overview' },
                { label: 'WCF Sync', href: '#wcf-sync' },
                { label: 'History Import', href: '#history-import', superAdmin: true },
                { label: 'Users', href: '#users', superAdmin: true },
                { label: 'Clubs', href: '#clubs' },
                { label: 'Feature Flags', href: '#flags' },
              ].filter(item => !item.superAdmin || profile.role === 'super_admin').map(item => (
                <a key={item.href} href={item.href}
                  className="block text-sm text-gray-600 hover:text-green-700 hover:bg-green-50 px-2 py-1.5 rounded transition">
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <a href="/dashboard" className="block text-sm text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded transition">
                ← Dashboard
              </a>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
        <h2 className="text-2xl font-bold mb-8">Admin Panel</h2>

        <div id="overview" className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-5">
            <p className="text-sm text-gray-500 mb-1">Signed in as</p>
            <p className="text-sm font-medium text-gray-800 truncate">{user.email}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-5">
            <p className="text-sm text-gray-500 mb-1">Your Role</p>
            <p className="text-2xl font-bold text-gray-800">{profile.role === 'super_admin' ? 'Super Admin' : 'Admin'}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-5">
            <p className="text-sm text-gray-500 mb-1">Total Users</p>
            <p className="text-2xl font-bold text-gray-800">{userTotal || '—'}</p>
          </div>
        </div>

        <div className="space-y-6">

          {/* WCF Sync */}
          <div id="wcf-sync" className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">WCF Player Sync</h3>
            <p className="text-sm text-gray-500 mb-4">Fetches the latest rankings from the WCF website and updates all player records and dGrade history.</p>
            <button onClick={handleWcfSync} disabled={syncing} className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition disabled:opacity-50">
              {syncing ? 'Syncing...' : 'Run WCF Sync Now'}
            </button>
            {syncStatus && (
              <div className={`mt-4 p-4 rounded-md text-sm ${syncStatus.status === 'error' ? 'bg-red-50 text-red-700' : syncStatus.status === 'complete' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                {syncStatus.status === 'running' && <p>Sync in progress — checking every 5 seconds...</p>}
                {syncStatus.status === 'complete' && <div><p className="font-medium">Sync complete</p><p>Total: {syncStatus.total} — Created: {syncStatus.created} — Updated: {syncStatus.updated}</p></div>}
                {syncStatus.status === 'error' && <p>Error: {syncStatus.error}</p>}
              </div>
            )}
            {syncHistory.length > 0 && (
              <div className="mt-6">
                <p className="text-sm font-medium text-gray-700 mb-2">Sync History</p>
                <div className="space-y-2">
                  {syncHistory.map((log) => (
                    <div key={log.id} className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded flex justify-between">
                      <span>{log.status === 'complete' ? `${log.total} players — ${log.created} created, ${log.updated} updated` : log.status === 'error' ? `Failed: ${log.error}` : 'Running...'}</span>
                      <span>{new Date(log.started_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Player History Import — Super Admin only */}
          {profile.role === 'super_admin' && (
            <div id="history-import" className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Import Player WCF History</h3>
              <p className="text-sm text-gray-500 mb-4">Manually trigger a full WCF history import for any player.</p>
              <div className="relative mb-4">
                <input type="text" placeholder="Search player by name..." value={playerSearch} onChange={(e) => handlePlayerSearchChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500" />
                {playerSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
                    {playerSuggestions.map((player) => (
                      <button key={player.id} onClick={() => handleSelectPlayer(player)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between items-center">
                        <span className="text-gray-900">{player.wcf_first_name} {player.wcf_last_name}</span>
                        <span className="text-gray-400 text-xs flex items-center gap-2">#{player.world_ranking} · {player.dgrade}{player.history_imported && <span className="text-green-600">✓ imported</span>}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedPlayer && (
                <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{selectedPlayer.wcf_first_name} {selectedPlayer.wcf_last_name}</p>
                    <p className="text-xs text-gray-500">World #{selectedPlayer.world_ranking} · dGrade {selectedPlayer.dgrade}</p>
                    {selectedPlayer.history_imported && <p className="text-xs text-green-600 mt-0.5">✓ Previously imported — re-importing will refresh all data</p>}
                  </div>
                  <button onClick={handleImportPlayerHistory} disabled={importing} className="bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700 transition disabled:opacity-50 shrink-0 ml-4">
                    {importing ? 'Importing...' : selectedPlayer.history_imported ? '↻ Re-import History' : '↓ Import History'}
                  </button>
                </div>
              )}
              {importSteps.length > 0 && (
                <div>
                  <div ref={importLogRef} className="bg-gray-50 border border-gray-200 rounded-md p-3 max-h-48 overflow-y-auto font-mono text-xs space-y-1">
                    {importSteps.map((step, i) => (
                      <div key={i} className={`flex gap-2 ${step.type === 'complete' ? 'text-green-700 font-semibold' : step.type === 'error' || step.type === 'year_error' ? 'text-red-600' : step.type === 'year_done' ? 'text-gray-700' : 'text-gray-400'}`}>
                        <span>{stepIcon(step.type)}</span><span>{step.message}</span>
                      </div>
                    ))}
                    {importing && <div className="text-gray-400 animate-pulse">• Working...</div>}
                  </div>
                  {importResult && (
                    <div className="mt-3 grid grid-cols-3 gap-3">
                      <div className="bg-green-50 border border-green-100 rounded-md p-3 text-center"><p className="text-2xl font-bold text-green-700">{importResult.totalGames?.toLocaleString()}</p><p className="text-xs text-green-600 mt-0.5">Games imported</p></div>
                      <div className="bg-green-50 border border-green-100 rounded-md p-3 text-center"><p className="text-2xl font-bold text-green-700">{importResult.years}</p><p className="text-xs text-green-600 mt-0.5">Years of history</p></div>
                      <div className="bg-green-50 border border-green-100 rounded-md p-3 text-center"><p className="text-2xl font-bold text-green-700">{importResult.startingGrade ?? '—'}</p><p className="text-xs text-green-600 mt-0.5">Starting grade</p></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* User Management — Super Admin only */}
          {profile.role === 'super_admin' && (
            <div id="users" className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">User Management</h3>
                  <p className="text-sm text-gray-500">{userTotal} registered users</p>
                </div>
              </div>
              <input type="text" placeholder="Search by name or email..." value={userSearch} onChange={(e) => handleUserSearchChange(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 mb-4" />
              <div className="space-y-2">
                {users.map((u) => (
                  <div key={u.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button onClick={() => handleExpandUser(u.id, u)} className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 text-sm font-semibold flex items-center justify-center shrink-0">
                          {u.first_name?.[0]}{u.last_name?.[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{u.first_name} {u.last_name}</p>
                          <p className="text-xs text-gray-400 truncate">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.role === 'super_admin' ? 'bg-purple-100 text-purple-700' : u.role === 'admin' ? 'bg-blue-100 text-blue-700' : u.role === 'club_manager' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                          {u.role || 'user'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${u.wcf_player_id ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'}`}>
                          WCF {u.wcf_player_id ? '✓' : '—'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${u.wcf_player_id && u.history_imported ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400'}`}>
                          History {u.history_imported ? '✓' : '—'}
                        </span>
                        {u.last_sign_in_at && (
                          <span className="text-xs text-gray-400 hidden sm:block">
                            {new Date(u.last_sign_in_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                        <span className="text-gray-400 text-xs">{expandedUser === u.id ? '▲' : '▼'}</span>
                      </div>
                    </button>
                    {expandedUser === u.id && editingUser && (
                      <div className="border-t border-gray-100 bg-gray-50 px-4 py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">First Name</label>
                            <input value={editingUser.first_name || ''} onChange={(e) => setEditingUser((p: any) => ({ ...p, first_name: e.target.value }))}
                              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-500" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Last Name</label>
                            <input value={editingUser.last_name || ''} onChange={(e) => setEditingUser((p: any) => ({ ...p, last_name: e.target.value }))}
                              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-500" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Email</label>
                            <input value={editingUser.email || ''} onChange={(e) => setEditingUser((p: any) => ({ ...p, email: e.target.value }))}
                              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-500" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Role</label>
                            <select value={editingUser.role || 'user'} onChange={(e) => setEditingUser((p: any) => ({ ...p, role: e.target.value }))}
                              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-500">
                              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Country</label>
                            <input value={editingUser.country || ''} onChange={(e) => setEditingUser((p: any) => ({ ...p, country: e.target.value }))}
                              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-500" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">City</label>
                            <input value={editingUser.city || ''} onChange={(e) => setEditingUser((p: any) => ({ ...p, city: e.target.value }))}
                              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-500" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">dGrade</label>
                            <input type="number" value={editingUser.dgrade || ''} onChange={(e) => setEditingUser((p: any) => ({ ...p, dgrade: parseInt(e.target.value) || null }))}
                              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-green-500" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Joined</label>
                            <p className="text-sm text-gray-600 py-1.5">{u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</p>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Last Login</label>
                            <p className="text-sm text-gray-600 py-1.5">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never'}</p>
                          </div>
                        </div>
                        {userActionMsg?.id === u.id && userActionMsg && (
                          <p className={`text-xs mb-3 ${userActionMsg.ok ? 'text-green-600' : 'text-red-500'}`}>{userActionMsg.msg}</p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => handleSaveUser(u.id)} disabled={savingUser}
                            className="px-4 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 transition">
                            {savingUser ? 'Saving...' : 'Save Changes'}
                          </button>
                          <a href={`/profile/${u.id}`} target="_blank" rel="noopener noreferrer"
                            className="px-4 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition">
                            View Profile →
                          </a>
                          <button onClick={() => handleResetPassword(u.id)}
                            className="px-4 py-1.5 bg-white border border-amber-300 text-amber-700 text-sm rounded hover:bg-amber-50 transition">
                            Send Password Reset
                          </button>
                          <button onClick={() => handleDeleteUser(u.id, `${u.first_name} ${u.last_name}`)}
                            className="px-4 py-1.5 bg-white border border-red-300 text-red-600 text-sm rounded hover:bg-red-50 transition ml-auto">
                            Delete User
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {userTotal > 20 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs text-gray-400">Showing {userPage * 20 + 1}–{Math.min((userPage + 1) * 20, userTotal)} of {userTotal}</p>
                  <div className="flex gap-2">
                    <button onClick={() => { const p = userPage - 1; setUserPage(p); loadUsers(p, userSearch) }} disabled={userPage === 0}
                      className="px-3 py-1 text-sm border rounded disabled:opacity-40 hover:bg-gray-50">← Prev</button>
                    <button onClick={() => { const p = userPage + 1; setUserPage(p); loadUsers(p, userSearch) }} disabled={(userPage + 1) * 20 >= userTotal}
                      className="px-3 py-1 text-sm border rounded disabled:opacity-40 hover:bg-gray-50">Next →</button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div id="clubs" className="bg-white rounded-lg shadow-sm p-6 opacity-50">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Club Management</h3>
            <p className="text-sm text-gray-500">Coming soon</p>
          </div>

          <div id="flags" className="bg-white rounded-lg shadow-sm p-6 opacity-50">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Feature Flags</h3>
            <p className="text-sm text-gray-500">Coming soon</p>
          </div>

        </div>
        </main>
      </div>
    </div>
  )
}
