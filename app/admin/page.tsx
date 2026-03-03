'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)
  const [syncLog, setSyncLog] = useState<any[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        console.log('user:', user, 'userError:', userError)
        if (!user) {
          router.push('/login')
          return
        }
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        console.log('profile data:', data, 'profile error:', error)
        if (!data) {
          router.push('/dashboard?debug=no_profile')
          return
        }
        if (!['admin', 'super_admin'].includes(data.role)) {
          router.push('/dashboard?debug=wrong_role&role=' + data.role)
          return
        }
        setUser(user)
        setProfile(data)
        setLoading(false)
      } catch (err) {
        console.error('Admin init error:', err)
        router.push('/dashboard?debug=exception')
      }
    }
    init()
  }, [])

  const handleWcfSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    const start = Date.now()
    try {
      const res = await fetch('/api/wcf-sync', {
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET}` }
      })
      const data = await res.json()
      const duration = ((Date.now() - start) / 1000).toFixed(1)
      const result = { ...data, duration, timestamp: new Date().toLocaleString() }
      setSyncResult(result)
      setSyncLog(prev => [result, ...prev].slice(0, 10))
    } catch (err) {
      setSyncResult({ error: 'Sync failed', timestamp: new Date().toLocaleString() })
    }
    setSyncing(false)
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
            <p className="text-sm text-gray-500 mb-1">WCF Players</p>
            <p className="text-2xl font-bold text-gray-800">Synced</p>
            <p className="text-xs text-gray-400 mt-1">Last sync: check logs below</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-5">
            <p className="text-sm text-gray-500 mb-1">Your Role</p>
            <p className="text-2xl font-bold text-gray-800">{profile.role === 'super_admin' ? 'Super Admin' : 'Admin'}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-5">
            <p className="text-sm text-gray-500 mb-1">Signed in as</p>
            <p className="text-sm font-medium text-gray-800 truncate">{user.email}</p>
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
              {syncing ? 'Syncing... (this may take a few minutes)' : 'Run WCF Sync Now'}
            </button>

            {syncResult && (
              <div className={`mt-4 p-4 rounded-md text-sm ${syncResult.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                {syncResult.error ? (
                  <p>Error: {syncResult.error}</p>
                ) : (
                  <div>
                    <p className="font-medium">Sync completed in {syncResult.duration}s</p>
                    <p>Total players: {syncResult.total} — Created: {syncResult.created} — Updated: {syncResult.updated}</p>
                    <p className="text-xs mt-1 opacity-70">{syncResult.timestamp}</p>
                  </div>
                )}
              </div>
            )}

            {syncLog.length > 1 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Recent Syncs</p>
                <div className="space-y-2">
                  {syncLog.slice(1).map((log, i) => (
                    <div key={i} className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded">
                      {log.error ? `Failed — ${log.timestamp}` : `${log.total} players — ${log.created} created, ${log.updated} updated — ${log.duration}s — ${log.timestamp}`}
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
            <p className="text-sm text-gray.500">Coming soon</p>
          </div>
        </div>
      </main>
    </div>
  )
}