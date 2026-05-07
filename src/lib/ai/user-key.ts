import { db, aiProviderAccounts } from '@/db'
import { and, eq } from 'drizzle-orm'
import { decrypt } from '@/lib/encrypt'

export async function getUserAIKey(
  userId: string,
  provider: 'anthropic' | 'openai'
): Promise<string | null> {
  const [account] = await db
    .select({ encryptedApiKey: aiProviderAccounts.encryptedApiKey })
    .from(aiProviderAccounts)
    .where(
      and(
        eq(aiProviderAccounts.userId, userId),
        eq(aiProviderAccounts.provider, provider),
        eq(aiProviderAccounts.isActive, true)
      )
    )
  if (!account) return null
  return decrypt(account.encryptedApiKey)
}

export const NO_ANTHROPIC_KEY_ERROR =
  'No Anthropic API key found. Go to Settings → AI Providers to add your key. ' +
  'Get one at https://console.anthropic.com/settings/keys'

export const NO_OPENAI_KEY_ERROR =
  'No OpenAI API key found. Go to Settings → AI Providers to add your key. ' +
  'Get one at https://platform.openai.com/api-keys'
