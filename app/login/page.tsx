'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

const DARK   = '#0f2417'
const GREEN  = '#4ade80'
const CREAM  = '#f5f0e8'

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
  .ghl  { font-family: 'DM Serif Display', serif; }
  .gsans{ font-family: 'DM Sans', sans-serif; }
  .gmono{ font-family: 'DM Mono', monospace; }

  .login-input {
    width: 100%; padding: 12px 16px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 10px;
    color: #e8e0d0; font-size: 15px;
    font-family: 'DM Sans', sans-serif;
    outline: none; transition: border-color 0.2s, background 0.2s;
    box-sizing: border-box;
  }
  .login-input::placeholder { color: rgba(232,224,208,0.35); }
  .login-input:focus {
    border-color: rgba(74,222,128,0.5);
    background: rgba(255,255,255,0.09);
  }
  .login-btn {
    width: 100%; padding: 13px;
    background: #4ade80; color: #0d2818;
    border: none; border-radius: 10px;
    font-weight: 700; font-size: 15px;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer; transition: all 0.2s;
  }
  .login-btn:hover:not(:disabled) {
    background: #86efac;
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(74,222,128,0.3);
  }
  .login-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .fade-up { animation: fadeUp 0.55s ease both; }
  .fade-up-d1 { animation-delay: 0.1s; }
  .fade-up-d2 { animation-delay: 0.2s; }
  .fade-up-d3 { animation-delay: 0.3s; }
  .fade-up-d4 { animation-delay: 0.4s; }

  @keyframes pulse-ring {
    0%   { box-shadow: 0 0 0 0 rgba(74,222,128,0.25); }
    70%  { box-shadow: 0 0 0 14px rgba(74,222,128,0); }
    100% { box-shadow: 0 0 0 0 rgba(74,222,128,0); }
  }
  .logo-pulse { animation: pulse-ring 3s ease-out infinite; }
`

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/dashboard')
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      {/* Full-screen dark green background */}
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(160deg, #0a1c0e 0%, ${DARK} 50%, #071510 100%)`,
        display: 'flex', flexDirection: 'column',
        position: 'relative', overflow: 'hidden',
      }}>

        {/* Subtle grid texture */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }}/>

        {/* Glow orbs */}
        <div style={{ position: 'absolute', top: '-120px', left: '-80px', width: 400, height: 400, background: 'radial-gradient(circle, rgba(74,222,128,0.07) 0%, transparent 70%)', pointerEvents: 'none' }}/>
        <div style={{ position: 'absolute', bottom: '-100px', right: '-60px', width: 350, height: 350, background: 'radial-gradient(circle, rgba(74,222,128,0.05) 0%, transparent 70%)', pointerEvents: 'none' }}/>

        {/* Top-left home link */}
        <div style={{ padding: '24px 32px' }}>
          <Link href="/" className="gsans" style={{ color: 'rgba(232,224,208,0.4)', fontSize: 13, textDecoration: 'none', transition: 'color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(232,224,208,0.8)') }
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(232,224,208,0.4)') }>
            ← gclab.app
          </Link>
        </div>

        {/* Centered card */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ width: '100%', maxWidth: 400 }}>

            {/* Logo + title */}
            <div className="fade-up" style={{ textAlign: 'center', marginBottom: 40 }}>
              <div className="logo-pulse" style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 72, height: 72, borderRadius: '50%',
                background: 'rgba(74,222,128,0.1)',
                marginBottom: 20,
              }}>
                <svg width="38" height="46" viewBox="0 0 44 52" fill="none">
                  <rect x="13" y="2" width="18" height="8" rx="2" fill="rgba(74,222,128,0.15)" stroke="#4ade80" strokeWidth="1.6"/>
                  <path d="M13 10 L2 44 Q0 50 4 51 L40 51 Q44 50 42 44 L31 10 Z" fill="rgba(74,222,128,0.08)" stroke="#4ade80" strokeWidth="1.6" strokeLinejoin="round"/>
                  <circle cx="14" cy="40" r="6.5" fill="#ef4444"/>
                  <circle cx="30" cy="40" r="6.5" fill="#3b82f6"/>
                  <circle cx="22" cy="29" r="6.5" fill="#eab308"/>
                </svg>
              </div>
              <h1 className="ghl" style={{ color: CREAM, fontSize: 34, margin: '0 0 8px', lineHeight: 1.1 }}>
                GCLab
              </h1>
              <p className="gsans" style={{ color: 'rgba(232,224,208,0.45)', fontSize: 14, margin: 0 }}>
                Golf Croquet analytics &amp; intelligence
              </p>
            </div>

            {/* Card */}
            <div className="fade-up fade-up-d1" style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 20,
              padding: '36px 32px',
              backdropFilter: 'blur(10px)',
            }}>
              <h2 className="gsans" style={{ color: CREAM, fontSize: 18, fontWeight: 600, margin: '0 0 24px', textAlign: 'center' }}>
                Sign in to your account
              </h2>

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="fade-up fade-up-d2">
                  <label className="gsans" style={{ display: 'block', color: 'rgba(232,224,208,0.55)', fontSize: 12, fontWeight: 500, marginBottom: 7, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    className="login-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="fade-up fade-up-d3">
                  <label className="gsans" style={{ display: 'block', color: 'rgba(232,224,208,0.55)', fontSize: 12, fontWeight: 500, marginBottom: 7, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    className="login-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>

                {error && (
                  <div style={{
                    background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
                    borderRadius: 8, padding: '10px 14px',
                    color: '#fca5a5', fontSize: 13,
                  }} className="gsans">
                    {error}
                  </div>
                )}

                <div className="fade-up fade-up-d4" style={{ marginTop: 4 }}>
                  <button type="submit" className="login-btn" disabled={loading}>
                    {loading ? 'Signing in…' : 'Sign in →'}
                  </button>
                </div>
              </form>
            </div>

            {/* Footer note */}

          </div>
        </div>


      </div>
    </>
  )
}
