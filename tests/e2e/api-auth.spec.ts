import { test, expect } from '@playwright/test'

// Every API route that requires authentication should return 401 when called
// without a session cookie. This verifies server-side auth guards are in place.

const PROTECTED_GET_ENDPOINTS = [
  '/api/ai-keys',
]

const PROTECTED_POST_ENDPOINTS = [
  '/api/content',
  '/api/ai-keys',
]

const DRAFT_ID = '00000000-0000-0000-0000-000000000000'

const PROTECTED_DRAFT_ENDPOINTS = [
  { method: 'GET',    url: `/api/drafts/${DRAFT_ID}/media` },
  { method: 'POST',   url: `/api/drafts/${DRAFT_ID}/media` },
  { method: 'PATCH',  url: `/api/drafts/${DRAFT_ID}` },
  { method: 'DELETE', url: `/api/drafts/${DRAFT_ID}` },
  { method: 'POST',   url: `/api/drafts/${DRAFT_ID}/publish` },
  { method: 'POST',   url: `/api/drafts/${DRAFT_ID}/schedule` },
  { method: 'POST',   url: `/api/drafts/${DRAFT_ID}/publish-now` },
]

test.describe('API auth protection', () => {
  for (const url of PROTECTED_GET_ENDPOINTS) {
    test(`GET ${url} returns 401 without auth`, async ({ request }) => {
      const res = await request.get(url)
      expect(res.status()).toBe(401)
    })
  }

  for (const url of PROTECTED_POST_ENDPOINTS) {
    test(`POST ${url} returns 401 without auth`, async ({ request }) => {
      const res = await request.post(url, { data: {} })
      expect(res.status()).toBe(401)
    })
  }

  for (const { method, url } of PROTECTED_DRAFT_ENDPOINTS) {
    test(`${method} ${url} returns 401 without auth`, async ({ request }) => {
      let res
      if (method === 'GET')    res = await request.get(url)
      else if (method === 'POST')   res = await request.post(url, { data: {} })
      else if (method === 'PATCH')  res = await request.patch(url, { data: {} })
      else                          res = await request.delete(url)
      expect(res.status()).toBe(401)
    })
  }

  test('GET /api/health returns 200 (public endpoint)', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.status()).toBe(200)
  })
})
