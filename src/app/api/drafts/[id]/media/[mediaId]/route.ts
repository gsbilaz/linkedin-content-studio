import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db, postMedia } from '@/db'
import { and, eq } from 'drizzle-orm'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; mediaId: string }> }
) {
  try {
    const { id, mediaId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [record] = await db
      .select()
      .from(postMedia)
      .where(
        and(
          eq(postMedia.id, mediaId),
          eq(postMedia.postDraftId, id),
          eq(postMedia.userId, user.id)
        )
      )

    if (!record) return NextResponse.json({ error: 'Media not found' }, { status: 404 })

    // Remove from Supabase Storage
    await supabase.storage.from('post-media').remove([record.storagePath])

    // Remove DB record
    await db.delete(postMedia).where(eq(postMedia.id, mediaId))

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
