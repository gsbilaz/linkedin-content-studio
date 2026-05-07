import type { Metadata } from 'next'
import Link from 'next/link'
import { PlusCircle } from 'lucide-react'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db, postDrafts } from '@/db'
import { Button } from '@/components/ui/button'
import { CalendarView } from '@/components/calendar/calendar-view'

export const metadata: Metadata = { title: 'Calendar' }

export default async function CalendarPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const drafts = await db
    .select({
      id: postDrafts.id,
      title: postDrafts.title,
      status: postDrafts.status,
      scheduledAt: postDrafts.scheduledAt,
    })
    .from(postDrafts)
    .where(
      and(
        eq(postDrafts.userId, user!.id),
        inArray(postDrafts.status, ['scheduled', 'ready'])
      )
    )
    .orderBy(asc(postDrafts.scheduledAt))

  const calendarDrafts = drafts
    .filter((d) => d.scheduledAt !== null)
    .map((d) => ({
      id: d.id,
      title: d.title,
      status: d.status as 'scheduled' | 'ready',
      scheduledAt: d.scheduledAt!.toISOString(),
    }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Calendar</h2>
          <p className="text-muted-foreground">Manage your LinkedIn publishing schedule</p>
        </div>
        <Button asChild>
          <Link href="/new-content">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Content
          </Link>
        </Button>
      </div>

      <CalendarView drafts={calendarDrafts} />
    </div>
  )
}
