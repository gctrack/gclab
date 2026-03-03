'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<any>(null)
  const [syncHistory, setSyncHistory] = useState<any[]>([])
  const pollRef = useRef<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        if (!data || !['admin', 'super_admin'].includes(data.role)) {
          router.push('/dashboard')
          return
        }
        setUser(user)
        setProfile(data)
        await loadSyncHistory()
        setLoading(false)
      } catch (err) {
        router.push('/dashboard')
      }
    }
    init()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  const loadSyncHistory = async () => {
    const { data } = await supabase
      .from('sync_log')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10)
    if (data) setSyncHistory(data)
  }

  const pollSyncStatus = (logId: string) => {
    pollRef.current = setInterval(async () => {
      const { data } = await supabase
        .from('sync_log')
        .select('*')
        .eq('id', logId)
        .single()
      if (data) {
        setSyncStatus(data)
        if (data.status === 'complete' || data.status === 'error') {
          clearInterval(pollRef.current)
          setSyncing(false)
          await loadSyncHistory()
        }
      }
    }, 5000)
  }

  const handleWcfSync = async () => {
    setSyncing(true)
    setSyncStatus({ status: 'running' })
    try {
      const res = await fetch('/api/wcf-sync', {
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET}` }
      })
      const data = await res.json()
      if (data.logId) {
        pollSyncStatus(data.logId)
      } else {
        setSyncing(false)
        setSyncStatus({ status: 'error', error: data.error })
      }
    } catch (err) {
      setSyncing(false)
      setSyncStatus({ status: 'error', error: 'Request failed' })
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <a href="/dashboard" className="text-xl font-bold text-green-600">GCLab</a>
        <div className="flex items-center gap-4">
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
            {profile.role === 'super_admin' ? 'Super Admin' : 'Admin'}
          </span>
          <a href="/dashboard" className="text-sm text-gray-600 hover:text-green-600">← Dashboard</a>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-bold mb-8">Admin Panel</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-5">
            <p className="text-sm text-gray-500 mb-1">Signed in as</p>
            <p className="text-sm font-medium text-gray-800 truncate">{user.email}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-5">
            <p className="text-sm text-gray-500 mb-1">Your Role</p>
            <p className="text-2xl font-bold text-gray-800">{profile.role === 'super_admin' ? 'Super Admin' : 'Admin'}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-5">
            <p className="text-sm text-gray-500 mb-1">Last Sync</p>
            <p className="text-sm font-medium text-gray-800">
              {syncHistory[0] ? new Date(syncHistory[0].started_at).toLocaleString() : 'Never'}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">WCF Player Sync</h3>
            <p className="text-sm text-gray-500 mb-4">Fetches the latest rankings from the WCF website and updates all player records and dGrade history.</p>
            <button
              onClick={handleWcfSync}
              disabled={syncing}
              className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition disabled:opacity-50"
            >
              {syncing ? 'Syncing...' : 'Run WCF Sync Now'}
            </button>

            {syncStatus && (
              <div className={`mt-4 p-4 rounded-md text-sm ${
                syncStatus.status === 'error' ? 'bg-red-50 text-red-700' :
                syncStatus.status === 'complete' ? 'bg-green-50 text-green-700' :
                'bg-blue-50 text-blue-700'
              }`}>
                {syncStatus.status === 'running' && (
                  <p>Sync in progress — checking for updates every 5 seconds...</p>
                )}
                {syncStatus.status === 'complete' && (
                  <div>
                    <p className="font-medium">Sync complete</p>
                    <p>Total: {syncStatus.total} — Created: {syncStatus.created} — Updated: {syncStatus.updated}</p>
                  </div>
                )}
                {syncStatus.status === 'error' && (
                  <p>Error: {syncStatus.error}</p>
                )}
              </div>
            )}

            {syncHistory.length > 0 && (
              <div className="mt-6">
                <p className="text-sm font-medium text-gray-700 mb-2">Sync History</p>
                <div className="space-y-2">
                  {syncHistory.map((log) => (
                    <div key={log.id} className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded flex justify-between">
                      <span>
                        {log.status === 'complete' ? `${log.total} players — ${log.created} created, ${log.updated} updated` :
                         log.status === 'error' ? `Failed: ${log.error}` : 'Running...'}
                      </span>
                      <span>{new Date(log.started_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 opacity-50">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">User Management</h3>
            <p className="text-sm text-gray-500">Coming soon</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 opacity-50">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Club Management</h3>
            <p className="text-sm text-gray-500">Coming soon</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 opacity-50">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Feature Flags</h3>
            <p className="text-sm text-gray-500">Coming soon</p>
          </div>
        </div>
      </main>
    </div>
  )
}