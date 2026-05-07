import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db, writingSamples, styleProfiles } from '@/db'
import { desc, eq } from 'drizzle-orm'
import { getAIProvider } from '@/lib/ai'
import { getUserAIKey, NO_ANTHROPIC_KEY_ERROR } from '@/lib/ai/user-key'

const MIN_SAMPLES = 3

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const samples = await db
      .select()
      .from(writingSamples)
      .where(eq(writingSamples.userId, user.id))
      .orderBy(desc(writingSamples.createdAt))

    if (samples.length < MIN_SAMPLES) {
      return NextResponse.json(
        {
          error: `Add at least ${MIN_SAMPLES} writing samples before generating a style profile (you have ${samples.length})`,
        },
        { status: 400 }
      )
    }

    const anthropicKey = await getUserAIKey(user.id, 'anthropic')
    if (!anthropicKey) {
      return NextResponse.json({ error: NO_ANTHROPIC_KEY_ERROR }, { status: 402 })
    }

    const provider = getAIProvider()
    const analysis = await provider.analyzeWritingStyle(
      samples.map((s) => s.content),
      anthropicKey
    )

    // Increment version number from the latest profile
    const [latest] = await db
      .select({ version: styleProfiles.version })
      .from(styleProfiles)
      .where(eq(styleProfiles.userId, user.id))
      .orderBy(desc(styleProfiles.version))
      .limit(1)

    const nextVersion = (latest?.version ?? 0) + 1

    const [profile] = await db
      .insert(styleProfiles)
      .values({
        userId: user.id,
        profileData: { analysis, generatedFromSamples: samples.length },
        version: nextVersion,
      })
      .returning()

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('[/api/writing-style/generate-profile]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
