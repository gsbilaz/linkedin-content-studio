'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface CopyButtonProps {
  text: string
  size?: 'default' | 'sm' | 'lg'
}

export function CopyButton({ text, size = 'default' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Copied to clipboard — ready to paste into LinkedIn!')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error('Copy failed — please select the text and copy manually')
    }
  }

  return (
    <Button variant={copied ? 'outline' : 'default'} size={size} onClick={handleCopy}>
      {copied ? <Check /> : <Copy />}
      {copied ? 'Copied!' : 'Copy Post'}
    </Button>
  )
}
