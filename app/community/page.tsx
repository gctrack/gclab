'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import GCLabNav from '@/components/GCLabNav'
import { getFlag, countryName } from '@/lib/countries'

const G    = '#0d2818'
const LIME = '#4ade80'
const CREAM = '#f5f0e8'
const CREAM_BG = '#f5f2ec'

const CATEGORIES = [
  { id: 'General Discussion',   icon: '💬', color: '#6b7280' },
  { id: 'Talk Tactics',         icon: '🎯', color: '#3b82f6' },
  { id: 'Rules Discussion',     icon: '📜', color: '#8b5cf6' },
  { id: 'Event Notices',        icon: '📅', color: '#f59e0b' },
  { id: 'Equipment For Sale',   icon: '🏑', color: '#10b981' },
  { id: 'Player Introductions', icon: '👋', color: '#ec4899' },
  { id: 'Site Feedback',        icon: '💡', color: '#0d2818' },
]

const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]))

const ML = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
  .ghl  { font-family: 'DM Serif Display', serif; }
  .gsans{ font-family: 'DM Sans', sans-serif; }
  .gmono{ font-family: 'DM Mono', monospace; }
  .thread-row { transition: background 0.12s; cursor: pointer; }
  .thread-row:hover { background: #f0fdf4 !important; }
  .cat-tab { transition: all 0.15s; cursor: pointer; border: none; font-family: 'DM Sans',sans-serif; }
  .cat-tab:hover { opacity: 0.85; }
  .post-card { transition: box-shadow 0.12s; }
  .post-card:hover { box-shadow: 0 4px 18px rgba(0,0,0,0.08) !important; }
  .author-link { cursor: pointer; transition: color 0.12s; }
  .author-link:hover { color: ${LIME} !important; text-decoration: underline; }
  textarea:focus { outline: none; }
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 300; display: flex; align-items: center; justify-content: center; padding: 24px; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
`

type Thread = {
  id: string; title: string; created_by: string; created_at: string
  post_count: number; last_post_at: string; category?: string
  author_name?: string; author_avatar?: string
}
type Post = {
  id: string; thread_id: string; user_id: string; content: string
  created_at: string; author_name?: string; author_avatar?: string
}
type PublicProfile = {
  id: string; first_name: string; last_name: string; country?: string
  city?: string; show_city?: boolean; phone?: string; show_phone?: boolean
  whatsapp?: string; show_whatsapp?: boolean; contact_email?: string
  show_contact_email?: boolean; bio?: string; avatar_url?: string
  dgrade?: number; wcf_profile_url?: string
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })
}

// ── Avatar Bubble ─────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444','#6366f1']
function avatarColor(name: string) {
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function AvatarBubble({ name, avatarUrl, size = 38, onClick }: {
  name: string; avatarUrl?: string; size?: number; onClick?: () => void
}) {
  const initials = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?'
  const style: React.CSSProperties = {
    width: size, height: size, borderRadius: '50%', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: size * 0.36, fontWeight: 700, fontFamily: 'DM Sans, sans-serif',
    cursor: onClick ? 'pointer' : 'default', overflow: 'hidden',
    background: avatarColor(name), color: 'white',
    border: '2px solid rgba(255,255,255,0.8)',
  }
  if (avatarUrl) return (
    <div style={style} onClick={onClick}>
      <img src={avatarUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
    </div>
  )
  return <div style={style} onClick={onClick}>{initials}</div>
}

// ── Category Badge ────────────────────────────────────────────────────────────
function CatBadge({ category }: { category?: string }) {
  const cat = CAT_MAP[category || ''] || CAT_MAP['General Discussion']
  return (
    <span className="gsans" style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: `${cat.color}14`, color: cat.color, whiteSpace: 'nowrap',
    }}>
      {cat.icon} {cat.id}
    </span>
  )
}

// ── Public Profile Modal ──────────────────────────────────────────────────────
function PublicProfileModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('profiles')
      .select('id,first_name,last_name,country,city,show_city,phone,show_phone,whatsapp,show_whatsapp,contact_email,show_contact_email,bio,avatar_url,dgrade,wcf_profile_url')
      .eq('id', userId).single()
      .then(({ data }) => { setProfile(data); setLoading(false) })
  }, [userId])

  const name = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Member' : ''

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'white', borderRadius: 20, width: '100%', maxWidth: 380,
        boxShadow: '0 24px 64px rgba(0,0,0,0.2)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ background: G, padding: '24px 24px 20px', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: CREAM, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          {loading ? (
            <div style={{ height: 60, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', animation: 'pulse 1.5s infinite' }}/>
              <div style={{ flex: 1 }}>
                <div style={{ height: 14, width: 120, background: 'rgba(255,255,255,0.1)', borderRadius: 4, marginBottom: 8, animation: 'pulse 1.5s infinite' }}/>
                <div style={{ height: 10, width: 80, background: 'rgba(255,255,255,0.07)', borderRadius: 4, animation: 'pulse 1.5s infinite' }}/>
              </div>
            </div>
          ) : profile ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <AvatarBubble name={name} avatarUrl={profile.avatar_url} size={52}/>
              <div>
                <div className="ghl" style={{ fontSize: 20, color: CREAM, lineHeight: 1.1, marginBottom: 4 }}>{name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {profile.country && <span style={{ fontSize: 15 }}>{getFlag(profile.country)}</span>}
                  {profile.country && <span className="gsans" style={{ fontSize: 12, color: 'rgba(245,240,232,0.5)' }}>{countryName(profile.country)}</span>}
                  {profile.dgrade && <span className="gmono" style={{ fontSize: 12, color: LIME, marginLeft: 4 }}>{profile.dgrade}</span>}
                </div>
              </div>
            </div>
          ) : (
            <p className="gsans" style={{ color: 'rgba(245,240,232,0.4)', fontSize: 14 }}>Member</p>
          )}
        </div>

        {/* Body */}
        {profile && !loading && (
          <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {profile.bio && (
              <p className="gsans" style={{ fontSize: 13, color: '#374151', lineHeight: 1.65, margin: 0 }}>{profile.bio}</p>
            )}

            {/* Visible contact details */}
            {(profile.show_city && profile.city) || (profile.show_phone && profile.phone) ||
             (profile.show_whatsapp && profile.whatsapp) || (profile.show_contact_email && profile.contact_email) ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px', background: '#f9f9f7', borderRadius: 10, border: '1px solid #e5e1d8' }}>
                <p className="gsans" style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.07em', textTransform: 'uppercase', margin: '0 0 4px' }}>Contact</p>
                {profile.show_city && profile.city && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 13 }}>📍</span>
                    <span className="gsans" style={{ fontSize: 13, color: '#374151' }}>{profile.city}</span>
                  </div>
                )}
                {profile.show_phone && profile.phone && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 13 }}>📞</span>
                    <a href={`tel:${profile.phone}`} className="gsans" style={{ fontSize: 13, color: G, textDecoration: 'none' }}>{profile.phone}</a>
                  </div>
                )}
                {profile.show_whatsapp && profile.whatsapp && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 13 }}>💬</span>
                    <span className="gsans" style={{ fontSize: 13, color: '#374151' }}>{profile.whatsapp}</span>
                  </div>
                )}
                {profile.show_contact_email && profile.contact_email && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 13 }}>✉️</span>
                    <a href={`mailto:${profile.contact_email}`} className="gsans" style={{ fontSize: 13, color: G, textDecoration: 'none' }}>{profile.contact_email}</a>
                  </div>
                )}
              </div>
            ) : (
              !profile.bio && <p className="gsans" style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>This member hasn't shared any public details yet.</p>
            )}

            {profile.wcf_profile_url && (
              <a href={profile.wcf_profile_url} target="_blank" rel="noopener noreferrer" className="gsans"
                style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                ↗ View WCF profile
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Thread List ────────────────────────────────────────────────────────────────
function ThreadList({ threads, onSelect, filterCat }: {
  threads: Thread[]; onSelect: (t: Thread) => void; filterCat: string
}) {
  const filtered = filterCat === 'All'
    ? threads
    : threads.filter(t => (t.category || 'General Discussion') === filterCat)

  if (filtered.length === 0) return (
    <div style={{ textAlign: 'center', padding: '60px 24px' }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>💬</div>
      <p className="gsans" style={{ color: '#9ca3af', fontSize: 14, margin: 0 }}>
        {filterCat === 'All' ? 'No discussions yet. Start the first one!' : `No threads in ${filterCat} yet.`}
      </p>
    </div>
  )

  return (
    <div>
      {filtered.map(t => (
        <div key={t.id} className="thread-row" onClick={() => onSelect(t)}
          style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 12, alignItems: 'center', background: 'white' }}>
          <AvatarBubble name={t.author_name || '?'} avatarUrl={t.author_avatar} size={40}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <CatBadge category={t.category}/>
            </div>
            <h4 className="gsans" style={{ margin: '0 0 3px', fontSize: 14, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</h4>
            <p className="gsans" style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>
              by <strong style={{ color: '#6b7280' }}>{t.author_name || 'Member'}</strong> · {timeAgo(t.last_post_at)}
            </p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p className="gmono" style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 700, color: G }}>{t.post_count}</p>
            <p className="gsans" style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>replies</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Thread View ────────────────────────────────────────────────────────────────
function ThreadView({ thread, posts, currentUser, onPost, onBack, loading }: {
  thread: Thread; posts: Post[]; currentUser: any
  onPost: (content: string) => void; onBack: () => void; loading: boolean
}) {
  const [reply, setReply] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [profileUserId, setProfileUserId] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!reply.trim()) return
    setSubmitting(true)
    await onPost(reply.trim())
    setReply('')
    setSubmitting(false)
  }

  const cat = CAT_MAP[thread.category || ''] || CAT_MAP['General Discussion']

  return (
    <div>
      {/* Back + title */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={onBack} className="gsans"
          style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
          ← Back to discussions
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 8 }}><CatBadge category={thread.category}/></div>
            <h2 className="ghl" style={{ margin: '0 0 4px', fontSize: 22, color: G, lineHeight: 1.2 }}>{thread.title}</h2>
            <p className="gsans" style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>
              Started by <strong style={{ color: '#6b7280' }}>{thread.author_name}</strong> · {timeAgo(thread.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Posts */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ height: 80, background: '#f3f4f6', borderRadius: 12, animation: 'pulse 1.5s infinite' }}/>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {posts.map((post, i) => (
            <div key={post.id} className="post-card" style={{
              background: 'white', borderRadius: 14, border: '1px solid #e5e1d8',
              padding: '14px 18px', boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <AvatarBubble
                  name={post.author_name || '?'}
                  avatarUrl={post.author_avatar}
                  size={36}
                  onClick={() => setProfileUserId(post.user_id)}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span
                      className="gsans author-link"
                      style={{ fontSize: 13, fontWeight: 700, color: G }}
                      onClick={() => setProfileUserId(post.user_id)}
                    >
                      {post.author_name || 'Member'}
                    </span>
                    {i === 0 && (
                      <span className="gsans" style={{ fontSize: 10, background: `${cat.color}14`, color: cat.color, padding: '1px 7px', borderRadius: 20, fontWeight: 600 }}>OP</span>
                    )}
                    <span className="gsans" style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto' }}>{timeAgo(post.created_at)}</span>
                  </div>
                  <p className="gsans" style={{ margin: 0, fontSize: 14, color: '#374151', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{post.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply box */}
      {currentUser ? (
        <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e5e1d8', padding: '16px 18px' }}>
          <p className="gsans" style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: G }}>Add a reply</p>
          <textarea
            value={reply} onChange={e => setReply(e.target.value)}
            placeholder="Share your thoughts…" rows={4}
            className="gsans"
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box', marginBottom: 10, resize: 'vertical' }}
          />
          <button onClick={handleSubmit} disabled={submitting || !reply.trim()} className="gsans"
            style={{ padding: '9px 20px', borderRadius: 8, border: 'none', cursor: reply.trim() ? 'pointer' : 'default',
              background: reply.trim() ? G : '#e5e7eb', color: reply.trim() ? 'white' : '#9ca3af',
              fontSize: 13, fontWeight: 600, transition: 'all 0.15s' }}>
            {submitting ? 'Posting…' : 'Post Reply →'}
          </button>
        </div>
      ) : (
        <div style={{ background: '#f9f9f7', borderRadius: 14, border: '1px solid #e5e1d8', padding: '16px 18px', textAlign: 'center' }}>
          <p className="gsans" style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>
            <a href="/login" style={{ color: G, fontWeight: 600 }}>Sign in</a> to join the conversation.
          </p>
        </div>
      )}

      {profileUserId && <PublicProfileModal userId={profileUserId} onClose={() => setProfileUserId(null)}/>}
    </div>
  )
}

// ── New Thread Modal ───────────────────────────────────────────────────────────
function NewThreadModal({ onClose, onSubmit }: {
  onClose: () => void
  onSubmit: (title: string, body: string, category: string) => void
}) {
  const [title,    setTitle]    = useState('')
  const [body,     setBody]     = useState('')
  const [category, setCategory] = useState('General Discussion')
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) return
    setLoading(true)
    await onSubmit(title.trim(), body.trim(), category)
    setLoading(false)
  }

  const cat = CAT_MAP[category]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'white', borderRadius: 20, width: '100%', maxWidth: 540,
        boxShadow: '0 24px 48px rgba(0,0,0,0.2)', overflow: 'hidden',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e1d8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 className="ghl" style={{ margin: 0, fontSize: 20, color: G }}>Start a Discussion</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Category picker */}
          <div>
            <label className="gsans" style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Category</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setCategory(c.id)} className="cat-tab gsans"
                  style={{
                    padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: category === c.id ? `${c.color}18` : 'transparent',
                    color: category === c.id ? c.color : '#9ca3af',
                    border: `1px solid ${category === c.id ? `${c.color}40` : '#e5e7eb'}`,
                  }}>
                  {c.icon} {c.id}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="gsans" style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="What would you like to discuss?"
              className="gsans" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}/>
          </div>

          <div>
            <label className="gsans" style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Message</label>
            <textarea value={body} onChange={e => setBody(e.target.value)}
              placeholder="Start the conversation…" rows={5} className="gsans"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }}/>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} className="gsans"
              style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', fontSize: 13, cursor: 'pointer', color: '#6b7280' }}>
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={loading || !title.trim() || !body.trim()} className="gsans"
              style={{ padding: '9px 20px', borderRadius: 8, border: 'none',
                background: title.trim() && body.trim() ? cat.color : '#e5e7eb',
                color: title.trim() && body.trim() ? 'white' : '#9ca3af',
                fontSize: 13, fontWeight: 600, cursor: title.trim() && body.trim() ? 'pointer' : 'default' }}>
              {loading ? 'Posting…' : 'Post Discussion →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function CommunityPage() {
  const [userProfile,    setUserProfile]    = useState<any>(null)
  const [signedIn,       setSignedIn]       = useState<boolean | null>(null)
  const [currentUser,    setCurrentUser]    = useState<any>(null)
  const [threads,        setThreads]        = useState<Thread[]>([])
  const [activeThread,   setActiveThread]   = useState<Thread | null>(null)
  const [posts,          setPosts]          = useState<Post[]>([])
  const [postsLoading,   setPostsLoading]   = useState(false)
  const [showNewThread,  setShowNewThread]  = useState(false)
  const [threadsLoading, setThreadsLoading] = useState(true)
  const [filterCat,      setFilterCat]      = useState('All')

  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setSignedIn(true)
        setCurrentUser(user)
        const { data } = await supabase.from('profiles').select('role,first_name,last_name,avatar_url').eq('id', user.id).single()
        setUserProfile(data)
      } else setSignedIn(false)
    }
    init()
    loadThreads()
  }, [])

  // Batch-fetch profiles for a list of user IDs
  const fetchProfileMap = async (userIds: string[]) => {
    const ids = [...new Set(userIds)]
    const { data } = await supabase.from('profiles').select('id,first_name,last_name,avatar_url').in('id', ids)
    const map = new Map<string, { name: string; avatar_url?: string }>()
    data?.forEach(p => map.set(p.id, {
      name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Member',
      avatar_url: p.avatar_url,
    }))
    return map
  }

  const loadThreads = async () => {
    setThreadsLoading(true)
    const { data } = await supabase
      .from('forum_threads').select('*')
      .order('last_post_at', { ascending: false }).limit(100)
    if (data) {
      const map = await fetchProfileMap(data.map(t => t.created_by))
      setThreads(data.map(t => ({
        ...t,
        author_name: map.get(t.created_by)?.name || 'Member',
        author_avatar: map.get(t.created_by)?.avatar_url,
      })))
    }
    setThreadsLoading(false)
  }

  const loadPosts = async (threadId: string) => {
    setPostsLoading(true)
    const { data } = await supabase
      .from('forum_posts').select('*')
      .eq('thread_id', threadId).order('created_at', { ascending: true })
    if (data) {
      const map = await fetchProfileMap(data.map(p => p.user_id))
      setPosts(data.map(p => ({
        ...p,
        author_name: map.get(p.user_id)?.name || 'Member',
        author_avatar: map.get(p.user_id)?.avatar_url,
      })))
    }
    setPostsLoading(false)
  }

  const handleSelectThread = (t: Thread) => {
    setActiveThread(t)
    loadPosts(t.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handlePost = async (content: string) => {
    if (!currentUser || !activeThread) return
    const { data } = await supabase
      .from('forum_posts').insert({ thread_id: activeThread.id, user_id: currentUser.id, content })
      .select().single()
    if (data) {
      const name = userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'Member' : 'Member'
      setPosts(prev => [...prev, { ...data, author_name: name, author_avatar: userProfile?.avatar_url }])
      await supabase.from('forum_threads')
        .update({ post_count: (activeThread.post_count || 0) + 1, last_post_at: new Date().toISOString() })
        .eq('id', activeThread.id)
    }
  }

  const handleNewThread = async (title: string, body: string, category: string) => {
    if (!currentUser) return
    const { data: thread } = await supabase.from('forum_threads')
      .insert({ title, category, created_by: currentUser.id, post_count: 1, last_post_at: new Date().toISOString() })
      .select().single()
    if (thread) {
      await supabase.from('forum_posts').insert({ thread_id: thread.id, user_id: currentUser.id, content: body })
      setShowNewThread(false)
      await loadThreads()
    }
  }

  // Category counts
  const catCounts = threads.reduce((acc, t) => {
    const c = t.category || 'General Discussion'
    acc[c] = (acc[c] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div style={{ minHeight: '100vh', background: CREAM_BG }}>
      <style dangerouslySetInnerHTML={{ __html: ML }}/>
      <GCLabNav role={userProfile?.role} isSignedIn={!!signedIn} currentPath="/community"/>

      {/* ── Header ── */}
      <div style={{ background: G, borderBottom: '2px solid #16a34a' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px 28px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 20, padding: '3px 12px', marginBottom: 12 }}>
              <span style={{ fontSize: 14 }}>🌿</span>
              <span className="gsans" style={{ color: LIME, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Community</span>
            </div>
            <h1 className="ghl" style={{ color: CREAM, fontSize: 'clamp(24px, 3vw, 36px)', margin: '0 0 6px', lineHeight: 1.1 }}>Golf Croquet Community</h1>
            <p className="gsans" style={{ color: 'rgba(245,240,232,0.45)', margin: 0, fontSize: 13 }}>
              {threadsLoading ? 'Loading…' : `${threads.length} discussion${threads.length !== 1 ? 's' : ''} across ${CATEGORIES.length} topics`}
            </p>
          </div>
          {signedIn && (
            <button onClick={() => setShowNewThread(true)} className="gsans"
              style={{ padding: '10px 20px', background: LIME, color: G, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
              + New Discussion
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 24px 60px' }}>

        {/* Sign-in banner */}
        {signedIn === false && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'white', border: '1px solid #e5e1d8', borderRadius: 12, padding: '12px 20px', marginBottom: 20, flexWrap: 'wrap' }}>
            <p className="gsans" style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
              💬 <strong style={{ color: '#374151' }}>Join the conversation</strong> — create an account to post and reply.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href="/login?mode=signup" className="gsans" style={{ padding: '7px 16px', borderRadius: 8, background: G, color: 'white', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>Create account</a>
              <a href="/login" className="gsans" style={{ padding: '7px 16px', borderRadius: 8, background: 'transparent', color: G, textDecoration: 'none', fontSize: 13, fontWeight: 500, border: '1px solid #d1d5db' }}>Sign in</a>
            </div>
          </div>
        )}

        {!activeThread && (
          <>
            {/* Category filter tabs */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              <button className="cat-tab gsans" onClick={() => setFilterCat('All')}
                style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: filterCat === 'All' ? G : 'white',
                  color: filterCat === 'All' ? LIME : '#6b7280',
                  border: `1px solid ${filterCat === 'All' ? G : '#e5e7eb'}` }}>
                All ({threads.length})
              </button>
              {CATEGORIES.map(c => {
                const count = catCounts[c.id] || 0
                if (count === 0 && filterCat !== c.id) return null
                return (
                  <button key={c.id} className="cat-tab gsans" onClick={() => setFilterCat(c.id)}
                    style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: filterCat === c.id ? `${c.color}18` : 'white',
                      color: filterCat === c.id ? c.color : '#6b7280',
                      border: `1px solid ${filterCat === c.id ? `${c.color}40` : '#e5e7eb'}` }}>
                    {c.icon} {c.id} {count > 0 && `(${count})`}
                  </button>
                )
              })}
            </div>
          </>
        )}

        <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e5e1d8', overflow: 'hidden' }}>
          {activeThread ? (
            <div style={{ padding: '24px' }}>
              <ThreadView
                thread={activeThread} posts={posts} currentUser={currentUser}
                onPost={handlePost}
                onBack={() => { setActiveThread(null); setPosts([]) }}
                loading={postsLoading}
              />
            </div>
          ) : threadsLoading ? (
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} style={{ height: 68, background: '#f3f4f6', borderRadius: 10, animation: 'pulse 1.5s infinite' }}/>
              ))}
            </div>
          ) : (
            <>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6', background: '#fafaf8' }}>
                <p className="gsans" style={{ margin: 0, fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>
                  {filterCat === 'All' ? `${threads.length} discussions` : `${(threads.filter(t => (t.category || 'General Discussion') === filterCat)).length} in ${filterCat}`} · sorted by latest activity
                </p>
              </div>
              <ThreadList threads={threads} onSelect={handleSelectThread} filterCat={filterCat}/>
            </>
          )}
        </div>
      </div>

      {showNewThread && <NewThreadModal onClose={() => setShowNewThread(false)} onSubmit={handleNewThread}/>}
    </div>
  )
}
