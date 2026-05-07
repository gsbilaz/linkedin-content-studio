export const CONVERTIBLE_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
  'application/vnd.ms-powerpoint', // ppt (legacy)
  'application/msword', // doc (legacy)
])

export function needsConversion(mimeType: string): boolean {
  return CONVERTIBLE_MIME_TYPES.has(mimeType)
}

export async function convertToPdf(buffer: Buffer): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const libre = require('libreoffice-convert')

  try {
    return await new Promise<Buffer>((resolve, reject) => {
      libre.convert(buffer, '.pdf', undefined, (err: Error | null, result: Buffer) => {
        if (err) reject(err)
        else resolve(result)
      })
    })
  } catch (err) {
    const msg = String(err)
    if (
      msg.includes('soffice') ||
      msg.includes('ENOENT') ||
      msg.includes('spawn') ||
      msg.includes('command not found') ||
      msg.includes('not found')
    ) {
      throw new Error(
        'PDF conversion requires LibreOffice. Install it free from libreoffice.org, ' +
          'add C:\\Program Files\\LibreOffice\\program to your Windows PATH, ' +
          'then restart your dev server. Alternatively, upload a PDF directly.'
      )
    }
    throw new Error(`Document conversion failed: ${msg}`)
  }
}
