'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

type ViewMode = 'month' | 'week' | 'agenda'

interface ScheduledDraft {
  id: string
  title: string | null
  status: 'scheduled' | 'ready'
  scheduledAt: string
}

interface CalendarViewProps {
  drafts: ScheduledDraft[]
}

const STATUS_CLASS: Record<string, string> = {
  scheduled: 'bg-amber-100 text-amber-800 border-amber-200',
  ready: 'bg-primary/10 text-primary border-primary/20',
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function formatDateFull(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function PostChip({ draft }: { draft: ScheduledDraft }) {
  return (
    <Link href={`/drafts/${draft.id}`} onClick={(e) => e.stopPropagation()}>
      <div
        className={cn(
          'text-xs px-1.5 py-0.5 rounded border truncate cursor-pointer hover:opacity-80 transition-opacity',
          STATUS_CLASS[draft.status]
        )}
        title={draft.title ?? 'Untitled Draft'}
      >
        {formatTime(draft.scheduledAt)} {draft.title ?? 'Untitled Draft'}
      </div>
    </Link>
  )
}

function MonthView({ today, current, drafts }: {
  today: Date
  current: Date
  drafts: ScheduledDraft[]
}) {
  const year = current.getFullYear()
  const month = current.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = firstDay.getDay() // 0 = Sunday

  // Build the grid: prefix empty cells + all days + suffix empty cells to complete the row
  const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7
  const cells: (Date | null)[] = []

  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month, d))
  while (cells.length < totalCells) cells.push(null)

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b">
        {DAY_NAMES.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
      </div>
      {/* Day cells */}
      <div className="grid grid-cols-7 divide-x divide-y border-b border-l">
        {cells.map((day, i) => {
          const isToday = day && sameDay(day, today)
          const dayDrafts = day
            ? drafts.filter((dr) => sameDay(new Date(dr.scheduledAt), day))
            : []

          return (
            <div
              key={i}
              className={cn(
                'min-h-[90px] p-1.5 border-r border-b',
                !day && 'bg-muted/20',
                isToday && 'bg-blue-50/50'
              )}
            >
              {day && (
                <>
                  <p
                    className={cn(
                      'text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full',
                      isToday && 'bg-primary text-primary-foreground'
                    )}
                  >
                    {day.getDate()}
                  </p>
                  <div className="space-y-0.5">
                    {dayDrafts.slice(0, 3).map((dr) => (
                      <PostChip key={dr.id} draft={dr} />
                    ))}
                    {dayDrafts.length > 3 && (
                      <p className="text-xs text-muted-foreground pl-1">
                        +{dayDrafts.length - 3} more
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WeekView({ today, current, drafts }: {
  today: Date
  current: Date
  drafts: ScheduledDraft[]
}) {
  // Build 7 days starting from Sunday of the week containing `current`
  const weekStart = new Date(current)
  weekStart.setDate(current.getDate() - current.getDay())

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })

  return (
    <div className="grid grid-cols-7 divide-x border rounded-lg overflow-hidden">
      {days.map((day, i) => {
        const isToday = sameDay(day, today)
        const dayDrafts = drafts.filter((dr) => sameDay(new Date(dr.scheduledAt), day))

        return (
          <div key={i} className={cn('p-2', isToday && 'bg-blue-50/50')}>
            <p className={cn(
              'text-xs font-medium text-center mb-1',
              isToday && 'text-primary font-bold'
            )}>
              {DAY_NAMES[day.getDay()]}
              <br />
              <span className={cn(
                'text-sm inline-flex items-center justify-center w-6 h-6 rounded-full mx-auto',
                isToday && 'bg-primary text-primary-foreground'
              )}>
                {day.getDate()}
              </span>
            </p>
            <div className="space-y-1 mt-2">
              {dayDrafts.map((dr) => (
                <PostChip key={dr.id} draft={dr} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AgendaView({ drafts }: { drafts: ScheduledDraft[] }) {
  const sorted = [...drafts].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  )

  if (sorted.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm">
        No upcoming scheduled posts
      </div>
    )
  }

  // Group by date
  const groups: { label: string; items: ScheduledDraft[] }[] = []
  let currentLabel = ''

  for (const draft of sorted) {
    const label = new Date(draft.scheduledAt).toLocaleDateString(undefined, {
      weekday: 'long', month: 'long', day: 'numeric',
    })
    if (label !== currentLabel) {
      groups.push({ label, items: [] })
      currentLabel = label
    }
    groups[groups.length - 1].items.push(draft)
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.label}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 pb-1 border-b">
            {group.label}
          </h3>
          <div className="space-y-2">
            {group.items.map((dr) => (
              <Link key={dr.id} href={`/drafts/${dr.id}`}>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{dr.title ?? 'Untitled Draft'}</p>
                      <p className="text-sm text-muted-foreground">{formatDateFull(dr.scheduledAt)}</p>
                    </div>
                    <Badge
                      variant={dr.status === 'ready' ? 'default' : 'warning'}
                      className="shrink-0"
                    >
                      {dr.status === 'ready' ? 'Ready' : 'Scheduled'}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function CalendarView({ drafts }: CalendarViewProps) {
  const today = useMemo(() => startOfDay(new Date()), [])
  const [current, setCurrent] = useState<Date>(() => new Date())
  const [view, setView] = useState<ViewMode>('month')

  function navigatePrev() {
    if (view === 'month') {
      setCurrent((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
    } else if (view === 'week') {
      setCurrent((d) => {
        const next = new Date(d)
        next.setDate(d.getDate() - 7)
        return next
      })
    }
  }

  function navigateNext() {
    if (view === 'month') {
      setCurrent((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
    } else if (view === 'week') {
      setCurrent((d) => {
        const next = new Date(d)
        next.setDate(d.getDate() + 7)
        return next
      })
    }
  }

  function getTitle(): string {
    if (view === 'month') {
      return `${MONTH_NAMES[current.getMonth()]} ${current.getFullYear()}`
    }
    if (view === 'week') {
      const weekStart = new Date(current)
      weekStart.setDate(current.getDate() - current.getDay())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getDate()}–${weekEnd.getDate()}, ${weekStart.getFullYear()}`
      }
      return `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getDate()} – ${MONTH_NAMES[weekEnd.getMonth()]} ${weekEnd.getDate()}, ${weekStart.getFullYear()}`
    }
    return 'Upcoming'
  }

  const showNav = view !== 'agenda'

  if (drafts.length === 0 && view !== 'month') {
    // fall through to show empty state in agenda/week
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {showNav && (
            <Button variant="outline" size="icon" onClick={navigatePrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <h3 className="text-base font-semibold min-w-[200px] text-center">{getTitle()}</h3>
          {showNav && (
            <Button variant="outline" size="icon" onClick={navigateNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
          {showNav && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrent(new Date())}
              className="text-xs"
            >
              Today
            </Button>
          )}
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-1">
          {(['month', 'week', 'agenda'] as ViewMode[]).map((v) => (
            <Button
              key={v}
              variant={view === v ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 capitalize"
              onClick={() => setView(v)}
            >
              {v}
            </Button>
          ))}
        </div>
      </div>

      {/* Calendar body */}
      {view === 'month' && (
        <div className="rounded-lg border overflow-hidden">
          <MonthView today={today} current={current} drafts={drafts} />
        </div>
      )}
      {view === 'week' && (
        <WeekView today={today} current={current} drafts={drafts} />
      )}
      {view === 'agenda' && <AgendaView drafts={drafts} />}

      {drafts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-2">
          <CalendarDays className="h-8 w-8 opacity-40" />
          <p className="text-sm">No scheduled posts yet. Approve a draft and schedule it to see it here.</p>
        </div>
      )}
    </div>
  )
}
