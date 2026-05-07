import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  mockFetch.mockReset()
})

describe('createLinkedInPost', () => {
  it('sends the correct LinkedIn-Version header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'urn:li:share:123' },
    })

    const { createLinkedInPost } = await import('@/lib/linkedin-api')
    await createLinkedInPost('token123', 'urn:li:person:abc', 'Hello LinkedIn')

    const [, options] = mockFetch.mock.calls[0]
    const headers = options.headers as Record<string, string>
    expect(headers['LinkedIn-Version']).toMatch(/^\d{6}$/)
  })

  it('publishes a text-only post with correct body shape', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'urn:li:share:456' },
    })

    const { createLinkedInPost } = await import('@/lib/linkedin-api')
    await createLinkedInPost('tok', 'urn:li:person:xyz', 'My post text')

    const [, options] = mockFetch.mock.calls[0]
    const body = JSON.parse(options.body as string)
    expect(body.author).toBe('urn:li:person:xyz')
    expect(body.commentary).toBe('My post text')
    expect(body.visibility).toBe('PUBLIC')
    expect(body.lifecycleState).toBe('PUBLISHED')
    expect(body.content).toBeUndefined()
  })

  it('includes single image content when mediaParam type is single_image', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'urn:li:share:789' },
    })

    const { createLinkedInPost } = await import('@/lib/linkedin-api')
    await createLinkedInPost('tok', 'urn:li:person:xyz', 'Post with image', {
      type: 'single_image',
      urns: ['urn:li:image:img1'],
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string)
    expect(body.content).toEqual({ media: { id: 'urn:li:image:img1' } })
  })

  it('includes multi-image content when mediaParam type is multi_image', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'urn:li:share:999' },
    })

    const { createLinkedInPost } = await import('@/lib/linkedin-api')
    await createLinkedInPost('tok', 'urn:li:person:xyz', 'Post with images', {
      type: 'multi_image',
      urns: ['urn:li:image:img1', 'urn:li:image:img2'],
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string)
    expect(body.content.multiImage.images).toHaveLength(2)
    expect(body.content.multiImage.images[0].id).toBe('urn:li:image:img1')
  })

  it('includes document content when mediaParam type is document', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'urn:li:share:doc1' },
    })

    const { createLinkedInPost } = await import('@/lib/linkedin-api')
    await createLinkedInPost('tok', 'urn:li:person:xyz', 'Post with doc', {
      type: 'document',
      urns: ['urn:li:document:doc1'],
      title: 'My Report.pdf',
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string)
    expect(body.content.media.id).toBe('urn:li:document:doc1')
    expect(body.content.media.title).toBe('My Report.pdf')
  })

  it('throws with status code when LinkedIn returns an error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => '{"message":"Access denied"}',
    })

    const { createLinkedInPost } = await import('@/lib/linkedin-api')
    await expect(
      createLinkedInPost('bad-token', 'urn:li:person:xyz', 'test')
    ).rejects.toThrow('403')
  })

  it('returns the post URN from the x-restli-id response header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: (h: string) => (h === 'x-restli-id' ? 'urn:li:share:abc123' : null) },
    })

    const { createLinkedInPost } = await import('@/lib/linkedin-api')
    const urn = await createLinkedInPost('tok', 'urn:li:person:xyz', 'test')
    expect(urn).toBe('urn:li:share:abc123')
  })
})

describe('initDocumentUpload', () => {
  it('does NOT include title in the request body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ value: { uploadUrl: 'https://upload.example.com', document: 'urn:li:document:d1' } }),
    })

    const { initDocumentUpload } = await import('@/lib/linkedin-api')
    await initDocumentUpload('tok', 'urn:li:person:xyz')

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string)
    expect(body.initializeUploadRequest.title).toBeUndefined()
    expect(body.initializeUploadRequest.owner).toBe('urn:li:person:xyz')
  })

  it('returns uploadUrl and documentUrn', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        value: { uploadUrl: 'https://upload.example.com/doc', document: 'urn:li:document:d2' },
      }),
    })

    const { initDocumentUpload } = await import('@/lib/linkedin-api')
    const result = await initDocumentUpload('tok', 'urn:li:person:xyz')
    expect(result.uploadUrl).toBe('https://upload.example.com/doc')
    expect(result.documentUrn).toBe('urn:li:document:d2')
  })
})

describe('initImageUpload', () => {
  it('returns uploadUrl and imageUrn', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        value: { uploadUrl: 'https://upload.example.com/img', image: 'urn:li:image:i1' },
      }),
    })

    const { initImageUpload } = await import('@/lib/linkedin-api')
    const result = await initImageUpload('tok', 'urn:li:person:xyz')
    expect(result.uploadUrl).toBe('https://upload.example.com/img')
    expect(result.imageUrn).toBe('urn:li:image:i1')
  })
})
