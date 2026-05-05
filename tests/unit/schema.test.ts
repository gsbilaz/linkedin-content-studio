import { describe, it, expect } from 'vitest'

describe('Database schema', () => {
  it('exports all required tables', async () => {
    const schema = await import('@/db/schema')

    expect(schema.profiles).toBeDefined()
    expect(schema.linkedinAccounts).toBeDefined()
    expect(schema.aiProviderAccounts).toBeDefined()
    expect(schema.writingSamples).toBeDefined()
    expect(schema.styleProfiles).toBeDefined()
    expect(schema.contentInputs).toBeDefined()
    expect(schema.contentArtifacts).toBeDefined()
    expect(schema.postDrafts).toBeDefined()
    expect(schema.postMedia).toBeDefined()
    expect(schema.publishingJobs).toBeDefined()
  })

  it('exports all required enums', async () => {
    const schema = await import('@/db/schema')

    expect(schema.aiProviderEnum).toBeDefined()
    expect(schema.contentInputTypeEnum).toBeDefined()
    expect(schema.processingStatusEnum).toBeDefined()
    expect(schema.draftStatusEnum).toBeDefined()
    expect(schema.jobStatusEnum).toBeDefined()
  })

  it('postDrafts status enum includes manual-fallback-relevant values', async () => {
    const schema = await import('@/db/schema')
    // jobStatusEnum must include manual_fallback for the fallback publishing flow
    const enumValues = schema.jobStatusEnum.enumValues
    expect(enumValues).toContain('manual_fallback')
    expect(enumValues).toContain('pending')
    expect(enumValues).toContain('completed')
    expect(enumValues).toContain('failed')
  })

  it('contentInputTypeEnum covers all required input types', async () => {
    const schema = await import('@/db/schema')
    const required = ['text', 'audio', 'video', 'document', 'link', 'image', 'voice_recording']
    const enumValues = schema.contentInputTypeEnum.enumValues
    required.forEach((type) => {
      expect(enumValues).toContain(type)
    })
  })
})
