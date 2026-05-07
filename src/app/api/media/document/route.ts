import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db, contentInputs, contentArtifacts, postDrafts, styleProfiles, draftGroups } from '@/db'
import { desc, eq } from 'drizzle-orm'
import { getOrCreateProfile } from '@/lib/profile'
import { generateLinkedInDraft, generateMultipleDrafts } from '@/lib/ai'
import { extractDocumentText, isAcceptedDocumentType, DOCUMENT_MAX_BYTES } from '@/lib/extract-document'
import { getUserAIKey, NO_ANTHROPIC_KEY_ERROR } from '@/lib/ai/user-key'

export const maxDuration = 120

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
    }

    const file = formData.get('file') as File | null
    const title = (formData.get('title') as string | null)?.trim() || null
    const mode = (formData.get('mode') as string | null) === 'multiple' ? 'multiple' : 'single'

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (file.size > DOCUMENT_MAX_BYTES) {
      return NextResponse.json({ error: 'File is too large — maximum size is 10 MB' }, { status: 400 })
    }

    const baseMimeType = file.type.split(';')[0].trim()
    if (!isAcceptedDocumentType(baseMimeType)) {
      return NextResponse.json(
        { error: `Unsupported file type (${file.type || 'unknown'}). Upload a PDF, DOCX, DOC, or TXT file.` },
        { status: 400 }
      )
    }

    await getOrCreateProfile(user)

    const anthropicKey = await getUserAIKey(user.id, 'anthropic')
    if (!anthropicKey) {
      return NextResponse.json({ error: NO_ANTHROPIC_KEY_ERROR }, { status: 402 })
    }

    const [latestStyleProfile] = await db
      .select({ profileData: styleProfiles.profileData })
      .from(styleProfiles)
      .where(eq(styleProfiles.userId, user.id))
      .orderBy(desc(styleProfiles.version))
      .limit(1)

    const styleProfile = latestStyleProfile
      ? (latestStyleProfile.profileData as { analysis: string }).analysis
      : undefined

    const [contentInput] = await db
      .insert(contentInputs)
      .values({
        userId: user.id,
        inputType: 'document',
        title,
        mimeType: file.type,
        fileSize: file.size,
        processingStatus: 'processing',
      })
      .returning()

    try {
      // Step 1: Extract text
      const extractedText = await extractDocumentText(file)

      await db
        .update(contentInputs)
        .set({ rawText: extractedText })
        .where(eq(contentInputs.id, contentInput.id))

      await db.insert(contentArtifacts).values({
        contentInputId: contentInput.id,
        userId: user.id,
        artifactType: 'transcription',
        content: extractedText,
        aiProvider: 'openai',
        model: 'document-extraction',
      })

      // Step 2: Generate draft(s)
      if (mode === 'multiple') {
        const results = await generateMultipleDrafts({
          rawContent: extractedText,
          title: title ?? undefined,
          styleProfile,
          apiKey: anthropicKey,
        })

        const [group] = await db.insert(draftGroups).values({ userId: user.id }).returning()

        const insertedDrafts = await db
          .insert(postDrafts)
          .values(
            results.map((r, i) => ({
              contentInputId: contentInput.id,
              userId: user.id,
              title: r.title,
              content: r.content,
              status: 'draft' as const,
              groupId: group.id,
              groupOrder: i,
            }))
          )
          .returning()

        const sorted = insertedDrafts.sort((a, b) => (a.groupOrder ?? 0) - (b.groupOrder ?? 0))

        await db
          .update(contentInputs)
          .set({ processingStatus: 'completed', updatedAt: new Date() })
          .where(eq(contentInputs.id, contentInput.id))

        return NextResponse.json({ draftId: sorted[0].id, groupId: group.id })
      } else {
        const result = await generateLinkedInDraft({
          rawContent: extractedText,
          title: title ?? undefined,
          styleProfile,
          apiKey: anthropicKey,
        })

        await db.insert(contentArtifacts).values([
          {
            contentInputId: contentInput.id,
            userId: user.id,
            artifactType: 'summary',
            content: result.summary,
            aiProvider: 'anthropic',
            model: 'claude-sonnet-4-6',
          },
          {
            contentInputId: contentInput.id,
            userId: user.id,
            artifactType: 'key_points',
            content: result.keyPoints.join('\n'),
            aiProvider: 'anthropic',
            model: 'claude-sonnet-4-6',
          },
        ])

        const [draft] = await db
          .insert(postDrafts)
          .values({
            contentInputId: contentInput.id,
            userId: user.id,
            title: title ?? result.suggestedTitle,
            content: result.draft,
            status: 'draft',
          })
          .returning()

        await db
          .update(contentInputs)
          .set({ processingStatus: 'completed', updatedAt: new Date() })
          .where(eq(contentInputs.id, contentInput.id))

        return NextResponse.json({ draftId: draft.id })
      }
    } catch (error) {
      await db
        .update(contentInputs)
        .set({ processingStatus: 'failed', processingError: String(error), updatedAt: new Date() })
        .where(eq(contentInputs.id, contentInput.id))

      console.error('[/api/media/document]', error)
      const msg = error instanceof Error ? error.message : String(error)
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  } catch (error) {
    console.error('[/api/media/document] Unhandled:', error)
    return NextResponse.json({ error: String(error instanceof Error ? error.message : error) }, { status: 500 })
  }
}
