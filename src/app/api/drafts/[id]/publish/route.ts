import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db, postDrafts, postMedia, linkedinAccounts, publishingJobs } from '@/db'
import { and, eq } from 'drizzle-orm'
import { decrypt } from '@/lib/encrypt'
import {
  initImageUpload,
  initDocumentUpload,
  uploadBinary,
  createLinkedInPost,
  type PostMediaParam,
} from '@/lib/linkedin-api'

export const maxDuration = 120

export async function POST(
  _req: NextRequest,
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
      { error: 'Only "Ready to Post" drafts can be published to LinkedIn' },
      { status: 400 }
    )
  }

  const [linkedIn] = await db
    .select()
    .from(linkedinAccounts)
    .where(and(eq(linkedinAccounts.userId, user.id), eq(linkedinAccounts.isActive, true)))

  if (!linkedIn) {
    return NextResponse.json(
      { error: 'No LinkedIn account connected. Go to Settings to connect.' },
      { status: 400 }
    )
  }

  if (linkedIn.tokenExpiresAt && new Date(linkedIn.tokenExpiresAt) < new Date()) {
    return NextResponse.json(
      { error: 'LinkedIn token has expired. Go to Settings to reconnect.' },
      { status: 400 }
    )
  }

  const accessToken = decrypt(linkedIn.encryptedAccessToken)
  const ownerUrn = `urn:li:person:${linkedIn.linkedinId}`

  const [job] = await db
    .insert(publishingJobs)
    .values({
      postDraftId: id,
      userId: user.id,
      status: 'processing',
      attemptedAt: new Date(),
    })
    .returning()

  try {
    const attachments = await db
      .select()
      .from(postMedia)
      .where(and(eq(postMedia.postDraftId, id), eq(postMedia.userId, user.id)))

    let mediaParam: PostMediaParam | undefined

    const images = attachments.filter((m) => m.mediaType === 'image')
    const documents = attachments.filter((m) => m.mediaType === 'document')

    if (images.length > 0) {
      const imageUrns: string[] = []
      for (const img of images) {
        const { data: fileData, error } = await supabase.storage
          .from('post-media')
          .download(img.storagePath)
        if (error || !fileData) throw new Error(`Failed to download image: ${img.fileName}`)
        const buffer = Buffer.from(await fileData.arrayBuffer())
        const { uploadUrl, imageUrn } = await initImageUpload(accessToken, ownerUrn)
        await uploadBinary(uploadUrl, buffer, img.mimeType)
        imageUrns.push(imageUrn)
      }
      mediaParam = {
        type: imageUrns.length === 1 ? 'single_image' : 'multi_image',
        urns: imageUrns,
      }
    } else if (documents.length > 0) {
      const doc = documents[0]
      const { data: fileData, error } = await supabase.storage
        .from('post-media')
        .download(doc.storagePath)
      if (error || !fileData) throw new Error(`Failed to download document: ${doc.fileName}`)
      const buffer = Buffer.from(await fileData.arrayBuffer())
      const { uploadUrl, documentUrn } = await initDocumentUpload(
        accessToken,
        ownerUrn
      )
      await uploadBinary(uploadUrl, buffer, doc.mimeType)
      mediaParam = { type: 'document', urns: [documentUrn], title: doc.fileName }
    }

    const postUrn = await createLinkedInPost(accessToken, ownerUrn, draft.content, mediaParam)

    // Clean up Storage files — they've been uploaded to LinkedIn and are no longer needed
    if (attachments.length > 0) {
      await supabase.storage
        .from('post-media')
        .remove(attachments.map((a) => a.storagePath))
      await db.delete(postMedia).where(eq(postMedia.postDraftId, id))
    }

    await db
      .update(postDrafts)
      .set({
        status: 'published',
        publishedAt: new Date(),
        linkedinPostId: postUrn,
        publishingError: null,
        updatedAt: new Date(),
      })
      .where(eq(postDrafts.id, id))

    await db
      .update(publishingJobs)
      .set({ status: 'completed', completedAt: new Date(), linkedinPostId: postUrn })
      .where(eq(publishingJobs.id, job.id))

    return NextResponse.json({ success: true, postUrn })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await db
      .update(publishingJobs)
      .set({ status: 'failed', errorMessage: msg })
      .where(eq(publishingJobs.id, job.id))
    await db
      .update(postDrafts)
      .set({ publishingError: msg, updatedAt: new Date() })
      .where(eq(postDrafts.id, id))

    console.error('[/api/drafts/[id]/publish]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
