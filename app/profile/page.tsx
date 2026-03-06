'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import WcfMatchBanner from '@/components/WcfMatchBanner'

const GC_COUNTRIES = [
  { code: 'AU', name: 'Australia' },
  { code: 'BE', name: 'Belgium' },
  { code: 'CA', name: 'Canada' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'EG', name: 'Egypt' },
  { code: 'GB-ENG', name: 'England' },
  { code: 'DE', name: 'Germany' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'IE', name: 'Ireland' },
  { code: 'LV', name: 'Latvia' },
  { code: 'MX', name: 'Mexico' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NO', name: 'Norway' },
  { code: 'PT', name: 'Portugal' },
  { code: 'GB-SCT', name: 'Scotland' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'ES', name: 'Spain' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'US', name: 'USA' },
  { code: 'GB-WLS', name: 'Wales' },
]

const ALL_COUNTRIES = [
  { code: 'AF', name: 'Afghanistan' },
  { code: 'AL', name: 'Albania' },
  { code: 'DZ', name: 'Algeria' },
  { code: 'AD', name: 'Andorra' },
  { code: 'AO', name: 'Angola' },
  { code: 'AG', name: 'Antigua and Barbuda' },
  { code: 'AR', name: 'Argentina' },
  { code: 'AM', name: 'Armenia' },
  { code: 'AT', name: 'Austria' },
  { code: 'AZ', name: 'Azerbaijan' },
  { code: 'BS', name: 'Bahamas' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'BB', name: 'Barbados' },
  { code: 'BY', name: 'Belarus' },
  { code: 'BZ', name: 'Belize' },
  { code: 'BJ', name: 'Benin' },
  { code: 'BT', name: 'Bhutan' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'BA', name: 'Bosnia and Herzegovina' },
  { code: 'BW', name: 'Botswana' },
  { code: 'BR', name: 'Brazil' },
  { code: 'BN', name: 'Brunei' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'BI', name: 'Burundi' },
  { code: 'CV', name: 'Cabo Verde' },
  { code: 'KH', name: 'Cambodia' },
  { code: 'CM', name: 'Cameroon' },
  { code: 'CF', name: 'Central African Republic' },
  { code: 'TD', name: 'Chad' },
  { code: 'CL', name: 'Chile' },
  { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colombia' },
  { code: 'KM', name: 'Comoros' },
  { code: 'CG', name: 'Congo' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'HR', name: 'Croatia' },
  { code: 'CU', name: 'Cuba' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'DK', name: 'Denmark' },
  { code: 'DJ', name: 'Djibouti' },
  { code: 'DM', name: 'Dominica' },
  { code: 'DO', name: 'Dominican Republic' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'GQ', name: 'Equatorial Guinea' },
  { code: 'ER', name: 'Eritrea' },
  { code: 'EE', name: 'Estonia' },
  { code: 'SZ', name: 'Eswatini' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'FJ', name: 'Fiji' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'GA', name: 'Gabon' },
  { code: 'GM', name: 'Gambia' },
  { code: 'GE', name: 'Georgia' },
  { code: 'GH', name: 'Ghana' },
  { code: 'GR', name: 'Greece' },
  { code: 'GD', name: 'Grenada' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'GN', name: 'Guinea' },
  { code: 'GW', name: 'Guinea-Bissau' },
  { code: 'GY', name: 'Guyana' },
  { code: 'HT', name: 'Haiti' },
  { code: 'HN', name: 'Honduras' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IS', name: 'Iceland' },
  { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IR', name: 'Iran' },
  { code: 'IQ', name: 'Iraq' },
  { code: 'IL', name: 'Israel' },
  { code: 'IT', name: 'Italy' },
  { code: 'JM', name: 'Jamaica' },
  { code: 'JP', name: 'Japan' },
  { code: 'JO', name: 'Jordan' },
  { code: 'KZ', name: 'Kazakhstan' },
  { code: 'KE', name: 'Kenya' },
  { code: 'KI', name: 'Kiribati' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'KG', name: 'Kyrgyzstan' },
  { code: 'LA', name: 'Laos' },
  { code: 'LB', name: 'Lebanon' },
  { code: 'LS', name: 'Lesotho' },
  { code: 'LR', name: 'Liberia' },
  { code: 'LY', name: 'Libya' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MG', name: 'Madagascar' },
  { code: 'MW', name: 'Malawi' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'MV', name: 'Maldives' },
  { code: 'ML', name: 'Mali' },
  { code: 'MT', name: 'Malta' },
  { code: 'MH', name: 'Marshall Islands' },
  { code: 'MR', name: 'Mauritania' },
  { code: 'MU', name: 'Mauritius' },
  { code: 'FM', name: 'Micronesia' },
  { code: 'MD', name: 'Moldova' },
  { code: 'MC', name: 'Monaco' },
  { code: 'MN', name: 'Mongolia' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'MA', name: 'Morocco' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'MM', name: 'Myanmar' },
  { code: 'NA', name: 'Namibia' },
  { code: 'NR', name: 'Nauru' },
  { code: 'NP', name: 'Nepal' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'NE', name: 'Niger' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'MK', name: 'North Macedonia' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PW', name: 'Palau' },
  { code: 'PA', name: 'Panama' },
  { code: 'PG', name: 'Papua New Guinea' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'PE', name: 'Peru' },
  { code: 'PH', name: 'Philippines' },
  { code: 'PL', name: 'Poland' },
  { code: 'QA', name: 'Qatar' },
  { code: 'RO', name: 'Romania' },
  { code: 'RU', name: 'Russia' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'KN', name: 'Saint Kitts and Nevis' },
  { code: 'LC', name: 'Saint Lucia' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines' },
  { code: 'WS', name: 'Samoa' },
  { code: 'SM', name: 'San Marino' },
  { code: 'ST', name: 'Sao Tome and Principe' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SN', name: 'Senegal' },
  { code: 'RS', name: 'Serbia' },
  { code: 'SL', name: 'Sierra Leone' },
  { code: 'SG', name: 'Singapore' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'SB', name: 'Solomon Islands' },
  { code: 'SO', name: 'Somalia' },
  { code: 'SS', name: 'South Sudan' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'SD', name: 'Sudan' },
  { code: 'SR', name: 'Suriname' },
  { code: 'SY', name: 'Syria' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'TJ', name: 'Tajikistan' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TL', name: 'Timor-Leste' },
  { code: 'TG', name: 'Togo' },
  { code: 'TO', name: 'Tonga' },
  { code: 'TT', name: 'Trinidad and Tobago' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'TR', name: 'Turkey' },
  { code: 'TM', name: 'Turkmenistan' },
  { code: 'TV', name: 'Tuvalu' },
  { code: 'UG', name: 'Uganda' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'UZ', name: 'Uzbekistan' },
  { code: 'VU', name: 'Vanuatu' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'YE', name: 'Yemen' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'ZW', name: 'Zimbabwe' },
]

const GRIP_OPTIONS = ['Irish', 'Solomon', 'Standard', 'Other']

function getFlag(code: string) {
  if (code === 'GB-ENG') return '🏴󠁧󠁢󠁥󠁮󠁧󠁿'
  if (code === 'GB-SCT') return '🏴󠁧󠁢󠁳󠁣󠁴󠁿'
  if (code === 'GB-WLS') return '🏴󠁧󠁢󠁷󠁬󠁳󠁿'
  return code
    .toUpperCase()
    .split('')
    .map(c => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join('')
}

function Toggle({ enabled, onChange }: { enabled: boolean, onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`flex items-center gap-2 text-xs px-2 py-1 rounded-full border transition ${
        enabled
          ? 'bg-green-50 border-green-400 text-green-700'
          : 'bg-gray-50 border-gray-300 text-gray-400'
      }`}
    >
      <span className={`w-3 h-3 rounded-full ${enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
      {enabled ? 'Visible to members' : 'Private'}
    </button>
  )
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [message, setMessage] = useState('')
  const [userId, setUserId] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    country: '',
    city: '',
    phone: '',
    whatsapp: '',
    contact_email: '',
    bio: '',
    mallet_type: '',
    grip_notes: '',
    dgrade: '',
    wcf_profile_url: '',
    wcf_player_id: '',
    show_city: false,
    show_phone: false,
    show_whatsapp: false,
    show_contact_email: false,
  })
  const [selectedGrips, setSelectedGrips] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUserId(user.id)
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (data) {
        setProfile({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          country: data.country || '',
          city: data.city || '',
          phone: data.phone || '',
          whatsapp: data.whatsapp || '',
          contact_email: data.contact_email || '',
          bio: data.bio || '',
          mallet_type: data.mallet_type || '',
          grip_notes: data.grip_notes || '',
          dgrade: data.dgrade || '',
          wcf_profile_url: data.wcf_profile_url || '',
          wcf_player_id: data.wcf_player_id || '',
          show_city: data.show_city || false,
          show_phone: data.show_phone || false,
          show_whatsapp: data.show_whatsapp || false,
          show_contact_email: data.show_contact_email || false,
        })
        setSelectedGrips(data.grips || [])
        if (data.avatar_url) setAvatarUrl(data.avatar_url)
      }
      setLoading(false)
    }
    getProfile()
  }, [])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setUploadingAvatar(true)
    const fileExt = file.name.split('.').pop()
    const filePath = `${userId}/avatar.${fileExt}`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })
    if (uploadError) {
      setMessage('Error uploading photo')
      setUploadingAvatar(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId)
    setAvatarUrl(publicUrl)
    setUploadingAvatar(false)
    setMessage('Photo updated successfully')
  }

  const toggleGrip = (grip: string) => {
    setSelectedGrips(prev =>
      prev.includes(grip) ? prev.filter(g => g !== grip) : [...prev, grip]
    )
  }

  const handleWcfLinked = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    if (data) {
      setProfile(p => ({
        ...p,
        wcf_player_id: data.wcf_player_id || '',
        dgrade: data.dgrade || '',
        wcf_profile_url: data.wcf_profile_url || '',
      }))
    }
  }

  const selectedFlag = profile.country ? getFlag(profile.country) : null

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: existing } = await supabase
      .from('profiles')
      .select('dgrade')
      .eq('id', user.id)
      .single()

    const newDgrade = profile.dgrade ? parseInt(profile.dgrade as string) : null

    if (newDgrade && existing?.dgrade !== newDgrade) {
      await supabase.from('dgrade_history').insert({
        user_id: user.id,
        dgrade_value: newDgrade,
      })
    }

    let wcfUrl = profile.wcf_profile_url
    if (!wcfUrl && profile.first_name && profile.last_name) {
      wcfUrl = `https://rank.worldcroquet.org/gcrankdg/player_full.php?pffn=${profile.first_name}&pfsn=${profile.last_name}&nt=1`
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: profile.first_name,
        last_name: profile.last_name,
        country: profile.country,
        city: profile.city,
        phone: profile.phone,
        whatsapp: profile.whatsapp,
        contact_email: profile.contact_email,
        bio: profile.bio,
        mallet_type: profile.mallet_type,
        grips: selectedGrips,
        grip_notes: profile.grip_notes,
        dgrade: newDgrade,
        wcf_profile_url: wcfUrl,
        show_city: profile.show_city,
        show_phone: profile.show_phone,
        show_whatsapp: profile.show_whatsapp,
        show_contact_email: profile.show_contact_email,
      })
      .eq('id', user.id)

    if (error) {
      setMessage('Error saving profile')
    } else {
      setMessage('Profile saved successfully')
      if (wcfUrl) setProfile(p => ({ ...p, wcf_profile_url: wcfUrl }))
    }
    setSaving(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <a href="/dashboard" className="text-xl font-bold text-green-600">GCLab</a>
        <a href="/dashboard" className="text-sm text-gray-600 hover:text-green-600">← Dashboard</a>
      </nav>
      <main className="max-w-2xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-bold mb-6">Your Profile</h2>

        {!profile.wcf_player_id && profile.first_name && profile.last_name && (
          <WcfMatchBanner
            userId={userId}
            firstName={profile.first_name}
            lastName={profile.last_name}
            onLinked={handleWcfLinked}
          />
        )}

        {message && (
          <p className={`text-sm mb-4 ${message.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>
            {message}
          </p>
        )}

        {profile.wcf_player_id && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm text-green-700">
            ✓ Linked to WCF record —
            <a href={profile.wcf_profile_url} target="_blank" rel="noopener noreferrer" className="underline ml-1">
              view WCF profile
            </a>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">

          <div className="flex items-center gap-4">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile photo"
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center text-gray-400 text-2xl">
                  {profile.first_name ? profile.first_name.charAt(0).toUpperCase() : '?'}
                </div>
              )}
            </div>
            <div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-200 transition disabled:opacity-50"
              >
                {uploadingAvatar ? 'Uploading...' : avatarUrl ? 'Change photo' : 'Upload photo'}
              </button>
              <p className="text-xs text-gray-400 mt-1">JPG or PNG, max 2MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                value={profile.first_name}
                onChange={(e) => setProfile(p => ({ ...p, first_name: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                value={profile.last_name}
                onChange={(e) => setProfile(p => ({ ...p, last_name: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
            <div className="flex items-center gap-2">
              {selectedFlag && <span className="text-2xl">{selectedFlag}</span>}
              <select
                value={profile.country}
                onChange={(e) => setProfile(p => ({ ...p, country: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select your country</option>
                <optgroup label="── Golf Croquet Countries ──">
                  {GC_COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </optgroup>
                <optgroup label="── All Other Countries ──">
                  {ALL_COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">City</label>
              <Toggle enabled={profile.show_city} onChange={(v) => setProfile(p => ({ ...p, show_city: v }))} />
            </div>
            <input
              type="text"
              value={profile.city}
              onChange={(e) => setProfile(p => ({ ...p, city: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">dGrade</label>
            <input
              type="number"
              value={profile.dgrade}
              onChange={(e) => setProfile(p => ({ ...p, dgrade: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g. 1750"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WCF Profile URL</label>
            <input
              type="text"
              value={profile.wcf_profile_url}
              onChange={(e) => setProfile(p => ({ ...p, wcf_profile_url: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Auto-generated from your name"
            />
            {profile.wcf_profile_url && (
              <div className="mt-1">
                <a href={profile.wcf_profile_url} target="_blank" rel="noopener noreferrer" className="text-sm text-green-600 hover:underline">
                  View WCF ranking page →
                </a>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mallet Type</label>
            <input
              type="text"
              value={profile.mallet_type}
              onChange={(e) => setProfile(p => ({ ...p, mallet_type: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Grips Used</label>
            <div className="flex gap-2 flex-wrap mb-3">
              {GRIP_OPTIONS.map(grip => (
                <button
                  key={grip}
                  onClick={() => toggleGrip(grip)}
                  className={`px-4 py-2 rounded-full border text-sm font-medium transition ${
                    selectedGrips.includes(grip)
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-green-500'
                  }`}
                >
                  {grip}
                </button>
              ))}
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Grip Notes <span className="text-gray-400 font-normal">e.g. which shots do you use each grip for?</span>
            </label>
            <textarea
              value={profile.grip_notes}
              onChange={(e) => setProfile(p => ({ ...p, grip_notes: e.target.value }))}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              value={profile.bio}
              onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))}
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Contact Details</h3>
            <p className="text-sm text-gray-500 mb-4">Control what other signed-in members can see.</p>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <Toggle enabled={profile.show_phone} onChange={(v) => setProfile(p => ({ ...p, show_phone: v }))} />
                </div>
                <input
                  type="text"
                  value={profile.phone}
                  onChange={(e) => setProfile(p => ({ ...p, phone: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">WhatsApp</label>
                  <Toggle enabled={profile.show_whatsapp} onChange={(v) => setProfile(p => ({ ...p, show_whatsapp: v }))} />
                </div>
                <input
                  type="text"
                  value={profile.whatsapp}
                  onChange={(e) => setProfile(p => ({ ...p, whatsapp: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Contact Email</label>
                  <Toggle enabled={profile.show_contact_email} onChange={(v) => setProfile(p => ({ ...p, show_contact_email: v }))} />
                </div>
                <input
                  type="email"
                  value={profile.contact_email}
                  onChange={(e) => setProfile(p => ({ ...p, contact_email: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>

        </div>
      </main>
    </div>
  )
}