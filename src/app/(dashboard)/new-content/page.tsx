import type { Metadata } from 'next'
import Link from 'next/link'
import { FileText, Mic, Video, FileUp, Link2, Image, Headphones } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'New Content' }

const inputTypes = [
  {
    href: '/new-content/text',
    icon: FileText,
    label: 'Text / Notes',
    description: 'Paste raw notes, talking points, or a rough draft',
    status: 'available' as const,
  },
  {
    href: '/new-content/audio',
    icon: Headphones,
    label: 'Audio Upload',
    description: 'Upload an MP3, M4A, WAV, or WebM file for transcription',
    status: 'available' as const,
  },
  {
    href: '/new-content/audio',
    icon: Video,
    label: 'Video Upload',
    description: 'Upload an MP4 or WebM video — audio is extracted and transcribed',
    status: 'available' as const,
  },
  {
    href: '/new-content/document',
    icon: FileUp,
    label: 'Document',
    description: 'Upload a PDF, DOCX, DOC, or TXT file',
    status: 'available' as const,
  },
  {
    href: '/new-content/link',
    icon: Link2,
    label: 'Link / URL',
    description: 'Submit an article or webpage URL to summarise',
    status: 'available' as const,
  },
  {
    href: null,
    icon: Image,
    label: 'Image',
    description: 'Upload a screenshot or image with text',
    status: 'coming-soon' as const,
  },
  {
    href: '/new-content/voice',
    icon: Mic,
    label: 'Voice Recording',
    description: 'Record directly in the app on mobile or desktop',
    status: 'available' as const,
  },
]

export default function NewContentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">New Content</h2>
        <p className="text-muted-foreground">Choose how you want to submit your content idea</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {inputTypes.map(({ href, icon: Icon, label, description, status }) => {
          const card = (
            <Card
              className={
                status === 'available'
                  ? 'h-full cursor-pointer transition-shadow hover:shadow-md'
                  : 'h-full opacity-60'
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
          )

          return href ? (
            <Link key={label} href={href}>
              {card}
            </Link>
          ) : (
            <div key={label}>{card}</div>
          )
        })}
      </div>
    </div>
  )
}
