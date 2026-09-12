import { cookies } from 'next/headers'

export async function getSpotifyAccessToken() {
  const store = await cookies(); const refreshToken = store.get('spotify_refresh_token')?.value
  if (!refreshToken) throw new Error('Spotify is not connected.')
  const clientId = process.env.SPOTIFY_CLIENT_ID, secret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !secret) throw new Error('Spotify is not configured.')
  const response = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }), cache: 'no-store' })
  if (!response.ok) throw new Error('Spotify connection expired. Please connect it again.')
  const data = await response.json() as { access_token: string; refresh_token?: string; expires_in: number }
  if (data.refresh_token) store.set('spotify_refresh_token', data.refresh_token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 })
  return data.access_token
}