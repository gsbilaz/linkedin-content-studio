import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { db, profiles, linkedinAccounts, aiProviderAccounts } from '@/db'
import { and, eq } from 'drizzle-orm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Linkedin, Key, User } from 'lucide-react'
import { ProfileNameForm } from '@/components/settings/profile-name-form'
import { LinkedInConnectCard } from '@/components/settings/linkedin-connect-card'
import { AIProviderCard } from '@/components/settings/ai-provider-card'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ linkedin?: string }>
}) {
  const { linkedin } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [profile, linkedInConnection, aiProviders] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.id, user!.id)).then((r) => r[0] ?? null),
    db
      .select({
        profileName: linkedinAccounts.profileName,
        profilePictureUrl: linkedinAccounts.profilePictureUrl,
        tokenExpiresAt: linkedinAccounts.tokenExpiresAt,
      })
      .from(linkedinAccounts)
      .where(and(eq(linkedinAccounts.userId, user!.id), eq(linkedinAccounts.isActive, true)))
      .then((r) => r[0] ?? null),
    db
      .select({ provider: aiProviderAccounts.provider, createdAt: aiProviderAccounts.createdAt })
      .from(aiProviderAccounts)
      .where(and(eq(aiProviderAccounts.userId, user!.id), eq(aiProviderAccounts.isActive, true))),
  ])

  const connection = linkedInConnection
    ? {
        profileName: linkedInConnection.profileName,
        profilePictureUrl: linkedInConnection.profilePictureUrl,
        tokenExpiresAt: linkedInConnection.tokenExpiresAt?.toISOString() ?? null,
      }
    : null

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
        <CardContent>
          <ProfileNameForm
            initialName={profile?.fullName ?? null}
            email={user?.email}
          />
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
            Connect your LinkedIn account to publish posts directly from the app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LinkedInConnectCard
            connection={connection}
            statusMessage={linkedin ?? null}
          />
        </CardContent>
      </Card>

      <Separator />

      {/* AI Providers */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            <CardTitle className="text-base">AI Providers</CardTitle>
          </div>
          <CardDescription>
            Add your own API keys — each key is encrypted and only used for your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AIProviderCard
            connectedProviders={aiProviders.map((p) => ({
              provider: p.provider,
              createdAt: p.createdAt.toISOString(),
            }))}
          />
        </CardContent>
      </Card>
    </div>
  )
}
