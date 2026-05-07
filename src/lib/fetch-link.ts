import * as cheerio from 'cheerio'

const FETCH_TIMEOUT_MS = 15_000
const MAX_CONTENT_CHARS = 12_000

export async function fetchLinkContent(url: string): Promise<{ title: string; content: string }> {
  // Basic URL validation
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('Invalid URL. Please enter a full URL starting with https://')
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Only http:// and https:// URLs are supported.')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  let html: string
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'LinkedInContentStudio/1.0 (content summariser)',
        Accept: 'text/html,application/xhtml+xml',
      },
    })
    if (!res.ok) {
      throw new Error(
        `The page returned an error (${res.status}). It may require a login or block automated access.`
      )
    }
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html') && !contentType.includes('xhtml')) {
      throw new Error(
        'The URL does not point to a web page. Only HTML pages are supported.'
      )
    }
    html = await res.text()
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('The request timed out. The page took too long to respond.')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }

  const $ = cheerio.load(html)

  // Remove noise elements
  $(
    'script, style, nav, header, footer, aside, form, iframe,' +
    '[class*="sidebar"], [class*="menu"], [class*="cookie"],' +
    '[class*="popup"], [class*="modal"], [class*="advertisement"],' +
    '[class*="newsletter"], [id*="sidebar"], [id*="menu"]'
  ).remove()

  // Page title
  const title =
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('title').text().trim() ||
    $('h1').first().text().trim() ||
    ''

  // Main content — try semantic containers first, fall back to body
  const contentEl =
    $('article').length ? $('article') :
    $('main').length ? $('main') :
    $('[role="main"]').length ? $('[role="main"]') :
    $('body')

  // Extract meaningful text blocks
  const blocks: string[] = []
  contentEl.find('h1,h2,h3,h4,p,li,blockquote').each((_i, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim()
    if (text.length > 20) blocks.push(text)
  })

  const content = blocks.join('\n').slice(0, MAX_CONTENT_CHARS).trim()

  if (content.length < 100) {
    throw new Error(
      'Not enough readable text found on this page. It may be JavaScript-rendered or require a login. Try copying the article text and using the Text input instead.'
    )
  }

  return { title, content }
}
