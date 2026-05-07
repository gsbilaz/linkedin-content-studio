import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db, linkedinAccounts } from '@/db'
import { eq } from 'drizzle-orm'

export async function DELETE() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await db.delete(linkedinAccounts).where(eq(linkedinAccounts.userId, user.id))
  return NextResponse.json({ success: true })
}
