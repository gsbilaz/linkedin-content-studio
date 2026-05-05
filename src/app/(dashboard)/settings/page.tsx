import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Linkedin, Key, User } from 'lucide-react'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage your account and integrations</p>
      </div>

      {/* Account */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <CardTitle className="text-base">Account</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-1">
            <p className="text-sm font-medium">Email</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <div className="grid gap-1">
            <p className="text-sm font-medium">Name</p>
            <p className="text-sm text-muted-foreground">
              {user?.user_metadata?.full_name ?? '—'}
            </p>
          </div>
          <Button variant="outline" size="sm" disabled>
            Edit Profile
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* LinkedIn */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Linkedin className="h-4 w-4" />
            <CardTitle className="text-base">LinkedIn Connection</CardTitle>
          </div>
          <CardDescription>
            Connect your LinkedIn account to publish posts directly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant="outline">Not connected</Badge>
            <span className="text-sm text-muted-foreground">
              LinkedIn API access requires approval
            </span>
          </div>
          <Button variant="outline" size="sm" disabled>
            Connect LinkedIn
          </Button>
          <p className="text-xs text-muted-foreground">
            Even without a direct connection, you can copy approved posts and publish manually.
          </p>
        </CardContent>
      </Card>

      <Separator />

      {/* AI Providers */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            <CardTitle className="text-base">AI Provider Keys</CardTitle>
          </div>
          <CardDescription>
            Optionally supply your own API keys. The app uses Claude by default.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Anthropic (Claude)</p>
              <p className="text-xs text-muted-foreground">Default provider for drafting</p>
            </div>
            <Badge variant="secondary">System key</Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">OpenAI</p>
              <p className="text-xs text-muted-foreground">Used for transcription and fallback</p>
            </div>
            <Badge variant="secondary">System key</Badge>
          </div>
          <Button variant="outline" size="sm" disabled>
            Add Custom Key
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
