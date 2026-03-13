'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const G = '#111f12'
const LIME = '#4ade80'
const CREAM = '#e8e0d0'

function Logo() {
  return (
    <svg width="28" height="30" viewBox="0 0 44 44" fill="none">
      <rect x="3" y="28" width="10" height="14" rx="2" fill="rgba(239,68,68,0.25)" stroke="#ef4444" strokeWidth="1.6"/>
      <rect x="17" y="16" width="10" height="26" rx="2" fill="rgba(59,130,246,0.25)" stroke="#3b82f6" strokeWidth="1.7"/>
      <rect x="31" y="4" width="10" height="38" rx="2" fill="rgba(234,179,8,0.25)" stroke="#eab308" strokeWidth="1.8"/>
      <polyline points="8,26 22,14 36,2" fill="none" stroke={LIME} strokeWidth="1.5" strokeDasharray="3,2.5" strokeLinecap="round"/>
      <circle cx="36" cy="2" r="2.5" fill={LIME}/>
    </svg>
  )
}

type Props = {
  role?: string
  isSignedIn?: boolean
  currentPath?: string
}

const NAV_LINKS = [
  { href: '/rankings',     label: 'Rankings'             },
  { href: '/leaderboards', label: 'Leaderboards'         },
  { href: '/compare',      label: 'Compare'              },
  { href: '/rankings?tab=Player+History', label: 'Player History' },
  { href: '/community',    label: 'Community'            },
  { href: '/dashboard',    label: 'Dashboard'            },
]

const DESKTOP_TABS = [
  { href: '/rankings',     label: 'Rankings',      public: true  },
  { href: '/leaderboards', label: 'Leaderboards',  public: true  },
  { href: '/compare',      label: 'Compare',       public: true  },
  { href: '/rankings?tab=Player+History', label: 'Player History', public: true, exactMatch: true },
  { href: '/community',    label: 'Community',     public: true  },
  { href: '/dashboard',    label: 'Dashboard',     public: true  },
  { href: '/profile',      label: 'My Profile',    public: false, hideWhenSignedOut: true },
]

const navStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap');
  .gcnav-logo { font-family: 'DM Serif Display', serif; }
  .gcnav-tab  { font-family: 'DM Sans', sans-serif; transition: all 0.15s; }
  .gcnav-desk { display: none; }
  @media (min-width: 900px) { .gcnav-desk { display: flex; align-items: center; gap: 1px; } }
  .gcnav-drop-item:hover { background: rgba(255,255,255,0.06) !important; color: ${CREAM} !important; }
  .gcnav-lab:hover { background: rgba(74,222,128,0.15) !important; }
