'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { CopyButton } from '@/components/drafts/copy-button'
import { MediaAttachments } from '@/components/drafts/media-attachments'
import { SchedulePanel } from '@/components/drafts/schedule-panel'
import { toast } from 'sonner'
import { CheckCircle, Clock, RotateCcw, Trash2, ArrowLeft, BookMarked } from 'lucide-react'
import Link from 'next/link'
import { DraftGroupNav, type GroupContext } from '@/components/drafts/draft-group-nav'

const LINKEDIN_LIMIT = 3000

type DraftStatus = 'draft' | 'approved' | 'rejected' | 'scheduled' | 'ready' | 'published'

interface Draft {
  id: string
  title: string | null
  content: string
  status: DraftStatus
  scheduledAt: string | null
  createdAt: string
}

const STATUS_LABEL: Record<DraftStatus, string> = {
  draft: 'Draft',
  approved: 'Approved',
  rejected: 'Rejected',
  scheduled: 'Scheduled',
  ready: 'Ready to Post',
  published: 'Published',
}

const STATUS_VARIANT: Record<
  DraftStatus,
  'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive'
> = {
  draft: 'secondary',
  approved: 'success',
  rejected: 'destructive',
  scheduled: 'warning',
  ready: 'default',
  published: 'outline',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface DraftEditorProps {
  draft: Draft
  groupContext?: GroupContext
  linkedInConnected?: boolean
}

export function DraftEditor({
  draft: initialDraft,
  groupContext,
  linkedInConnected = false,
}: DraftEditorProps) {
  const router = useRouter()
  const [title, setTitle] = useState(initialDraft.title ?? '')
  const [content, setContent] = useState(initialDraft.content)
  const [status, setStatus] = useState<DraftStatus>(initialDraft.status)
  const [scheduledAt, setScheduledAt] = useState<string | null>(initialDraft.scheduledAt)
  const [saving, setSaving] = useState(false)
  const [pendingDeletion, setPendingDeletion] = useState(false)
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTitle = useRef(initialDraft.title ?? '')
  const savedContent = useRef(initialDraft.content)

  const isDirty = title !== savedTitle.current || content !== savedContent.current
  const charCount = content.length
  const isOverLimit = charCount > LINKEDIN_LIMIT
  const isReadOnly =
    status === 'approved' ||
    status === 'scheduled' ||
    status === 'ready' ||
    status === 'published'

  const patch = useCallback(
    async (updates: { title?: string; content?: string; status?: DraftStatus }) => {
      const res = await fetch(`/api/drafts/${initialDraft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Request failed')
      return data.draft
    },
    [initialDraft.id]
  )

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await patch({ title: title.trim() || undefined, content })
      savedTitle.current = title
      savedContent.current = content
      toast.success('Draft saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [patch, title, content])

  const handleApprove = useCallback(async () => {
    setSaving(true)
    try {
      await patch({ title: title.trim() || undefined, content, status: 'approved' })
      savedTitle.current = title
      savedContent.current = content
      setStatus('approved')
      toast.success('Draft approved')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve')
    } finally {
      setSaving(false)
    }
  }, [patch, title, content, router])

  const handleRevertToDraft = useCallback(async () => {
    setSaving(true)
    try {
      await patch({ status: 'draft' })
      setStatus('draft')
      setScheduledAt(null)
      toast.success('Reverted to draft')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setSaving(false)
    }
  }, [patch, router])

  const handleDelete = useCallback(() => {
    setPendingDeletion(true)

    deleteTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/drafts/${initialDraft.id}`, { method: 'DELETE' })
        if (!res.ok) {
          const data = await res.json()
          toast.error(data.error ?? 'Failed to delete')
          setPendingDeletion(false)
          return
        }
        router.push('/drafts')
      } catch {
        toast.error('Something went wrong')
        setPendingDeletion(false)
      }
    }, 30000)

    toast('Draft will be deleted in 30 seconds', {
      duration: 30000,
      action: {
        label: 'Undo',
        onClick: () => {
          if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current)
          setPendingDeletion(false)
        },
      },
    })
  }, [initialDraft.id, router])

  // Cmd/Ctrl+S to save
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's' && isDirty && !isReadOnly) {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleSave, isDirty, isReadOnly])

  const showSchedulePanel =
    status === 'approved' || status === 'scheduled' || status === 'ready'

  const handleAddAsWritingSample = useCallback(async () => {
    try {
      const res = await fetch('/api/writing-style/samples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || 'Draft sample',
          content,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to add sample')
      toast.success('Added to writing samples')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add sample')
    }
  }, [title, content])

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Back nav */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/drafts">
          <ArrowLeft className="mr-1 h-4 w-4" />
          All Drafts
        </Link>
      </Button>

      {/* Group review banner */}
      {groupContext && <DraftGroupNav {...groupContext} />}

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          {isReadOnly ? (
            <h2 className="text-2xl font-bold tracking-tight">{title || 'Untitled Draft'}</h2>
          ) : (
            <Input
              className="text-2xl font-bold border-0 px-0 shadow-none focus-visible:ring-0 h-auto py-0 bg-transparent"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Draft title"
            />
          )}
          <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
        </div>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {formatDate(initialDraft.createdAt)}
          {isDirty && <span className="text-amber-500 ml-2">· Unsaved changes</span>}
        </p>
      </div>

      <Separator />

      {/* Content editor */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">LinkedIn Post</CardTitle>
            <div className="flex items-center gap-1">
              {(status === 'approved' || status === 'published') && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground"
                  onClick={handleAddAsWritingSample}
                  title="Save this post as a writing sample to improve your style profile"
                >
                  <BookMarked className="mr-1.5 h-3.5 w-3.5" />
                  Use as sample
                </Button>
              )}
              <CopyButton text={content} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {isReadOnly ? (
            <div className="whitespace-pre-wrap rounded-md bg-muted/40 p-4 text-sm leading-relaxed">
              {content}
            </div>
          ) : (
            <textarea
              className="w-full min-h-[280px] resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm leading-relaxed shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Your LinkedIn post content..."
            />
          )}
          <p
            className={`text-right text-xs ${
              isOverLimit ? 'text-destructive font-medium' : 'text-muted-foreground'
            }`}
          >
            {charCount.toLocaleString()} / {LINKEDIN_LIMIT.toLocaleString()} characters
            {isOverLimit && ' — over LinkedIn limit, consider trimming'}
          </p>
        </CardContent>
      </Card>

      {/* Media attachments */}
      <MediaAttachments draftId={initialDraft.id} readOnly={isReadOnly} />

      {/* Scheduling panel */}
      {showSchedulePanel && (
        <SchedulePanel
          draftId={initialDraft.id}
          status={status as 'approved' | 'scheduled' | 'ready'}
          scheduledAt={scheduledAt}
          linkedInConnected={linkedInConnected}
          onUpdate={(updates) => {
            if (updates.status) setStatus(updates.status as DraftStatus)
            if ('scheduledAt' in updates) setScheduledAt(updates.scheduledAt ?? null)
          }}
        />
      )}

      {/* Actions */}
      {status !== 'scheduled' && status !== 'published' && status !== 'ready' && (
        <div className="flex flex-wrap items-center gap-3">
          {status === 'draft' || status === 'rejected' ? (
            <>
              <Button
                onClick={handleApprove}
                disabled={saving || isOverLimit || content.trim().length === 0}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button variant="outline" onClick={handleSave} disabled={saving || !isDirty}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={handleRevertToDraft} disabled={saving}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Revert to Draft
            </Button>
          )}
          <Button
            variant="outline"
            className="ml-auto border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={handleDelete}
            disabled={pendingDeletion || saving}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {pendingDeletion ? 'Deleting in 30s…' : 'Delete'}
          </Button>
        </div>
      )}
    </div>
  )
}
