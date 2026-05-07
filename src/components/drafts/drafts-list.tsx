'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2, PlusCircle, FileText, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

const STATUS_VARIANT: Record<
  string,
  'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive'
> = {
  draft: 'secondary',
  approved: 'success',
  scheduled: 'warning',
  ready: 'default',
  published: 'outline',
  rejected: 'destructive',
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  approved: 'Approved',
  scheduled: 'Scheduled',
  ready: 'Ready to Post',
  published: 'Published',
  rejected: 'Rejected',
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatScheduled(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface Draft {
  id: string
  title: string | null
  content: string
  status: string
  scheduledAt: string | null
  createdAt: string
}

interface DraftsListProps {
  drafts: Draft[]
  publishedDrafts?: Draft[]
}

function DraftCard({
  draft,
  onDelete,
  isPending,
}: {
  draft: Draft
  onDelete: (id: string, e: React.MouseEvent) => void
  isPending: boolean
}) {
  return (
    <Link key={draft.id} href={`/drafts/${draft.id}`}>
      <Card className="cursor-pointer transition-shadow hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <p className="font-medium truncate">{draft.title ?? 'Untitled Draft'}</p>
              <Badge
                variant={STATUS_VARIANT[draft.status] ?? 'secondary'}
                className="shrink-0 text-xs"
              >
                {STATUS_LABEL[draft.status] ?? draft.status}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => onDelete(draft.id, e)}
              aria-label="Delete draft"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{draft.content}</p>
          <div className="flex items-center justify-between">
            {draft.scheduledAt && (draft.status === 'scheduled' || draft.status === 'ready') ? (
              <p className="text-xs text-amber-600 font-medium">
                {draft.status === 'ready' ? 'Ready · ' : 'Scheduled · '}
                {formatScheduled(draft.scheduledAt)}
              </p>
            ) : (
              <span />
            )}
            <p className="text-xs text-muted-foreground text-right">{timeAgo(draft.createdAt)}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export function DraftsList({ drafts, publishedDrafts = [] }: DraftsListProps) {
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const router = useRouter()

  const handleDelete = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      setPendingIds((prev) => new Set([...prev, id]))

      const timer = setTimeout(async () => {
        timers.current.delete(id)
        try {
          const res = await fetch(`/api/drafts/${id}`, { method: 'DELETE' })
          if (!res.ok) {
            const data = await res.json()
            toast.error(data.error ?? 'Failed to delete draft')
            setPendingIds((prev) => {
              const next = new Set(prev)
              next.delete(id)
              return next
            })
          } else {
            router.refresh()
          }
        } catch {
          toast.error('Something went wrong')
          setPendingIds((prev) => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
        }
      }, 30000)

      timers.current.set(id, timer)

      toast('Draft deleted', {
        duration: 30000,
        action: {
          label: 'Undo',
          onClick: () => {
            const t = timers.current.get(id)
            if (t) clearTimeout(t)
            timers.current.delete(id)
            setPendingIds((prev) => {
              const next = new Set(prev)
              next.delete(id)
              return next
            })
          },
        },
      })
    },
    [router]
  )

  const visibleDrafts = drafts.filter((d) => !pendingIds.has(d.id))
  const visiblePublished = publishedDrafts.filter((d) => !pendingIds.has(d.id))

  if (visibleDrafts.length === 0 && visiblePublished.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="font-medium text-muted-foreground">No drafts yet</p>
          <p className="mb-4 text-sm text-muted-foreground">
            Your AI-generated drafts will appear here
          </p>
          <Button asChild>
            <Link href="/new-content/text">
              <PlusCircle className="mr-2 h-4 w-4" />
              Submit your first content idea
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      {visibleDrafts.length > 0 && (
        <div className="space-y-3">
          {visibleDrafts.map((draft) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              onDelete={handleDelete}
              isPending={pendingIds.has(draft.id)}
            />
          ))}
        </div>
      )}

      {visiblePublished.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground">Published (last 24h)</h3>
          </div>
          {visiblePublished.map((draft) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              onDelete={handleDelete}
              isPending={pendingIds.has(draft.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
