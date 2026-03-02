'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
        setLoading(false)
      }
    }
    getUser()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-green-600">GCLab</h1>
        <button
          onClick={handleSignOut}
          className="text-sm text-gray-600 hover:text-red-500"
        >
          Sign Out
        </button>
      </nav>
      <main className="max-w-4xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-bold mb-2">Welcome to GCLab</h2>
        <p className="text-gray-600">You are signed in as {user.email}</p>
      </main>
    </div>
  )
}