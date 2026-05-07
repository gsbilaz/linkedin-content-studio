import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const iconsDir = join(__dirname, '..', 'public', 'icons')

// Simple "LCS" on a blue rounded square
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#2563eb"/>
  <text
    x="256" y="330"
    font-family="system-ui,-apple-system,BlinkMacSystemFont,sans-serif"
    font-size="220"
    font-weight="700"
    fill="white"
    text-anchor="middle"
    letter-spacing="-8"
  >LCS</text>
</svg>`

const svgBuffer = Buffer.from(svg)

await sharp(svgBuffer).resize(192, 192).png().toFile(join(iconsDir, 'icon-192.png'))
console.log('✓ icon-192.png')

await sharp(svgBuffer).resize(512, 512).png().toFile(join(iconsDir, 'icon-512.png'))
console.log('✓ icon-512.png')

await sharp(svgBuffer).resize(180, 180).png().toFile(join(iconsDir, 'apple-touch-icon.png'))
console.log('✓ apple-touch-icon.png')

console.log('Icons generated in public/icons/')
