import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { and, asc, eq } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { db, postDrafts, linkedinAccounts } from '@/db'
import { DraftEditorClient } from '@/components/drafts/draft-editor-client'
import type { GroupContext } from '@/components/drafts/draft-group-nav'

export const metadata: Metadata = { title: 'Edit Draft' }

export default async function DraftDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [[draft], linkedIn] = await Promise.all([
    db
      .select()
      .from(postDrafts)
      .where(and(eq(postDrafts.id, id), eq(postDrafts.userId, user!.id))),
    db
      .select({ id: linkedinAccounts.id, tokenExpiresAt: linkedinAccounts.tokenExpiresAt })
      .from(linkedinAccounts)
      .where(and(eq(linkedinAccounts.userId, user!.id), eq(linkedinAccounts.isActive, true)))
      .then((r) => r[0] ?? null),
  ])

  if (!draft) notFound()

  const linkedInConnected =
    !!linkedIn && (!linkedIn.tokenExpiresAt || new Date(linkedIn.tokenExpiresAt) > new Date())

  let groupContext: GroupContext | undefined

  if (draft.groupId) {
    const siblings = await db
      .select({ id: postDrafts.id, groupOrder: postDrafts.groupOrder })
      .from(postDrafts)
      .where(and(eq(postDrafts.groupId, draft.groupId), eq(postDrafts.userId, user!.id)))
      .orderBy(asc(postDrafts.groupOrder))

    const position = siblings.findIndex((s) => s.id === id)
    if (position !== -1 && siblings.length > 1) {
      groupContext = {
        groupId: draft.groupId,
        position: position + 1,
        total: siblings.length,
        prevId: position > 0 ? siblings[position - 1].id : null,
        nextId: position < siblings.length - 1 ? siblings[position + 1].id : null,
      }
    }
  }

  return (
    <DraftEditorClient
      draft={{
        id: draft.id,
        title: draft.title,
        content: draft.content,
        status: draft.status as 'draft' | 'approved' | 'rejected' | 'scheduled' | 'ready' | 'published',
        scheduledAt: draft.scheduledAt?.toISOString() ?? null,
        createdAt: draft.createdAt.toISOString(),
      }}
      groupContext={groupContext}
      linkedInConnected={linkedInConnected}
    />
  )
}
