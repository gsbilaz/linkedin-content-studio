'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'

interface GenerateProfileButtonProps {
  canGenerate: boolean
  hasProfile: boolean
  onSuccess: () => void
}

export function GenerateProfileButton({ canGenerate, hasProfile, onSuccess }: GenerateProfileButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    try {
      const res = await fetch('/api/writing-style/generate-profile', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to generate style profile')
        return
      }
      toast.success(hasProfile ? 'Style profile updated!' : 'Style profile generated!')
      onSuccess()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" disabled={!canGenerate || loading} onClick={handleGenerate}>
      <Sparkles className="mr-2 h-4 w-4" />
      {loading
        ? (hasProfile ? 'Regenerating…' : 'Generating…')
        : (hasProfile ? 'Regenerate Style Profile' : 'Generate Style Profile')}
    </Button>
  )
}
