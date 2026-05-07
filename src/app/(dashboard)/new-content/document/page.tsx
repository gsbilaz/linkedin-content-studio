import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { DocumentUploadForm } from '@/components/new-content/document-upload-form'

export const metadata: Metadata = { title: 'Upload Document' }

export default function DocumentPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/new-content">
          <ArrowLeft className="mr-1 h-4 w-4" />
          New Content
        </Link>
      </Button>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Upload Document</h2>
        <p className="text-muted-foreground">
          Upload a PDF, Word document, or text file — the text is extracted and turned into a LinkedIn post
        </p>
      </div>

      <DocumentUploadForm />
    </div>
  )
}
