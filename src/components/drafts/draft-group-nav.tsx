'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, CheckCheck, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export interface GroupContext {
  groupId: string
  position: number
  total: number
  prevId: string | null
  nextId: string | null
}

type DraftGroupNavProps = GroupContext

export function DraftGroupNav({ groupId, position, total, prevId, nextId }: DraftGroupNavProps) {
  const router = useRouter()
  const [finishing, setFinishing] = useState(false)

  async function handleFinish() {
    setFinishing(true)
    try {
      const res = await fetch(`/api/draft-groups/${groupId}/finish`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? 'Failed to finish review')
        setFinishing(false)
        return
      }
      toast.success('Review complete — drafts are now independent')
      router.push('/drafts')
    } catch {
      toast.error('Something went wrong')
      setFinishing(false)
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/40 px-4 py-3">
      <div className="flex items-center gap-2 min-w-0">
        <Badge variant="secondary" className="shrink-0">
          Draft {position} of {total}
        </Badge>
        <span className="text-xs text-muted-foreground hidden sm:block truncate">
          Reviewing a batch — save your changes before moving on
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {prevId && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/drafts/${prevId}`)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
        )}

        {nextId ? (
          <Button
            size="sm"
            onClick={() => router.push(`/drafts/${nextId}`)}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleFinish}
            disabled={finishing}
          >
            {finishing ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4 mr-1" />
            )}
            Finish Review
          </Button>
        )}
      </div>
    </div>
  )
}
