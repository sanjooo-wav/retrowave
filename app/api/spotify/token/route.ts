import { NextResponse } from 'next/server'
import { getSpotifyAccessToken } from '@/lib/spotify/server'
export async function GET() { try { return NextResponse.json({ accessToken: await getSpotifyAccessToken() }, { headers: { 'Cache-Control': 'no-store' } }) } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Spotify unavailable.' }, { status: 401 }) } }