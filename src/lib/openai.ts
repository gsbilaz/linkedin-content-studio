import OpenAI from 'openai'

function getClient(apiKey?: string): OpenAI {
  if (!apiKey) {
    throw new Error('No OpenAI API key. Add your key in Settings → AI Providers.')
  }
  return new OpenAI({ apiKey })
}

export async function transcribeAudio(file: File, apiKey?: string): Promise<string> {
  const client = getClient(apiKey)
  const result = await client.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    response_format: 'text',
  })
  return result as unknown as string
}