`

export default function GCLabNav({ role, isSignedIn: isSignedInProp, currentPath = '' }: Props) {
  const [open, setOpen] = useState(false)
  const [authResolved, setAuthResolved] = useState<boolean | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (isSignedInProp === true) {
      setAuthResolved(true)
      return
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthResolved(!!session)
    })
  }, [isSignedInProp])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isAdmin = role === 'admin' || role === 'super_admin'

  const isActive = (href: string, exactMatch = false) => {
    if (exactMatch) {
      return currentPath === href
    }
    const base = href.split('?')[0]
    const currentBase = currentPath.split('?')[0]
    if (currentPath.includes('?') && currentBase === base) return false
    return currentBase === base || currentBase.startsWith(base + '/')
  }

  const signedIn = authResolved === null ? true : authResolved

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: navStyles }}/>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: G,
        borderBottom: '2px solid #16a34a',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', height: 48,
      }}>
        {/* Logo */}
        <a href="/rankings" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', flexShrink: 0 }}>
          <Logo/>
          <span className="gcnav-logo" style={{ fontSize: 17, color: CREAM, fontWeight: 700, letterSpacing: '-0.3px' }}>GC Rankings</span>
        </a>

        {/* Desktop tabs */}
        <div className="gcnav-desk">
          {DESKTOP_TABS.map(tab => {
            // Hide profile entirely when signed out (once auth is confirmed)
            if ((tab as any).hideWhenSignedOut && authResolved === false) return null
            const active = isActive(tab.href, (tab as any).exactMatch)
            const locked = !tab.public && !signedIn
            return (
              <a
                key={tab.href}
                href={locked ? '/login' : tab.href}
                title={locked ? `Sign in for ${tab.label}` : tab.label}
                className="gcnav-tab"
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px', borderRadius: 6,
                  fontSize: 12, fontWeight: active ? 600 : 400,
                  textDecoration: 'none', whiteSpace: 'nowrap',
                  background: active ? 'rgba(74,222,128,0.1)' : 'transparent',
                  color: active ? '#4ade80' : locked ? 'rgba(232,224,208,0.25)' : 'rgba(232,224,208,0.72)',
                }}>
                <span>{tab.label}</span>
                {locked && (
                  <svg width="9" height="9" fill="currentColor" viewBox="0 0 20 20" style={{ opacity: 0.4 }}>
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                  </svg>
                )}
              </a>
            )
          })}

          {/* GC Lab — special external item */}
          <span style={{ width: 1, height: 20, background: 'rgba(74,222,128,0.2)', margin: '0 6px', flexShrink: 0 }}/>
          <a
            href="https://gclab.app"
            target="_blank"
            rel="noopener noreferrer"
            className="gcnav-tab gcnav-lab"
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', borderRadius: 6,
              fontSize: 12, fontWeight: 500,
              textDecoration: 'none', whiteSpace: 'nowrap',
              background: 'rgba(74,222,128,0.08)',
              border: '1px solid rgba(74,222,128,0.25)',
              color: LIME,
            }}>
            {/* GCLab beaker logo, scaled for nav */}
            <svg width="13" height="16" viewBox="0 0 44 52" fill="none">
              <rect x="13" y="2" width="18" height="8" rx="2" fill="rgba(74,222,128,0.1)" stroke={LIME} strokeWidth="1.6"/>
              <path d="M13 10 L2 44 Q0 50 4 51 L40 51 Q44 50 42 44 L31 10 Z" fill="rgba(74,222,128,0.07)" stroke={LIME} strokeWidth="1.6" strokeLinejoin="round"/>
              <circle cx="14" cy="40" r="6.5" fill="#ef4444"/>
              <circle cx="30" cy="40" r="6.5" fill="#3b82f6"/>
              <circle cx="22" cy="29" r="6.5" fill="#eab308"/>
            </svg>
            <span>GC Lab</span>
            <svg width="8" height="8" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.6 }}>
              <path d="M1 9L9 1M9 1H3M9 1V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>

        {/* Hamburger */}
        <button
          onClick={() => setOpen(!open)}
          style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: 32, height: 32, gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
          aria-label="Menu">
          {[
            open ? 'rotate(45deg) translate(5px, 5px)' : 'none',
            '',
            open ? 'rotate(-45deg) translate(5px, -5px)' : 'none',
          ].map((tf, i) => (
            <span key={i} style={{ display: 'block', width: 20, height: 1.5, background: 'rgba(232,224,208,0.65)', borderRadius: 1, transition: 'all 0.18s', transform: tf || 'none', opacity: i === 1 && open ? 0 : 1 }}/>
          ))}
        </button>
      </nav>

      {/* Mobile dropdown */}
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)}/>
          <div style={{ position: 'fixed', right: 12, top: 56, zIndex: 50, background: '#0f2e1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, boxShadow: '0 20px 48px rgba(0,0,0,0.5)', width: 240, padding: '6px 0' }}>
            {NAV_LINKS.map(link => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="gcnav-tab gcnav-drop-item"
                style={{ display: 'flex', alignItems: 'center', padding: '9px 16px', textDecoration: 'none', fontSize: 14, color: isActive(link.href) ? LIME : 'rgba(232,224,208,0.65)', fontWeight: isActive(link.href) ? 600 : 400 }}>
                {link.label}
              </a>
            ))}

            {/* Profile — only when signed in */}
            {signedIn && (
              <a
                href="/profile"
                onClick={() => setOpen(false)}
                className="gcnav-tab gcnav-drop-item"
                style={{ display: 'flex', alignItems: 'center', padding: '9px 16px', textDecoration: 'none', fontSize: 14, color: isActive('/profile') ? LIME : 'rgba(232,224,208,0.65)', fontWeight: isActive('/profile') ? 600 : 400 }}>
                My Profile
              </a>
            )}

            {isAdmin && (
              <>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', margin: '4px 0' }}/>
                <a href="/admin" onClick={() => setOpen(false)} className="gcnav-tab gcnav-drop-item"
                  style={{ display: 'flex', alignItems: 'center', padding: '9px 16px', textDecoration: 'none', fontSize: 14, color: 'rgba(192,132,252,0.7)' }}>
                  Admin Panel
                </a>
              </>
            )}

            {/* GC Lab — special item */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', margin: '4px 0' }}/>
            <a
              href="https://gclab.app"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="gcnav-tab"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', textDecoration: 'none', fontSize: 14, color: LIME, fontWeight: 500 }}>
              <svg width="14" height="17" viewBox="0 0 44 52" fill="none">
                <rect x="13" y="2" width="18" height="8" rx="2" fill="rgba(74,222,128,0.1)" stroke={LIME} strokeWidth="1.6"/>
                <path d="M13 10 L2 44 Q0 50 4 51 L40 51 Q44 50 42 44 L31 10 Z" fill="rgba(74,222,128,0.07)" stroke={LIME} strokeWidth="1.6" strokeLinejoin="round"/>
                <circle cx="14" cy="40" r="6.5" fill="#ef4444"/>
                <circle cx="30" cy="40" r="6.5" fill="#3b82f6"/>
                <circle cx="22" cy="29" r="6.5" fill="#eab308"/>
              </svg>
              GC Lab
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.5 }}>
                <path d="M1 9L9 1M9 1H3M9 1V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', margin: '4px 0' }}/>
            {signedIn ? (
              <button onClick={handleSignOut} className="gcnav-tab"
                style={{ width: '100%', textAlign: 'left', padding: '9px 16px', fontSize: 14, color: 'rgba(248,113,113,0.75)', background: 'none', border: 'none', cursor: 'pointer' }}>
                Sign Out
              </button>
            ) : (
              <a href="/login" onClick={() => setOpen(false)} className="gcnav-tab"
                style={{ display: 'flex', alignItems: 'center', padding: '9px 16px', textDecoration: 'none', fontSize: 14, color: LIME, fontWeight: 600 }}>
                Sign In
              </a>
            )}
          </div>
        </>
      )}
    </>
  )
}
