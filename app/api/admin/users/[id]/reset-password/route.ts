// SAVE TO: app/api/admin/users/[id]/reset-password/route.ts
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

export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (!await isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user email
  const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(params.id)
  if (userError || !user?.email) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Send password reset email
  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: 'https://gclab.app/login',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, email: user.email })
}
