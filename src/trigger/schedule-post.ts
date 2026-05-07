import { task } from '@trigger.dev/sdk/v3'
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
import { createClient } from '@supabase/supabase-js'

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars missing in Trigger.dev environment')
  return createClient(url, key)
}

export const schedulePost = task({
  id: 'schedule-post',
  run: async (payload: { draftId: string }) => {
    const { draftId } = payload

    const [draft] = await db
      .select()
      .from(postDrafts)
      .where(eq(postDrafts.id, draftId))

    if (!draft) throw new Error(`Draft ${draftId} not found`)

    // Check for an active, non-expired LinkedIn connection
    const [linkedIn] = await db
      .select()
      .from(linkedinAccounts)
      .where(and(eq(linkedinAccounts.userId, draft.userId), eq(linkedinAccounts.isActive, true)))

    const tokenExpired =
      linkedIn?.tokenExpiresAt && new Date(linkedIn.tokenExpiresAt) < new Date()

    if (!linkedIn || tokenExpired) {
      // No connection — move to 'ready' so the user can publish manually
      await db
        .update(postDrafts)
        .set({ status: 'ready', triggerRunId: null, updatedAt: new Date() })
        .where(eq(postDrafts.id, draftId))
      return { status: 'ready', reason: 'No active LinkedIn connection' }
    }

    const accessToken = decrypt(linkedIn.encryptedAccessToken)
    const ownerUrn = `urn:li:person:${linkedIn.linkedinId}`
    const supabase = getServiceRoleClient()

    const [job] = await db
      .insert(publishingJobs)
      .values({
        postDraftId: draftId,
        userId: draft.userId,
        status: 'processing',
        attemptedAt: new Date(),
      })
      .returning()

    try {
      const attachments = await db
        .select()
        .from(postMedia)
        .where(and(eq(postMedia.postDraftId, draftId), eq(postMedia.userId, draft.userId)))

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
        await db.delete(postMedia).where(eq(postMedia.postDraftId, draftId))
      }

      await db
        .update(postDrafts)
        .set({
          status: 'published',
          publishedAt: new Date(),
          linkedinPostId: postUrn,
          publishingError: null,
          triggerRunId: null,
          updatedAt: new Date(),
        })
        .where(eq(postDrafts.id, draftId))

      await db
        .update(publishingJobs)
        .set({ status: 'completed', completedAt: new Date(), linkedinPostId: postUrn })
        .where(eq(publishingJobs.id, job.id))

      return { status: 'published', postUrn }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)

      await db
        .update(publishingJobs)
        .set({ status: 'failed', errorMessage: msg })
        .where(eq(publishingJobs.id, job.id))

      // Fall back to 'ready' so user can publish manually
      await db
        .update(postDrafts)
        .set({
          status: 'ready',
          publishingError: msg,
          triggerRunId: null,
          updatedAt: new Date(),
        })
        .where(eq(postDrafts.id, draftId))

      throw new Error(`LinkedIn publishing failed: ${msg}`)
    }
  },
})
