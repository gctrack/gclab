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
]

const DESKTOP_TABS = [
  { href: '/rankings', label: 'Rankings', icon: '🏆', public: true },
  { href: '/profile', label: 'My Profile', icon: '👤', public: false },
  { href: '/compare', label: 'Compare', icon: '⚔️', public: false },
  { href: '/rankings?tab=Historical+Rankings', label: 'Historical', icon: '📈', public: true },
  { href: '/dashboard', label: 'Dashboard', icon: '🎯', public: false },
]

export default function GCLabNav({ role, isSignedIn = false, currentPath = '' }: Props & { isSignedIn?: boolean, currentPath?: string }) {
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
      <nav className="bg-white shadow-sm px-4 py-3 flex justify-between items-center relative z-50">
        <a href="/dashboard" className="text-xl font-bold text-green-600 shrink-0">GCLab</a>

        {/* Desktop tab bar */}
        <div className="hidden md:flex items-center gap-1 bg-gray-50 rounded-xl px-2 py-1.5 border border-gray-100">
          {DESKTOP_TABS.map(tab => {
            const isActive = currentPath === tab.href || currentPath.startsWith(tab.href.split('?')[0] + (tab.href.includes('?') ? '?' : '/')) && tab.href !== '/rankings'
            const isLocked = !tab.public && !isSignedIn
            return (
              <a
                key={tab.href}
                href={isLocked ? '/login' : tab.href}
                title={isLocked ? `Sign in to access ${tab.label}` : tab.label}
                className={[
                  'relative flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-white text-green-700 shadow-sm border border-gray-200'
                    : isLocked
                    ? 'text-gray-400 hover:text-gray-500 hover:bg-white/60'
                    : 'text-gray-600 hover:text-green-700 hover:bg-white/80',
                ].join(' ')}
              >
                <span className="text-base leading-none">{tab.icon}</span>
                <span>{tab.label}</span>
                {isLocked && (
                  <svg className="w-3 h-3 ml-0.5 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                  </svg>
                )}
              </a>
            )
          })}
        </div>
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
