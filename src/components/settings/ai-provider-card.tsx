'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, ExternalLink, Trash2 } from 'lucide-react'

interface ConnectedProvider {
  provider: 'anthropic' | 'openai'
  createdAt: string
}

interface ProviderRowProps {
  provider: 'anthropic' | 'openai'
  label: string
  description: string
  keyPlaceholder: string
  docsUrl: string
  docsLabel: string
  connected: boolean
  connectedAt: string | null
  onSaved: () => void
  onRemoved: () => void
}

function ProviderRow({
  provider,
  label,
  description,
  keyPlaceholder,
  docsUrl,
  docsLabel,
  connected,
  connectedAt,
  onSaved,
  onRemoved,
}: ProviderRowProps) {
  const [editing, setEditing] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)

  async function handleSave() {
    if (!apiKey.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/ai-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey: apiKey.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')
      toast.success(`${label} key saved`)
      setApiKey('')
      setEditing(false)
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save key')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    setRemoving(true)
    try {
      const res = await fetch(`/api/ai-keys?provider=${provider}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success(`${label} key removed`)
      onRemoved()
    } catch {
      toast.error('Failed to remove key')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{label}</p>
            {connected ? (
              <Badge variant="success" className="text-xs">Connected</Badge>
            ) : (
              <Badge variant="outline" className="text-xs">Not connected</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          {connected && connectedAt && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Added {new Date(connectedAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <a
          href={docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 shrink-0"
        >
          <ExternalLink className="h-3 w-3" />
          {docsLabel}
        </a>
      </div>

      {!connected && !editing && (
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
          Add API Key
        </Button>
      )}

      {connected && !editing && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            Replace Key
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRemove}
            disabled={removing}
            className="text-destructive hover:text-destructive"
          >
            {removing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}

      {editing && (
        <div className="space-y-2">
          <div className="relative">
            <Input
              type={showKey ? 'text' : 'password'}
              placeholder={keyPlaceholder}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              className="pr-10"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={!apiKey.trim() || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setEditing(false); setApiKey('') }}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

interface AIProviderCardProps {
  connectedProviders: ConnectedProvider[]
}

export function AIProviderCard({ connectedProviders }: AIProviderCardProps) {
  const router = useRouter()
  const [providers, setProviders] = useState<ConnectedProvider[]>(connectedProviders)

  function isConnected(p: 'anthropic' | 'openai') {
    return providers.some((c) => c.provider === p)
  }

  function getConnectedAt(p: 'anthropic' | 'openai') {
    return providers.find((c) => c.provider === p)?.createdAt ?? null
  }

  function handleSaved(p: 'anthropic' | 'openai') {
    if (!isConnected(p)) {
      setProviders((prev) => [...prev, { provider: p, createdAt: new Date().toISOString() }])
    }
    router.refresh()
  }

  function handleRemoved(p: 'anthropic' | 'openai') {
    setProviders((prev) => prev.filter((c) => c.provider !== p))
    router.refresh()
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Your API keys are encrypted and stored securely. They are only used for your account.
      </p>
      <ProviderRow
        provider="anthropic"
        label="Anthropic (Claude)"
        description="Used for draft generation, writing style analysis, and rewriting"
        keyPlaceholder="sk-ant-..."
        docsUrl="https://console.anthropic.com/settings/keys"
        docsLabel="Get key"
        connected={isConnected('anthropic')}
        connectedAt={getConnectedAt('anthropic')}
        onSaved={() => handleSaved('anthropic')}
        onRemoved={() => handleRemoved('anthropic')}
      />
      <ProviderRow
        provider="openai"
        label="OpenAI (Whisper)"
        description="Used for audio and video transcription"
        keyPlaceholder="sk-..."
        docsUrl="https://platform.openai.com/api-keys"
        docsLabel="Get key"
        connected={isConnected('openai')}
        connectedAt={getConnectedAt('openai')}
        onSaved={() => handleSaved('openai')}
        onRemoved={() => handleRemoved('openai')}
      />
    </div>
  )
}
