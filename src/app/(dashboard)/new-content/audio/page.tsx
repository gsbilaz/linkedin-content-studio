import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AudioUploadForm } from '@/components/new-content/audio-upload-form'

export const metadata: Metadata = { title: 'New Content — Audio / Video' }

export default function NewContentAudioPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/new-content">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Audio / Video Upload</h2>
          <p className="text-muted-foreground text-sm">
            Upload a recording — Whisper will transcribe it, then Claude shapes it into a post
          </p>
        </div>
      </div>

      <AudioUploadForm />
    </div>
  )
}
