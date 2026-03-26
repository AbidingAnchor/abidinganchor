import { useEffect, useRef } from 'react'

export default function SkyBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    function getTimeOfDay() {
      const hour = new Date().getHours()
      if (hour >= 6 && hour < 11) return 'morning'
      if (hour >= 11 && hour < 18) return 'afternoon'
      if (hour >= 18 && hour < 20) return 'evening'
      return 'night'
    }

    function lerpColor(c1, c2, t) {
      const h = (s) => parseInt(s.replace('#', ''), 16)
      const r1 = h(c1) >> 16
      const g1 = (h(c1) >> 8) & 255
      const b1 = h(c1) & 255
      const r2 = h(c2) >> 16
      const g2 = (h(c2) >> 8) & 255
      const b2 = h(c2) & 255
      const r = Math.round(r1 + (r2 - r1) * t)
      const g = Math.round(g1 + (g2 - g1) * t)
      const b = Math.round(b1 + (b2 - b1) * t)
      return `rgb(${r},${g},${b})`
    }

    const lerpNumber = (a, b, t) => a + (b - a) * t

    const themes = {
      morning: {
        gradient: ['#78b7e7', '#95caef', '#b8def4', '#d6ebf8', '#e7f4fc'],
        sun: { x: 0.73, y: 0.17, r: 40, rays: true },
        cloudShade: '#255f92',
        cross: { top: '#FFF8C0', mid: '#FFE566', low: '#D4A020', edge: '#A87800' },
        showStarsMoon: false,
      },
      afternoon: {
        gradient: ['#1a6eb5', '#2e8fd4', '#4eaee8', '#a8d8f0', '#e8f5fd'],
        sun: { x: 0.62, y: 0.08, r: 46, rays: true },
        cloudShade: '#2060A0',
        cross: { top: '#FFF8C0', mid: '#FFE566', low: '#D4A020', edge: '#A87800' },
        showStarsMoon: false,
      },
      evening: {
        gradient: ['#1f4474', '#4e5f9a', '#9072b2', '#c88793', '#f2a673'],
        sun: { x: 0.28, y: 0.14, r: 36, rays: true },
        cloudShade: '#483f74',
        cross: { top: '#FFE6AF', mid: '#FFCC6D', low: '#D28B3F', edge: '#8A5A22' },
        showStarsMoon: false,
      },
      night: {
        gradient: ['#070d25', '#10224c', '#1b3563', '#223f6e', '#274a78'],
        sun: { x: 0.8, y: 0.15, r: 26, rays: true },
        cloudShade: '#14223e',
        cross: { top: '#FFE8BF', mid: '#FFD275', low: '#C99137', edge: '#8B5A1F' },
        showStarsMoon: true,
      },
    }

    let currentPeriod = getTimeOfDay()
    let currentTheme = themes[currentPeriod]
    let targetTheme = currentTheme
    let transitionProgress = 0
    let isTransitioning = false

    function resize() {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const W = () => canvas.offsetWidth
    const H = () => canvas.offsetHeight

    const sun = { x: currentTheme.sun.x, y: currentTheme.sun.y, r: currentTheme.sun.r, rayAngle: 0 }

    const clouds = [
      { x: -200, y: 0.13, speed: 0.18, scale: 1.4, alpha: 1.0, puffs: [{ x: 0, y: 0, rx: 90, ry: 48 }, { x: 75, y: 12, rx: 70, ry: 42 }, { x: -65, y: 15, rx: 60, ry: 36 }, { x: 30, y: -18, rx: 55, ry: 38 }, { x: -20, y: -10, rx: 50, ry: 32 }, { x: 110, y: 22, rx: 45, ry: 30 }] },
      { x: -100, y: 0.15, speed: 0.11, scale: 1.0, alpha: 0.92, puffs: [{ x: 0, y: 0, rx: 70, ry: 36 }, { x: 58, y: 10, rx: 55, ry: 30 }, { x: -50, y: 12, rx: 48, ry: 26 }, { x: 20, y: -14, rx: 44, ry: 28 }, { x: 90, y: 18, rx: 36, ry: 22 }] },
      { x: 320, y: 0.09, speed: 0.14, scale: 1.2, alpha: 0.96, puffs: [{ x: 0, y: 0, rx: 80, ry: 44 }, { x: 68, y: 14, rx: 62, ry: 36 }, { x: -58, y: 16, rx: 54, ry: 32 }, { x: 28, y: -16, rx: 50, ry: 34 }, { x: 105, y: 20, rx: 40, ry: 26 }, { x: -20, y: -8, rx: 46, ry: 28 }] },
      { x: 620, y: 0.16, speed: 0.09, scale: 0.85, alpha: 0.88, puffs: [{ x: 0, y: 0, rx: 60, ry: 30 }, { x: 48, y: 8, rx: 46, ry: 24 }, { x: -40, y: 10, rx: 40, ry: 22 }, { x: 16, y: -12, rx: 38, ry: 22 }, { x: 75, y: 14, rx: 30, ry: 18 }] },
      { x: -320, y: 0.18, speed: 0.07, scale: 0.7, alpha: 0.75, puffs: [{ x: 0, y: 0, rx: 50, ry: 24 }, { x: 40, y: 6, rx: 38, ry: 20 }, { x: -32, y: 8, rx: 34, ry: 18 }, { x: 12, y: -10, rx: 30, ry: 18 }, { x: 62, y: 12, rx: 26, ry: 14 }] },
      { x: 460, y: 0.2, speed: 0.13, scale: 0.9, alpha: 0.8, puffs: [{ x: 0, y: 0, rx: 65, ry: 32 }, { x: 52, y: 10, rx: 50, ry: 26 }, { x: -44, y: 12, rx: 44, ry: 22 }, { x: 22, y: -12, rx: 40, ry: 24 }, { x: 82, y: 16, rx: 32, ry: 18 }] },
    ]

    const stars = Array.from({ length: 60 }).map(() => ({
      x: Math.random(),
      y: Math.random() * 0.55,
      r: Math.random() * 1.7 + 0.4,
      twinkle: Math.random() * Math.PI * 2,
    }))

    function getBlendedTheme(t) {
      return {
        gradient: currentTheme.gradient.map((c, i) => lerpColor(c, targetTheme.gradient[i], t)),
        sun: {
          x: lerpNumber(currentTheme.sun.x, targetTheme.sun.x, t),
          y: lerpNumber(currentTheme.sun.y, targetTheme.sun.y, t),
          r: lerpNumber(currentTheme.sun.r, targetTheme.sun.r, t),
          rays: t < 0.5 ? currentTheme.sun.rays : targetTheme.sun.rays,
        },
        cloudShade: lerpColor(currentTheme.cloudShade, targetTheme.cloudShade, t),
        cross: {
          top: lerpColor(currentTheme.cross.top, targetTheme.cross.top, t),
          mid: lerpColor(currentTheme.cross.mid, targetTheme.cross.mid, t),
          low: lerpColor(currentTheme.cross.low, targetTheme.cross.low, t),
          edge: lerpColor(currentTheme.cross.edge, targetTheme.cross.edge, t),
        },
        nightFactor:
          lerpNumber(currentTheme.showStarsMoon ? 1 : 0, targetTheme.showStarsMoon ? 1 : 0, t),
      }
    }

    function drawSkyGradient(w, h, blendedTheme) {
      const g = ctx.createLinearGradient(0, 0, 0, h)
      blendedTheme.gradient.forEach((color, i) => g.addColorStop(i / (blendedTheme.gradient.length - 1), color))
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
    }

    function drawSunRays(sx, sy, blendedTheme) {
      if (!blendedTheme.sun.rays || sun.r <= 0) return
      const rayStrength = 0.32 + blendedTheme.nightFactor * 0.34
      for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2 + sun.rayAngle
        const innerR = sun.r + 8
        const outerR = sun.r + 90 + Math.sin(i * 2.3) * 30
        const x1 = sx + Math.cos(angle) * innerR
        const y1 = sy + Math.sin(angle) * innerR
        const x2 = sx + Math.cos(angle) * outerR
        const y2 = sy + Math.sin(angle) * outerR
        const g = ctx.createLinearGradient(x1, y1, x2, y2)
        g.addColorStop(0, `rgba(255,230,120,${rayStrength})`)
        g.addColorStop(1, 'rgba(255,220,60,0)')
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.strokeStyle = g
        ctx.lineWidth = 3 + Math.sin(i * 1.7) * 1.5
        ctx.stroke()
      }
    }

    function drawSunOrMoon(sx, sy, blendedTheme) {
      if (blendedTheme.nightFactor > 0.55) {
        const moonGlow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 170)
        moonGlow.addColorStop(0, 'rgba(255,220,120,0.55)')
        moonGlow.addColorStop(0.45, 'rgba(255,210,110,0.25)')
        moonGlow.addColorStop(1, 'rgba(255,210,110,0)')
        ctx.beginPath()
        ctx.arc(sx, sy, 170, 0, Math.PI * 2)
        ctx.fillStyle = moonGlow
        ctx.fill()
        ctx.beginPath()
        ctx.arc(sx, sy, 36, 0, Math.PI * 2)
        ctx.fillStyle = '#FFE9B3'
        ctx.fill()
        return
      }
      if (sun.r <= 0) return
      const g1 = ctx.createRadialGradient(sx, sy, 0, sx, sy, sun.r * 4)
      g1.addColorStop(0, 'rgba(255,240,120,0.45)')
      g1.addColorStop(0.4, 'rgba(255,210,60,0.18)')
      g1.addColorStop(1, 'rgba(255,200,0,0)')
      ctx.beginPath()
      ctx.arc(sx, sy, sun.r * 4, 0, Math.PI * 2)
      ctx.fillStyle = g1
      ctx.fill()
      const g2 = ctx.createRadialGradient(sx - sun.r * 0.25, sy - sun.r * 0.25, 2, sx, sy, sun.r)
      g2.addColorStop(0, '#FFF9C4')
      g2.addColorStop(0.4, '#FFE55A')
      g2.addColorStop(0.75, '#FFD020')
      g2.addColorStop(1, '#FFB800')
      ctx.beginPath()
      ctx.arc(sx, sy, sun.r, 0, Math.PI * 2)
      ctx.fillStyle = g2
      ctx.fill()
    }

    function drawStars(w, h, ts, blendedTheme) {
      if (blendedTheme.nightFactor <= 0.01) return
      stars.forEach((s) => {
        const a = (0.35 + (Math.sin(ts / 700 + s.twinkle) + 1) * 0.28) * blendedTheme.nightFactor
        ctx.beginPath()
        ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,245,${a})`
        ctx.fill()
      })
    }

    function drawCloud(cloud, blendedTheme) {
      const h = H()
      const y = Math.min(cloud.y * h, 160)
      const nightFactor = blendedTheme.nightFactor || 0
      ctx.save()
      ctx.globalAlpha = cloud.alpha * (1 + nightFactor * 0.18)
      ctx.translate(cloud.x, y)
      const s = cloud.scale
      ctx.save()
      ctx.globalAlpha = cloud.alpha * (0.15 + nightFactor * 0.2)
      ctx.translate(6 * s, 14 * s)
      for (const p of cloud.puffs) {
        ctx.beginPath()
        ctx.ellipse(p.x * s, p.y * s, p.rx * s, p.ry * s, 0, 0, Math.PI * 2)
        ctx.fillStyle = blendedTheme.cloudShade
        ctx.fill()
      }
      ctx.restore()
      for (const p of cloud.puffs) {
        const pg = ctx.createRadialGradient(p.x * s, (p.y - p.ry * 0.2) * s, 0, p.x * s, p.y * s, p.rx * s)
        pg.addColorStop(0, `rgba(255,255,255,${1})`)
        pg.addColorStop(0.55, `rgba(245,250,255,${0.97 + nightFactor * 0.03})`)
        pg.addColorStop(0.82, `rgba(225,240,255,${0.92 + nightFactor * 0.08})`)
        pg.addColorStop(1, `rgba(200,228,250,${0.75 + nightFactor * 0.18})`)
        ctx.beginPath()
        ctx.ellipse(p.x * s, p.y * s, p.rx * s, p.ry * s, 0, 0, Math.PI * 2)
        ctx.fillStyle = pg
        ctx.fill()
      }
      ctx.restore()
    }

    function drawCross(w, h, blendedTheme) {
      const t = Date.now() / 1000
      const floatY = Math.sin(t * 0.5) * 5
      const nightFactor = blendedTheme.nightFactor || 0
      ctx.save()
      ctx.translate(w * 0.5, h * 0.12 + floatY)
      const vW = 28
      const vH = 130
      const hW = 90
      const hH = 28
      const hY = -16
      ctx.globalAlpha = 1
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 120)
      glow.addColorStop(0, `rgba(255,220,90,${0.45 + nightFactor * 0.3})`)
      glow.addColorStop(0.55, `rgba(255,200,50,${0.15 + nightFactor * 0.25})`)
      glow.addColorStop(1, 'rgba(255,180,0,0)')
      ctx.beginPath()
      ctx.arc(0, 0, 120, 0, Math.PI * 2)
      ctx.fillStyle = glow
      ctx.fill()
      const cg = ctx.createLinearGradient(-hW / 2, -vH / 2, hW / 2, vH / 2)
      cg.addColorStop(0, blendedTheme.cross.top)
      cg.addColorStop(0.25, blendedTheme.cross.mid)
      cg.addColorStop(0.6, blendedTheme.cross.low)
      cg.addColorStop(1, blendedTheme.cross.edge)
      ctx.shadowColor = `rgba(255,200,40,${0.6 + nightFactor * 0.25})`
      ctx.shadowBlur = 20 + nightFactor * 16
      ctx.beginPath()
      ctx.rect(-vW / 2, -vH / 2, vW, vH)
      ctx.fillStyle = cg
      ctx.fill()
      ctx.beginPath()
      ctx.rect(-hW / 2, hY - hH / 2, hW, hH)
      ctx.fillStyle = cg
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.restore()
    }

    function drawHaze(w, h) {
      const haze = ctx.createLinearGradient(0, h * 0.6, 0, h)
      haze.addColorStop(0, 'rgba(200,230,255,0)')
      haze.addColorStop(1, 'rgba(220,240,255,0.5)')
      ctx.fillStyle = haze
      ctx.fillRect(0, h * 0.6, w, h * 0.4)
    }

    let last = 0
    let animId
    function animate(ts) {
      const dt = Math.min((ts - last) / 1000, 0.05)
      last = ts
      if (isTransitioning) {
        transitionProgress = Math.min(1, transitionProgress + dt / 60)
        if (transitionProgress >= 1) {
          currentTheme = targetTheme
          isTransitioning = false
          transitionProgress = 0
        }
      }
      const blendedTheme = getBlendedTheme(transitionProgress)
      const w = W()
      const h = H()
      ctx.clearRect(0, 0, w, h)
      drawSkyGradient(w, h, blendedTheme)
      drawStars(w, h, ts, blendedTheme)
      sun.rayAngle += dt * 0.04
      sun.x = blendedTheme.sun.x
      sun.y = blendedTheme.sun.y
      sun.r = blendedTheme.sun.r
      const sx = sun.x * w
      const sy = sun.y * h
      drawSunRays(sx, sy, blendedTheme)
      drawSunOrMoon(sx, sy, blendedTheme)
      for (const c of clouds) {
        c.x += c.speed * (w / 800) * 60 * dt
        if (c.x > w + 420) c.x = -420
        drawCloud(c, blendedTheme)
      }
      drawCross(w, h, blendedTheme)
      drawHaze(w, h)
      animId = requestAnimationFrame(animate)
    }
    animId = requestAnimationFrame(animate)

    const timeWatcher = setInterval(() => {
      const next = getTimeOfDay()
      if (next !== currentPeriod) {
        currentPeriod = next
        targetTheme = themes[currentPeriod]
        transitionProgress = 0
        isTransitioning = true
      }
    }, 60000)

    return () => {
      cancelAnimationFrame(animId)
      clearInterval(timeWatcher)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        clipPath: 'inset(0)',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          zIndex: 1,
          background: 'transparent',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '220px',
          background: 'linear-gradient(to bottom, transparent 0%, #1a6eb5 60%, #1a6eb5 100%)',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
