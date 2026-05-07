'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Calendar, Clock, Zap, CheckCircle, X, RotateCcw, Linkedin, Loader2 } from 'lucide-react'

type SchedulableStatus = 'approved' | 'scheduled' | 'ready'

interface SchedulePanelProps {
  draftId: string
  status: SchedulableStatus
  scheduledAt: string | null
  linkedInConnected: boolean
  onUpdate: (updates: { status?: string; scheduledAt?: string | null }) => void
}

function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function getMinDatetimeLocal(): string {
  return toDatetimeLocal(new Date(Date.now() + 5 * 60 * 1000))
}

function formatScheduledTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function SchedulePanel({
  draftId,
  status,
  scheduledAt,
  linkedInConnected,
  onUpdate,
}: SchedulePanelProps) {
  const router = useRouter()
  const [dateInput, setDateInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [pendingPublish, setPendingPublish] = useState(false)
  const publishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (status === 'scheduled' && scheduledAt) {
      setDateInput(toDatetimeLocal(new Date(scheduledAt)))
    } else if (status === 'approved') {
      setDateInput('')
    }
  }, [status, scheduledAt])

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  async function handleSchedule() {
    if (!dateInput) {
      toast.error('Please choose a date and time')
      return
    }
    const scheduledDate = new Date(dateInput)
    if (scheduledDate <= new Date()) {
      toast.error('Scheduled time must be in the future')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/drafts/${draftId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt: scheduledDate.toISOString() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to schedule')
      onUpdate({ status: 'scheduled', scheduledAt: scheduledDate.toISOString() })
      toast.success('Post scheduled')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to schedule')
    } finally {
      setSaving(false)
    }
  }

  async function handleCancelSchedule() {
    setSaving(true)
    try {
      const res = await fetch(`/api/drafts/${draftId}/schedule`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to cancel')
      onUpdate({ status: 'approved', scheduledAt: null })
      toast.success('Schedule cancelled')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel schedule')
    } finally {
      setSaving(false)
    }
  }

  async function handlePublishNow() {
    setSaving(true)
    try {
      const res = await fetch(`/api/drafts/${draftId}/publish-now`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to publish')
      onUpdate({ status: 'ready', scheduledAt: null })
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  async function handleRevertToDraft() {
    setSaving(true)
    try {
      const res = await fetch(`/api/drafts/${draftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to revert')
      onUpdate({ status: 'draft', scheduledAt: null })
      toast.success('Reverted to draft')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to revert')
    } finally {
      setSaving(false)
    }
  }

  function handleMarkPublished() {
    setPendingPublish(true)

    publishTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/drafts/${draftId}/mark-published`, { method: 'POST' })
        if (!res.ok) {
          const data = await res.json()
          toast.error(data.error ?? 'Failed to mark as published')
          setPendingPublish(false)
          return
        }
        router.push('/drafts')
      } catch {
        toast.error('Something went wrong')
        setPendingPublish(false)
      }
    }, 30000)

    toast('Post will be marked as published in 30 seconds', {
      duration: 30000,
      action: {
        label: 'Undo',
        onClick: () => {
          if (publishTimerRef.current) clearTimeout(publishTimerRef.current)
          setPendingPublish(false)
        },
      },
    })
  }

  async function handlePublishToLinkedIn() {
    setPublishing(true)
    try {
      const res = await fetch(`/api/drafts/${draftId}/publish`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Publishing failed')
      toast.success('Published to LinkedIn!')
      router.push('/drafts')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Publishing failed')
    } finally {
      setPublishing(false)
    }
  }

  if (status === 'ready') {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <CardTitle className="text-base text-green-900">Ready to Post</CardTitle>
            <Badge variant="success" className="ml-auto">Ready</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-green-800">
            Copy the post text above and paste it into LinkedIn, or follow the steps below.
          </p>
          <ol className="text-xs text-green-800 space-y-0.5 list-decimal list-inside">
            <li>Click <strong>Copy Post</strong> above</li>
            <li>Open LinkedIn and click <strong>Start a post</strong></li>
            <li>Paste the text and add any images or documents</li>
            <li>Click <strong>Post</strong>, then come back and mark it as published</li>
          </ol>
          <div className="flex flex-col gap-2 pt-1">
            {linkedInConnected && (
              <Button
                onClick={handlePublishToLinkedIn}
                disabled={pendingPublish || saving || publishing}
                className="w-full"
              >
                {publishing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Linkedin className="mr-2 h-4 w-4" />
                )}
                {publishing ? 'Publishing to LinkedIn…' : 'Publish to LinkedIn'}
              </Button>
            )}
            <Button
              onClick={handleMarkPublished}
              disabled={pendingPublish || saving || publishing}
              className="w-full bg-green-700 hover:bg-green-800 text-white"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {pendingPublish
                ? 'Marking as published in 30s… (tap toast to undo)'
                : 'Mark as Manually Posted'}
            </Button>
            {!linkedInConnected && (
              <p className="text-xs text-muted-foreground text-center">
                Connect LinkedIn in{' '}
                <a href="/settings" className="underline">
                  Settings
                </a>{' '}
                to publish directly
              </p>
            )}
            <Button
              variant="outline"
              onClick={handleRevertToDraft}
              disabled={pendingPublish || saving || publishing}
              className="w-full"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Revert to Draft
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (status === 'scheduled' && scheduledAt) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-base">Scheduled</CardTitle>
            <Badge variant="warning" className="ml-auto">Scheduled</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Scheduled for <strong>{formatScheduledTime(scheduledAt)}</strong>
          </p>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Reschedule</label>
            <input
              type="datetime-local"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={dateInput}
              min={getMinDatetimeLocal()}
              onChange={(e) => setDateInput(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Timezone: {timezone}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSchedule} disabled={saving || !dateInput} size="sm">
              <Calendar className="mr-2 h-3.5 w-3.5" />
              Update Schedule
            </Button>
            <Button variant="outline" size="sm" onClick={handleCancelSchedule} disabled={saving}>
              <X className="mr-2 h-3.5 w-3.5" />
              Cancel Schedule
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePublishNow}
              disabled={saving}
              className="ml-auto"
            >
              <Zap className="mr-2 h-3.5 w-3.5" />
              Publish Now
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // status === 'approved'
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Schedule this post</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Choose date and time</label>
          <input
            type="datetime-local"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={dateInput}
            min={getMinDatetimeLocal()}
            onChange={(e) => setDateInput(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Timezone: {timezone}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSchedule} disabled={saving || !dateInput}>
            <Calendar className="mr-2 h-4 w-4" />
            Schedule Post
          </Button>
          <Button variant="outline" onClick={handlePublishNow} disabled={saving}>
            <Zap className="mr-2 h-4 w-4" />
            Publish Now
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
