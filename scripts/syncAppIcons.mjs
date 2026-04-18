/**
 * Generates launcher and PWA icons from public/anchor_500kb.png.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.join(__dirname, '..')

const sourcePng = path.join(root, 'public', 'anchor_500kb.png')

/** Legacy launcher: 48dp */
const androidLegacy = [
  { folder: 'mipmap-mdpi', px: 48 },
  { folder: 'mipmap-hdpi', px: 72 },
  { folder: 'mipmap-xhdpi', px: 96 },
  { folder: 'mipmap-xxhdpi', px: 144 },
  { folder: 'mipmap-xxxhdpi', px: 192 },
]

/** Adaptive foreground: 108dp */
const androidForeground = [
  { folder: 'mipmap-mdpi', px: 108 },
  { folder: 'mipmap-hdpi', px: 162 },
  { folder: 'mipmap-xhdpi', px: 216 },
  { folder: 'mipmap-xxhdpi', px: 324 },
  { folder: 'mipmap-xxxhdpi', px: 432 },
]

const publicRootIcons = [
  { name: 'icon-48x48.png', size: 48 },
  { name: 'icon-72x72.png', size: 72 },
  { name: 'icon-96x96.png', size: 96 },
  { name: 'icon-128x128.png', size: 128 },
  { name: 'icon-144x144.png', size: 144 },
  { name: 'icon-152x152.png', size: 152 },
  { name: 'icon-180x180.png', size: 180 },
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
]

function readSourceBuffer() {
  if (!fs.existsSync(sourcePng)) {
    throw new Error(`Missing source image: ${sourcePng}`)
  }
  return fs.readFileSync(sourcePng)
}

async function resizeToSquare(buffer, size, { contain = false } = {}) {
  const base = sharp(buffer).ensureAlpha()
  if (contain) {
    return base
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer()
  }
  return base.resize(size, size, { fit: 'cover', position: 'centre' }).png().toBuffer()
}

async function main() {
  const buf = readSourceBuffer()

  const resRoot = path.join(root, 'android', 'app', 'src', 'main', 'res')

  for (const { folder, px } of androidLegacy) {
    const outDir = path.join(resRoot, folder)
    const legacy = await resizeToSquare(buf, px, { contain: false })
    fs.writeFileSync(path.join(outDir, 'ic_launcher.png'), legacy)
    fs.writeFileSync(path.join(outDir, 'ic_launcher_round.png'), legacy)
  }

  for (const { folder, px } of androidForeground) {
    const outDir = path.join(resRoot, folder)
    const fg = await resizeToSquare(buf, px, { contain: true })
    fs.writeFileSync(path.join(outDir, 'ic_launcher_foreground.png'), fg)
  }

  for (const { name, size } of publicRootIcons) {
    const out = path.join(root, 'public', name)
    const png = await resizeToSquare(buf, size, { contain: false })
    fs.writeFileSync(out, png)
    console.log(`Wrote public/${name}`)
  }

  const fav16 = await resizeToSquare(buf, 16, { contain: false })
  const fav32 = await resizeToSquare(buf, 32, { contain: false })
  const icoBuf = await pngToIco([fav16, fav32])
  fs.writeFileSync(path.join(root, 'public', 'favicon.ico'), icoBuf)
  console.log('Wrote public/favicon.ico')

  const iconsDir = path.join(root, 'public', 'icons')
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true })
  }
  const extraIcons = [
    { name: 'icon-1024.png', size: 1024 },
    { name: 'icon-180.png', size: 180 },
    { name: 'icon-120.png', size: 120 },
    { name: 'icon-167.png', size: 167 },
    { name: 'icon-152.png', size: 152 },
    { name: 'icon-76.png', size: 76 },
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
  ]
  for (const { name, size } of extraIcons) {
    const png = await resizeToSquare(buf, size, { contain: false })
    fs.writeFileSync(path.join(iconsDir, name), png)
    console.log(`Wrote public/icons/${name}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
