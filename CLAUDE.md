# LinkedIn Content Studio - Claude Code Project Instructions

## Product Summary

We are building a multi-user web application called LinkedIn Content Studio.

The app allows users to submit raw content ideas through text, audio, video, documents, links, images, and in-app voice recordings. The app uses AI to transcribe, summarize, synthesize, identify highlights, generate LinkedIn post drafts, match each user's writing style, allow editing and approval, schedule approved posts, and publish them to LinkedIn when API access allows.

The app must also support a manual fallback workflow where the user can easily copy the final post and manually upload attached media to LinkedIn.

## Target Users

The first user is a content operator creating LinkedIn posts on behalf of someone else. However, the app must be built as a multi-user product from the beginning. Each user account should have its own data, AI provider settings, writing style profile, content inputs, drafts, media attachments, schedule, and LinkedIn connection.

## Tech Stack

Use:
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Drizzle ORM
- Trigger.dev for background jobs and scheduling
- Anthropic Claude API as the default AI provider
- OpenAI API as a secondary provider
- LinkedIn OAuth and LinkedIn posting APIs
- PWA support for mobile recording and app-like usage
- Vitest for unit tests
- Playwright for end-to-end tests

## Non-Negotiable Product Requirements

1. Multi-user authentication.
2. User data isolation.
3. One LinkedIn profile connected per user for MVP.
4. Text input.
5. Audio upload.
6. Video upload.
7. Document upload.
8. Link submission.
9. In-app voice recording.
10. Image, video, and document attachment support for LinkedIn posts.
11. User-specific writing samples.
12. AI-generated style profile per user.
13. AI draft generation using the user's style profile.
14. Draft editing.
15. Draft approval.
16. Post scheduling inside the app.
17. Direct LinkedIn publishing when available.
18. Manual copy/paste fallback if LinkedIn publishing fails or is unavailable.
19. Full audit trail of processing and publishing status.
20. Environment variables for all secrets.
21. No hardcoded API keys.
22. Clear error handling.
23. Production-ready architecture.

## AI Provider Requirements

Create a provider abstraction layer so the app can call Claude or OpenAI based on user settings.

The abstraction should support:
- summarizeContent()
- extractKeyPoints()
- generateLinkedInDrafts()
- analyzeWritingStyle()
- rewriteInUserStyle()
- scoreDraftQuality()
- transcribeMedia() where applicable

Claude should be the default for writing and synthesis. OpenAI should be available for transcription and fallback drafting.

## LinkedIn Requirements

Build the LinkedIn integration defensively.

The app should support:
- OAuth connection flow
- token storage using encryption
- media upload flow
- post creation flow
- publishing status tracking
- clear manual fallback when direct posting fails

Do not assume API access will always be granted. Build the user experience so the product is still useful without direct LinkedIn posting.

## Security Requirements

- Use Supabase Row Level Security.
- Never expose service role keys to the browser.
- Store provider API keys and LinkedIn tokens encrypted.
- Validate all uploads.
- Validate file size and MIME type.
- Use server-side API routes for AI and LinkedIn calls.
- Keep user data isolated.
- Do not log secrets.
- Use environment variables.

## UX Requirements

The app should feel simple and polished.

Primary navigation:
- Dashboard
- New Content
- Drafts
- Calendar
- Writing Style
- Settings

Design principles:
- Clean, minimal interface
- Mobile-friendly
- PWA-ready
- Clear empty states
- Clear processing states
- Clear publishing states
- Obvious copy button for manual LinkedIn posting
- Draft editor should be easy to use on desktop and mobile

## Build Style

Work in small phases. Before coding each phase:
1. Explain the files you will create or modify.
2. Identify risks or assumptions.
3. Implement the phase.
4. Run typecheck and tests.
5. Summarize what changed.

Do not skip tests. Do not hardcode secrets. Do not create fake integrations without clearly labeling them as mock/stub code.