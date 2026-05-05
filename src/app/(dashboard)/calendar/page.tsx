import type { Metadata } from 'next'
import Link from 'next/link'
import { PlusCircle, CalendarDays } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Calendar' }

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Calendar</h2>
          <p className="text-muted-foreground">Manage your LinkedIn publishing schedule</p>
        </div>
        <Button asChild>
          <Link href="/new-content">
            <PlusCircle />
            New Content
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <CalendarDays className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="font-medium text-muted-foreground">No scheduled posts</p>
          <p className="mb-4 text-sm text-muted-foreground">
            Approved posts will appear here once scheduled
          </p>
          <Button asChild>
            <Link href="/drafts">Go to Drafts</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
