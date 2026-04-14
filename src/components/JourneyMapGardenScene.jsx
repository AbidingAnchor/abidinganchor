import { useEffect, useRef } from 'react'

/**
 * Painterly animated garden (CSS + canvas) — no external images.
 * Sits behind the journey SVG; complements warm day-sky themes.
 */
export default function JourneyMapGardenScene() {
  const canvasRef = useRef(null)
  const rafRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const parent = canvas.parentElement
    if (!parent) return

    let w = 300
    let h = 200
    let dpr = 1

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = parent.getBoundingClientRect()
      w = Math.max(1, rect.width)
      h = Math.max(1, rect.height)
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    let t = 0
    const draw = () => {
      t += 0.015
      ctx.clearRect(0, 0, w, h)

      // River band (mid vertical slice of this overlay) — shimmer
      const ry = h * 0.38
      const rh = h * 0.14
      const shimmer = (Math.sin(t * 1.2) * 0.5 + 0.5) * 18
      const g = ctx.createLinearGradient(0, ry, w, ry + rh)
      g.addColorStop(0, `rgba(130, 185, 220, ${0.12 + shimmer / 200})`)
      g.addColorStop(0.35 + Math.sin(t * 0.8) * 0.08, `rgba(200, 230, 250, ${0.22 + shimmer / 250})`)
      g.addColorStop(0.65, `rgba(160, 210, 235, ${0.15 + shimmer / 220})`)
      g.addColorStop(1, `rgba(120, 175, 210, ${0.1 + shimmer / 200})`)

      ctx.save()
      ctx.globalAlpha = 0.85
      ctx.beginPath()
      ctx.moveTo(0, ry + rh * 0.35)
      ctx.quadraticCurveTo(w * 0.25, ry - rh * 0.2, w * 0.5, ry + rh * 0.25)
      ctx.quadraticCurveTo(w * 0.72, ry + rh * 0.55, w, ry + rh * 0.2)
      ctx.lineTo(w, ry + rh * 1.2)
      ctx.lineTo(0, ry + rh * 1.1)
      ctx.closePath()
      ctx.fillStyle = g
      ctx.fill()
      ctx.restore()

      // Soft sparkle lines on water
      ctx.save()
      ctx.globalAlpha = 0.35
      for (let i = 0; i < 7; i++) {
        const x = ((i * 73 + t * 40) % (w + 40)) - 20
        const y = ry + rh * (0.35 + Math.sin(t + i) * 0.15)
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.25 + Math.sin(t * 2 + i) * 0.15})`
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + 22 + Math.sin(t + i) * 6, y - 1)
        ctx.stroke()
      }
      ctx.restore()

      rafRef.current = requestAnimationFrame(draw)
    }

    resize()
    const ro = new ResizeObserver(() => resize())
    ro.observe(parent)
    window.addEventListener('resize', resize)
    rafRef.current = requestAnimationFrame(draw)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div
      className="journey-map-garden pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
      aria-hidden
    >
      <style>
        {`
          .journey-map-garden {
            --g-sky-top: #87b8e8;
            --g-sky-mid: #c9ddf5;
            --g-sky-low: #f5e6c8;
            --g-hill-far: #6a9e6e;
            --g-hill-near: #4d8a56;
            --g-grass: #3d7a48;
            --g-grass-deep: #2d5c36;
            --g-sun: #ffd88a;
            --g-sun-core: #fff3d0;
          }
          .jmg-sky {
            position: absolute;
            inset: 0;
            background: linear-gradient(
              165deg,
              var(--g-sky-top) 0%,
              #a8c8ec 22%,
              var(--g-sky-mid) 48%,
              #e8d4a8 78%,
              var(--g-sky-low) 100%
            );
          }
          .jmg-sun-wrap {
            position: absolute;
            top: -6%;
            right: 6%;
            width: min(120px, 28vw);
            height: min(120px, 28vw);
            animation: jmg-sun-pulse 14s ease-in-out infinite;
          }
          .jmg-sun-core {
            position: absolute;
            inset: 18%;
            border-radius: 50%;
            background: radial-gradient(circle at 40% 35%, var(--g-sun-core), var(--g-sun) 55%, rgba(255, 200, 100, 0.5) 100%);
            box-shadow:
              0 0 40px rgba(255, 220, 160, 0.65),
              0 0 80px rgba(255, 200, 120, 0.35);
          }
          .jmg-sun-rays {
            position: absolute;
            inset: 0;
            border-radius: 50%;
            background: repeating-conic-gradient(
              from 0deg,
              rgba(255, 235, 200, 0.14) 0deg 8deg,
              transparent 8deg 16deg
            );
            animation: jmg-rays-spin 120s linear infinite;
            opacity: 0.55;
            mix-blend-mode: soft-light;
          }
          @keyframes jmg-rays-spin {
            to { transform: rotate(360deg); }
          }
          @keyframes jmg-sun-pulse {
            0%, 100% { filter: brightness(1); transform: scale(1); }
            50% { filter: brightness(1.06); transform: scale(1.02); }
          }
          .jmg-haze {
            position: absolute;
            inset: 0;
            background:
              radial-gradient(ellipse 120% 60% at 50% 100%, rgba(255, 248, 230, 0.35) 0%, transparent 55%),
              radial-gradient(ellipse 80% 45% at 20% 30%, rgba(255, 255, 255, 0.12) 0%, transparent 50%),
              radial-gradient(ellipse 70% 40% at 85% 25%, rgba(255, 220, 180, 0.15) 0%, transparent 45%);
            mix-blend-mode: soft-light;
            animation: jmg-haze-drift 28s ease-in-out infinite alternate;
          }
          @keyframes jmg-haze-drift {
            from { opacity: 0.85; transform: translateY(0); }
            to { opacity: 1; transform: translateY(-4px); }
          }
          .jmg-hill-far {
            position: absolute;
            left: -15%;
            bottom: 28%;
            width: 130%;
            height: 38%;
            background: linear-gradient(180deg, var(--g-hill-far) 0%, #5a8f5e 70%, rgba(80, 130, 85, 0.9) 100%);
            border-radius: 50% 50% 0 0 / 100% 45% 0 0;
            opacity: 0.88;
            filter: blur(0.3px);
          }
          .jmg-hill-near {
            position: absolute;
            left: -8%;
            bottom: 22%;
            width: 116%;
            height: 28%;
            background: linear-gradient(180deg, var(--g-hill-near) 0%, var(--g-grass) 55%, var(--g-grass-deep) 100%);
            border-radius: 48% 52% 0 0 / 90% 38% 0 0;
            opacity: 0.92;
          }
          .jmg-river-css {
            position: absolute;
            left: 5%;
            right: 5%;
            top: 40%;
            height: 12%;
            border-radius: 50%;
            background: linear-gradient(
              90deg,
              rgba(100, 160, 200, 0.25) 0%,
              rgba(190, 225, 245, 0.42) 45%,
              rgba(120, 175, 210, 0.3) 100%
            );
            background-size: 200% 100%;
            animation: jmg-river-flow 10s ease-in-out infinite;
            filter: blur(1px);
            opacity: 0.65;
          }
          @keyframes jmg-river-flow {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
          .jmg-grass {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            height: 34%;
            background: linear-gradient(
              180deg,
              rgba(70, 140, 85, 0.15) 0%,
              var(--g-grass) 28%,
              var(--g-grass-deep) 100%
            );
            border-radius: 50% 50% 0 0 / 18% 100% 0 0;
            box-shadow: inset 0 12px 24px rgba(255, 255, 255, 0.08);
          }
          .jmg-grass::before {
            content: "";
            position: absolute;
            left: 0;
            right: 0;
            top: 0;
            height: 14px;
            background: repeating-linear-gradient(
              90deg,
              transparent 0,
              transparent 3px,
              rgba(45, 110, 55, 0.12) 3px,
              rgba(45, 110, 55, 0.12) 5px
            );
            opacity: 0.5;
            mask-image: linear-gradient(90deg, transparent, black 8%, black 92%, transparent);
          }
          .jmg-tree {
            position: absolute;
            bottom: 26%;
            width: 56px;
            z-index: 2;
          }
          .jmg-tree--L { left: 2%; }
          .jmg-tree--R { right: 3%; transform: scaleX(-1); }
          .jmg-tree-trunk {
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 10px;
            height: 42px;
            background: linear-gradient(90deg, #4a3528, #6b4f3a, #3d2a22);
            border-radius: 3px;
          }
          .jmg-tree-foliage {
            position: absolute;
            bottom: 34px;
            left: 50%;
            transform: translateX(-50%);
            width: 72px;
            height: 58px;
            background: radial-gradient(ellipse at 50% 60%, #4d9a55 0%, #2d6a38 72%, #1e4a28 100%);
            border-radius: 50% 50% 48% 48% / 60% 60% 40% 40%;
            box-shadow:
              -18px 8px 0 -6px rgba(45, 120, 60, 0.55),
              16px 6px 0 -8px rgba(40, 100, 55, 0.45);
            filter: blur(0.2px);
          }
          .jmg-tree-foliage::after {
            content: "";
            position: absolute;
            inset: 10% 15%;
            background: radial-gradient(circle at 30% 40%, rgba(180, 230, 160, 0.25), transparent 55%);
            border-radius: inherit;
          }
          .jmg-flower {
            position: absolute;
            bottom: 10%;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: radial-gradient(circle at 30% 30%, #fff8e8, #f0c860 40%, #c94a6a 100%);
            box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.25);
            opacity: 0.85;
            animation: jmg-flower-sway 6s ease-in-out infinite;
          }
          .jmg-flower:nth-child(odd) { animation-delay: -2s; }
          .jmg-flower:nth-child(3n) { animation-delay: -4s; }
          @keyframes jmg-flower-sway {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-2px) scale(1.05); }
          }
          .jmg-butterfly {
            position: absolute;
            top: 42%;
            left: -6%;
            width: 14px;
            height: 10px;
            animation: jmg-bfly-move 48s ease-in-out infinite;
            opacity: 0.78;
            z-index: 4;
          }
          .jmg-butterfly::before,
          .jmg-butterfly::after {
            content: "";
            position: absolute;
            width: 8px;
            height: 10px;
            border-radius: 50% 50% 40% 40%;
            background: linear-gradient(135deg, #c4a0ff, #f8e8ff);
            top: 0;
            animation: jmg-wing 0.35s ease-in-out infinite alternate;
          }
          .jmg-butterfly::before { left: 0; transform-origin: right center; }
          .jmg-butterfly::after { right: 0; transform: scaleX(-1); transform-origin: left center; }
          @keyframes jmg-wing {
            from { transform: rotate(-18deg); }
            to { transform: rotate(12deg); }
          }
          @keyframes jmg-bfly-move {
            0% { left: -5%; transform: translateY(0) rotate(6deg); }
            25% { left: 28%; transform: translateY(-10px) rotate(-5deg); }
            50% { left: 55%; transform: translateY(4px) rotate(4deg); }
            75% { left: 82%; transform: translateY(-8px) rotate(-3deg); }
            100% { left: 108%; transform: translateY(0) rotate(6deg); }
          }
          .jmg-bird {
            position: absolute;
            top: 18%;
            left: -5%;
            width: 12px;
            height: 6px;
            animation: jmg-bird-fly 55s linear infinite;
            opacity: 0.55;
            z-index: 3;
          }
          .jmg-bird::before,
          .jmg-bird::after {
            content: "";
            position: absolute;
            width: 6px;
            height: 3px;
            border: 1.5px solid rgba(40, 50, 70, 0.45);
            border-bottom: none;
            border-radius: 50% 50% 0 0;
            top: 2px;
          }
          .jmg-bird::before { left: 0; }
          .jmg-bird::after { right: 0; }
          @keyframes jmg-bird-fly {
            0% { transform: translate(0, 0); }
            100% { transform: translate(110vw, -12vh); }
          }
        `}
      </style>

      <div className="jmg-sky" />
      <div className="jmg-sun-wrap">
        <div className="jmg-sun-rays" />
        <div className="jmg-sun-core" />
      </div>
      <div className="jmg-haze" />
      <div className="jmg-hill-far" />
      <div className="jmg-hill-near" />
      <div className="jmg-river-css" />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-[1] h-full w-full opacity-90"
        aria-hidden
      />
      <div className="jmg-grass" />

      <div className="jmg-tree jmg-tree--L">
        <div className="jmg-tree-foliage" />
        <div className="jmg-tree-trunk" />
      </div>
      <div className="jmg-tree jmg-tree--R">
        <div className="jmg-tree-foliage" />
        <div className="jmg-tree-trunk" />
      </div>

      {[
        { l: '8%', b: '11%' },
        { l: '14%', b: '9%' },
        { l: '22%', b: '12%' },
        { l: '38%', b: '10%' },
        { l: '52%', b: '11%' },
        { l: '63%', b: '9%' },
        { l: '71%', b: '12%' },
        { l: '78%', b: '10%' },
        { l: '88%', b: '11%' },
        { l: '31%', b: '8%' },
        { l: '45%', b: '9%' },
        { l: '94%', b: '10%' },
      ].map((pos, i) => (
        <span
          key={i}
          className="jmg-flower"
          style={{ left: pos.l, bottom: pos.b }}
        />
      ))}

      <div className="jmg-butterfly" />
      <div className="jmg-bird" />
    </div>
  )
}
