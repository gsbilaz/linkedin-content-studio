import { defineConfig } from 'drizzle-kit'
import * as fs from 'fs'
import * as path from 'path'

// drizzle-kit doesn't load .env.local automatically (that's a Next.js feature),
// so we read and apply it ourselves before the config is evaluated.
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return
  const content = fs.readFileSync(envPath, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    const value = trimmed.slice(eqIndex + 1).trim()
    if (key && !(key in process.env)) {
      process.env[key] = value
    }
  }
}

loadEnvLocal()

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_DIRECT_URL!,
  },
})
