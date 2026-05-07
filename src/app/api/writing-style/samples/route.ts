import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db, writingSamples } from '@/db'
import { desc, eq } from 'drizzle-orm'
import { getOrCreateProfile } from '@/lib/profile'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const samples = await db
      .select()
      .from(writingSamples)
      .where(eq(writingSamples.userId, user.id))
      .orderBy(desc(writingSamples.createdAt))

    return NextResponse.json({ samples })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let body: { title?: string; content?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { title, content } = body

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }
    if (content.trim().length < 50) {
      return NextResponse.json(
        { error: 'Sample must be at least 50 characters' },
        { status: 400 }
      )
    }

    await getOrCreateProfile(user)

    const [sample] = await db
      .insert(writingSamples)
      .values({
        userId: user.id,
        title: title?.trim() || null,
        content: content.trim(),
        source: 'manual',
      })
      .returning()

    return NextResponse.json({ sample })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
