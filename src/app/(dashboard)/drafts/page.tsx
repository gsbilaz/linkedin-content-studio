import type { Metadata } from 'next'
import Link from 'next/link'
import { PlusCircle, FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Drafts' }

// Phase 1: empty state — data fetching added in Phase 2
export default function DraftsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Drafts</h2>
          <p className="text-muted-foreground">Review and approve LinkedIn posts</p>
        </div>
        <Button asChild>
          <Link href="/new-content">
            <PlusCircle />
            New Content
          </Link>
        </Button>
      </div>

      {/* Status filter pills — wired up in Phase 2 */}
      <div className="flex gap-2 flex-wrap">
        {(['All', 'Draft', 'Approved', 'Scheduled', 'Published'] as const).map((status) => (
          <Badge
            key={status}
            variant={status === 'All' ? 'default' : 'outline'}
            className="cursor-pointer"
          >
            {status}
          </Badge>
        ))}
      </div>

      {/* Empty state */}
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="font-medium text-muted-foreground">No drafts yet</p>
          <p className="mb-4 text-sm text-muted-foreground">
            Your AI-generated drafts will appear here
          </p>
          <Button asChild>
            <Link href="/new-content">
              <PlusCircle />
              Submit your first content idea
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
