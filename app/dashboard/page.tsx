'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import WcfMatchBanner from '@/components/WcfMatchBanner'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
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

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

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
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-green-600">GCLab</h1>
        <div className="flex items-center gap-4">
          {profile && ['admin', 'super_admin'].includes(profile.role) && (
            <a href="/admin" className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-medium hover:bg-purple-200 transition">
              Admin
            </a>
          )}
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-600 hover:text-red-500"
          >
            Sign Out
          </button>
        </div>
      </nav>
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
        </div>
      </main>
    </div>
  )
}