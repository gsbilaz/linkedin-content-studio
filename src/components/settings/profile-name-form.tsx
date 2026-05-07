'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Pencil, Check, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ProfileNameFormProps {
  initialName: string | null
  email: string | null | undefined
}

export function ProfileNameForm({ initialName, email }: ProfileNameFormProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(initialName ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) {
      toast.error('Name cannot be empty')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')
      toast.success('Name updated')
      setEditing(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setName(initialName ?? '')
    setEditing(false)
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-1">
        <p className="text-sm font-medium">Email</p>
        <p className="text-sm text-muted-foreground">{email}</p>
      </div>
      <div className="grid gap-1.5">
        <p className="text-sm font-medium">Display Name</p>
        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') handleCancel()
              }}
              className="h-8 max-w-xs"
              autoFocus
            />
            <Button size="icon" className="h-8 w-8" onClick={handleSave} disabled={saving}>
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancel} disabled={saving}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">{initialName || '—'}</p>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
