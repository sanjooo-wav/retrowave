import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email) || typeof password !== 'string' || password.length < 8) return NextResponse.json({ error: 'Enter a valid email and a password of at least 8 characters.' }, { status: 400 })
    const supabase = await createSupabaseServerClient()
    const origin = new URL(request.url).origin
    const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${origin}/auth/callback` } })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ message: 'Check your inbox to confirm your account.' }, { status: 201 })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create account.' }, { status: 500 }) }
}