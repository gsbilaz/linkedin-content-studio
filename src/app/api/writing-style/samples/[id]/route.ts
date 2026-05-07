import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db, writingSamples } from '@/db'
import { and, eq } from 'drizzle-orm'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
    if (content !== undefined && content.trim().length < 50) {
      return NextResponse.json({ error: 'Sample must be at least 50 characters' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    if (title !== undefined) updates.title = title.trim() || null
    if (content !== undefined) updates.content = content.trim()

    const [updated] = await db
      .update(writingSamples)
      .set(updates)
      .where(and(eq(writingSamples.id, id), eq(writingSamples.userId, user.id)))
      .returning()

    if (!updated) return NextResponse.json({ error: 'Sample not found' }, { status: 404 })
    return NextResponse.json({ sample: updated })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await db
      .delete(writingSamples)
      .where(and(eq(writingSamples.id, id), eq(writingSamples.userId, user.id)))

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
