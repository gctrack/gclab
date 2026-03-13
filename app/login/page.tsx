'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

const DARK  = '#0f2417'
const GREEN = '#4ade80'
const CREAM = '#f5f0e8'

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
  .mode-toggle {
    background: none; border: none; cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    color: #4ade80; font-size: 13px; font-weight: 600;
    padding: 0; text-decoration: underline; text-underline-offset: 3px;
    transition: opacity 0.15s;
  }
  .mode-toggle:hover { opacity: 0.75; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .fade-up { animation: fadeUp 0.5s ease both; }
  .fade-up-d1 { animation-delay: 0.08s; }
  .fade-up-d2 { animation-delay: 0.16s; }
  .fade-up-d3 { animation-delay: 0.24s; }
  .fade-up-d4 { animation-delay: 0.32s; }
`

// GC Rankings bar-chart logo
function RankingsLogo() {
  const LIME = '#4ade80'
  return (
    <svg width="28" height="30" viewBox="0 0 44 44" fill="none">
      <rect x="3"  y="28" width="10" height="14" rx="2" fill="#ef4444"/>
      <rect x="17" y="16" width="10" height="26" rx="2" fill="#3b82f6"/>
      <rect x="31" y="4"  width="10" height="38" rx="2" fill="#eab308"/>
      <polyline points="8,26 22,14 36,2" fill="none" stroke={LIME} strokeWidth="1.5" strokeDasharray="3,2.5" strokeLinecap="round"/>
      <circle cx="36" cy="2" r="2.5" fill={LIME}/>
    </svg>
  )
}

// GCLab beaker logo
function LabLogo() {
  return (
    <svg width="24" height="30" viewBox="0 0 44 52" fill="none">
      <rect x="13" y="2" width="18" height="8" rx="2" fill="rgba(74,222,128,0.15)" stroke="#4ade80" strokeWidth="1.6"/>
      <path d="M13 10 L2 44 Q0 50 4 51 L40 51 Q44 50 42 44 L31 10 Z" fill="rgba(74,222,128,0.08)" stroke="#4ade80" strokeWidth="1.6" strokeLinejoin="round"/>
      <circle cx="14" cy="40" r="6.5" fill="#ef4444"/>
      <circle cx="30" cy="40" r="6.5" fill="#3b82f6"/>
      <circle cx="22" cy="29" r="6.5" fill="#eab308"/>
    </svg>
  )
}

function LoginPageInner() {
  const searchParams = useSearchParams()
  const initialMode  = searchParams.get('mode') === 'signup' ? 'signup' : 'signin'

  const [mode, setMode]         = useState<'signin' | 'signup'>(initialMode)
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [success,   setSuccess]   = useState<string | null>(null)

  const router   = useRouter()
  const supabase = createClient()

  const switchMode = (next: 'signin' | 'signup') => {
    setMode(next)
    setError(null)
    setSuccess(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false) }
      else router.push('/dashboard')
    } else {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { first_name: firstName, last_name: lastName } },
      })
      if (error) { setError(error.message); setLoading(false) }
      else {
        setSuccess('Check your email to confirm your account, then sign in.')
        setLoading(false)
        setMode('signin')
      }
    }
  }

  const isSigning = mode === 'signin'

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }}/>

      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(160deg, #0a1c0e 0%, ${DARK} 50%, #071510 100%)`,
        display: 'flex', flexDirection: 'column',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Grid texture */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
          backgroundSize: '40px 40px', pointerEvents: 'none',
        }}/>

        {/* Glow orbs */}
        <div style={{ position: 'absolute', top: '-120px', left: '-80px', width: 400, height: 400, background: 'radial-gradient(circle, rgba(74,222,128,0.07) 0%, transparent 70%)', pointerEvents: 'none' }}/>
        <div style={{ position: 'absolute', bottom: '-100px', right: '-60px', width: 350, height: 350, background: 'radial-gradient(circle, rgba(74,222,128,0.05) 0%, transparent 70%)', pointerEvents: 'none' }}/>

        {/* Centered content */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
          <div style={{ width: '100%', maxWidth: 400 }}>

            {/* Dual-brand header */}
            <div className="fade-up" style={{ textAlign: 'center', marginBottom: 36 }}>
              {/* Both logos */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 18 }}>
                {/* GC Rankings */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 52, height: 52, borderRadius: 14,
                    background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)',
                  }}>
                    <RankingsLogo/>
                  </div>
                  <span className="ghl" style={{ color: CREAM, fontSize: 13, lineHeight: 1 }}>GC Rankings</span>
                </div>

                {/* Connector */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 24, height: 1, background: 'rgba(74,222,128,0.25)' }}/>
                  <span className="gsans" style={{ color: 'rgba(232,224,208,0.25)', fontSize: 10, letterSpacing: '0.1em' }}>+</span>
                  <div style={{ width: 24, height: 1, background: 'rgba(74,222,128,0.25)' }}/>
                </div>

                {/* GCLab */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 52, height: 52, borderRadius: 14,
                    background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)',
                  }}>
                    <LabLogo/>
                  </div>
                  <span className="ghl" style={{ color: CREAM, fontSize: 13, lineHeight: 1 }}>GC Lab</span>
                </div>
              </div>

              <p className="gsans" style={{ color: 'rgba(232,224,208,0.35)', fontSize: 12, margin: 0, letterSpacing: '0.04em' }}>
                One account · both platforms
              </p>
            </div>

            {/* Card */}
            <div className="fade-up fade-up-d1" style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 20, padding: '32px 28px',
              backdropFilter: 'blur(10px)',
            }}>
              <h2 className="gsans" style={{ color: CREAM, fontSize: 17, fontWeight: 600, margin: '0 0 22px', textAlign: 'center' }}>
                {isSigning ? 'Sign in to your account' : 'Create your account'}
              </h2>

              {success && (
                <div style={{
                  background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)',
                  borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                  color: '#86efac', fontSize: 13,
                }} className="gsans">{success}</div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {!isSigning && (
                  <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label className="gsans" style={{ display: 'block', color: 'rgba(232,224,208,0.5)', fontSize: 11, fontWeight: 500, marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>First name</label>
                      <input type="text" className="login-input" placeholder="Jane" value={firstName} onChange={e => setFirstName(e.target.value)} required autoComplete="given-name"/>
                    </div>
                    <div>
                      <label className="gsans" style={{ display: 'block', color: 'rgba(232,224,208,0.5)', fontSize: 11, fontWeight: 500, marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Last name</label>
                      <input type="text" className="login-input" placeholder="Smith" value={lastName} onChange={e => setLastName(e.target.value)} required autoComplete="family-name"/>
                    </div>
                  </div>
                )}

                <div className="fade-up fade-up-d2">
                  <label className="gsans" style={{ display: 'block', color: 'rgba(232,224,208,0.5)', fontSize: 11, fontWeight: 500, marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Email</label>
                  <input type="email" className="login-input" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"/>
                </div>

                <div className="fade-up fade-up-d3">
                  <label className="gsans" style={{ display: 'block', color: 'rgba(232,224,208,0.5)', fontSize: 11, fontWeight: 500, marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Password</label>
                  <input type="password" className="login-input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required autoComplete={isSigning ? 'current-password' : 'new-password'}/>
                </div>

                {error && (
                  <div style={{
                    background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
                    borderRadius: 8, padding: '10px 14px',
                    color: '#fca5a5', fontSize: 13,
                  }} className="gsans">{error}</div>
                )}

                <div className="fade-up fade-up-d4" style={{ marginTop: 4 }}>
                  <button type="submit" className="login-btn" disabled={loading}>
                    {loading
                      ? (isSigning ? 'Signing in…' : 'Creating account…')
                      : (isSigning ? 'Sign in →' : 'Create account →')}
                  </button>
                </div>
              </form>

              {/* Toggle */}
              <p className="gsans" style={{ textAlign: 'center', color: 'rgba(232,224,208,0.35)', fontSize: 13, margin: '20px 0 0' }}>
                {isSigning ? "Don't have an account? " : 'Already have an account? '}
                <button className="mode-toggle" onClick={() => switchMode(isSigning ? 'signup' : 'signin')}>
                  {isSigning ? 'Create one' : 'Sign in'}
                </button>
              </p>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner/>
    </Suspense>
  )
}
