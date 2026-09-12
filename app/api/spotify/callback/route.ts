import { NextRequest, NextResponse } from 'next/server'
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code'), state = request.nextUrl.searchParams.get('state')
  if (!code || !state || state !== request.cookies.get('spotify_oauth_state')?.value) return NextResponse.redirect(new URL('/auth?spotify=invalid-state', request.url))
  const clientId = process.env.SPOTIFY_CLIENT_ID, secret = process.env.SPOTIFY_CLIENT_SECRET, redirectUri = process.env.SPOTIFY_REDIRECT_URI
  if (!clientId || !secret || !redirectUri) return NextResponse.redirect(new URL('/auth?spotify=missing-config', request.url))
  const response = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }) })
  if (!response.ok) return NextResponse.redirect(new URL('/auth?spotify=exchange-failed', request.url))
  // Do not expose or put Spotify refresh tokens in browser storage. Persist the token response in a user-owned, encrypted database record when playlists are connected.
  const redirect = NextResponse.redirect(new URL('/auth?spotify=authorized', request.url)); redirect.cookies.delete('spotify_oauth_state'); return redirect
}