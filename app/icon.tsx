import { ImageResponse } from 'next/og'
import { headers } from 'next/headers'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default async function Icon() {
  const host = (await headers()).get('host') || ''
  const isLab = host.includes('gclab')

  if (isLab) {
    // GC Lab beaker icon
    return new ImageResponse(
      (
        <div
          style={{
            width: 32, height: 32,
            background: '#0d2818',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="20" height="26" viewBox="0 0 44 52" fill="none">
            <rect x="13" y="2" width="18" height="8" rx="2" fill="rgba(74,222,128,0.2)" stroke="#4ade80" strokeWidth="2"/>
            <path d="M13 10 L2 44 Q0 50 4 51 L40 51 Q44 50 42 44 L31 10 Z" fill="rgba(74,222,128,0.1)" stroke="#4ade80" strokeWidth="2" strokeLinejoin="round"/>
            <circle cx="14" cy="40" r="7" fill="#ef4444"/>
            <circle cx="30" cy="40" r="7" fill="#3b82f6"/>
            <circle cx="22" cy="29" r="7" fill="#eab308"/>
          </svg>
        </div>
      ),
      { ...size }
    )
  }

  // GC Rankings bar chart icon
  return new ImageResponse(
    (
      <div
        style={{
          width: 32, height: 32,
          background: '#0d2818',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 44 44" fill="none">
          <rect x="3"  y="28" width="10" height="14" rx="2" fill="#ef4444"/>
          <rect x="17" y="16" width="10" height="26" rx="2" fill="#3b82f6"/>
          <rect x="31" y="4"  width="10" height="38" rx="2" fill="#eab308"/>
          <polyline points="8,26 22,14 36,2" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="36" cy="2" r="3" fill="#4ade80"/>
        </svg>
      </div>
    ),
    { ...size }
  )
}
