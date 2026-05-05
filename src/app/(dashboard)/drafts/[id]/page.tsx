import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock } from 'lucide-react'
import { and, eq } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db, postDrafts } from '@/db'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { CopyButton } from '@/components/drafts/copy-button'

export const metadata: Metadata = { title: 'Draft' }

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'success' | 'warning'> =
  {
    draft: 'secondary',
    approved: 'success',
    scheduled: 'warning',
    published: 'default',
    failed: 'destructive' as 'default',
  }

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function DraftDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [draft] = await db
    .select()
    .from(postDrafts)
    .where(and(eq(postDrafts.id, id), eq(postDrafts.userId, user!.id)))

  if (!draft) notFound()

  const charCount = draft.content.length
  const isOverLinkedInLimit = charCount > 3000

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Back nav */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/drafts">
          <ArrowLeft />
          All Drafts
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">
            {draft.title ?? 'Untitled Draft'}
          </h2>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {formatDate(draft.createdAt)}
          </p>
        </div>
        <Badge variant={STATUS_VARIANT[draft.status] ?? 'secondary'}>
          {draft.status}
        </Badge>
      </div>

      <Separator />

      {/* Draft content */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">LinkedIn Post</CardTitle>
            <CopyButton text={draft.content} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="whitespace-pre-wrap rounded-md bg-muted/40 p-4 text-sm leading-relaxed">
            {draft.content}
          </div>
          <p
            className={`mt-2 text-right text-xs ${
              isOverLinkedInLimit ? 'text-destructive font-medium' : 'text-muted-foreground'
            }`}
          >
            {charCount.toLocaleString()} / 3,000 characters
            {isOverLinkedInLimit && ' — over LinkedIn limit, consider trimming'}
          </p>
        </CardContent>
      </Card>

      {/* Manual posting instructions */}
      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 space-y-1">
        <p className="text-sm font-semibold text-blue-900">How to post on LinkedIn</p>
        <ol className="text-xs text-blue-800 space-y-0.5 list-decimal list-inside">
          <li>Click <strong>Copy Post</strong> above</li>
          <li>Open LinkedIn and click <strong>Start a post</strong></li>
          <li>Paste the text and add any images or documents</li>
          <li>Review, then click <strong>Post</strong></li>
        </ol>
      </div>
    </div>
  )
}
