import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db, contentInputs, contentArtifacts, postDrafts } from '@/db'
import { eq } from 'drizzle-orm'
import { generateLinkedInDraft } from '@/lib/ai'
import { getOrCreateProfile } from '@/lib/profile'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { title?: string; rawText?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { title, rawText } = body

  if (!rawText?.trim()) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 })
  }

  if (rawText.trim().length < 20) {
    return NextResponse.json(
      { error: 'Content is too short — please provide at least 20 characters' },
      { status: 400 }
    )
  }

  // Ensure the user has a profile row (fallback if DB trigger missed it)
  await getOrCreateProfile(user)

  // Persist the raw input immediately so it's never lost
  const [contentInput] = await db
    .insert(contentInputs)
    .values({
      userId: user.id,
      inputType: 'text',
      title: title?.trim() || null,
      rawText: rawText.trim(),
      processingStatus: 'processing',
    })
    .returning()

  try {
    const result = await generateLinkedInDraft({
      rawContent: rawText.trim(),
      title: title?.trim(),
    })

    // Save both AI artifacts
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

    // Save the generated draft
    const [draft] = await db
      .insert(postDrafts)
      .values({
        contentInputId: contentInput.id,
        userId: user.id,
        title: title?.trim() || result.suggestedTitle,
        content: result.draft,
        status: 'draft',
      })
      .returning()

    await db
      .update(contentInputs)
      .set({ processingStatus: 'completed', updatedAt: new Date() })
      .where(eq(contentInputs.id, contentInput.id))

    return NextResponse.json({ draftId: draft.id })
  } catch (error) {
    await db
      .update(contentInputs)
      .set({
        processingStatus: 'failed',
        processingError: String(error),
        updatedAt: new Date(),
      })
      .where(eq(contentInputs.id, contentInput.id))

    console.error('[/api/content] AI processing error:', error)
    return NextResponse.json(
      { error: 'AI processing failed. Check your ANTHROPIC_API_KEY and try again.' },
      { status: 500 }
    )
  }
}
