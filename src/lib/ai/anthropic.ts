import Anthropic from '@anthropic-ai/sdk'
import type { AIProvider, GenerateDraftInput, GenerateDraftResult } from './types'

const MODEL = 'claude-sonnet-4-6'

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured. Add it to your .env.local file.')
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

function parseJson<T>(text: string): T {
  // Handle direct JSON or JSON wrapped in markdown code blocks
  try {
    return JSON.parse(text) as T
  } catch {
    const inBlock = text.match(/```(?:json)?\s*(\{[\s\S]*?\}|\[[\s\S]*?\])\s*```/)
    const inline = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
    const raw = inBlock?.[1] ?? inline?.[1]
    if (!raw) throw new Error('Could not extract JSON from Claude response')
    return JSON.parse(raw) as T
  }
}

const LINKEDIN_SYSTEM_PROMPT = `You are an expert LinkedIn content writer. You transform raw ideas, notes, and drafts into polished, high-performing LinkedIn posts.

LinkedIn post guidelines:
- Hook: Start with a compelling first line — a bold statement, surprising fact, or relatable observation
- Length: 150–300 words is ideal (aim for under 1,300 characters for best algorithmic reach)
- Format: Short paragraphs of 1–3 lines, blank lines between paragraphs, easy to read on mobile
- Voice: Professional but conversational, authentic first person — sounds human, not corporate
- Ending: Close with a thought-provoking question or clear call to action
- Hashtags: 2–3 highly relevant hashtags at the very end, on their own line
- Avoid: "Excited to share", "humbled to announce", "thrilled", empty filler phrases, corporate jargon`

export const anthropicProvider: AIProvider = {
  async generateLinkedInDraft({
    rawContent,
    title,
    styleProfile,
  }: GenerateDraftInput): Promise<GenerateDraftResult> {
    const client = getClient()

    const system = styleProfile
      ? `${LINKEDIN_SYSTEM_PROMPT}\n\nUser's personal writing style — match this closely:\n${styleProfile}`
      : LINKEDIN_SYSTEM_PROMPT

    const userMessage = [
      title ? `Topic / Title: ${title}\n` : '',
      'Raw content to transform into a LinkedIn post:',
      rawContent,
      '',
      'Respond with ONLY a valid JSON object — no markdown, no explanation, no extra text:',
      '{',
      '  "suggestedTitle": "Short internal label for this draft",',
      '  "summary": "2–3 sentence summary of the core message",',
      '  "keyPoints": ["Key insight 1", "Key insight 2", "Key insight 3"],',
      '  "draft": "The complete LinkedIn post text, ready to publish"',
      '}',
    ]
      .filter(Boolean)
      .join('\n')

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system,
      messages: [{ role: 'user', content: userMessage }],
    })

    const block = response.content[0]
    if (block.type !== 'text') throw new Error('Unexpected response type from Claude')

    return parseJson<GenerateDraftResult>(block.text)
  },

  async summarizeContent(content: string): Promise<string> {
    const client = getClient()
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `Summarize the following content in 2–3 clear sentences:\n\n${content}`,
        },
      ],
    })
    const block = response.content[0]
    if (block.type !== 'text') throw new Error('Unexpected response type')
    return block.text
  },

  async extractKeyPoints(content: string): Promise<string[]> {
    const client = getClient()
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `Extract 3–5 key points from the following content. Return only a JSON array of strings, no other text:\n\n${content}`,
        },
      ],
    })
    const block = response.content[0]
    if (block.type !== 'text') throw new Error('Unexpected response type')
    return parseJson<string[]>(block.text)
  },

  async analyzeWritingStyle(samples: string[]): Promise<string> {
    const client = getClient()
    const combined = samples.join('\n\n---\n\n')
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Analyze the writing style across these LinkedIn post samples. Describe: tone, vocabulary level, sentence length, formatting preferences, how they open posts, how they close, and any recurring patterns.\n\nSamples:\n${combined}`,
        },
      ],
    })
    const block = response.content[0]
    if (block.type !== 'text') throw new Error('Unexpected response type')
    return block.text
  },

  async rewriteInUserStyle(draft: string, styleProfile: string): Promise<string> {
    const client = getClient()
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: `Rewrite the provided LinkedIn post draft to precisely match this writing style profile. Keep all the key ideas but change the voice, structure, and phrasing to match the style:\n\n${styleProfile}`,
      messages: [{ role: 'user', content: `Rewrite this draft:\n\n${draft}` }],
    })
    const block = response.content[0]
    if (block.type !== 'text') throw new Error('Unexpected response type')
    return block.text
  },

  async scoreDraftQuality(draft: string): Promise<number> {
    const client = getClient()
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 64,
      messages: [
        {
          role: 'user',
          content: `Score this LinkedIn post from 1–100 based on: hook strength, clarity, authenticity, engagement potential, and readability. Reply with only the integer score, nothing else:\n\n${draft}`,
        },
      ],
    })
    const block = response.content[0]
    if (block.type !== 'text') throw new Error('Unexpected response type')
    const score = parseInt(block.text.trim(), 10)
    return isNaN(score) ? 70 : Math.min(100, Math.max(1, score))
  },
}
