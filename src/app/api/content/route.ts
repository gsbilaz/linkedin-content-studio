import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db, contentInputs, contentArtifacts, postDrafts, styleProfiles, draftGroups } from '@/db'
import { desc, eq } from 'drizzle-orm'
import { generateLinkedInDraft, generateMultipleDrafts } from '@/lib/ai'
import { getOrCreateProfile } from '@/lib/profile'
import { getUserAIKey, NO_ANTHROPIC_KEY_ERROR } from '@/lib/ai/user-key'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: { title?: string; rawText?: string; mode?: 'single' | 'multiple' }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { title, rawText, mode = 'single' } = body

    if (!rawText?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    if (rawText.trim().length < 20) {
      return NextResponse.json(
        { error: 'Content is too short — please provide at least 20 characters' },
        { status: 400 }
      )
    }

    if (!process.env.DATABASE_URL) {
      console.error('[/api/content] DATABASE_URL is not set in .env.local')
      return NextResponse.json(
        { error: 'Database not configured. Add DATABASE_URL to your .env.local file.' },
        { status: 500 }
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
        inputType: 'text',
        title: title?.trim() || null,
        rawText: rawText.trim(),
        processingStatus: 'processing',
      })
      .returning()

    try {
      if (mode === 'multiple') {
        // ── Multiple drafts flow ──────────────────────────────────────────────
        const results = await generateMultipleDrafts({
          rawContent: rawText.trim(),
          title: title?.trim(),
          styleProfile,
          apiKey: anthropicKey,
        })

        const [group] = await db
          .insert(draftGroups)
          .values({ userId: user.id })
          .returning()

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
        // ── Single draft flow ─────────────────────────────────────────────────
        const result = await generateLinkedInDraft({
          rawContent: rawText.trim(),
          title: title?.trim(),
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
      }
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
      const msg = error instanceof Error ? error.message : String(error)
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  } catch (error) {
    console.error('[/api/content] Unhandled error:', error)
    return NextResponse.json(
      { error: String(error instanceof Error ? error.message : error) },
      { status: 500 }
    )
  }
}
