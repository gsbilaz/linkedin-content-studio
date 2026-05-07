import { anthropicProvider } from './anthropic'
import type { AIProvider, GenerateDraftInput, GenerateDraftResult, MultipleDraftResult } from './types'

export function getAIProvider(): AIProvider {
  return anthropicProvider
}

export async function generateLinkedInDraft(
  input: GenerateDraftInput
): Promise<GenerateDraftResult> {
  return getAIProvider().generateLinkedInDraft(input)
}

export async function generateMultipleDrafts(
  input: GenerateDraftInput
): Promise<MultipleDraftResult[]> {
  return getAIProvider().generateMultipleDrafts(input)
}

export type { AIProvider, GenerateDraftInput, GenerateDraftResult, MultipleDraftResult }
