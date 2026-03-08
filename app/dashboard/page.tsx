'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import WcfMatchBanner from '@/components/WcfMatchBanner'
import GCLabNav from '@/components/GCLabNav'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setSignedIn(false); setLoading(false); return }
      setSignedIn(true)
      setUser(user)
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(data)
      setLoading(false)
    }
    getUser()
  }, [])

  const handleWcfLinked = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    setProfile(data)
  }

  const formatSyncDate = (dateStr: string) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  if (loading || signedIn === null) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>

  if (!signedIn) return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <GCLabNav role="" isSignedIn={false} currentPath="/dashboard" />
      <div className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="relative w-full max-w-lg">
          <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm" style={{ filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none' }}>
            <div className="p-6 border-b border-gray-100">
              <div className="h-6 w-48 bg-gray-200 rounded mb-2"/>
              <div className="h-4 w-32 bg-gray-100 rounded"/>
            </div>
            <div className="p-6 space-y-3">
              {[85,65,75,55,80,60].map((w,i) => (
                <div key={i} className="flex gap-3 items-center">
                  <div className="h-4 rounded bg-gray-200" style={{ width: `${w}%` }}/>
                  <div className="h-4 rounded bg-gray-100 w-16"/>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm rounded-2xl">
            <div className="text-center px-8 py-10 max-w-sm">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5 text-2xl">🎯</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Your personal dashboard</h2>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">Track your grade, link your WCF profile, and see your career stats at a glance. Free to set up in 30 seconds.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a href="/login?mode=signup" className="bg-green-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition text-center">Create free account</a>
                <a href="/login" className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg text-sm font-medium hover:border-green-500 hover:text-green-700 transition text-center">Sign in</a>
              </div>
              <p className="text-xs text-gray-400 mt-4">Free · No credit card · 30 seconds</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 relative">
      <GCLabNav role={profile?.role} isSignedIn={true} currentPath="/dashboard" />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-bold mb-1">
          Welcome, {profile?.first_name || user.email}
        </h2>

        {profile?.dgrade ? (
          <div className="flex items-baseline gap-2 mb-6">
            <p className="text-gray-600">dGrade: <span className="font-semibold text-gray-800">{profile.dgrade}</span></p>
            {profile.dgrade_last_synced_at ? (
              <p className="text-xs text-gray-400">Last updated {formatSyncDate(profile.dgrade_last_synced_at)}</p>
            ) : profile.wcf_player_id ? (
              <p className="text-xs text-gray-400">Updates automatically every day</p>
            ) : null}
          </div>
        ) : (
          <p className="text-gray-500 mb-6">Set your dGrade in your profile</p>
        )}

        {profile && !profile.wcf_player_id && profile.first_name && profile.last_name && (
          <WcfMatchBanner
            userId={user.id}
            firstName={profile.first_name}
            lastName={profile.last_name}
            onLinked={handleWcfLinked}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a href="/profile" className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition">
            <h3 className="font-semibold text-gray-800 mb-1">My Profile</h3>
            <p className="text-sm text-gray-500">Update your details, dGrade and equipment</p>
          </a>
          <a href="/games" className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition">
            <h3 className="font-semibold text-gray-800 mb-1">My Games</h3>
            <p className="text-sm text-gray-500">Log and view your game results</p>
          </a>
          <a href="/clubs" className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition">
            <h3 className="font-semibold text-gray-800 mb-1">Clubs</h3>
            <p className="text-sm text-gray-500">Manage your club memberships</p>
          </a>
          <a href="/rankings" className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition">
            <h3 className="font-semibold text-gray-800 mb-1">Rankings</h3>
            <p className="text-sm text-gray-500">WCF rankings, movers and country stats</p>
          </a>
          <a href="/compare" className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition">
            <h3 className="font-semibold text-gray-800 mb-1">Compare</h3>
            <p className="text-sm text-gray-500">Head to head stats, grade history and career comparisons</p>
          </a>
          {['admin', 'super_admin'].includes(profile?.role) && (
            <a href="/admin" className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition border border-purple-100">
              <h3 className="font-semibold text-gray-800 mb-1">⚙️ Admin Panel</h3>
              <p className="text-sm text-gray-500">Sync, user management and settings</p>
            </a>
          )}
        </div>
      </main>
    </div>
  )
}
