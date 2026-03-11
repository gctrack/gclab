'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const G = '#0d2818'
const LIME = '#4ade80'
const CREAM = '#e8e0d0'

function Logo() {
  return (
    <svg width="30" height="36" viewBox="0 0 44 52" fill="none">
      <rect x="13" y="2" width="18" height="8" rx="2" fill="rgba(74,222,128,0.1)" stroke={LIME} strokeWidth="1.6"/>
      <path d="M13 10 L2 44 Q0 50 4 51 L40 51 Q44 50 42 44 L31 10 Z" fill="rgba(74,222,128,0.07)" stroke={LIME} strokeWidth="1.6" strokeLinejoin="round"/>
      <circle cx="14" cy="40" r="6.5" fill="#ef4444"/>
      <circle cx="30" cy="40" r="6.5" fill="#3b82f6"/>
      <circle cx="22" cy="29" r="6.5" fill="#eab308"/>
    </svg>
  )
}

type Props = {
  role?: string
  isSignedIn?: boolean
  currentPath?: string
}

const NAV_LINKS = [
  { href: '/dashboard',    label: 'Dashboard',            icon: '🎯' },
  { href: '/profile',      label: 'My Profile',           icon: '👤' },
  { href: '/rankings',     label: 'WCF Rankings',         icon: '🏆' },
  { href: '/leaderboards', label: 'Stats & Leaderboards', icon: '📊' },
  { href: '/compare',      label: 'Compare',              icon: '⚔️'  },
  { href: '/history',      label: 'Player History',       icon: '📈' },
  { href: '/community',    label: 'Community',            icon: '💬' },
]

const DESKTOP_TABS = [
  { href: '/dashboard',    label: 'Dashboard',    icon: '🎯', public: false },
  { href: '/profile',      label: 'My Profile',   icon: '👤', public: false },
  { href: '/rankings',     label: 'WCF Rankings', icon: '🏆', public: true  },
  { href: '/leaderboards', label: 'Leaderboards', icon: '📊', public: true  },
  { href: '/compare',      label: 'Compare',      icon: '⚔️',  public: false },
  { href: '/history',      label: 'Player History', icon: '📈', public: true },
  { href: '/community',    label: 'Community',    icon: '💬', public: false },
]

const navStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600&display=swap');
  .gcnav-logo { font-family: 'Playfair Display', serif; }
  .gcnav-tab  { font-family: 'DM Sans', sans-serif; transition: all 0.15s; }
  .gcnav-desk { display: none; }
  @media (min-width: 900px) { .gcnav-desk { display: flex; align-items: center; gap: 1px; } }
  .gcnav-drop-item:hover { background: rgba(255,255,255,0.06) !important; color: ${CREAM} !important; }
`

export default function GCLabNav({ role, isSignedIn: isSignedInProp, currentPath = '' }: Props) {
  const [open, setOpen] = useState(false)
  // Start as null (unknown) — resolve via internal auth check
  const [authResolved, setAuthResolved] = useState<boolean | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // If prop is explicitly provided and already true, trust it immediately
    if (isSignedInProp === true) {
      setAuthResolved(true)
      return
    }
    // Otherwise check auth ourselves so we don't lock links prematurely
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthResolved(!!session)
    })
  }, [isSignedInProp])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isAdmin = role === 'admin' || role === 'super_admin'

  const isActive = (href: string) => {
    const base = href.split('?')[0]
    return currentPath === base || currentPath.startsWith(base + '/')
  }

  // While auth is resolving (null), treat as signed-in so links aren't locked prematurely.
  // The destination page will handle its own auth guard if the user truly isn't signed in.
  const signedIn = authResolved === null ? true : authResolved

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: navStyles }}/>
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: G, borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', flexShrink: 0 }}>
          <Logo/>
          <span className="gcnav-logo" style={{ fontSize: 19, color: CREAM, fontWeight: 700, letterSpacing: '-0.3px' }}>GCLab</span>
        </a>
        <div className="gcnav-desk">
          {DESKTOP_TABS.map(tab => {
            const active = isActive(tab.href)
            const locked = !tab.public && !signedIn
            return (
              <a key={tab.href} href={locked ? '/login' : tab.href} title={locked ? `Sign in for ${tab.label}` : tab.label} className="gcnav-tab"
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 8, fontSize: 12, fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap',
                  background: active ? 'rgba(74,222,128,0.14)' : 'transparent',
                  border: `1px solid ${active ? 'rgba(74,222,128,0.3)' : 'transparent'}`,
                  color: active ? LIME : locked ? 'rgba(232,224,208,0.25)' : 'rgba(232,224,208,0.55)',
                }}>
                <span style={{ fontSize: 12, lineHeight: 1 }}>{tab.icon}</span>
                <span>{tab.label}</span>
                {locked && <svg width="9" height="9" fill="currentColor" viewBox="0 0 20 20" style={{ opacity: 0.4 }}><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>}
              </a>
            )
          })}
        </div>
        <button onClick={() => setOpen(!open)} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: 32, height: 32, gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }} aria-label="Menu">
          {[open ? 'rotate(45deg) translate(5px, 5px)' : 'none', '', open ? 'rotate(-45deg) translate(5px, -5px)' : 'none'].map((tf, i) => (
            <span key={i} style={{ display: 'block', width: 20, height: 1.5, background: 'rgba(232,224,208,0.65)', borderRadius: 1, transition: 'all 0.18s', transform: tf || 'none', opacity: i === 1 && open ? 0 : 1 }}/>
          ))}
        </button>
      </nav>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)}/>
          <div style={{ position: 'fixed', right: 12, top: 58, zIndex: 50, background: '#0f2e1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, boxShadow: '0 20px 48px rgba(0,0,0,0.5)', width: 240, padding: '6px 0' }}>
            {NAV_LINKS.map(link => (
              <a key={link.href} href={link.href} onClick={() => setOpen(false)} className="gcnav-tab gcnav-drop-item"
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', textDecoration: 'none', fontSize: 14, color: isActive(link.href) ? LIME : 'rgba(232,224,208,0.6)', fontWeight: isActive(link.href) ? 600 : 400 }}>
                <span style={{ width: 18, textAlign: 'center' }}>{link.icon}</span>
                <span>{link.label}</span>
              </a>
            ))}
            {isAdmin && (<>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', margin: '4px 0' }}/>
              <a href="/admin" onClick={() => setOpen(false)} className="gcnav-tab gcnav-drop-item" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', textDecoration: 'none', fontSize: 14, color: 'rgba(192,132,252,0.7)' }}>
                <span style={{ width: 18, textAlign: 'center' }}>⚙️</span><span>Admin Panel</span>
              </a>
            </>)}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', margin: '4px 0' }}/>
            {signedIn ? (
              <button onClick={handleSignOut} className="gcnav-tab" style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', fontSize: 14, color: 'rgba(248,113,113,0.75)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <span style={{ width: 18, textAlign: 'center' }}>↩</span><span>Sign Out</span>
              </button>
            ) : (
              <a href="/login" onClick={() => setOpen(false)} className="gcnav-tab" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', textDecoration: 'none', fontSize: 14, color: LIME, fontWeight: 600 }}>
                <span style={{ width: 18, textAlign: 'center' }}>→</span><span>Sign In</span>
              </a>
            )}
          </div>
        </>
      )}
    </>
  )
}
