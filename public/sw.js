const CACHE_NAME = 'lcs-v1'

const PRECACHE_PAGES = [
  '/dashboard',
  '/drafts',
  '/new-content',
  '/calendar',
  '/writing-style',
  '/settings',
]

// ── Install: cache key pages ───────────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Best-effort precache — don't fail install if a page is unreachable
      Promise.allSettled(PRECACHE_PAGES.map((url) => cache.add(url)))
    )
  )
})

// ── Activate: remove stale caches ─────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  )
})

// ── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle GET requests from this origin
  if (request.method !== 'GET') return
  if (url.origin !== self.location.origin) return

  // Skip API routes — always go to network
  if (url.pathname.startsWith('/api/')) return

  // Skip Next.js internals
  if (url.pathname.startsWith('/_next/webpack-hmr')) return

  // Cache-first for static assets (JS, CSS, fonts, images)
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.match(/\.(png|ico|svg|woff2?|ttf)$/)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((res) => {
            if (res.ok) {
              const clone = res.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
            }
            return res
          })
      )
    )
    return
  }

  // Network-first for pages — fall back to cache when offline
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return res
      })
      .catch(
        () =>
          caches.match(request) ??
          caches.match('/dashboard')
      )
  )
})
