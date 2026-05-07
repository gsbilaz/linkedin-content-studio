'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import type { GroupContext } from '@/components/drafts/draft-group-nav'

const DraftEditorInner = dynamic(
  () => import('./draft-editor').then((m) => m.DraftEditor),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-px w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-10 w-32" />
      </div>
    ),
  }
)

interface DraftEditorClientProps {
  draft: {
    id: string
    title: string | null
    content: string
    status: 'draft' | 'approved' | 'rejected' | 'scheduled' | 'ready' | 'published'
    scheduledAt: string | null
    createdAt: string
  }
  groupContext?: GroupContext
  linkedInConnected?: boolean
}

export function DraftEditorClient({
  draft,
  groupContext,
  linkedInConnected = false,
}: DraftEditorClientProps) {
  return (
    <DraftEditorInner
      draft={draft}
      groupContext={groupContext}
      linkedInConnected={linkedInConnected}
    />
  )
}
