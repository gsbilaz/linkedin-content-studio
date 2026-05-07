import { describe, it, expect, beforeEach, afterEach } from 'vitest'

const VALID_KEY = 'a'.repeat(64) // 64 hex chars = 32 bytes

beforeEach(() => {
  process.env.TOKEN_ENCRYPTION_KEY = VALID_KEY
})

afterEach(() => {
  delete process.env.TOKEN_ENCRYPTION_KEY
})

describe('encrypt / decrypt', () => {
  it('decrypt reverses encrypt for a simple string', async () => {
    const { encrypt, decrypt } = await import('@/lib/encrypt')
    const plaintext = 'hello world'
    expect(decrypt(encrypt(plaintext))).toBe(plaintext)
  })

  it('round-trips a LinkedIn access token', async () => {
    const { encrypt, decrypt } = await import('@/lib/encrypt')
    const token = 'AQX1abc123_linkedin_token_value'
    expect(decrypt(encrypt(token))).toBe(token)
  })

  it('round-trips a string with special characters', async () => {
    const { encrypt, decrypt } = await import('@/lib/encrypt')
    const value = 'sk-ant-api03-abc!@#$%^&*()_+-=[]{}|;:,.<>?'
    expect(decrypt(encrypt(value))).toBe(value)
  })

  it('produces different ciphertext each call (random IV)', async () => {
    const { encrypt } = await import('@/lib/encrypt')
    const plaintext = 'same input'
    expect(encrypt(plaintext)).not.toBe(encrypt(plaintext))
  })

  it('ciphertext has three colon-separated parts', async () => {
    const { encrypt } = await import('@/lib/encrypt')
    const parts = encrypt('test').split(':')
    expect(parts).toHaveLength(3)
  })

  it('throws when TOKEN_ENCRYPTION_KEY is missing', async () => {
    delete process.env.TOKEN_ENCRYPTION_KEY
    const { encrypt } = await import('@/lib/encrypt')
    expect(() => encrypt('test')).toThrow('TOKEN_ENCRYPTION_KEY')
  })

  it('throws when TOKEN_ENCRYPTION_KEY is wrong length', async () => {
    process.env.TOKEN_ENCRYPTION_KEY = 'tooshort'
    const { encrypt } = await import('@/lib/encrypt')
    expect(() => encrypt('test')).toThrow('32 bytes')
  })

  it('throws on tampered ciphertext (auth tag mismatch)', async () => {
    const { encrypt, decrypt } = await import('@/lib/encrypt')
    const ciphertext = encrypt('sensitive data')
    const parts = ciphertext.split(':')
    // Flip one hex char in the encrypted payload
    parts[2] = parts[2].slice(0, -1) + (parts[2].endsWith('0') ? '1' : '0')
    expect(() => decrypt(parts.join(':'))).toThrow()
  })

  it('throws on ciphertext with wrong number of parts', async () => {
    const { decrypt } = await import('@/lib/encrypt')
    expect(() => decrypt('onlyone')).toThrow('Invalid encrypted value format')
    expect(() => decrypt('only:two')).toThrow('Invalid encrypted value format')
  })
})
