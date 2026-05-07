import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db, aiProviderAccounts } from '@/db'
import { and, eq } from 'drizzle-orm'
import { encrypt } from '@/lib/encrypt'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accounts = await db
    .select({
      provider: aiProviderAccounts.provider,
      createdAt: aiProviderAccounts.createdAt,
    })
    .from(aiProviderAccounts)
    .where(and(eq(aiProviderAccounts.userId, user.id), eq(aiProviderAccounts.isActive, true)))

  return NextResponse.json({ accounts })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { provider, apiKey } = body as { provider?: string; apiKey?: string }

  if (!provider || !['anthropic', 'openai'].includes(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
  }
  if (!apiKey?.trim()) {
    return NextResponse.json({ error: 'API key is required' }, { status: 400 })
  }

  const p = provider as 'anthropic' | 'openai'

  await db
    .delete(aiProviderAccounts)
    .where(and(eq(aiProviderAccounts.userId, user.id), eq(aiProviderAccounts.provider, p)))

  await db.insert(aiProviderAccounts).values({
    userId: user.id,
    provider: p,
    encryptedApiKey: encrypt(apiKey.trim()),
    isActive: true,
  })

  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const provider = searchParams.get('provider')

  if (!provider || !['anthropic', 'openai'].includes(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
  }

  await db
    .delete(aiProviderAccounts)
    .where(
      and(
        eq(aiProviderAccounts.userId, user.id),
        eq(aiProviderAccounts.provider, provider as 'anthropic' | 'openai')
      )
    )

  return NextResponse.json({ success: true })
}
