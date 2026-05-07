import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db, profiles } from '@/db'
import { eq } from 'drizzle-orm'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id))
  const userName = profile?.fullName ?? (user.user_metadata?.full_name as string | undefined)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r bg-background">
        <Sidebar userEmail={user.email} userName={userName} />
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userEmail={user.email} userName={userName} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
