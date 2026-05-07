import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db, profiles } from '@/db'
import { eq } from 'drizzle-orm'
import { getOrCreateProfile } from '@/lib/profile'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await getOrCreateProfile(user)
    return NextResponse.json({ profile })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let body: { fullName?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { fullName } = body
    if (fullName !== undefined && fullName.trim().length === 0) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    }

    const [updated] = await db
      .update(profiles)
      .set({ fullName: fullName?.trim() ?? null, updatedAt: new Date() })
      .where(eq(profiles.id, user.id))
      .returning()

    if (!updated) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    return NextResponse.json({ profile: updated })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
