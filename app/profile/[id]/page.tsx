// SAVE TO: app/profile/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import GCLabNav from '@/components/GCLabNav'

export default function ProfileViewPage() {
  const [viewerProfile, setViewerProfile] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [wcfPlayer, setWcfPlayer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const params = useParams()
  const targetId = params.id as string
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Check viewer is admin
      const { data: vp } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!vp || !['admin', 'super_admin'].includes(vp.role)) {
        router.push('/dashboard'); return
      }
      setViewerProfile(vp)

      // Load target profile
      const { data: tp } = await supabase.from('profiles').select('*').eq('id', targetId).single()
      if (!tp) { router.push('/admin'); return }
      setProfile(tp)

      // Load WCF player if linked
      if (tp.wcf_player_id) {
        const { data: wp } = await supabase
          .from('wcf_players')
          .select('wcf_first_name, wcf_last_name, dgrade, egrade, world_ranking, games, win_percentage, history_imported, wcf_profile_url')
          .eq('id', tp.wcf_player_id)
          .single()
        if (wp) setWcfPlayer(wp)
      }

      setLoading(false)
    }
    init()
  }, [targetId])

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  if (!profile) return null

  const Field = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800">{value || <span className="text-gray-300">—</span>}</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <GCLabNav role={viewerProfile?.role} />
      <main className="max-w-3xl mx-auto px-6 py-10">

        {/* Back link */}
        <a href="/admin#users" className="text-sm text-gray-400 hover:text-gray-600 mb-6 inline-block">← Back to Users</a>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-green-100 text-green-700 text-2xl font-bold flex items-center justify-center shrink-0">
            {profile.first_name?.[0]}{profile.last_name?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900">{profile.first_name} {profile.last_name}</h2>
            <p className="text-sm text-gray-500">{profile.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                profile.role === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                profile.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-600'
              }`}>{profile.role || 'user'}</span>
              {profile.country && <span className="text-xs text-gray-500">{profile.country}</span>}
              {profile.city && <span className="text-xs text-gray-400">{profile.city}</span>}
            </div>
          </div>
          <a href={`/admin`} onClick={(e) => { e.preventDefault(); router.push(`/admin#users`) }}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded hover:bg-gray-50 transition shrink-0">
            Edit in Admin →
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Profile details */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Profile Details</h3>
            <div className="space-y-3">
              <Field label="dGrade" value={profile.dgrade} />
              <Field label="Bio" value={profile.bio} />
              <Field label="Mallet" value={profile.mallet_type} />
              <Field label="Grip Notes" value={profile.grip_notes} />
              <Field label="Joined" value={profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null} />
            </div>
          </div>

          {/* WCF data */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">WCF Account</h3>
            {wcfPlayer ? (
              <div className="space-y-3">
                <Field label="WCF Name" value={`${wcfPlayer.wcf_first_name} ${wcfPlayer.wcf_last_name}`} />
                <Field label="World Ranking" value={wcfPlayer.world_ranking ? `#${wcfPlayer.world_ranking}` : null} />
                <Field label="dGrade" value={wcfPlayer.dgrade} />
                <Field label="eGrade" value={wcfPlayer.egrade} />
                <Field label="Games" value={wcfPlayer.games} />
                <Field label="Win %" value={wcfPlayer.win_percentage != null ? `${wcfPlayer.win_percentage}%` : null} />
                <div className="flex items-center gap-2 pt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${wcfPlayer.history_imported ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400'}`}>
                    History {wcfPlayer.history_imported ? '✓ imported' : 'not imported'}
                  </span>
                  {wcfPlayer.wcf_profile_url && (
                    <a href={wcfPlayer.wcf_profile_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-green-600 hover:underline">WCF Profile →</a>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">No WCF account linked</p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
