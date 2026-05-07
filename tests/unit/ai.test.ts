import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreate = vi.fn()

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}))

const MOCK_RESULT = {
  suggestedTitle: 'Test Draft Title',
  summary: 'This is a two sentence summary. It covers the main points.',
  keyPoints: ['First insight', 'Second insight', 'Third insight'],
  draft: 'This is the LinkedIn post draft.\n\nIt has multiple paragraphs.\n\n#testing',
}

const TEST_API_KEY = 'sk-ant-test-key-123'

beforeEach(() => {
  vi.resetModules()
  mockCreate.mockReset()
})

describe('anthropicProvider.generateLinkedInDraft', () => {
  it('returns a structured result from Claude response', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(MOCK_RESULT) }],
    })

    const { anthropicProvider } = await import('@/lib/ai/anthropic')
    const result = await anthropicProvider.generateLinkedInDraft({
      rawContent: 'I learned a lot building my first product...',
      title: 'Product lessons',
      apiKey: TEST_API_KEY,
    })

    expect(result.suggestedTitle).toBe(MOCK_RESULT.suggestedTitle)
    expect(result.summary).toBe(MOCK_RESULT.summary)
    expect(result.keyPoints).toEqual(MOCK_RESULT.keyPoints)
    expect(result.draft).toBe(MOCK_RESULT.draft)
  })

  it('handles JSON wrapped in markdown code blocks', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: 'text',
          text: `Here is the result:\n\`\`\`json\n${JSON.stringify(MOCK_RESULT)}\n\`\`\``,
        },
      ],
    })

    const { anthropicProvider } = await import('@/lib/ai/anthropic')
    const result = await anthropicProvider.generateLinkedInDraft({
      rawContent: 'Some content here',
      apiKey: TEST_API_KEY,
    })

    expect(result.draft).toBe(MOCK_RESULT.draft)
  })

  it('throws when no apiKey is provided', async () => {
    const { anthropicProvider } = await import('@/lib/ai/anthropic')
    await expect(
      anthropicProvider.generateLinkedInDraft({ rawContent: 'test' })
    ).rejects.toThrow('No Anthropic API key')
  })
})

describe('anthropicProvider.scoreDraftQuality', () => {
  it('returns a numeric score between 1 and 100', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '82' }],
    })

    const { anthropicProvider } = await import('@/lib/ai/anthropic')
    const score = await anthropicProvider.scoreDraftQuality('A great LinkedIn post...', TEST_API_KEY)

    expect(score).toBe(82)
    expect(score).toBeGreaterThanOrEqual(1)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('returns 70 as fallback when response is not a number', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'I would rate this post highly.' }],
    })

    const { anthropicProvider } = await import('@/lib/ai/anthropic')
    const score = await anthropicProvider.scoreDraftQuality('Some post', TEST_API_KEY)

    expect(score).toBe(70)
  })
})
