import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createCanvas } from 'canvas'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const outputDir = path.join(__dirname, '..', 'public', 'icons')

const iconSizes = [
  { size: 1024, name: 'icon-1024.png' },
  { size: 180, name: 'icon-180.png' },
  { size: 120, name: 'icon-120.png' },
  { size: 167, name: 'icon-167.png' },
  { size: 152, name: 'icon-152.png' },
  { size: 76, name: 'icon-76.png' },
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
]

function drawAppIcon(ctx, size) {
  const c = size / 1024

  const bg = ctx.createLinearGradient(0, 0, 0, size)
  bg.addColorStop(0, '#1a6eb5')
  bg.addColorStop(0.22, '#2e8fd4')
  bg.addColorStop(0.5, '#72c3ef')
  bg.addColorStop(0.82, '#d4ecf9')
  bg.addColorStop(1, '#e8f5fd')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, size, size)

  // Sun glow
  const sx = size * 0.78
  const sy = size * 0.2
  const sunR = 95 * c
  const sunGlow = ctx.createRadialGradient(sx, sy, 0, sx, sy, sunR * 3.5)
  sunGlow.addColorStop(0, 'rgba(255,240,120,0.48)')
  sunGlow.addColorStop(0.5, 'rgba(255,210,60,0.2)')
  sunGlow.addColorStop(1, 'rgba(255,200,0,0)')
  ctx.fillStyle = sunGlow
  ctx.beginPath()
  ctx.arc(sx, sy, sunR * 3.5, 0, Math.PI * 2)
  ctx.fill()

  const sunCore = ctx.createRadialGradient(sx - sunR * 0.2, sy - sunR * 0.2, 0, sx, sy, sunR)
  sunCore.addColorStop(0, '#FFF9C4')
  sunCore.addColorStop(0.45, '#FFE55A')
  sunCore.addColorStop(0.8, '#FFD020')
  sunCore.addColorStop(1, '#FFB800')
  ctx.fillStyle = sunCore
  ctx.beginPath()
  ctx.arc(sx, sy, sunR, 0, Math.PI * 2)
  ctx.fill()

  // Soft cloud shapes
  const clouds = [
    { x: 180, y: 280, puffs: [[0, 0, 130, 72], [120, 16, 95, 55], [-100, 22, 88, 50]] },
    { x: 770, y: 380, puffs: [[0, 0, 120, 66], [110, 15, 88, 52], [-90, 18, 82, 46]] },
    { x: 470, y: 520, puffs: [[0, 0, 100, 58], [90, 10, 76, 44], [-76, 14, 70, 40]] },
  ]

  clouds.forEach((cloud) => {
    cloud.puffs.forEach(([px, py, rx, ry]) => {
      const g = ctx.createRadialGradient(
        (cloud.x + px) * c,
        (cloud.y + py - ry * 0.25) * c,
        0,
        (cloud.x + px) * c,
        (cloud.y + py) * c,
        rx * c,
      )
      g.addColorStop(0, 'rgba(255,255,255,0.95)')
      g.addColorStop(0.75, 'rgba(225,240,252,0.88)')
      g.addColorStop(1, 'rgba(180,215,240,0.55)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.ellipse((cloud.x + px) * c, (cloud.y + py) * c, rx * c, ry * c, 0, 0, Math.PI * 2)
      ctx.fill()
    })
  })

  // Cross glow and body
  const cx = size * 0.5
  const cy = size * 0.34
  const vW = 28 * c
  const vH = 130 * c
  const hW = 90 * c
  const hH = 28 * c
  const hY = -16 * c

  const crossGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 180 * c)
  crossGlow.addColorStop(0, 'rgba(255,220,80,0.44)')
  crossGlow.addColorStop(0.55, 'rgba(255,190,40,0.16)')
  crossGlow.addColorStop(1, 'rgba(255,180,0,0)')
  ctx.fillStyle = crossGlow
  ctx.beginPath()
  ctx.arc(cx, cy, 180 * c, 0, Math.PI * 2)
  ctx.fill()

  const crossGradient = ctx.createLinearGradient(cx - hW / 2, cy - vH / 2, cx + hW / 2, cy + vH / 2)
  crossGradient.addColorStop(0, '#FFF8C0')
  crossGradient.addColorStop(0.28, '#FFE566')
  crossGradient.addColorStop(0.65, '#D4A020')
  crossGradient.addColorStop(1, '#A87800')
  ctx.shadowColor = 'rgba(255,200,0,0.65)'
  ctx.shadowBlur = 28 * c
  ctx.fillStyle = crossGradient
  ctx.fillRect(cx - vW / 2, cy - vH / 2, vW, vH)
  ctx.fillRect(cx - hW / 2, cy + hY - hH / 2, hW, hH)
  ctx.shadowBlur = 0
}

function main() {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  iconSizes.forEach(({ size, name }) => {
    const canvas = createCanvas(size, size)
    const ctx = canvas.getContext('2d')
    drawAppIcon(ctx, size)
    const outputPath = path.join(outputDir, name)
    fs.writeFileSync(outputPath, canvas.toBuffer('image/png'))
    console.log(`Generated ${name} (${size}x${size})`)
  })
}

main()
