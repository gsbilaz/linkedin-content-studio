import type { Metadata } from 'next'
import { Pen, Plus, Sparkles } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Writing Style' }

export default function WritingStylePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Writing Style</h2>
          <p className="text-muted-foreground">
            Train the AI to write in your voice
          </p>
        </div>
        <Button>
          <Plus />
          Add Sample
        </Button>
      </div>

      {/* Style Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Style Profile</CardTitle>
            <Badge variant="secondary">Not generated</Badge>
          </div>
          <CardDescription>
            Add at least 3 writing samples so we can generate your personalised style profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" disabled>
            <Sparkles />
            Generate Style Profile
          </Button>
        </CardContent>
      </Card>

      {/* Writing Samples */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">Writing Samples</h3>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Pen className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium text-muted-foreground">No writing samples yet</p>
            <p className="mb-4 text-sm text-muted-foreground">
              Add examples of your best LinkedIn posts or writing to teach the AI your style
            </p>
            <Button>
              <Plus />
              Add your first sample
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
