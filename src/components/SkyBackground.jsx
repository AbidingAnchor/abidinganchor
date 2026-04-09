import { useEffect, useRef } from 'react'

export default function SkyBackground({ scenery }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    function getTimeOfDay() {
      if (scenery === 'day') return 'afternoon'
      if (scenery === 'night') return 'night'
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
        sun: { x: 0.8, y: 0.15, r: 0, rays: false },
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
      { x: 0.1, y: 0.08, speed: 0.08, scale: 1.0, alpha: 1.0, size: 'large', puffs: [
        { x: 0, y: 0, rx: 100, ry: 50 },
        { x: 70, y: 10, rx: 80, ry: 40 },
        { x: -60, y: 15, rx: 70, ry: 35 },
        { x: 40, y: -20, rx: 60, ry: 30 },
        { x: -30, y: -10, rx: 55, ry: 28 },
        { x: 90, y: 25, rx: 50, ry: 25 },
        { x: 20, y: 5, rx: 45, ry: 23 },
      ]},
      { x: 0.35, y: 0.15, speed: 0.06, scale: 0.85, alpha: 0.9, size: 'medium', puffs: [
        { x: 0, y: 0, rx: 65, ry: 32 },
        { x: 50, y: 12, rx: 50, ry: 25 },
        { x: -45, y: 15, rx: 45, ry: 22 },
        { x: 30, y: -15, rx: 40, ry: 20 },
        { x: -25, y: -8, rx: 35, ry: 18 },
        { x: 70, y: 20, rx: 30, ry: 15 },
      ]},
      { x: 0.6, y: 0.1, speed: 0.07, scale: 1.2, alpha: 0.95, size: 'large', puffs: [
        { x: 0, y: 0, rx: 110, ry: 55 },
        { x: 80, y: 15, rx: 85, ry: 42 },
        { x: -70, y: 18, rx: 75, ry: 38 },
        { x: 50, y: -22, rx: 65, ry: 32 },
        { x: -35, y: -12, rx: 55, ry: 28 },
        { x: 100, y: 28, rx: 50, ry: 25 },
        { x: 25, y: 8, rx: 45, ry: 22 },
      ]},
      { x: 0.85, y: 0.18, speed: 0.05, scale: 0.7, alpha: 0.85, size: 'small', puffs: [
        { x: 0, y: 0, rx: 45, ry: 22 },
        { x: 35, y: 10, rx: 35, ry: 18 },
        { x: -30, y: 12, rx: 30, ry: 15 },
        { x: 20, y: -10, rx: 28, ry: 14 },
        { x: -18, y: -6, rx: 25, ry: 12 },
      ]},
      { x: 0.2, y: 0.2, speed: 0.09, scale: 0.9, alpha: 0.88, size: 'medium', puffs: [
        { x: 0, y: 0, rx: 70, ry: 35 },
        { x: 55, y: 14, rx: 55, ry: 28 },
        { x: -48, y: 16, rx: 48, ry: 24 },
        { x: 32, y: -18, rx: 42, ry: 21 },
        { x: -28, y: -10, rx: 38, ry: 19 },
        { x: 75, y: 22, rx: 32, ry: 16 },
      ]},
      { x: 0.7, y: 0.12, speed: 0.06, scale: 1.1, alpha: 0.92, size: 'large', puffs: [
        { x: 0, y: 0, rx: 105, ry: 52 },
        { x: 75, y: 12, rx: 82, ry: 41 },
        { x: -65, y: 14, rx: 72, ry: 36 },
        { x: 42, y: -20, rx: 62, ry: 31 },
        { x: -32, y: -9, rx: 54, ry: 27 },
        { x: 95, y: 26, rx: 48, ry: 24 },
        { x: 22, y: 6, rx: 44, ry: 22 },
      ]},
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
      ctx.save()
      ctx.globalAlpha = 0.85
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
        ctx.restore()
        return
      }
      if (sun.r <= 0) {
        ctx.restore()
        return
      }
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
      ctx.restore()
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
      const w = W()
      const h = H()
      const y = Math.min(cloud.y * h, 180)
      const x = cloud.x * w
      ctx.save()
      ctx.globalAlpha = cloud.alpha
      ctx.translate(x, y)
      const s = cloud.scale
      const isNight = blendedTheme.nightFactor > 0.5

      // Shadow layer at bottom for depth
      ctx.save()
      ctx.globalAlpha = 0.3
      ctx.translate(6 * s, 18 * s)
      for (const p of cloud.puffs) {
        ctx.beginPath()
        ctx.ellipse(p.x * s, p.y * s, p.rx * s, p.ry * s, 0, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(20,40,80,0.3)'
        ctx.fill()
      }
      ctx.restore()

      // Main cloud body with realistic colors
      for (const p of cloud.puffs) {
        ctx.beginPath()
        ctx.ellipse(p.x * s, p.y * s, p.rx * s, p.ry * s, 0, 0, Math.PI * 2)
        
        if (isNight) {
          // Night cloud colors: base, lit top, shadow bottom
          const pg = ctx.createRadialGradient(
            p.x * s, (p.y - p.ry * 0.3) * s, 0,
            p.x * s, (p.y + p.ry * 0.3) * s, p.ry * s
          )
          pg.addColorStop(0, 'rgba(220, 230, 245, 0.65)') // Lit top
          pg.addColorStop(0.5, 'rgba(180, 200, 230, 0.55)') // Base
          pg.addColorStop(1, 'rgba(100, 120, 160, 0.4)') // Shadow bottom
          ctx.fillStyle = pg
        } else {
          // Day cloud colors
          const pg = ctx.createRadialGradient(p.x * s, (p.y - p.ry * 0.2) * s, 0, p.x * s, p.y * s, p.rx * s)
          pg.addColorStop(0, 'rgba(255,255,255,1)')
          pg.addColorStop(0.55, 'rgba(245,250,255,0.98)')
          pg.addColorStop(0.82, 'rgba(225,240,255,0.94)')
          pg.addColorStop(1, 'rgba(200,228,250,0.86)')
          ctx.fillStyle = pg
        }
        ctx.fill()
      }

      // Moonlit top edge for night
      if (isNight) {
        ctx.save()
        ctx.globalAlpha = 0.15
        for (const p of cloud.puffs) {
          const pg = ctx.createRadialGradient(
            p.x * s, (p.y - p.ry * 0.4) * s, 0,
            p.x * s, p.y * s, p.rx * s
          )
          pg.addColorStop(0, 'rgba(255,255,255,0.25)')
          pg.addColorStop(1, 'rgba(255,255,255,0)')
          ctx.beginPath()
          ctx.ellipse(p.x * s, p.y * s, p.rx * s, p.ry * s, 0, 0, Math.PI * 2)
          ctx.fillStyle = pg
          ctx.fill()
        }
        ctx.restore()
      }

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
        c.x += c.speed * dt * 0.02
        if (c.x > 1.5) c.x = -0.5
        drawCloud(c, blendedTheme)
      }
      drawHaze(w, h)
      animId = requestAnimationFrame(animate)
    }
    animId = requestAnimationFrame(animate)

    const timeWatcher = setInterval(() => {
      if (scenery === 'day' || scenery === 'night') return
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
  }, [scenery])

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
