import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TextInputForm } from '@/components/content/text-input-form'

export const metadata: Metadata = { title: 'New Content — Text' }

export default function NewContentTextPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/new-content">
            <ArrowLeft />
            Back
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Text / Notes</h2>
          <p className="text-muted-foreground text-sm">
            Paste anything — Claude will shape it into a LinkedIn post
          </p>
        </div>
      </div>

      <TextInputForm />
    </div>
  )
}
