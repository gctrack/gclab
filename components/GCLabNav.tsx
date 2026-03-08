'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Props = {
  role?: string
}

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/profile', label: 'My Profile' },
  { href: '/rankings', label: 'Rankings' },
  { href: '/compare', label: 'Compare' },
  { href: '/rankings?tab=Historical+Rankings', label: 'Historical Rankings' },
  { href: '/games', label: 'My Games' },
  { href: '/clubs', label: 'Clubs' },
]

export default function GCLabNav({ role }: Props) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isAdmin = role === 'admin' || role === 'super_admin'

  return (
    <>
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center relative z-50">
        <a href="/dashboard" className="text-xl font-bold text-green-600">GCLab</a>
        <button
          onClick={() => setOpen(!open)}
          className="flex flex-col justify-center items-center w-8 h-8 gap-1.5 group"
          aria-label="Menu"
        >
          <span className={`block w-6 h-0.5 bg-gray-600 transition-all duration-200 ${open ? 'rotate-45 translate-y-2' : ''}`} />
          <span className={`block w-6 h-0.5 bg-gray-600 transition-all duration-200 ${open ? 'opacity-0' : ''}`} />
          <span className={`block w-6 h-0.5 bg-gray-600 transition-all duration-200 ${open ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </nav>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          {/* Menu */}
          <div className="absolute right-4 top-16 z-50 bg-white border border-gray-200 rounded-lg shadow-lg w-56 py-2">
            {NAV_LINKS.map(link => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-green-600 transition"
              >
                {link.label}
              </a>
            ))}
            {isAdmin && (
              <>
                <div className="border-t my-1" />
                <a
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2.5 text-sm text-purple-700 hover:bg-purple-50 transition"
                >
                  ⚙️ Admin Panel
                </a>
              </>
            )}
            <div className="border-t my-1" />
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition"
            >
              Sign Out
            </button>
          </div>
        </>
      )}
    </>
  )
}
