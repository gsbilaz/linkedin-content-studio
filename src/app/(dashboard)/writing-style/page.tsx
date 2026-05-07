import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { db, writingSamples, styleProfiles } from '@/db'
import { desc, eq } from 'drizzle-orm'
import { WritingStylePanel } from '@/components/writing-style/writing-style-panel'

export const metadata: Metadata = { title: 'Writing Style' }

export default async function WritingStylePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [samples, profileRows] = await Promise.all([
    user
      ? db
          .select()
          .from(writingSamples)
          .where(eq(writingSamples.userId, user.id))
          .orderBy(desc(writingSamples.createdAt))
      : Promise.resolve([]),
    user
      ? db
          .select()
          .from(styleProfiles)
          .where(eq(styleProfiles.userId, user.id))
          .orderBy(desc(styleProfiles.version))
          .limit(1)
      : Promise.resolve([]),
  ])

  const latestProfile = profileRows[0] ?? null

  return (
    <WritingStylePanel
      initialSamples={samples.map((s) => ({
        id: s.id,
        title: s.title,
        content: s.content,
        createdAt: s.createdAt.toISOString(),
      }))}
      initialProfile={
        latestProfile
          ? {
              id: latestProfile.id,
              version: latestProfile.version,
              profileData: latestProfile.profileData as {
                analysis: string
                generatedFromSamples: number
              },
              createdAt: latestProfile.createdAt.toISOString(),
            }
          : null
      }
    />
  )
}
