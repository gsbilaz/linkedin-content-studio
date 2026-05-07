'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DraftModeToggle } from '@/components/new-content/draft-mode-toggle'

const MAX_CHARS = 10000

export function TextInputForm() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [mode, setMode] = useState<'single' | 'multiple'>('single')
  const [isLoading, setIsLoading] = useState(false)

  const charCount = content.length
  const isOverLimit = charCount > MAX_CHARS
  const isEmpty = !content.trim()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isEmpty || isOverLimit || isLoading) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || undefined,
          rawText: content.trim(),
          mode,
        }),
      })

      const data = (await response.json()) as { draftId?: string; groupId?: string; error?: string }

      if (!response.ok) {
        throw new Error(data.error ?? 'Something went wrong')
      }

      toast.success(mode === 'multiple' ? 'Drafts generated — reviewing first one' : 'Draft generated!')
      router.push(`/drafts/${data.draftId}`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paste Your Content</CardTitle>
        <CardDescription>
          Paste raw notes, talking points, a rough draft, or anything you want to turn into a
          LinkedIn post. Claude will do the rest.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">Topic or title (optional)</Label>
            <Input
              id="title"
              placeholder="e.g. Lessons learned from my first product launch"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">
              Your content <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="content"
              placeholder="Paste your notes, bullet points, voice memo transcript, article excerpt, or rough draft here..."
              className="min-h-[240px] resize-y"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isLoading}
              required
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Minimum 20 characters</span>
              <span className={isOverLimit ? 'text-destructive font-medium' : ''}>
                {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
              </span>
            </div>
          </div>

          <DraftModeToggle value={mode} onChange={setMode} disabled={isLoading} />

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isEmpty || isOverLimit || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" />
                {mode === 'multiple' ? 'Generating drafts…' : 'Generating draft…'}
              </>
            ) : (
              <>
                <Sparkles />
                {mode === 'multiple' ? 'Generate Multiple Posts' : 'Generate LinkedIn Post'}
              </>
            )}
          </Button>

          {isLoading && (
            <p className="text-center text-xs text-muted-foreground animate-pulse">
              {mode === 'multiple'
                ? 'Claude is identifying themes and writing a post for each one — may take 20–40 seconds'
                : 'Claude is reading your content and writing a draft — usually takes 5–15 seconds'}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
