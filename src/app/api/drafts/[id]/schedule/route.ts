import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db, postDrafts } from '@/db'
import { and, eq } from 'drizzle-orm'
import { runs } from '@trigger.dev/sdk/v3'
import { schedulePost } from '@/trigger/schedule-post'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { scheduledAt?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { scheduledAt } = body
  if (!scheduledAt) return NextResponse.json({ error: 'scheduledAt is required' }, { status: 400 })

  const scheduledDate = new Date(scheduledAt)
  if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
    return NextResponse.json({ error: 'Scheduled time must be in the future' }, { status: 400 })
  }

  const [draft] = await db
    .select()
    .from(postDrafts)
    .where(and(eq(postDrafts.id, id), eq(postDrafts.userId, user.id)))

  if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  if (draft.status !== 'approved' && draft.status !== 'scheduled') {
    return NextResponse.json(
      { error: 'Only approved or scheduled posts can be scheduled' },
      { status: 400 }
    )
  }

  // Cancel existing Trigger.dev run if any
  if (draft.triggerRunId) {
    try {
      await runs.cancel(draft.triggerRunId)
    } catch {
      // Run may have already completed or been cancelled; continue
    }
  }

  // Trigger the scheduled task (delay = run at scheduledDate)
  let triggerRunId: string | null = null
  try {
    const handle = await schedulePost.trigger({ draftId: id }, { delay: scheduledDate })
    triggerRunId = handle.id
  } catch (err) {
    console.error('[schedule] Trigger.dev unavailable — schedule saved without background job:', err)
  }

  await db
    .update(postDrafts)
    .set({
      status: 'scheduled',
      scheduledAt: scheduledDate,
      triggerRunId,
      updatedAt: new Date(),
    })
    .where(eq(postDrafts.id, id))

  return NextResponse.json({ ok: true })
}

export async function DELETE(
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

  if (draft.triggerRunId) {
    try {
      await runs.cancel(draft.triggerRunId)
    } catch {
      // ignore
    }
  }

  await db
    .update(postDrafts)
    .set({ status: 'approved', scheduledAt: null, triggerRunId: null, updatedAt: new Date() })
    .where(eq(postDrafts.id, id))

  return NextResponse.json({ ok: true })
}
