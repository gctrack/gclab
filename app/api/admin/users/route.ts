// SAVE TO: app/api/admin/users/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function isAuthorized(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return false
  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return false
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  return profile?.role === 'super_admin'
}

export async function GET(request: Request) {
  if (!await isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const page = parseInt(searchParams.get('page') || '0')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')

  // Get profiles
  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
  }

  const { data: profiles, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch last_sign_in_at from auth.users for each profile
  const ids = (profiles || []).map((p: any) => p.id)
  const authData: Record<string, string | null> = {}

  if (ids.length > 0) {
    // list users — paginate up to 1000 at a time, filter by our IDs
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    for (const u of authUsers || []) {
      if (ids.includes(u.id)) {
        authData[u.id] = u.last_sign_in_at || null
      }
    }
  }

  const enriched = (profiles || []).map((p: any) => ({
    ...p,
    last_sign_in_at: authData[p.id] || null,
  }))

  return NextResponse.json({ profiles: enriched, total: count })
}
