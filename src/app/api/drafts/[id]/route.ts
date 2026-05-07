import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db, postDrafts, postMedia } from '@/db'
import { and, eq } from 'drizzle-orm'
import { runs } from '@trigger.dev/sdk/v3'

async function cancelTriggerRun(triggerRunId: string | null) {
  if (!triggerRunId) return
  try {
    await runs.cancel(triggerRunId)
  } catch {
    // Run may have already completed or been cancelled — safe to ignore
  }
}

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

    let body: { title?: string; content?: string; status?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { title, content, status } = body

    const validStatuses = ['draft', 'approved', 'rejected', 'scheduled', 'ready', 'published']
    if (status !== undefined && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    if (content !== undefined && content.trim().length === 0) {
      return NextResponse.json({ error: 'Content cannot be empty' }, { status: 400 })
    }

    // Fetch current draft to check for a pending Trigger.dev run
    const [current] = await db
      .select({ triggerRunId: postDrafts.triggerRunId, status: postDrafts.status })
      .from(postDrafts)
      .where(and(eq(postDrafts.id, id), eq(postDrafts.userId, user.id)))

    if (!current) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })

    // Reverting to draft cancels any scheduled Trigger.dev job
    const revertingToDraft = status === 'draft' && current.status !== 'draft'
    if (revertingToDraft) {
      await cancelTriggerRun(current.triggerRunId)
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (title !== undefined) updates.title = title.trim() || null
    if (content !== undefined) updates.content = content
    if (status !== undefined) updates.status = status
    if (revertingToDraft) {
      updates.scheduledAt = null
      updates.triggerRunId = null
    }

    const [updated] = await db
      .update(postDrafts)
      .set(updates)
      .where(and(eq(postDrafts.id, id), eq(postDrafts.userId, user.id)))
      .returning()

    if (!updated) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })

    return NextResponse.json({ draft: updated })
  } catch (error) {
    console.error('[/api/drafts/[id] PATCH]', error)
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

    // Fetch first so we can cancel any pending Trigger.dev run before deleting
    const [current] = await db
      .select({ triggerRunId: postDrafts.triggerRunId })
      .from(postDrafts)
      .where(and(eq(postDrafts.id, id), eq(postDrafts.userId, user.id)))

    if (!current) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })

    await cancelTriggerRun(current.triggerRunId)

    // Delete Storage files before removing the DB row (cascade will remove postMedia rows)
    const mediaRecords = await db
      .select({ storagePath: postMedia.storagePath })
      .from(postMedia)
      .where(eq(postMedia.postDraftId, id))

    if (mediaRecords.length > 0) {
      await supabase.storage
        .from('post-media')
        .remove(mediaRecords.map((m) => m.storagePath))
    }

    await db
      .delete(postDrafts)
      .where(and(eq(postDrafts.id, id), eq(postDrafts.userId, user.id)))

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
