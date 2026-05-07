import Anthropic from '@anthropic-ai/sdk'
import type { AIProvider, GenerateDraftInput, GenerateDraftResult, MultipleDraftResult } from './types'

const MODEL = 'claude-sonnet-4-6'

function getClient(apiKey?: string): Anthropic {
  if (!apiKey) {
    throw new Error('No Anthropic API key. Add your key in Settings → AI Providers.')
  }
  return new Anthropic({ apiKey })
}

function parseJson<T>(text: string): T {
  // 1. Try direct parse first (clean response)
  try {
    return JSON.parse(text) as T
  } catch {
    // fall through
  }
  // 2. Strip markdown code block and try again
  const inBlock = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/)
  if (inBlock?.[1]) {
    try {
      return JSON.parse(inBlock[1]) as T
    } catch {
      // fall through
    }
  }
  // 3. Extract array first, then object (array must be tried before object
  //    because the object pattern would greedily match the inner objects of
  //    an array, stripping the surrounding brackets)
  const array = text.match(/\[[\s\S]*\]/)
  if (array?.[0]) {
    try {
      return JSON.parse(array[0]) as T
    } catch {
      // fall through
    }
  }
  const obj = text.match(/\{[\s\S]*\}/)
  if (obj?.[0]) {
    return JSON.parse(obj[0]) as T
  }
  throw new Error(`Could not extract JSON from Claude response. Raw: ${text.slice(0, 300)}`)
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
    apiKey,
  }: GenerateDraftInput): Promise<GenerateDraftResult> {
    const client = getClient(apiKey)

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

  async generateMultipleDrafts({
    rawContent,
    styleProfile,
    apiKey,
  }: GenerateDraftInput): Promise<MultipleDraftResult[]> {
    const client = getClient(apiKey)

    const system = styleProfile
      ? `${LINKEDIN_SYSTEM_PROMPT}\n\nUser's personal writing style — match this closely:\n${styleProfile}`
      : LINKEDIN_SYSTEM_PROMPT

    const userMessage = [
      'Analyze this content and identify the distinct themes, concepts, or angles that each deserve their own standalone LinkedIn post.',
      '',
      'Rules:',
      '- Each post must stand completely alone — no cross-references to the other posts',
      '- Only create posts for genuinely distinct themes — typically 2–5 posts',
      '- Do not create posts that overlap significantly in message or angle',
      '- Quality over quantity: fewer strong posts beat many weak ones',
      '- Each post must follow all LinkedIn best practices (hook, short paragraphs, CTA, 2–3 hashtags)',
      '',
      'Content to analyze:',
      rawContent,
      '',
      'Respond with ONLY a valid JSON array — no markdown, no explanation, no extra text:',
      '[',
      '  {',
      '    "title": "Short internal label for this draft (5–8 words)",',
      '    "content": "The complete LinkedIn post text, ready to publish"',
      '  }',
      ']',
    ].join('\n')

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system,
      messages: [{ role: 'user', content: userMessage }],
    })

    const block = response.content[0]
    if (block.type !== 'text') throw new Error('Unexpected response type from Claude')

    const parsed = parseJson<MultipleDraftResult[] | MultipleDraftResult>(block.text)
    // Claude occasionally returns a single object instead of a one-item array
    const drafts: MultipleDraftResult[] = Array.isArray(parsed) ? parsed : [parsed]
    if (drafts.length === 0) {
      throw new Error('Claude did not return any drafts')
    }
    return drafts
  },

  async summarizeContent(content: string, apiKey?: string): Promise<string> {
    const client = getClient(apiKey)
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

  async extractKeyPoints(content: string, apiKey?: string): Promise<string[]> {
    const client = getClient(apiKey)
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

  async analyzeWritingStyle(samples: string[], apiKey?: string): Promise<string> {
    const client = getClient(apiKey)
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

  async rewriteInUserStyle(draft: string, styleProfile: string, apiKey?: string): Promise<string> {
    const client = getClient(apiKey)
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

  async scoreDraftQuality(draft: string, apiKey?: string): Promise<number> {
    const client = getClient(apiKey)
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
