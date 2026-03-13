'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import WcfMatchBanner from '@/components/WcfMatchBanner'
import GCLabNav from '@/components/GCLabNav'
import { getFlag } from '@/lib/countries'

const G      = '#0d2818'
const LIME   = '#4ade80'
const CREAM  = '#f5f0e8'
const CREAM_BG = '#f5f2ec'
const AMBER  = '#eab308'

const GC_COUNTRIES = [
  { code: 'AU', name: 'Australia' }, { code: 'BE', name: 'Belgium' },
  { code: 'CA', name: 'Canada' },   { code: 'CZ', name: 'Czech Republic' },
  { code: 'EG', name: 'Egypt' },    { code: 'GB-ENG', name: 'England' },
  { code: 'DE', name: 'Germany' },  { code: 'HK', name: 'Hong Kong' },
  { code: 'IE', name: 'Ireland' },  { code: 'LV', name: 'Latvia' },
  { code: 'MX', name: 'Mexico' },   { code: 'NZ', name: 'New Zealand' },
  { code: 'NO', name: 'Norway' },   { code: 'PT', name: 'Portugal' },
  { code: 'GB-SCT', name: 'Scotland' }, { code: 'ZA', name: 'South Africa' },
  { code: 'ES', name: 'Spain' },    { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' }, { code: 'US', name: 'USA' },
  { code: 'GB-WLS', name: 'Wales' },
]

const ALL_COUNTRIES = [
  { code: 'AF', name: 'Afghanistan' }, { code: 'AL', name: 'Albania' }, { code: 'DZ', name: 'Algeria' }, { code: 'AD', name: 'Andorra' }, { code: 'AO', name: 'Angola' }, { code: 'AG', name: 'Antigua and Barbuda' }, { code: 'AR', name: 'Argentina' }, { code: 'AM', name: 'Armenia' }, { code: 'AT', name: 'Austria' }, { code: 'AZ', name: 'Azerbaijan' }, { code: 'BS', name: 'Bahamas' }, { code: 'BH', name: 'Bahrain' }, { code: 'BD', name: 'Bangladesh' }, { code: 'BB', name: 'Barbados' }, { code: 'BY', name: 'Belarus' }, { code: 'BZ', name: 'Belize' }, { code: 'BJ', name: 'Benin' }, { code: 'BT', name: 'Bhutan' }, { code: 'BO', name: 'Bolivia' }, { code: 'BA', name: 'Bosnia and Herzegovina' }, { code: 'BW', name: 'Botswana' }, { code: 'BR', name: 'Brazil' }, { code: 'BN', name: 'Brunei' }, { code: 'BG', name: 'Bulgaria' }, { code: 'BF', name: 'Burkina Faso' }, { code: 'BI', name: 'Burundi' }, { code: 'CV', name: 'Cabo Verde' }, { code: 'KH', name: 'Cambodia' }, { code: 'CM', name: 'Cameroon' }, { code: 'CF', name: 'Central African Republic' }, { code: 'TD', name: 'Chad' }, { code: 'CL', name: 'Chile' }, { code: 'CN', name: 'China' }, { code: 'CO', name: 'Colombia' }, { code: 'KM', name: 'Comoros' }, { code: 'CG', name: 'Congo' }, { code: 'CR', name: 'Costa Rica' }, { code: 'HR', name: 'Croatia' }, { code: 'CU', name: 'Cuba' }, { code: 'CY', name: 'Cyprus' }, { code: 'DK', name: 'Denmark' }, { code: 'DJ', name: 'Djibouti' }, { code: 'DM', name: 'Dominica' }, { code: 'DO', name: 'Dominican Republic' }, { code: 'EC', name: 'Ecuador' }, { code: 'SV', name: 'El Salvador' }, { code: 'GQ', name: 'Equatorial Guinea' }, { code: 'ER', name: 'Eritrea' }, { code: 'EE', name: 'Estonia' }, { code: 'SZ', name: 'Eswatini' }, { code: 'ET', name: 'Ethiopia' }, { code: 'FJ', name: 'Fiji' }, { code: 'FI', name: 'Finland' }, { code: 'FR', name: 'France' }, { code: 'GA', name: 'Gabon' }, { code: 'GM', name: 'Gambia' }, { code: 'GE', name: 'Georgia' }, { code: 'GH', name: 'Ghana' }, { code: 'GR', name: 'Greece' }, { code: 'GD', name: 'Grenada' }, { code: 'GT', name: 'Guatemala' }, { code: 'GN', name: 'Guinea' }, { code: 'GW', name: 'Guinea-Bissau' }, { code: 'GY', name: 'Guyana' }, { code: 'HT', name: 'Haiti' }, { code: 'HN', name: 'Honduras' }, { code: 'HU', name: 'Hungary' }, { code: 'IS', name: 'Iceland' }, { code: 'IN', name: 'India' }, { code: 'ID', name: 'Indonesia' }, { code: 'IR', name: 'Iran' }, { code: 'IQ', name: 'Iraq' }, { code: 'IL', name: 'Israel' }, { code: 'IT', name: 'Italy' }, { code: 'JM', name: 'Jamaica' }, { code: 'JP', name: 'Japan' }, { code: 'JO', name: 'Jordan' }, { code: 'KZ', name: 'Kazakhstan' }, { code: 'KE', name: 'Kenya' }, { code: 'KI', name: 'Kiribati' }, { code: 'KW', name: 'Kuwait' }, { code: 'KG', name: 'Kyrgyzstan' }, { code: 'LA', name: 'Laos' }, { code: 'LB', name: 'Lebanon' }, { code: 'LS', name: 'Lesotho' }, { code: 'LR', name: 'Liberia' }, { code: 'LY', name: 'Libya' }, { code: 'LI', name: 'Liechtenstein' }, { code: 'LT', name: 'Lithuania' }, { code: 'LU', name: 'Luxembourg' }, { code: 'MG', name: 'Madagascar' }, { code: 'MW', name: 'Malawi' }, { code: 'MY', name: 'Malaysia' }, { code: 'MV', name: 'Maldives' }, { code: 'ML', name: 'Mali' }, { code: 'MT', name: 'Malta' }, { code: 'MH', name: 'Marshall Islands' }, { code: 'MR', name: 'Mauritania' }, { code: 'MU', name: 'Mauritius' }, { code: 'FM', name: 'Micronesia' }, { code: 'MD', name: 'Moldova' }, { code: 'MC', name: 'Monaco' }, { code: 'MN', name: 'Mongolia' }, { code: 'ME', name: 'Montenegro' }, { code: 'MA', name: 'Morocco' }, { code: 'MZ', name: 'Mozambique' }, { code: 'MM', name: 'Myanmar' }, { code: 'NA', name: 'Namibia' }, { code: 'NR', name: 'Nauru' }, { code: 'NP', name: 'Nepal' }, { code: 'NL', name: 'Netherlands' }, { code: 'NI', name: 'Nicaragua' }, { code: 'NE', name: 'Niger' }, { code: 'NG', name: 'Nigeria' }, { code: 'MK', name: 'North Macedonia' }, { code: 'PK', name: 'Pakistan' }, { code: 'PW', name: 'Palau' }, { code: 'PA', name: 'Panama' }, { code: 'PG', name: 'Papua New Guinea' }, { code: 'PY', name: 'Paraguay' }, { code: 'PE', name: 'Peru' }, { code: 'PH', name: 'Philippines' }, { code: 'PL', name: 'Poland' }, { code: 'QA', name: 'Qatar' }, { code: 'RO', name: 'Romania' }, { code: 'RU', name: 'Russia' }, { code: 'RW', name: 'Rwanda' }, { code: 'KN', name: 'Saint Kitts and Nevis' }, { code: 'LC', name: 'Saint Lucia' }, { code: 'VC', name: 'Saint Vincent and the Grenadines' }, { code: 'WS', name: 'Samoa' }, { code: 'SM', name: 'San Marino' }, { code: 'ST', name: 'Sao Tome and Principe' }, { code: 'SA', name: 'Saudi Arabia' }, { code: 'SN', name: 'Senegal' }, { code: 'RS', name: 'Serbia' }, { code: 'SL', name: 'Sierra Leone' }, { code: 'SG', name: 'Singapore' }, { code: 'SK', name: 'Slovakia' }, { code: 'SI', name: 'Slovenia' }, { code: 'SB', name: 'Solomon Islands' }, { code: 'SO', name: 'Somalia' }, { code: 'SS', name: 'South Sudan' }, { code: 'LK', name: 'Sri Lanka' }, { code: 'SD', name: 'Sudan' }, { code: 'SR', name: 'Suriname' }, { code: 'SY', name: 'Syria' }, { code: 'TW', name: 'Taiwan' }, { code: 'TJ', name: 'Tajikistan' }, { code: 'TZ', name: 'Tanzania' }, { code: 'TH', name: 'Thailand' }, { code: 'TL', name: 'Timor-Leste' }, { code: 'TG', name: 'Togo' }, { code: 'TO', name: 'Tonga' }, { code: 'TT', name: 'Trinidad and Tobago' }, { code: 'TN', name: 'Tunisia' }, { code: 'TR', name: 'Turkey' }, { code: 'TM', name: 'Turkmenistan' }, { code: 'TV', name: 'Tuvalu' }, { code: 'UG', name: 'Uganda' }, { code: 'UA', name: 'Ukraine' }, { code: 'AE', name: 'United Arab Emirates' }, { code: 'UY', name: 'Uruguay' }, { code: 'UZ', name: 'Uzbekistan' }, { code: 'VU', name: 'Vanuatu' }, { code: 'VE', name: 'Venezuela' }, { code: 'VN', name: 'Vietnam' }, { code: 'YE', name: 'Yemen' }, { code: 'ZM', name: 'Zambia' }, { code: 'ZW', name: 'Zimbabwe' },
]

const GRIP_OPTIONS = ['Irish', 'Solomon', 'Standard', 'Other']

const ML = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
  .ghl  { font-family: 'DM Serif Display', serif; }
  .gsans{ font-family: 'DM Sans', sans-serif; }
  .gmono{ font-family: 'DM Mono', monospace; }
  .prof-input {
    width: 100%; padding: 10px 14px; border-radius: 10px;
    border: 1px solid #e5e1d8; font-size: 14px;
    font-family: 'DM Sans', sans-serif; color: ${G};
    background: white; box-sizing: border-box; outline: none;
    transition: border-color 0.15s;
  }
  .prof-input:focus { border-color: ${LIME}; }
  .prof-label {
    display: block; font-size: 11px; font-weight: 600;
    color: rgba(13,40,24,0.45); margin-bottom: 6px;
    letter-spacing: 0.07em; text-transform: uppercase;
    font-family: 'DM Sans', sans-serif;
  }
  .vis-toggle {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 10px; border-radius: 20px; border: 1px solid;
    font-size: 11px; font-weight: 600; cursor: pointer;
    font-family: 'DM Sans', sans-serif; transition: all 0.15s;
  }
  .grip-btn {
    padding: 7px 16px; border-radius: 20px; font-size: 13px;
    font-weight: 600; cursor: pointer; transition: all 0.15s;
    font-family: 'DM Sans', sans-serif;
  }
  .grip-btn:hover { opacity: 0.85; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  .fade-up { animation: fadeUp 0.4s ease both; }
`

// ── Reusable components ───────────────────────────────────────────────────────
function Card({ title, icon, children, accent }: { title: string; icon: string; children: React.ReactNode; accent?: string }) {
  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e5e1d8', overflow: 'hidden', marginBottom: 14 }}>
      <div style={{ padding: '13px 20px', borderBottom: '1px solid #e5e1d8', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 15 }}>{icon}</span>
        <h3 className="gsans" style={{ margin: 0, fontSize: 13, fontWeight: 600, color: accent || G }}>{title}</h3>
      </div>
      <div style={{ padding: '18px 20px' }}>{children}</div>
    </div>
  )
}

function Field({ label, children, action }: { label: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <label className="prof-label" style={{ margin: 0 }}>{label}</label>
        {action}
      </div>
      {children}
    </div>
  )
}

function VisToggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className="vis-toggle" onClick={() => onChange(!enabled)} style={{
      background: enabled ? 'rgba(74,222,128,0.1)' : 'rgba(13,40,24,0.04)',
      borderColor: enabled ? 'rgba(74,222,128,0.4)' : '#e5e1d8',
      color: enabled ? '#16a34a' : 'rgba(13,40,24,0.35)',
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: enabled ? '#16a34a' : 'rgba(13,40,24,0.25)' }}/>
      {enabled ? 'Visible to members' : 'Private'}
    </button>
  )
}

type ImportStep = { type: 'info'|'year'|'year_done'|'year_error'|'error'|'complete'; message: string; year?: number; games?: number; events?: number }
type ImportResult = { totalGames: number; years: number; startingGrade: number | null }

export default function ProfilePage() {
  const [loading,         setLoading]         = useState(true)
  const [signedIn,        setSignedIn]        = useState<boolean | null>(null)
  const [saving,          setSaving]          = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [message,         setMessage]         = useState('')
  const [userId,          setUserId]          = useState('')
  const [avatarUrl,       setAvatarUrl]       = useState('')
  const [historyImported, setHistoryImported] = useState(false)
  const [importing,       setImporting]       = useState(false)
  const [importSteps,     setImportSteps]     = useState<ImportStep[]>([])
  const [importResult,    setImportResult]    = useState<ImportResult | null>(null)
  const [showImportLog,   setShowImportLog]   = useState(false)
  const importLogRef = useRef<HTMLDivElement>(null)

  const [profile, setProfile] = useState({
    first_name: '', last_name: '', country: '', city: '', phone: '',
    whatsapp: '', contact_email: '', bio: '', mallet_type: '',
    grip_notes: '', dgrade: '', wcf_profile_url: '', wcf_player_id: '',
    role: '', show_city: false, show_phone: false,
    show_whatsapp: false, show_contact_email: false,
  })
  const [selectedGrips, setSelectedGrips] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setSignedIn(false); setLoading(false); return }
      setSignedIn(true); setUserId(user.id)
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile({
          first_name: data.first_name || '', last_name: data.last_name || '',
          country: data.country || '', city: data.city || '',
          phone: data.phone || '', whatsapp: data.whatsapp || '',
          contact_email: data.contact_email || '', bio: data.bio || '',
          mallet_type: data.mallet_type || '', grip_notes: data.grip_notes || '',
          dgrade: data.dgrade || '', wcf_profile_url: data.wcf_profile_url || '',
          wcf_player_id: data.wcf_player_id || '', role: data.role || '',
          show_city: data.show_city || false, show_phone: data.show_phone || false,
          show_whatsapp: data.show_whatsapp || false, show_contact_email: data.show_contact_email || false,
        })
        setSelectedGrips(data.grips || [])
        if (data.avatar_url) setAvatarUrl(data.avatar_url)
        if (data.wcf_player_id) {
          const { data: wcf } = await supabase.from('wcf_players').select('history_imported').eq('id', data.wcf_player_id).single()
          if (wcf) setHistoryImported(wcf.history_imported || false)
        }
      }
      setLoading(false)
    }
    getProfile()
  }, [])

  useEffect(() => {
    if (importLogRef.current) importLogRef.current.scrollTop = importLogRef.current.scrollHeight
  }, [importSteps])

  const handleImportHistory = async () => {
    if (!profile.wcf_player_id) return
    if (historyImported) {
      if (!window.confirm('Your WCF history has already been imported.\n\nRe-importing will refresh all data.\n\nContinue?')) return
    }
    setImporting(true); setImportSteps([]); setImportResult(null); setShowImportLog(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setImporting(false); return }
      const response = await fetch('/api/wcf-history-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ wcf_player_id: profile.wcf_player_id }),
      })
      if (!response.ok || !response.body) {
        setImportSteps(prev => [...prev, { type: 'error', message: 'Import request failed' }])
        setImporting(false); return
      }
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            setImportSteps(prev => [...prev, { type: data.step, message: data.message, year: data.year, games: data.games, events: data.events }])
            if (data.step === 'complete') { setImportResult({ totalGames: data.totalGames, years: data.years, startingGrade: data.startingGrade }); setHistoryImported(true) }
          } catch {}
        }
      }
    } catch (err) { setImportSteps(prev => [...prev, { type: 'error', message: `Error: ${String(err)}` }]) }
    setImporting(false)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !userId) return
    setUploadingAvatar(true)
    const filePath = `${userId}/avatar.${file.name.split('.').pop()}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true })
    if (uploadError) { setMessage('Error uploading photo'); setUploadingAvatar(false); return }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId)
    setAvatarUrl(`${publicUrl}?t=${Date.now()}`)
    setUploadingAvatar(false); setMessage('Photo updated successfully')
  }

  const handleWcfLinked = async () => {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) {
      setProfile(p => ({ ...p, wcf_player_id: data.wcf_player_id || '', dgrade: data.dgrade || '', wcf_profile_url: data.wcf_profile_url || '' }))
      if (data.wcf_player_id) {
        const { data: wcf } = await supabase.from('wcf_players').select('history_imported').eq('id', data.wcf_player_id).single()
        if (wcf) setHistoryImported(wcf.history_imported || false)
      }
    }
  }

  const handleSave = async () => {
    setSaving(true); setMessage('')
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return
    const { data: existing } = await supabase.from('profiles').select('dgrade').eq('id', user.id).single()
    const newDgrade = profile.dgrade ? parseInt(profile.dgrade as string) : null
    if (newDgrade && existing?.dgrade !== newDgrade) {
      await supabase.from('dgrade_history').insert({ user_id: user.id, dgrade_value: newDgrade })
    }
    let wcfUrl = profile.wcf_profile_url
    if (!wcfUrl && profile.first_name && profile.last_name) {
      wcfUrl = `https://rank.worldcroquet.org/gcrankdg/player_full.php?pffn=${profile.first_name}&pfsn=${profile.last_name}&nt=1`
    }
    const { error } = await supabase.from('profiles').update({
      first_name: profile.first_name, last_name: profile.last_name, country: profile.country,
      city: profile.city, phone: profile.phone, whatsapp: profile.whatsapp,
      contact_email: profile.contact_email, bio: profile.bio, mallet_type: profile.mallet_type,
      grips: selectedGrips, grip_notes: profile.grip_notes, dgrade: newDgrade,
      wcf_profile_url: wcfUrl, show_city: profile.show_city, show_phone: profile.show_phone,
      show_whatsapp: profile.show_whatsapp, show_contact_email: profile.show_contact_email,
    }).eq('id', user.id)
    if (error) setMessage('Error saving profile')
    else { setMessage('Profile saved'); if (wcfUrl) setProfile(p => ({ ...p, wcf_profile_url: wcfUrl })) }
    setSaving(false)
  }

  const stepIcon = (t: ImportStep['type']) => t === 'complete' ? '✅' : t === 'error' || t === 'year_error' ? '❌' : t === 'year_done' ? '✓' : '•'

  const displayName = profile.first_name ? `${profile.first_name}${profile.last_name ? ' ' + profile.last_name : ''}` : 'Your Profile'
  const selectedFlag = profile.country ? getFlag(profile.country) : null

  // ── Loading ──
  if (loading || signedIn === null) return (
    <div style={{ minHeight: '100vh', background: G, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style dangerouslySetInnerHTML={{ __html: ML }}/>
      <div className="gsans" style={{ color: 'rgba(245,240,232,0.35)', fontSize: 14 }}>Loading…</div>
    </div>
  )

  // ── Not signed in ──
  if (!signedIn) return (
    <div style={{ minHeight: '100vh', background: CREAM_BG }}>
      <style dangerouslySetInnerHTML={{ __html: ML }}/>
      <GCLabNav role="" isSignedIn={false} currentPath="/profile"/>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 48px)', padding: '32px 24px' }}>
        <div style={{ width: '100%', maxWidth: 400, position: 'relative' }}>
          {/* Blurred mock */}
          <div style={{ filter: 'blur(5px)', pointerEvents: 'none', userSelect: 'none', background: 'white', borderRadius: 20, border: '1px solid #e5e1d8', overflow: 'hidden' }}>
            <div style={{ background: G, padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'rgba(74,222,128,0.2)' }}/>
                <div>
                  <div style={{ height: 16, width: 130, background: 'rgba(255,255,255,0.15)', borderRadius: 4, marginBottom: 8 }}/>
                  <div style={{ height: 10, width: 80, background: 'rgba(255,255,255,0.08)', borderRadius: 4 }}/>
                </div>
              </div>
            </div>
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {['#e8f5e9','#e3f2fd','#fff8e1','#f3e5f5'].map((bg, i) => (
                <div key={i} style={{ background: bg, borderRadius: 12, padding: 14 }}>
                  <div style={{ height: 22, width: 50, background: 'white', borderRadius: 4, marginBottom: 6 }}/>
                  <div style={{ height: 9, width: 70, background: 'rgba(0,0,0,0.08)', borderRadius: 4 }}/>
                </div>
              ))}
            </div>
          </div>
          {/* Overlay */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(245,240,232,0.7)', backdropFilter: 'blur(2px)', borderRadius: 20 }}>
            <div style={{ textAlign: 'center', padding: '28px 32px' }}>
              <div style={{ width: 52, height: 52, background: 'rgba(13,40,24,0.08)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 22 }}>👤</div>
              <h2 className="ghl" style={{ fontSize: 22, color: G, margin: '0 0 8px' }}>Your player profile</h2>
              <p className="gsans" style={{ fontSize: 13, color: 'rgba(13,40,24,0.5)', marginBottom: 22, lineHeight: 1.6 }}>Link your WCF account to unlock your grade history, career stats, and more.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <a href="/login?mode=signup" className="gsans" style={{ background: LIME, color: G, padding: '11px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>Create free account →</a>
                <a href="/login" className="gsans" style={{ border: '1px solid #d1d5db', color: 'rgba(13,40,24,0.6)', padding: '10px 20px', borderRadius: 10, fontSize: 13, textDecoration: 'none', textAlign: 'center' }}>Sign in</a>
              </div>
              <p className="gsans" style={{ fontSize: 11, color: 'rgba(13,40,24,0.3)', margin: '14px 0 0' }}>Free · No credit card · 30 seconds</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: CREAM_BG }}>
      <style dangerouslySetInnerHTML={{ __html: ML }}/>
      <GCLabNav role={profile.role} isSignedIn={true} currentPath="/profile"/>

      {/* ── Dark header ── */}
      <div style={{ background: G, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 80% 0%, rgba(74,222,128,0.07) 0%, transparent 55%)' }}/>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(255,255,255,0.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.012) 1px,transparent 1px)', backgroundSize: '44px 44px' }}/>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '28px 24px 32px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(74,222,128,0.3)' }}/>
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(74,222,128,0.12)', border: '3px solid rgba(74,222,128,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, color: LIME, fontFamily: 'DM Sans, sans-serif', fontWeight: 700 }}>
                  {profile.first_name ? profile.first_name.charAt(0).toUpperCase() : '?'}
                </div>
              )}
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}
                style={{ position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: '50%', background: LIME, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}
                title={uploadingAvatar ? 'Uploading…' : 'Change photo'}>
                {uploadingAvatar ? '…' : '✎'}
              </button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" onChange={handleAvatarUpload} style={{ display: 'none' }}/>
            </div>
            {/* Name + grade */}
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(74,222,128,0.09)', border: '1px solid rgba(74,222,128,0.18)', borderRadius: 20, padding: '2px 10px', marginBottom: 8 }}>
                <span className="gsans" style={{ color: LIME, fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase' }}>My Profile</span>
              </div>
              <h1 className="ghl" style={{ fontSize: 'clamp(20px,3vw,30px)', color: CREAM, margin: '0 0 4px', lineHeight: 1.1 }}>{displayName}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {profile.dgrade && <span className="gmono" style={{ fontSize: 13, color: LIME }}>dGrade {profile.dgrade}</span>}
                {profile.country && <span className="gsans" style={{ fontSize: 12, color: 'rgba(245,240,232,0.45)' }}>{selectedFlag} {profile.country}</span>}
              </div>
            </div>
          </div>
        </div>
        <div style={{ height: 20, background: 'linear-gradient(180deg, #0d2818 0%, #f5f2ec 100%)' }}/>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '8px 24px 60px' }}>

        {/* WCF match banner */}
        {!profile.wcf_player_id && profile.first_name && profile.last_name && (
          <div style={{ marginBottom: 14 }}>
            <WcfMatchBanner userId={userId} firstName={profile.first_name} lastName={profile.last_name} onLinked={handleWcfLinked}/>
          </div>
        )}

        {/* Save feedback */}
        {message && (
          <div style={{
            padding: '10px 16px', borderRadius: 10, marginBottom: 14, fontSize: 13,
            background: message.includes('Error') ? 'rgba(239,68,68,0.08)' : 'rgba(74,222,128,0.1)',
            border: `1px solid ${message.includes('Error') ? 'rgba(239,68,68,0.2)' : 'rgba(74,222,128,0.25)'}`,
            color: message.includes('Error') ? '#dc2626' : '#16a34a',
          }} className="gsans">{message}</div>
        )}

        {/* WCF linked banner */}
        {profile.wcf_player_id && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', marginBottom: 14 }} className="gsans">
            <span style={{ fontSize: 13 }}>✓</span>
            <span style={{ fontSize: 13, color: '#16a34a', flex: 1 }}>Linked to WCF record</span>
            <a href={profile.wcf_profile_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#16a34a', textDecoration: 'underline', textUnderlineOffset: 2 }}>View WCF profile ↗</a>
          </div>
        )}

        {/* ── WCF History Import ── */}
        {profile.wcf_player_id && (
          <Card title={historyImported ? 'WCF History Imported' : 'Import Your WCF History'} icon={historyImported ? '✅' : '📥'} accent={historyImported ? '#16a34a' : G}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <p className="gsans" style={{ fontSize: 13, color: 'rgba(13,40,24,0.55)', margin: '0 0 4px', lineHeight: 1.6 }}>
                  {historyImported
                    ? 'Your full career history is imported. Every game, opponent, score and dGrade change is recorded.'
                    : 'Import your complete WCF career — every game, opponent, score and dGrade change. Takes 10–30 seconds.'}
                </p>
                {historyImported && <p className="gsans" style={{ fontSize: 11, color: 'rgba(13,40,24,0.35)', margin: 0 }}>Re-import if your starting grade was revised.</p>}
              </div>
              <button onClick={handleImportHistory} disabled={importing} className="gsans"
                style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, border: 'none', cursor: importing ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
                  background: importing ? '#e5e7eb' : historyImported ? 'rgba(13,40,24,0.06)' : LIME,
                  color: importing ? '#9ca3af' : historyImported ? G : G,
                  ...(historyImported && !importing ? { border: '1px solid #e5e1d8' } : {}),
                }}>
                {importing ? 'Importing…' : historyImported ? 'Re-import' : 'Import History'}
              </button>
            </div>

            {showImportLog && (
              <div style={{ marginTop: 14 }}>
                <div ref={importLogRef} style={{ background: '#fafaf8', border: '1px solid #e5e1d8', borderRadius: 10, padding: 12, maxHeight: 180, overflowY: 'auto', fontFamily: 'DM Mono, monospace', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {importSteps.map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, color: step.type === 'complete' ? '#16a34a' : step.type === 'error' || step.type === 'year_error' ? '#dc2626' : step.type === 'year_done' ? G : 'rgba(13,40,24,0.4)' }}>
                      <span>{stepIcon(step.type)}</span><span>{step.message}</span>
                    </div>
                  ))}
                  {importing && <div style={{ color: 'rgba(13,40,24,0.35)', fontStyle: 'italic' }}>Working…</div>}
                </div>
                {importResult && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 12 }}>
                    {[
                      { v: importResult.totalGames.toLocaleString(), l: 'Games imported' },
                      { v: importResult.years, l: 'Years of history' },
                      { v: importResult.startingGrade ?? '—', l: 'Starting grade' },
                    ].map(({ v, l }) => (
                      <div key={l} style={{ background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                        <p className="gmono" style={{ margin: '0 0 2px', fontSize: 20, fontWeight: 700, color: '#16a34a' }}>{v}</p>
                        <p className="gsans" style={{ margin: 0, fontSize: 11, color: 'rgba(13,40,24,0.45)' }}>{l}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {/* ── Personal Info ── */}
        <Card title="Personal Info" icon="👤">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <Field label="First Name">
              <input className="prof-input" type="text" value={profile.first_name} onChange={e => setProfile(p => ({ ...p, first_name: e.target.value }))}/>
            </Field>
            <Field label="Last Name">
              <input className="prof-input" type="text" value={profile.last_name} onChange={e => setProfile(p => ({ ...p, last_name: e.target.value }))}/>
            </Field>
          </div>
          <Field label="Country">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {selectedFlag && <span style={{ fontSize: 22 }}>{selectedFlag}</span>}
              <select className="prof-input" value={profile.country} onChange={e => setProfile(p => ({ ...p, country: e.target.value }))}>
                <option value="">Select country</option>
                <optgroup label="── Golf Croquet Countries ──">
                  {GC_COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </optgroup>
                <optgroup label="── All Other Countries ──">
                  {ALL_COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </optgroup>
              </select>
            </div>
          </Field>
          <Field label="City" action={<VisToggle enabled={profile.show_city} onChange={v => setProfile(p => ({ ...p, show_city: v }))}/>}>
            <input className="prof-input" type="text" value={profile.city} onChange={e => setProfile(p => ({ ...p, city: e.target.value }))} placeholder="Your city"/>
          </Field>
          <Field label="dGrade">
            <input className="prof-input" type="number" value={profile.dgrade} onChange={e => setProfile(p => ({ ...p, dgrade: e.target.value }))} placeholder="e.g. 1750"/>
          </Field>
          {profile.wcf_profile_url && (
            <div style={{ marginTop: 4 }}>
              <a href={profile.wcf_profile_url} target="_blank" rel="noopener noreferrer" className="gsans" style={{ fontSize: 12, color: '#16a34a', textDecoration: 'underline', textUnderlineOffset: 2 }}>View WCF ranking page ↗</a>
            </div>
          )}
        </Card>

        {/* ── Bio ── */}
        <Card title="Bio" icon="📝">
          <textarea className="prof-input" value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} rows={4} placeholder="A bit about yourself — your background, clubs you play for, how long you've been playing…" style={{ resize: 'vertical', lineHeight: 1.6 }}/>
        </Card>

        {/* ── Equipment ── */}
        <Card title="Equipment" icon="🏑">
          <Field label="Mallet Type">
            <input className="prof-input" type="text" value={profile.mallet_type} onChange={e => setProfile(p => ({ ...p, mallet_type: e.target.value }))} placeholder="e.g. Pidcock, Townsend…"/>
          </Field>
          <Field label="Grips Used">
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 12 }}>
              {GRIP_OPTIONS.map(grip => (
                <button key={grip} className="grip-btn" onClick={() => setSelectedGrips(prev => prev.includes(grip) ? prev.filter(g => g !== grip) : [...prev, grip])}
                  style={{ background: selectedGrips.includes(grip) ? G : 'white', color: selectedGrips.includes(grip) ? LIME : 'rgba(13,40,24,0.55)', border: `1px solid ${selectedGrips.includes(grip) ? G : '#e5e1d8'}` }}>
                  {grip}
                </button>
              ))}
            </div>
            <label className="prof-label">Grip Notes <span style={{ textTransform: 'none', fontWeight: 400, letterSpacing: 0 }}>— which shots do you use each grip for?</span></label>
            <textarea className="prof-input" value={profile.grip_notes} onChange={e => setProfile(p => ({ ...p, grip_notes: e.target.value }))} rows={3} style={{ resize: 'vertical' }}/>
          </Field>
        </Card>

        {/* ── Contact Details ── */}
        <Card title="Contact Details" icon="📬">
          <p className="gsans" style={{ fontSize: 12, color: 'rgba(13,40,24,0.4)', margin: '0 0 16px', lineHeight: 1.5 }}>
            Control what other signed-in members can see on your public profile.
          </p>
          <Field label="Phone" action={<VisToggle enabled={profile.show_phone} onChange={v => setProfile(p => ({ ...p, show_phone: v }))}/>}>
            <input className="prof-input" type="text" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+1 555 000 0000"/>
          </Field>
          <Field label="WhatsApp" action={<VisToggle enabled={profile.show_whatsapp} onChange={v => setProfile(p => ({ ...p, show_whatsapp: v }))}/>}>
            <input className="prof-input" type="text" value={profile.whatsapp} onChange={e => setProfile(p => ({ ...p, whatsapp: e.target.value }))} placeholder="+1 555 000 0000"/>
          </Field>
          <Field label="Contact Email" action={<VisToggle enabled={profile.show_contact_email} onChange={v => setProfile(p => ({ ...p, show_contact_email: v }))}/>}>
            <input className="prof-input" type="email" value={profile.contact_email} onChange={e => setProfile(p => ({ ...p, contact_email: e.target.value }))} placeholder="contact@example.com"/>
          </Field>
        </Card>

        {/* ── Save ── */}
        <button onClick={handleSave} disabled={saving} className="gsans"
          style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: saving ? '#e5e7eb' : LIME, color: saving ? '#9ca3af' : G, fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', transition: 'all 0.15s', marginTop: 4 }}>
          {saving ? 'Saving…' : 'Save Profile →'}
        </button>
      </div>
    </div>
  )
}
