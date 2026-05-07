import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db, postDrafts } from '@/db'
import { and, eq } from 'drizzle-orm'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [draft] = await db
    .select()
    .from(postDrafts)
    .where(and(eq(postDrafts.id, id), eq(postDrafts.userId, user.id)))

  if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  if (draft.status !== 'ready') {
    return NextResponse.json(
      { error: 'Only ready posts can be marked as published' },
      { status: 400 }
    )
  }

  await db
    .update(postDrafts)
    .set({
      status: 'published',
      publishedAt: new Date(),
      triggerRunId: null,
      updatedAt: new Date(),
    })
    .where(eq(postDrafts.id, id))

  return NextResponse.json({ ok: true })
}
