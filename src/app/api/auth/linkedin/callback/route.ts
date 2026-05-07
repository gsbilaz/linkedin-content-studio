import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { db, linkedinAccounts } from '@/db'
import { eq } from 'drizzle-orm'
import { encrypt } from '@/lib/encrypt'
import { getLinkedInProfile } from '@/lib/linkedin-api'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const settingsUrl = new URL('/settings', request.url)

  if (error) {
    settingsUrl.searchParams.set('linkedin', 'denied')
    return NextResponse.redirect(settingsUrl)
  }

  const cookieStore = await cookies()
  const savedState = cookieStore.get('linkedin_oauth_state')?.value
  cookieStore.delete('linkedin_oauth_state')

  if (!state || state !== savedState || !code) {
    settingsUrl.searchParams.set('linkedin', 'error')
    return NextResponse.redirect(settingsUrl)
  }

  try {
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.LINKEDIN_REDIRECT_URI!,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
      }),
    })

    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed: ${tokenRes.status}`)
    }

    const tokens = await tokenRes.json()
    const { access_token, expires_in, refresh_token } = tokens
    const expiresAt = new Date(Date.now() + (expires_in as number) * 1000)

    const profile = await getLinkedInProfile(access_token as string)

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(new URL('/login', request.url))

    // Replace any existing connection for this user
    await db.delete(linkedinAccounts).where(eq(linkedinAccounts.userId, user.id))
    await db.insert(linkedinAccounts).values({
      userId: user.id,
      linkedinId: profile.linkedinId,
      encryptedAccessToken: encrypt(access_token as string),
      encryptedRefreshToken: refresh_token ? encrypt(refresh_token as string) : null,
      tokenExpiresAt: expiresAt,
      profileName: profile.name,
      profilePictureUrl: profile.picture,
      isActive: true,
    })

    settingsUrl.searchParams.set('linkedin', 'connected')
    return NextResponse.redirect(settingsUrl)
  } catch (err) {
    console.error('[LinkedIn callback]', err)
    settingsUrl.searchParams.set('linkedin', 'error')
    return NextResponse.redirect(settingsUrl)
  }
}
