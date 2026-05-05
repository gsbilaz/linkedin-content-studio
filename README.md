# LinkedIn Content Studio

A multi-user web application for creating, managing, and publishing LinkedIn content using AI.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Supabase Postgres + Drizzle ORM
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **AI**: Anthropic Claude (default) + OpenAI (fallback/transcription)
- **Background Jobs**: Trigger.dev
- **Testing**: Vitest + Playwright

## Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- An [Anthropic](https://console.anthropic.com) API key
- Optional: OpenAI API key, LinkedIn Developer App

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in all values in `.env.local`:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API |
| `DATABASE_URL` | Supabase Dashboard → Settings → Database → Connection Pooler (Transaction mode) |
| `DATABASE_DIRECT_URL` | Supabase Dashboard → Settings → Database → Direct connection |
| `ENCRYPTION_KEY` | Generate: `openssl rand -hex 32` |
| `ANTHROPIC_API_KEY` | console.anthropic.com |

### 3. Run database migrations

**Step A** — Generate Drizzle migrations (creates `drizzle/` folder):

```bash
npm run db:generate
```

**Step B** — Apply Drizzle migrations to your database:

```bash
npm run db:migrate
```

**Step C** — Apply Supabase-specific SQL (triggers + RLS policies) via the Supabase Dashboard SQL Editor or Supabase CLI:

```bash
# Using Supabase CLI
supabase db push --db-url "$DATABASE_DIRECT_URL" < supabase/migrations/0001_profiles_trigger.sql
supabase db push --db-url "$DATABASE_DIRECT_URL" < supabase/migrations/0002_rls_policies.sql
```

Or paste each file's contents into **Supabase Dashboard → SQL Editor → New query**.

### 4. Configure Supabase Auth

In your Supabase project dashboard:

1. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback`

2. **Authentication → Email Templates** (optional): customise confirmation email

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login + Signup (no sidebar)
│   ├── (dashboard)/     # All authenticated pages
│   ├── auth/callback/   # Supabase OAuth callback
│   └── api/health/      # Health check endpoint
├── components/
│   ├── auth/            # Login/signup forms
│   ├── layout/          # Sidebar + Header
│   └── ui/              # shadcn/ui primitives
├── db/
│   ├── schema.ts        # Drizzle ORM schema (all 10 tables)
│   └── index.ts         # DB client
├── lib/
│   ├── supabase/        # Browser + server Supabase clients
│   └── utils.ts         # cn() utility
└── middleware.ts         # Session refresh + auth guard
```

## Development Commands

| Command | Description |
|---|---|
| `npm run dev` | Start dev server on :3000 |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript type check |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Apply migrations |
| `npm run db:studio` | Open Drizzle Studio |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run E2E tests (Playwright) |

## Database Schema

| Table | Purpose |
|---|---|
| `profiles` | Extends `auth.users` with display info |
| `linkedin_accounts` | Encrypted LinkedIn OAuth tokens |
| `ai_provider_accounts` | Encrypted per-user AI API keys |
| `writing_samples` | User writing examples for style training |
| `style_profiles` | AI-generated writing style JSON |
| `content_inputs` | Raw submitted content (text/audio/video/etc.) |
| `content_artifacts` | AI-processed outputs (transcription, summary, etc.) |
| `post_drafts` | LinkedIn post drafts with status tracking |
| `post_media` | Attachments for posts (images, video, documents) |
| `publishing_jobs` | Full audit trail of publish attempts |

## Security Notes

- Row Level Security is enabled on all tables — users can only access their own data
- LinkedIn tokens and AI API keys are stored encrypted (AES-256 via `ENCRYPTION_KEY`)
- Service role key is server-side only, never exposed to the browser
- All AI and LinkedIn API calls go through server-side API routes

## Roadmap

- **Phase 2**: Text content input → AI transcription + summarisation → draft generation
- **Phase 3**: Audio/video upload + transcription (OpenAI Whisper)
- **Phase 4**: Writing style analysis + style-matched draft generation
- **Phase 5**: Draft editor + approval flow
- **Phase 6**: LinkedIn OAuth + publishing (with manual copy fallback)
- **Phase 7**: Scheduling with Trigger.dev
- **Phase 8**: PWA + mobile voice recording
