'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, Download, Share } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'pwa-install-dismissed'

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOSHint, setShowIOSHint] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Already installed as standalone app
    if (window.matchMedia('(display-mode: standalone)').matches) return
    // User previously dismissed
    if (localStorage.getItem(DISMISSED_KEY)) return

    // iOS Safari — no beforeinstallprompt, show manual instructions instead
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    if (isIOS && isSafari) {
      setShowIOSHint(true)
      setVisible(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    setVisible(false)
    localStorage.setItem(DISMISSED_KEY, '1')
  }

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setVisible(false)
      setDeferredPrompt(null)
    }
  }

  if (!visible) return null

  if (showIOSHint) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 rounded-lg border bg-background p-4 shadow-lg sm:left-auto sm:right-4 sm:w-80">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Share className="h-5 w-5 shrink-0 text-primary" />
            <p className="text-sm font-medium">Install this app</p>
          </div>
          <button onClick={dismiss} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Tap the <strong>Share</strong> button in Safari, then choose{' '}
          <strong>Add to Home Screen</strong> to install.
        </p>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex items-center gap-3 rounded-lg border bg-background p-4 shadow-lg sm:left-auto sm:right-4 sm:w-80">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Download className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Install the app</p>
        <p className="text-xs text-muted-foreground">Add to your home screen for quick access</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button size="sm" onClick={handleInstall}>
          Install
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={dismiss}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
