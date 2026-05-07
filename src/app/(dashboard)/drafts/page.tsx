import type { Metadata } from 'next'
import Link from 'next/link'
import { PlusCircle } from 'lucide-react'
import { and, desc, eq, gte, ne } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db, postDrafts } from '@/db'
import { Button } from '@/components/ui/button'
import { DraftsList } from '@/components/drafts/drafts-list'

export const metadata: Metadata = { title: 'Drafts' }

export default async function DraftsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const [activeDrafts, publishedDrafts] = await Promise.all([
    db
      .select()
      .from(postDrafts)
      .where(and(eq(postDrafts.userId, user!.id), ne(postDrafts.status, 'published')))
      .orderBy(desc(postDrafts.createdAt)),
    db
      .select()
      .from(postDrafts)
      .where(
        and(
          eq(postDrafts.userId, user!.id),
          eq(postDrafts.status, 'published'),
          gte(postDrafts.publishedAt, cutoff)
        )
      )
      .orderBy(desc(postDrafts.publishedAt)),
  ])

  function toDraftShape(d: typeof postDrafts.$inferSelect) {
    return {
      id: d.id,
      title: d.title,
      content: d.content,
      status: d.status,
      scheduledAt: d.scheduledAt?.toISOString() ?? null,
      createdAt: d.createdAt.toISOString(),
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Drafts</h2>
          <p className="text-muted-foreground">Review and approve LinkedIn posts</p>
        </div>
        <Button asChild>
          <Link href="/new-content">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Content
          </Link>
        </Button>
      </div>

      <DraftsList
        drafts={activeDrafts.map(toDraftShape)}
        publishedDrafts={publishedDrafts.map(toDraftShape)}
      />
    </div>
  )
}
