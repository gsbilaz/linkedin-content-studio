-- Enable Row Level Security on all tables
alter table public.profiles enable row level security;
alter table public.linkedin_accounts enable row level security;
alter table public.ai_provider_accounts enable row level security;
alter table public.writing_samples enable row level security;
alter table public.style_profiles enable row level security;
alter table public.content_inputs enable row level security;
alter table public.content_artifacts enable row level security;
alter table public.post_drafts enable row level security;
alter table public.post_media enable row level security;
alter table public.publishing_jobs enable row level security;

-- ── profiles ──────────────────────────────────────────────────────────────────
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ── linkedin_accounts ─────────────────────────────────────────────────────────
create policy "Users can manage own linkedin accounts"
  on public.linkedin_accounts for all
  using (auth.uid() = user_id);

-- ── ai_provider_accounts ─────────────────────────────────────────────────────
create policy "Users can manage own ai provider accounts"
  on public.ai_provider_accounts for all
  using (auth.uid() = user_id);

-- ── writing_samples ───────────────────────────────────────────────────────────
create policy "Users can manage own writing samples"
  on public.writing_samples for all
  using (auth.uid() = user_id);

-- ── style_profiles ────────────────────────────────────────────────────────────
create policy "Users can manage own style profiles"
  on public.style_profiles for all
  using (auth.uid() = user_id);

-- ── content_inputs ────────────────────────────────────────────────────────────
create policy "Users can manage own content inputs"
  on public.content_inputs for all
  using (auth.uid() = user_id);

-- ── content_artifacts ─────────────────────────────────────────────────────────
create policy "Users can manage own content artifacts"
  on public.content_artifacts for all
  using (auth.uid() = user_id);

-- ── post_drafts ───────────────────────────────────────────────────────────────
create policy "Users can manage own post drafts"
  on public.post_drafts for all
  using (auth.uid() = user_id);

-- ── post_media ────────────────────────────────────────────────────────────────
create policy "Users can manage own post media"
  on public.post_media for all
  using (auth.uid() = user_id);

-- ── publishing_jobs ───────────────────────────────────────────────────────────
create policy "Users can manage own publishing jobs"
  on public.publishing_jobs for all
  using (auth.uid() = user_id);
