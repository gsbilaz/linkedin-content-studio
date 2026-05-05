import { anthropicProvider } from './anthropic'
import type { AIProvider, GenerateDraftInput, GenerateDraftResult } from './types'

export function getAIProvider(): AIProvider {
  // Future: check user settings and return openaiProvider as fallback
  return anthropicProvider
}

export async function generateLinkedInDraft(
  input: GenerateDraftInput
): Promise<GenerateDraftResult> {
  return getAIProvider().generateLinkedInDraft(input)
}

export type { AIProvider, GenerateDraftInput, GenerateDraftResult }
