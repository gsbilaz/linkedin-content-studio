import type { Metadata } from 'next'
import Link from 'next/link'
import { PlusCircle, FileText, Copy } from 'lucide-react'
import { desc, eq } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db, postDrafts } from '@/db'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Drafts' }

const STATUS_VARIANT: Record<
  string,
  'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive'
> = {
  draft: 'secondary',
  approved: 'success',
  scheduled: 'warning',
  published: 'default',
  failed: 'destructive',
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default async function DraftsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const drafts = await db
    .select()
    .from(postDrafts)
    .where(eq(postDrafts.userId, user!.id))
    .orderBy(desc(postDrafts.createdAt))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Drafts</h2>
          <p className="text-muted-foreground">Review and approve LinkedIn posts</p>
        </div>
        <Button asChild>
          <Link href="/new-content">
            <PlusCircle />
            New Content
          </Link>
        </Button>
      </div>

      {drafts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium text-muted-foreground">No drafts yet</p>
            <p className="mb-4 text-sm text-muted-foreground">
              Your AI-generated drafts will appear here
            </p>
            <Button asChild>
              <Link href="/new-content/text">
                <PlusCircle />
                Submit your first content idea
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {drafts.map((draft) => (
            <Link key={draft.id} href={`/drafts/${draft.id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {draft.title ?? 'Untitled Draft'}
                        </p>
                        <Badge
                          variant={STATUS_VARIANT[draft.status] ?? 'secondary'}
                          className="shrink-0 text-xs"
                        >
                          {draft.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {draft.content}
                      </p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {timeAgo(draft.createdAt)}
                      </span>
                      <Copy className="h-4 w-4 text-muted-foreground/50" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
