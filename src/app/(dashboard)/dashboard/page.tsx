import type { Metadata } from 'next'
import Link from 'next/link'
import { and, asc, count, desc, eq, inArray, ne } from 'drizzle-orm'
import { PlusCircle, FileText, Pen, Calendar, Clock, CheckCircle, CalendarClock, BookOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { db, postDrafts, writingSamples } from '@/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Dashboard' }

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  approved: 'Approved',
  scheduled: 'Scheduled',
  ready: 'Ready to Post',
  published: 'Published',
  rejected: 'Rejected',
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive'> = {
  draft: 'secondary',
  approved: 'success',
  scheduled: 'warning',
  ready: 'default',
  published: 'outline',
  rejected: 'destructive',
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

function formatScheduled(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const quickActions = [
  { href: '/new-content', icon: PlusCircle, label: 'New Content', description: 'Submit an idea, recording, or file' },
  { href: '/writing-style', icon: Pen, label: 'Writing Style', description: 'Add samples to personalise AI drafts' },
  { href: '/drafts', icon: FileText, label: 'All Drafts', description: 'Edit and approve pending posts' },
  { href: '/calendar', icon: Calendar, label: 'Calendar', description: 'Manage your publishing schedule' },
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    [{ activeDrafts }],
    [{ publishedCount }],
    [{ scheduledCount }],
    [{ sampleCount }],
    recentDrafts,
    upcomingPosts,
  ] = await Promise.all([
    db.select({ activeDrafts: count() }).from(postDrafts).where(and(eq(postDrafts.userId, user!.id), ne(postDrafts.status, 'published'))),
    db.select({ publishedCount: count() }).from(postDrafts).where(and(eq(postDrafts.userId, user!.id), eq(postDrafts.status, 'published'))),
    db.select({ scheduledCount: count() }).from(postDrafts).where(and(eq(postDrafts.userId, user!.id), inArray(postDrafts.status, ['scheduled', 'ready']))),
    db.select({ sampleCount: count() }).from(writingSamples).where(eq(writingSamples.userId, user!.id)),
    db
      .select({ id: postDrafts.id, title: postDrafts.title, status: postDrafts.status, updatedAt: postDrafts.updatedAt })
      .from(postDrafts)
      .where(and(eq(postDrafts.userId, user!.id), ne(postDrafts.status, 'published')))
      .orderBy(desc(postDrafts.updatedAt))
      .limit(6),
    db
      .select({ id: postDrafts.id, title: postDrafts.title, status: postDrafts.status, scheduledAt: postDrafts.scheduledAt })
      .from(postDrafts)
      .where(and(eq(postDrafts.userId, user!.id), inArray(postDrafts.status, ['scheduled', 'ready'])))
      .orderBy(asc(postDrafts.scheduledAt))
      .limit(4),
  ])

  const stats = [
    { label: 'Active Drafts', value: activeDrafts, icon: FileText, description: 'In progress or approved' },
    { label: 'Published', value: publishedCount, icon: CheckCircle, description: 'Posted to LinkedIn' },
    { label: 'Scheduled', value: scheduledCount, icon: CalendarClock, description: 'Queued for release' },
    { label: 'Writing Samples', value: sampleCount, icon: BookOpen, description: 'Style training data' },
  ]

  const isEmpty = activeDrafts === 0 && publishedCount === 0

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Your LinkedIn content overview</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, description }) => (
          <Card key={label}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardDescription className="text-sm font-medium">{label}</CardDescription>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {isEmpty ? (
        /* ── First-time empty state ── */
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <PlusCircle className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-semibold">Welcome — let's create your first post</p>
              <p className="text-sm text-muted-foreground mt-1">
                Submit a text idea, upload a recording, or paste a link to get started
              </p>
            </div>
            <Button asChild size="lg">
              <Link href="/new-content">
                <PlusCircle className="mr-2 h-5 w-5" />
                New Content
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* ── Main content grid ── */
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Drafts — takes 2 columns */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Recent Drafts</h3>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/drafts">View all</Link>
              </Button>
            </div>
            {recentDrafts.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No active drafts — <Link href="/new-content" className="underline">create one</Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {recentDrafts.map((draft) => (
                  <Link key={draft.id} href={`/drafts/${draft.id}`}>
                    <Card className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="flex items-center justify-between gap-3 p-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{draft.title ?? 'Untitled Draft'}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" />
                            {timeAgo(draft.updatedAt)}
                          </p>
                        </div>
                        <Badge variant={STATUS_VARIANT[draft.status] ?? 'secondary'} className="shrink-0 text-xs">
                          {STATUS_LABEL[draft.status] ?? draft.status}
                        </Badge>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Right column: Upcoming + Quick Actions */}
          <div className="space-y-6">
            {/* Upcoming Scheduled */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Upcoming</h3>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/calendar">Calendar</Link>
                </Button>
              </div>
              {upcomingPosts.length === 0 ? (
                <Card>
                  <CardContent className="py-6 text-center text-sm text-muted-foreground">
                    No scheduled posts yet
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {upcomingPosts.map((post) => (
                    <Link key={post.id} href={`/drafts/${post.id}`}>
                      <Card className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-4 space-y-1">
                          <p className="font-medium text-sm truncate">{post.title ?? 'Untitled Draft'}</p>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <CalendarClock className="h-3 w-3" />
                              {post.scheduledAt ? formatScheduled(post.scheduledAt) : '—'}
                            </p>
                            <Badge variant={STATUS_VARIANT[post.status] ?? 'secondary'} className="text-xs shrink-0">
                              {STATUS_LABEL[post.status] ?? post.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Quick Actions</h3>
              <div className="space-y-2">
                {quickActions.map(({ href, icon: Icon, label, description }) => (
                  <Link key={href} href={href}>
                    <Card className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{label}</p>
                          <p className="text-xs text-muted-foreground truncate">{description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
