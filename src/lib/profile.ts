import { db, profiles } from '@/db'
import { eq } from 'drizzle-orm'
import type { User } from '@supabase/supabase-js'

// Ensures a profile row exists for the given auth user.
// The Supabase trigger handles this on signup, but this is a safe fallback.
export async function getOrCreateProfile(user: User) {
  const [existing] = await db.select().from(profiles).where(eq(profiles.id, user.id))
  if (existing) return existing

  const [created] = await db
    .insert(profiles)
    .values({
      id: user.id,
      fullName: (user.user_metadata?.full_name as string) ?? null,
      avatarUrl: (user.user_metadata?.avatar_url as string) ?? null,
    })
    .returning()

  return created
}
