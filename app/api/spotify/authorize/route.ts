import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
export async function GET(request: Request) {
  const clientId = process.env.SPOTIFY_CLIENT_ID, redirectUri = process.env.SPOTIFY_REDIRECT_URI
  if (!clientId || !redirectUri) return NextResponse.redirect(new URL('/auth?spotify=missing-config', request.url))
  const state = randomBytes(32).toString('hex'); const url = new URL('https://accounts.spotify.com/authorize')
  url.search = new URLSearchParams({ client_id: clientId, response_type: 'code', redirect_uri: redirectUri, state, scope: 'user-read-email user-read-private playlist-read-private playlist-modify-private playlist-modify-public user-library-read user-library-modify' }).toString()
  const response = NextResponse.redirect(url); response.cookies.set('spotify_oauth_state', state, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 600 }); return response
}