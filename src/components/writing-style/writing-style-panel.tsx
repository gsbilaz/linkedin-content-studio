'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Pen } from 'lucide-react'
import { AddSampleForm } from './add-sample-form'
import { SampleCard } from './sample-card'
import { GenerateProfileButton } from './generate-profile-button'

const MIN_SAMPLES = 3

interface Sample {
  id: string
  title: string | null
  content: string
  createdAt: string | Date
}

interface StyleProfile {
  id: string
  version: number
  profileData: { analysis: string; generatedFromSamples: number }
  createdAt: string | Date
}

interface WritingStylePanelProps {
  initialSamples: Sample[]
  initialProfile: StyleProfile | null
}

export function WritingStylePanel({ initialSamples, initialProfile }: WritingStylePanelProps) {
  const [samples, setSamples] = useState<Sample[]>(initialSamples)
  const [profile, setProfile] = useState<StyleProfile | null>(initialProfile)
  const [showForm, setShowForm] = useState(false)

  const refreshSamples = useCallback(async () => {
    const res = await fetch('/api/writing-style/samples')
    if (res.ok) {
      const data = await res.json()
      setSamples(data.samples ?? [])
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    const res = await fetch('/api/writing-style/profile')
    if (res.ok) {
      const data = await res.json()
      setProfile(data.profile ?? null)
    }
  }, [])

  const handleSampleAdded = useCallback(() => {
    setShowForm(false)
    refreshSamples()
  }, [refreshSamples])

  const handleSampleUpdated = useCallback((updated: Sample) => {
    setSamples((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
  }, [])

  const handleSampleDeleted = useCallback(() => {
    refreshSamples()
  }, [refreshSamples])

  const canGenerate = samples.length >= MIN_SAMPLES
  const needed = Math.max(0, MIN_SAMPLES - samples.length)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Writing Style</h2>
          <p className="text-muted-foreground">Train the AI to write in your voice</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Sample
          </Button>
        )}
      </div>

      {showForm && (
        <AddSampleForm onSuccess={handleSampleAdded} onCancel={() => setShowForm(false)} />
      )}

      {/* Style Profile card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Style Profile</CardTitle>
            {profile ? (
              <Badge variant="secondary">v{profile.version} — active</Badge>
            ) : (
              <Badge variant="outline">Not generated</Badge>
            )}
          </div>
          {profile ? (
            <CardDescription>
              Generated from {profile.profileData.generatedFromSamples} sample
              {profile.profileData.generatedFromSamples !== 1 ? 's' : ''}.
              {samples.length > profile.profileData.generatedFromSamples
                ? ` You have added ${samples.length - profile.profileData.generatedFromSamples} more since — regenerate to update.`
                : ' Regenerate any time after adding more samples.'}
            </CardDescription>
          ) : (
            <CardDescription>
              {needed > 0
                ? `Add ${needed} more writing sample${needed !== 1 ? 's' : ''} to generate your style profile (${samples.length} of ${MIN_SAMPLES} needed).`
                : 'You have enough samples — generate your style profile below.'}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {profile && (
            <div className="rounded-md bg-muted px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed">
              {profile.profileData.analysis}
            </div>
          )}
          <GenerateProfileButton
            canGenerate={canGenerate}
            hasProfile={profile !== null}
            onSuccess={refreshProfile}
          />
        </CardContent>
      </Card>

      {/* Writing Samples */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">
          Writing Samples{' '}
          <span className="text-sm font-normal text-muted-foreground">({samples.length})</span>
        </h3>
        {samples.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Pen className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-medium text-muted-foreground">No writing samples yet</p>
              <p className="mb-4 text-sm text-muted-foreground">
                Add examples of your best LinkedIn posts to teach the AI your voice. You need at least {MIN_SAMPLES}.
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add your first sample
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {samples.map((s) => (
              <SampleCard
                key={s.id}
                sample={s}
                onDeleted={handleSampleDeleted}
                onUpdated={handleSampleUpdated}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
