import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LinkInputForm } from '@/components/new-content/link-input-form'

export const metadata: Metadata = { title: 'Submit Link' }

export default function LinkPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/new-content">
          <ArrowLeft className="mr-1 h-4 w-4" />
          New Content
        </Link>
      </Button>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Submit a Link</h2>
        <p className="text-muted-foreground">
          Paste an article or blog post URL — the content is fetched and turned into a LinkedIn post
        </p>
      </div>

      <LinkInputForm />
    </div>
  )
}
