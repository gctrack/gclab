'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import GCLabNav from '@/components/GCLabNav'

const DARK_GREEN = '#0d2818'
const CREAM = '#f5f0e8'
const LIME = '#4ade80'

const ML = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
  .ghl  { font-family: 'DM Serif Display', serif; }
  .gsans{ font-family: 'DM Sans', sans-serif; }
  .gmono{ font-family: 'DM Mono', monospace; }
  .post-card { transition: box-shadow 0.15s; }
  .post-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.09) !important; }
  .thread-row:hover { background: #f9f9f7 !important; cursor: pointer; }
  .reply-btn { transition: all 0.15s; }
  .reply-btn:hover { background: #f0fdf4 !important; color: #16a34a !important; }
  textarea { resize: vertical; }
  textarea:focus { outline: none; border-color: #4ade80 !important; }
`

type Thread = {
  id: string
  title: string
  created_by: string
  created_at: string
  post_count: number
  last_post_at: string
  author_name?: string
}
type Post = {
  id: string
  thread_id: string
  user_id: string
  content: string
  created_at: string
  author_name?: string
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
  return new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
}

// ── Thread List ────────────────────────────────────────────────────────────
function ThreadList({ threads, onSelect, currentUser }: {
  threads: Thread[]
  onSelect: (t: Thread) => void
  currentUser: any
}) {
  if (threads.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
        <p className="gsans" style={{ color: '#9ca3af', fontSize: 14 }}>No discussions yet. Start the first one!</p>
      </div>
    )
  }
  return (
    <div>
      {threads.map(t => (
        <div key={t.id} className="thread-row" onClick={() => onSelect(t)}
          style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
            💬
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 className="gsans" style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</h4>
            <p className="gsans" style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>
              by <strong style={{ color: '#6b7280' }}>{t.author_name || 'Unknown'}</strong> · {timeAgo(t.created_at)}
            </p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p className="gmono" style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: DARK_GREEN }}>{t.post_count}</p>
            <p className="gsans" style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>replies</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Thread View ────────────────────────────────────────────────────────────
function ThreadView({ thread, posts, currentUser, onPost, onBack, loading }: {
  thread: Thread
  posts: Post[]
  currentUser: any
  onPost: (content: string) => void
  onBack: () => void
  loading: boolean
}) {
  const [reply, setReply] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!reply.trim()) return
    setSubmitting(true)
    await onPost(reply.trim())
    setReply('')
    setSubmitting(false)
  }

  return (
    <div>
      {/* Back + title */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={onBack} className="gsans" style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 12 }}>← Back to discussions</button>
        <h2 className="ghl" style={{ margin: 0, fontSize: 24, color: '#111827' }}>{thread.title}</h2>
        <p className="gsans" style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>by {thread.author_name} · {timeAgo(thread.created_at)}</p>
      </div>

      {/* Posts */}
      {loading ? (
        <p className="gsans" style={{ color: '#9ca3af', padding: '20px 0' }}>Loading…</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {posts.map((post, i) => (
            <div key={post.id} className="post-card" style={{
              background: 'white', borderRadius: 14, border: '1px solid #e5e1d8',
              padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: i === 0 ? '#e8f5e9' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                  {i === 0 ? '🎯' : '👤'}
                </div>
                <strong className="gsans" style={{ fontSize: 14, color: '#374151' }}>{post.author_name || 'Unknown'}</strong>
                <span className="gsans" style={{ fontSize: 12, color: '#9ca3af', marginLeft: 'auto' }}>{timeAgo(post.created_at)}</span>
              </div>
              <p className="gsans" style={{ margin: 0, fontSize: 14, color: '#374151', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{post.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Reply box */}
      {currentUser ? (
        <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e5e1d8', padding: '16px 20px' }}>
          <p className="gsans" style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: '#374151' }}>Add a reply</p>
          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            placeholder="Share your thoughts…"
            rows={4}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 10,
              border: '1px solid #d1d5db', fontSize: 14, fontFamily: 'DM Sans, sans-serif',
              boxSizing: 'border-box', marginBottom: 10,
            }}
          />
          <button onClick={handleSubmit} disabled={submitting || !reply.trim()}
            className="gsans"
            style={{
              padding: '9px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: reply.trim() ? DARK_GREEN : '#e5e7eb',
              color: reply.trim() ? 'white' : '#9ca3af',
              fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
            }}>
            {submitting ? 'Posting…' : 'Post Reply →'}
          </button>
        </div>
      ) : (
        <div style={{ background: '#f9f9f7', borderRadius: 14, border: '1px solid #e5e1d8', padding: '16px 20px', textAlign: 'center' }}>
          <p className="gsans" style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>
            <a href="/login" style={{ color: DARK_GREEN, fontWeight: 600 }}>Sign in</a> to join the conversation.
          </p>
        </div>
      )}
    </div>
  )
}

// ── New Thread Modal ───────────────────────────────────────────────────────
function NewThreadModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (title: string, body: string) => void }) {
  const [title, setTitle]   = useState('')
  const [body, setBody]     = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) return
    setLoading(true)
    await onSubmit(title.trim(), body.trim())
    setLoading(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={onClose}/>
      <div style={{ position: 'relative', background: 'white', borderRadius: 20, width: '100%', maxWidth: 520, padding: '28px 28px 24px', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}>
        <h3 className="ghl" style={{ margin: '0 0 20px', fontSize: 22, color: '#111827' }}>Start a Discussion</h3>
        <div style={{ marginBottom: 14 }}>
          <label className="gsans" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What would you like to discuss?"
            className="gsans" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}/>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label className="gsans" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Message</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Start the conversation…" rows={5}
            className="gsans" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}/>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="gsans" style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', fontSize: 13, cursor: 'pointer', color: '#6b7280' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading || !title.trim() || !body.trim()} className="gsans"
            style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: DARK_GREEN, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {loading ? 'Posting…' : 'Post Discussion →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function CommunityPage() {
  const [userProfile,   setUserProfile]   = useState<any>(null)
  const [signedIn,      setSignedIn]      = useState<boolean | null>(null)
  const [currentUser,   setCurrentUser]   = useState<any>(null)
  const [threads,       setThreads]       = useState<Thread[]>([])
  const [activeThread,  setActiveThread]  = useState<Thread | null>(null)
  const [posts,         setPosts]         = useState<Post[]>([])
  const [postsLoading,  setPostsLoading]  = useState(false)
  const [showNewThread, setShowNewThread] = useState(false)
  const [threadsLoading, setThreadsLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setSignedIn(true)
        setCurrentUser(user)
        const { data } = await supabase.from('profiles').select('role, first_name, last_name').eq('id', user.id).single()
        setUserProfile(data)
      } else setSignedIn(false)
    }
    init()
    loadThreads()
  }, [])

  const getAuthorName = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('first_name, last_name').eq('id', userId).single()
    return data ? `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Member' : 'Member'
  }

  const loadThreads = async () => {
    setThreadsLoading(true)
    const { data } = await supabase
      .from('forum_threads')
      .select('*')
      .order('last_post_at', { ascending: false })
      .limit(50)
    if (data) {
      // Enrich with author names
      const enriched = await Promise.all(data.map(async t => ({
        ...t,
        author_name: await getAuthorName(t.created_by),
      })))
      setThreads(enriched)
    }
    setThreadsLoading(false)
  }

  const loadPosts = async (threadId: string) => {
    setPostsLoading(true)
    const { data } = await supabase
      .from('forum_posts')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
    if (data) {
      const enriched = await Promise.all(data.map(async p => ({
        ...p,
        author_name: await getAuthorName(p.user_id),
      })))
      setPosts(enriched)
    }
    setPostsLoading(false)
  }

  const handleSelectThread = (t: Thread) => {
    setActiveThread(t)
    loadPosts(t.id)
  }

  const handlePost = async (content: string) => {
    if (!currentUser || !activeThread) return
    const { data } = await supabase
      .from('forum_posts')
      .insert({ thread_id: activeThread.id, user_id: currentUser.id, content })
      .select()
      .single()
    if (data) {
      const name = userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'Member' : 'Member'
      setPosts(prev => [...prev, { ...data, author_name: name }])
      // Update thread post count
      await supabase.from('forum_threads').update({ post_count: (activeThread.post_count || 0) + 1, last_post_at: new Date().toISOString() }).eq('id', activeThread.id)
    }
  }

  const handleNewThread = async (title: string, body: string) => {
    if (!currentUser) return
    const { data: thread } = await supabase
      .from('forum_threads')
      .insert({ title, created_by: currentUser.id, post_count: 1, last_post_at: new Date().toISOString() })
      .select()
      .single()
    if (thread) {
      await supabase.from('forum_posts').insert({ thread_id: thread.id, user_id: currentUser.id, content: body })
      setShowNewThread(false)
      await loadThreads()
    }
  }

  const authorName = userProfile ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'Member' : ''

  return (
    <div style={{ minHeight: '100vh', background: CREAM }}>
      <style dangerouslySetInnerHTML={{ __html: ML }}/>
      <GCLabNav role={userProfile?.role} isSignedIn={!!signedIn} currentPath="/community"/>

      {/* Header */}
      <div style={{ background: DARK_GREEN, padding: '48px 24px 40px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'inline-block', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 20, padding: '4px 14px', marginBottom: 16 }}>
              <span className="gsans" style={{ color: LIME, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Community</span>
            </div>
            <h1 className="ghl" style={{ color: CREAM, fontSize: 38, margin: '0 0 8px', lineHeight: 1.1 }}>Discussions</h1>
            <p className="gsans" style={{ color: 'rgba(245,240,232,0.5)', margin: 0, fontSize: 14 }}>Golf Croquet community</p>
          </div>
          {signedIn && (
            <button onClick={() => setShowNewThread(true)} className="gsans"
              style={{ padding: '11px 22px', background: LIME, color: DARK_GREEN, border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              + New Discussion
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '28px 24px 60px' }}>

        {/* Sign-in banner — shown to non-members, doesn't hide content */}
        {signedIn === false && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'white', border: '1px solid #e5e1d8', borderRadius: 12, padding: '12px 20px', marginBottom: 20, flexWrap: 'wrap' }}>
            <p className="gsans" style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
              💬 <strong style={{ color: '#374151' }}>Join the conversation</strong> — create an account to post and reply.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href="/signup" className="gsans" style={{ padding: '7px 16px', borderRadius: 8, background: DARK_GREEN, color: 'white', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>Create account</a>
              <a href="/login" className="gsans" style={{ padding: '7px 16px', borderRadius: 8, background: 'transparent', color: DARK_GREEN, textDecoration: 'none', fontSize: 13, fontWeight: 500, border: '1px solid #d1d5db' }}>Sign in</a>
            </div>
          </div>
        )}

        <div style={{ background: 'white', borderRadius: 20, border: '1px solid #e5e1d8', overflow: 'hidden' }}>
          {activeThread ? (
            <div style={{ padding: '24px' }}>
              <ThreadView
                thread={activeThread}
                posts={posts}
                currentUser={currentUser}
                onPost={handlePost}
                onBack={() => { setActiveThread(null); setPosts([]) }}
                loading={postsLoading}
              />
            </div>
          ) : (
            <>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e1d8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 className="gsans" style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#374151' }}>
                  {threadsLoading ? 'Loading…' : `${threads.length} discussion${threads.length !== 1 ? 's' : ''}`}
                </h3>
              </div>
              <ThreadList threads={threads} onSelect={handleSelectThread} currentUser={currentUser}/>
            </>
          )}
        </div>
      </div>

      {showNewThread && <NewThreadModal onClose={() => setShowNewThread(false)} onSubmit={handleNewThread}/>}
    </div>
  )
}
