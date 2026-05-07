'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Trash2, Pencil, ChevronDown, ChevronUp, X, Check } from 'lucide-react'
import { toast } from 'sonner'

interface Sample {
  id: string
  title: string | null
  content: string
  createdAt: string | Date
}

interface SampleCardProps {
  sample: Sample
  onDeleted: () => void
  onUpdated: (updated: Sample) => void
}

function timeAgo(date: string | Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const PREVIEW_LENGTH = 200

export function SampleCard({ sample, onDeleted, onUpdated }: SampleCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(sample.title ?? '')
  const [editContent, setEditContent] = useState(sample.content)
  const [saving, setSaving] = useState(false)
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isLong = sample.content.length > PREVIEW_LENGTH
  const preview = isLong && !expanded
    ? sample.content.slice(0, PREVIEW_LENGTH) + '…'
    : sample.content

  function handleDelete() {
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/writing-style/samples/${sample.id}`, { method: 'DELETE' })
        if (!res.ok) {
          const data = await res.json()
          toast.error(data.error ?? 'Failed to delete sample')
        } else {
          onDeleted()
        }
      } catch {
        toast.error('Something went wrong')
      }
    }, 5000)

    deleteTimerRef.current = timer

    toast('Writing sample deleted', {
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => {
          clearTimeout(timer)
        },
      },
    })
  }

  function handleStartEdit() {
    setEditTitle(sample.title ?? '')
    setEditContent(sample.content)
    setEditing(true)
    setExpanded(false)
  }

  function handleCancelEdit() {
    setEditing(false)
  }

  async function handleSaveEdit() {
    if (editContent.trim().length < 50) {
      toast.error('Sample must be at least 50 characters')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/writing-style/samples/${sample.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim() || undefined,
          content: editContent,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to update sample')
        return
      }
      toast.success('Sample updated')
      setEditing(false)
      onUpdated({
        ...sample,
        title: data.sample.title,
        content: data.sample.content,
      })
    } catch {
      toast.error('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium">Edit Sample</p>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancelEdit}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Title (optional)"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
          />
          <div className="space-y-1">
            <Textarea
              rows={8}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="resize-y"
            />
            <p className="text-xs text-right text-muted-foreground">{editContent.length} characters</p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSaveEdit}
              disabled={saving || editContent.trim().length < 50}
            >
              <Check className="mr-1.5 h-3.5 w-3.5" />
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancelEdit} disabled={saving}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <p className="font-medium text-sm">{sample.title ?? 'Untitled sample'}</p>
          <p className="text-xs text-muted-foreground">{timeAgo(sample.createdAt)}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={handleStartEdit}
            aria-label="Edit sample"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
            aria-label="Delete sample"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{preview}</p>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{sample.content.length} characters</p>
          {isLong && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? (
                <><ChevronUp className="mr-1 h-3 w-3" />Show less</>
              ) : (
                <><ChevronDown className="mr-1 h-3 w-3" />Show more</>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
