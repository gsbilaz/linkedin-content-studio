import mammoth from 'mammoth'

const ACCEPTED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
])

export const DOCUMENT_ACCEPT = '.pdf,.docx,.doc,.txt'
export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export function isAcceptedDocumentType(mimeType: string): boolean {
  return ACCEPTED_MIME_TYPES.has(mimeType.split(';')[0].trim())
}

export async function extractDocumentText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const mime = file.type.split(';')[0].trim()

  if (mime === 'application/pdf') {
    // Dynamic require keeps pdf-parse out of the client bundle
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse') as (b: Buffer) => Promise<{ text: string }>
    const result = await pdfParse(buffer)
    const text = result.text.trim()
    if (!text) {
      throw new Error(
        'No text found in this PDF. Scanned or image-only PDFs are not supported — please use a text-based PDF or copy the text manually.'
      )
    }
    return text
  }

  if (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mime === 'application/msword'
  ) {
    const result = await mammoth.extractRawText({ buffer })
    const text = result.value.trim()
    if (!text) {
      throw new Error('No text could be extracted from this document.')
    }
    return text
  }

  if (mime === 'text/plain') {
    const text = buffer.toString('utf-8').trim()
    if (!text) {
      throw new Error('The text file appears to be empty.')
    }
    return text
  }

  throw new Error(`Unsupported file type (${mime}). Upload a PDF, DOCX, DOC, or TXT file.`)
}
