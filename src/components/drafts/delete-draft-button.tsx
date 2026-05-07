'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export function DeleteDraftButton({ id }: { id: string }) {
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Delete this draft? This cannot be undone.')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/drafts/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? 'Failed to delete')
        return
      }
      toast.success('Draft deleted')
      router.refresh()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      onClick={handleDelete}
      disabled={deleting}
      aria-label="Delete draft"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
