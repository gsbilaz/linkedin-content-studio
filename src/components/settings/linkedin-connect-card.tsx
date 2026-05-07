'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Linkedin, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Connection {
  profileName: string | null
  profilePictureUrl: string | null
  tokenExpiresAt: string | null
}

interface LinkedInConnectCardProps {
  connection: Connection | null
  statusMessage: string | null
}

export function LinkedInConnectCard({ connection, statusMessage }: LinkedInConnectCardProps) {
  const router = useRouter()
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    if (statusMessage === 'connected') toast.success('LinkedIn connected successfully')
    if (statusMessage === 'denied') toast.error('LinkedIn authorization was denied')
    if (statusMessage === 'error') toast.error('Failed to connect LinkedIn — please try again')
  }, [statusMessage])

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      const res = await fetch('/api/linkedin/disconnect', { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('LinkedIn disconnected')
      router.refresh()
    } catch {
      toast.error('Failed to disconnect')
    } finally {
      setDisconnecting(false)
    }
  }

  const isExpired =
    connection?.tokenExpiresAt && new Date(connection.tokenExpiresAt) < new Date()

  if (!connection) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Badge variant="outline">Not connected</Badge>
          <span className="text-sm text-muted-foreground">
            Connect to publish posts directly from the app
          </span>
        </div>
        <Button asChild>
          <a href="/api/auth/linkedin">
            <Linkedin className="mr-2 h-4 w-4" />
            Connect LinkedIn
          </a>
        </Button>
        <p className="text-xs text-muted-foreground">
          You can still copy approved posts and publish manually without connecting.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {connection.profilePictureUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={connection.profilePictureUrl}
            alt=""
            className="h-8 w-8 rounded-full object-cover"
          />
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium">{connection.profileName ?? 'LinkedIn Account'}</p>
          {isExpired ? (
            <p className="text-xs text-destructive">Token expired — reconnect to keep publishing</p>
          ) : connection.tokenExpiresAt ? (
            <p className="text-xs text-muted-foreground">
              Token expires {new Date(connection.tokenExpiresAt).toLocaleDateString()}
            </p>
          ) : null}
        </div>
        <Badge variant={isExpired ? 'destructive' : 'success'} className="ml-auto shrink-0">
          {isExpired ? 'Expired' : 'Connected'}
        </Badge>
      </div>
      <div className="flex gap-2">
        {isExpired && (
          <Button asChild size="sm">
            <a href="/api/auth/linkedin">
              <Linkedin className="mr-2 h-4 w-4" />
              Reconnect
            </a>
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleDisconnect}
          disabled={disconnecting}
        >
          {disconnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Disconnect
        </Button>
      </div>
    </div>
  )
}
