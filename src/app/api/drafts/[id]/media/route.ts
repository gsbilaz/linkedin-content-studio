import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db, postDrafts, postMedia } from '@/db'
import { and, eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { needsConversion, convertToPdf } from '@/lib/document-converter'

export const maxDuration = 60

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
const DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'application/msword',
])
const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10 MB
const MAX_DOC_BYTES = 25 * 1024 * 1024 // 25 MB
const MAX_IMAGES = 9

function getMediaKind(mimeType: string): 'image' | 'document' | null {
  if (IMAGE_MIME_TYPES.has(mimeType)) return 'image'
  if (DOCUMENT_MIME_TYPES.has(mimeType)) return 'document'
  return null
}

function extForMime(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/msword': 'doc',
  }
  return map[mimeType] ?? 'bin'
}

// ── GET — list media for a draft with signed URLs ──────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [draft] = await db
      .select({ id: postDrafts.id })
      .from(postDrafts)
      .where(and(eq(postDrafts.id, id), eq(postDrafts.userId, user.id)))
    if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })

    const media = await db
      .select()
      .from(postMedia)
      .where(and(eq(postMedia.postDraftId, id), eq(postMedia.userId, user.id)))

    // Generate signed URLs (1 hour)
    const withUrls = await Promise.all(
      media.map(async (m) => {
        const { data } = await supabase.storage
          .from('post-media')
          .createSignedUrl(m.storagePath, 3600)
        return { ...m, signedUrl: data?.signedUrl ?? null }
      })
    )

    return NextResponse.json({ media: withUrls })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// ── POST — upload a file and attach it to a draft ─────────────────────────────

export async function POST(
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

    const [draft] = await db
      .select({ id: postDrafts.id })
      .from(postDrafts)
      .where(and(eq(postDrafts.id, id), eq(postDrafts.userId, user.id)))
    if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const kind = getMediaKind(file.type)
    if (!kind) {
      return NextResponse.json(
        {
          error:
            'Unsupported file type. Images: JPEG, PNG, GIF, WebP. Documents: PDF, DOCX, PPTX.',
        },
        { status: 400 }
      )
    }

    // Size limits
    const limit = kind === 'image' ? MAX_IMAGE_BYTES : MAX_DOC_BYTES
    if (file.size > limit) {
      return NextResponse.json(
        { error: `File too large. Max ${kind === 'image' ? '10' : '25'} MB.` },
        { status: 400 }
      )
    }

    // Attachment type constraint — no mixing images and documents
    const existing = await db
      .select({ mediaType: postMedia.mediaType })
      .from(postMedia)
      .where(and(eq(postMedia.postDraftId, id), eq(postMedia.userId, user.id)))

    if (existing.length > 0) {
      const existingKind = existing[0].mediaType // 'image' | 'document'
      if (existingKind !== kind) {
        return NextResponse.json(
          {
            error: `This post already has ${existingKind === 'image' ? 'images' : 'a document'} attached. Remove them before adding a ${kind === 'image' ? 'document' : 'different type'}.`,
          },
          { status: 400 }
        )
      }
      if (kind === 'image' && existing.length >= MAX_IMAGES) {
        return NextResponse.json(
          { error: `Maximum ${MAX_IMAGES} images per post.` },
          { status: 400 }
        )
      }
      if (kind === 'document' && existing.length >= 1) {
        return NextResponse.json(
          { error: 'Only one document per post. Remove the existing document first.' },
          { status: 400 }
        )
      }
    }

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer()
    let buffer: Buffer = Buffer.from(new Uint8Array(arrayBuffer))
    let storedMimeType = file.type
    let storedExt = extForMime(file.type)

    // Convert DOCX/PPTX → PDF
    if (needsConversion(file.type)) {
      try {
        buffer = await convertToPdf(buffer)
        storedMimeType = 'application/pdf'
        storedExt = 'pdf'
      } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 422 })
      }
    }

    // Upload to Supabase Storage
    const fileId = uuidv4()
    const storagePath = `${user.id}/${id}/${fileId}.${storedExt}`

    const { error: uploadError } = await supabase.storage
      .from('post-media')
      .upload(storagePath, buffer, { contentType: storedMimeType, upsert: false })

    if (uploadError) {
      return NextResponse.json(
        { error: `Storage upload failed: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Generate signed URL for immediate preview
    const { data: signed } = await supabase.storage
      .from('post-media')
      .createSignedUrl(storagePath, 3600)

    // Insert DB record
    const [record] = await db
      .insert(postMedia)
      .values({
        postDraftId: id,
        userId: user.id,
        storagePath,
        mimeType: storedMimeType,
        fileSize: buffer.length,
        fileName: file.name,
        mediaType: kind,
        uploadStatus: 'uploaded',
      })
      .returning()

    return NextResponse.json({ media: { ...record, signedUrl: signed?.signedUrl ?? null } })
  } catch (error) {
    console.error('[/api/drafts/[id]/media POST]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
