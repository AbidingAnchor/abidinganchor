import { useEffect, useRef } from 'react'

/**
 * Aged biblical parchment for Journey Map — gradient, grain (canvas), vignette, map lines, worn edges.
 */
export default function JourneyMapParchmentScene() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const parent = canvas.parentElement
    if (!parent) return

    let w = 300
    let h = 300

    const paintGrain = () => {
      const id = ctx.createImageData(w, h)
      const data = id.data
      for (let i = 0; i < data.length; i += 4) {
        const n = (Math.random() - 0.5) * 28
        const v = 128 + n
        data[i] = v
        data[i + 1] = v - 8
        data[i + 2] = v - 20
        data[i + 3] = 38
      }
      ctx.putImageData(id, 0, 0)
    }

    const resize = () => {
      const rect = parent.getBoundingClientRect()
      w = Math.max(1, Math.floor(rect.width))
      h = Math.max(1, Math.floor(rect.height))
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      paintGrain()
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(parent)
    window.addEventListener('resize', resize)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <div className="jmp-scroll pointer-events-none absolute inset-0 overflow-hidden rounded-xl" aria-hidden>
      <style>
        {`
          .jmp-scroll {
            box-shadow:
              inset 0 0 80px rgba(80, 40, 0, 0.5),
              inset 0 0 24px rgba(60, 30, 0, 0.35);
          }
          .jmp-scroll__base {
            position: absolute;
            inset: 0;
            background: linear-gradient(180deg, #e8d5a3 0%, #dfc88a 48%, #c9a85c 100%);
          }
          .jmp-scroll__lines {
            position: absolute;
            inset: 0;
            opacity: 0.55;
            background:
              repeating-linear-gradient(
                0deg,
                transparent 0,
                transparent 36px,
                rgba(139, 105, 20, 0.07) 36px,
                rgba(139, 105, 20, 0.07) 37px
              ),
              repeating-linear-gradient(
                58deg,
                transparent 0,
                transparent 72px,
                rgba(100, 70, 30, 0.05) 72px,
                rgba(100, 70, 30, 0.05) 73px
              ),
              repeating-linear-gradient(
                -32deg,
                transparent 0,
                transparent 90px,
                rgba(80, 50, 20, 0.035) 90px,
                rgba(80, 50, 20, 0.035) 91px
              );
            pointer-events: none;
          }
          .jmp-scroll__edge {
            position: absolute;
            inset: 0;
            border-radius: inherit;
            border: 2px solid rgba(100, 65, 25, 0.45);
            box-shadow:
              inset 2px 2px 0 rgba(255, 245, 220, 0.25),
              inset -2px -2px 0 rgba(60, 35, 10, 0.12);
            pointer-events: none;
          }
          .jmp-scroll__tatter {
            position: absolute;
            inset: -3px;
            border-radius: 14px;
            background: transparent;
            clip-path: polygon(
              0% 2%, 3% 0%, 8% 1%, 14% 0%, 22% 1%, 30% 0%, 40% 1%, 50% 0%, 60% 1%, 70% 0%, 80% 1%, 90% 0%, 97% 1%, 100% 3%,
              100% 8%, 99% 14%, 100% 22%, 99% 32%, 100% 42%, 99% 52%, 100% 62%, 99% 72%, 100% 82%, 99% 92%, 97% 100%,
              92% 99%, 85% 100%, 75% 99%, 65% 100%, 55% 99%, 45% 100%, 35% 99%, 25% 100%, 15% 99%, 5% 100%, 0% 97%,
              1% 90%, 0% 80%, 1% 70%, 0% 58%, 1% 46%, 0% 34%, 1% 22%, 0% 10%
            );
            box-shadow: inset 0 0 0 1px rgba(80, 45, 15, 0.2);
            pointer-events: none;
            opacity: 0.85;
          }
          .jmp-scroll__grain {
            position: absolute;
            inset: 0;
            mix-blend-mode: multiply;
            opacity: 0.42;
            pointer-events: none;
          }
        `}
      </style>
      <div className="jmp-scroll__base" />
      <div className="jmp-scroll__lines" />
      <canvas ref={canvasRef} className="jmp-scroll__grain h-full w-full" />
      <div className="jmp-scroll__tatter" />
      <div className="jmp-scroll__edge" />
    </div>
  )
}
