import type { Metadata } from 'next'
import Link from 'next/link'
import { PlusCircle, FileText, Pen, Calendar } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Dashboard' }

const statCards = [
  { label: 'Total Drafts', value: '0', description: 'Posts created' },
  { label: 'Published', value: '0', description: 'Posts live on LinkedIn' },
  { label: 'Scheduled', value: '0', description: 'Upcoming posts' },
  { label: 'Writing Samples', value: '0', description: 'Style training data' },
]

const quickActions = [
  {
    href: '/new-content',
    icon: PlusCircle,
    label: 'New Content',
    description: 'Submit an idea, recording, or file',
  },
  {
    href: '/writing-style',
    icon: Pen,
    label: 'Train Writing Style',
    description: 'Add samples to personalise AI drafts',
  },
  {
    href: '/drafts',
    icon: FileText,
    label: 'Review Drafts',
    description: 'Edit and approve pending posts',
  },
  {
    href: '/calendar',
    icon: Calendar,
    label: 'View Calendar',
    description: 'Manage your publishing schedule',
  },
]

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Your LinkedIn content overview</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-3xl">{stat.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">Quick Actions</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {quickActions.map(({ href, icon: Icon, label, description }) => (
            <Link key={href} href={href}>
              <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                <CardContent className="flex items-start gap-4 pt-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">Recent Drafts</h3>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium text-muted-foreground">No drafts yet</p>
            <p className="mb-4 text-sm text-muted-foreground">
              Submit your first content idea to get started
            </p>
            <Button asChild>
              <Link href="/new-content">
                <PlusCircle />
                New Content
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
