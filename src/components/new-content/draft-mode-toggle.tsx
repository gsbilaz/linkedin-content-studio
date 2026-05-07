'use client'

import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Layers, FileText } from 'lucide-react'

interface DraftModeToggleProps {
  value: 'single' | 'multiple'
  onChange: (value: 'single' | 'multiple') => void
  disabled?: boolean
}

export function DraftModeToggle({ value, onChange, disabled }: DraftModeToggleProps) {
  const isMultiple = value === 'multiple'

  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
        {isMultiple ? (
          <Layers className="h-4 w-4 text-primary" />
        ) : (
          <FileText className="h-4 w-4 text-primary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="draft-mode-switch" className="font-medium cursor-pointer">
            {isMultiple ? 'Multiple drafts' : 'Single draft'}
          </Label>
          <Switch
            id="draft-mode-switch"
            checked={isMultiple}
            onCheckedChange={(checked: boolean) => onChange(checked ? 'multiple' : 'single')}
            disabled={disabled}
          />
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {isMultiple
            ? 'Claude will identify distinct themes and write a separate post for each one'
            : 'Claude will write one LinkedIn post from your content'}
        </p>
      </div>
    </div>
  )
}
