import { describe, it, expect } from 'vitest'
import { needsConversion, CONVERTIBLE_MIME_TYPES } from '@/lib/document-converter'

// convertToPdf shells out to LibreOffice and cannot be reliably unit-tested
// without the binary installed. Its error handling is covered by manual QA
// and the upload API integration path.

describe('needsConversion', () => {
  it('returns true for .docx', () => {
    expect(needsConversion('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true)
  })

  it('returns true for .pptx', () => {
    expect(needsConversion('application/vnd.openxmlformats-officedocument.presentationml.presentation')).toBe(true)
  })

  it('returns true for legacy .doc', () => {
    expect(needsConversion('application/msword')).toBe(true)
  })

  it('returns true for legacy .ppt', () => {
    expect(needsConversion('application/vnd.ms-powerpoint')).toBe(true)
  })

  it('returns false for PDF (already the target format)', () => {
    expect(needsConversion('application/pdf')).toBe(false)
  })

  it('returns false for images', () => {
    expect(needsConversion('image/jpeg')).toBe(false)
    expect(needsConversion('image/png')).toBe(false)
    expect(needsConversion('image/webp')).toBe(false)
  })

  it('returns false for unknown MIME types', () => {
    expect(needsConversion('application/octet-stream')).toBe(false)
    expect(needsConversion('')).toBe(false)
  })

  it('CONVERTIBLE_MIME_TYPES covers exactly 4 types', () => {
    expect(CONVERTIBLE_MIME_TYPES.size).toBe(4)
  })
})
