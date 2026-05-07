import {
  pgTable,
  pgSchema,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  bigint,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Reference Supabase-managed auth schema
const authSchema = pgSchema('auth')
const authUsers = authSchema.table('users', {
  id: uuid('id').primaryKey(),
})

// ─── Enums ───────────────────────────────────────────────────────────────────

export const aiProviderEnum = pgEnum('ai_provider', ['anthropic', 'openai'])

export const writingSampleSourceEnum = pgEnum('writing_sample_source', [
  'manual',
  'linkedin_import',
])

export const contentInputTypeEnum = pgEnum('content_input_type', [
  'text',
  'audio',
  'video',
  'document',
  'link',
  'image',
  'voice_recording',
])

export const processingStatusEnum = pgEnum('processing_status', [
  'pending',
  'processing',
  'completed',
  'failed',
])

export const artifactTypeEnum = pgEnum('artifact_type', [
  'transcription',
  'summary',
  'key_points',
  'highlights',
])

export const draftStatusEnum = pgEnum('draft_status', [
  'draft',
  'approved',
  'scheduled',
  'ready',
  'published',
  'failed',
])

export const mediaTypeEnum = pgEnum('media_type', ['image', 'video', 'document'])

export const uploadStatusEnum = pgEnum('upload_status', [
  'pending',
  'uploaded',
  'failed',
])

export const jobStatusEnum = pgEnum('job_status', [
  'pending',
  'processing',
  'completed',
  'failed',
  'manual_fallback',
])

// ─── Tables ──────────────────────────────────────────────────────────────────

export const profiles = pgTable('profiles', {
  id: uuid('id')
    .primaryKey()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const linkedinAccounts = pgTable('linkedin_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  linkedinId: text('linkedin_id').notNull(),
  encryptedAccessToken: text('encrypted_access_token').notNull(),
  encryptedRefreshToken: text('encrypted_refresh_token'),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
  profileName: text('profile_name'),
  profilePictureUrl: text('profile_picture_url'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const aiProviderAccounts = pgTable('ai_provider_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  provider: aiProviderEnum('provider').notNull(),
  encryptedApiKey: text('encrypted_api_key').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const writingSamples = pgTable(
  'writing_samples',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    title: text('title'),
    content: text('content').notNull(),
    source: writingSampleSourceEnum('source').default('manual').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('idx_writing_samples_user_id').on(t.userId)]
)

export const styleProfiles = pgTable('style_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  profileData: jsonb('profile_data').notNull(),
  generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
  version: integer('version').default(1).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const draftGroups = pgTable('draft_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const contentInputs = pgTable(
  'content_inputs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    inputType: contentInputTypeEnum('input_type').notNull(),
    title: text('title'),
    rawText: text('raw_text'),
    storagePath: text('storage_path'),
    sourceUrl: text('source_url'),
    mimeType: text('mime_type'),
    fileSize: bigint('file_size', { mode: 'number' }),
    processingStatus: processingStatusEnum('processing_status').default('pending').notNull(),
    processingError: text('processing_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('idx_content_inputs_user_id').on(t.userId)]
)

export const contentArtifacts = pgTable('content_artifacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  contentInputId: uuid('content_input_id')
    .notNull()
    .references(() => contentInputs.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  artifactType: artifactTypeEnum('artifact_type').notNull(),
  content: text('content').notNull(),
  aiProvider: aiProviderEnum('ai_provider').notNull(),
  model: text('model'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const postDrafts = pgTable(
  'post_drafts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contentInputId: uuid('content_input_id').references(() => contentInputs.id, {
      onDelete: 'set null',
    }),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    title: text('title'),
    content: text('content').notNull(),
    status: draftStatusEnum('status').default('draft').notNull(),
    groupId: uuid('group_id').references(() => draftGroups.id, { onDelete: 'set null' }),
    groupOrder: integer('group_order'),
    styleScore: integer('style_score'),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    triggerRunId: text('trigger_run_id'),
    linkedinPostId: text('linkedin_post_id'),
    publishingError: text('publishing_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_post_drafts_user_id').on(t.userId),
    index('idx_post_drafts_user_status').on(t.userId, t.status),
    index('idx_post_drafts_scheduled_at').on(t.scheduledAt),
  ]
)

export const postMedia = pgTable(
  'post_media',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    postDraftId: uuid('post_draft_id')
      .notNull()
      .references(() => postDrafts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    storagePath: text('storage_path').notNull(),
    mimeType: text('mime_type').notNull(),
    fileSize: bigint('file_size', { mode: 'number' }).notNull(),
    fileName: text('file_name').notNull(),
    mediaType: mediaTypeEnum('media_type').notNull(),
    linkedinAssetId: text('linkedin_asset_id'),
    uploadStatus: uploadStatusEnum('upload_status').default('pending').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('idx_post_media_draft_id').on(t.postDraftId)]
)

export const publishingJobs = pgTable(
  'publishing_jobs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    postDraftId: uuid('post_draft_id')
      .notNull()
      .references(() => postDrafts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    status: jobStatusEnum('status').default('pending').notNull(),
    attemptedAt: timestamp('attempted_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    linkedinPostId: text('linkedin_post_id'),
    errorMessage: text('error_message'),
    isManualFallback: boolean('is_manual_fallback').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('idx_publishing_jobs_draft_id').on(t.postDraftId)]
)

// ─── Relations ────────────────────────────────────────────────────────────────

export const profilesRelations = relations(profiles, ({ many }) => ({
  linkedinAccounts: many(linkedinAccounts),
  aiProviderAccounts: many(aiProviderAccounts),
  writingSamples: many(writingSamples),
  styleProfiles: many(styleProfiles),
  contentInputs: many(contentInputs),
  postDrafts: many(postDrafts),
  draftGroups: many(draftGroups),
}))

export const draftGroupsRelations = relations(draftGroups, ({ one, many }) => ({
  profile: one(profiles, { fields: [draftGroups.userId], references: [profiles.id] }),
  drafts: many(postDrafts),
}))

export const contentInputsRelations = relations(contentInputs, ({ one, many }) => ({
  profile: one(profiles, { fields: [contentInputs.userId], references: [profiles.id] }),
  artifacts: many(contentArtifacts),
  drafts: many(postDrafts),
}))

export const postDraftsRelations = relations(postDrafts, ({ one, many }) => ({
  profile: one(profiles, { fields: [postDrafts.userId], references: [profiles.id] }),
  contentInput: one(contentInputs, {
    fields: [postDrafts.contentInputId],
    references: [contentInputs.id],
  }),
  group: one(draftGroups, {
    fields: [postDrafts.groupId],
    references: [draftGroups.id],
  }),
  media: many(postMedia),
  publishingJobs: many(publishingJobs),
}))

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type Profile = typeof profiles.$inferSelect
export type NewProfile = typeof profiles.$inferInsert
export type LinkedinAccount = typeof linkedinAccounts.$inferSelect
export type AiProviderAccount = typeof aiProviderAccounts.$inferSelect
export type WritingSample = typeof writingSamples.$inferSelect
export type NewWritingSample = typeof writingSamples.$inferInsert
export type StyleProfile = typeof styleProfiles.$inferSelect
export type ContentInput = typeof contentInputs.$inferSelect
export type NewContentInput = typeof contentInputs.$inferInsert
export type ContentArtifact = typeof contentArtifacts.$inferSelect
export type DraftGroup = typeof draftGroups.$inferSelect
export type PostDraft = typeof postDrafts.$inferSelect
export type NewPostDraft = typeof postDrafts.$inferInsert
export type PostMedia = typeof postMedia.$inferSelect
export type PublishingJob = typeof publishingJobs.$inferSelect
