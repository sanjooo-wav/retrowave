import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
export async function POST(request: Request) {
  try { const { email, password } = await request.json(); const supabase = await createSupabaseServerClient(); const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) return NextResponse.json({ error: error.message }, { status: 401 }); return NextResponse.json({ message: 'Welcome back.' }) }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to sign in.' }, { status: 500 }) }
}