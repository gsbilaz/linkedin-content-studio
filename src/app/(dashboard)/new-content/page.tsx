import type { Metadata } from 'next'
import { FileText, Mic, Video, FileUp, Link2, Image, Headphones } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'New Content' }

const inputTypes = [
  {
    icon: FileText,
    label: 'Text / Notes',
    description: 'Paste raw notes, talking points, or a rough draft',
    status: 'available' as const,
  },
  {
    icon: Headphones,
    label: 'Audio Upload',
    description: 'Upload an MP3, M4A, or WAV file for transcription',
    status: 'coming-soon' as const,
  },
  {
    icon: Video,
    label: 'Video Upload',
    description: 'Upload a video and extract key talking points',
    status: 'coming-soon' as const,
  },
  {
    icon: FileUp,
    label: 'Document',
    description: 'Upload a PDF, DOCX, or TXT file',
    status: 'coming-soon' as const,
  },
  {
    icon: Link2,
    label: 'Link / URL',
    description: 'Submit an article or webpage to summarise',
    status: 'coming-soon' as const,
  },
  {
    icon: Image,
    label: 'Image',
    description: 'Upload a screenshot or image with text',
    status: 'coming-soon' as const,
  },
  {
    icon: Mic,
    label: 'Voice Recording',
    description: 'Record directly in the app on mobile or desktop',
    status: 'coming-soon' as const,
  },
]

export default function NewContentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">New Content</h2>
        <p className="text-muted-foreground">
          Choose how you want to submit your content idea
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {inputTypes.map(({ icon: Icon, label, description, status }) => (
          <Card
            key={label}
            className={
              status === 'available'
                ? 'cursor-pointer transition-shadow hover:shadow-md'
                : 'opacity-60'
            }
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                {status === 'coming-soon' && (
                  <Badge variant="secondary" className="text-xs">
                    Coming soon
                  </Badge>
                )}
              </div>
              <CardTitle className="text-base">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
