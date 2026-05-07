import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db, postDrafts, draftGroups } from '@/db'
import { and, eq } from 'drizzle-orm'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify ownership
    const [group] = await db
      .select({ id: draftGroups.id })
      .from(draftGroups)
      .where(and(eq(draftGroups.id, groupId), eq(draftGroups.userId, user.id)))
    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })

    // Clear group association from all drafts
    await db
      .update(postDrafts)
      .set({ groupId: null, groupOrder: null })
      .where(and(eq(postDrafts.groupId, groupId), eq(postDrafts.userId, user.id)))

    // Delete the group record
    await db.delete(draftGroups).where(eq(draftGroups.id, groupId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[/api/draft-groups/[groupId]/finish]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
