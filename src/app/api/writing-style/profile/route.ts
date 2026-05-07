import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db, styleProfiles } from '@/db'
import { desc, eq } from 'drizzle-orm'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [profile] = await db
      .select()
      .from(styleProfiles)
      .where(eq(styleProfiles.userId, user.id))
      .orderBy(desc(styleProfiles.version))
      .limit(1)

    return NextResponse.json({ profile: profile ?? null })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
