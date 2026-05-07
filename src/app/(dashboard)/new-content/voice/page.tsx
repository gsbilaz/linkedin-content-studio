import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VoiceRecorder } from '@/components/new-content/voice-recorder'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export const metadata: Metadata = { title: 'New Content — Voice Recording' }

export default function NewContentVoicePage() {
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
          <h2 className="text-2xl font-bold tracking-tight">Voice Recording</h2>
          <p className="text-muted-foreground text-sm">
            Record directly in your browser — Claude will transcribe and draft your post
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Record Your Idea</CardTitle>
          <CardDescription>
            Speak naturally. Your recording is transcribed by Whisper, then Claude turns it into a
            polished LinkedIn post matching your writing style.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VoiceRecorder />
        </CardContent>
      </Card>
    </div>
  )
}
