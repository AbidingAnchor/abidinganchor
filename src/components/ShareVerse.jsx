import { useEffect, useMemo, useRef } from 'react'

function incrementSharedCount() {
  const raw = localStorage.getItem('abidinganchor-shared-count')
  const count = raw ? Number(raw) || 0 : 0
  localStorage.setItem('abidinganchor-shared-count', String(count + 1))
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ')
  const lines = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate
    } else {
      if (line) lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  return lines
}

export default function ShareVerse({ text, reference, onClose }) {
  const canvasRef = useRef(null)
  const fileName = useMemo(() => `abidinganchor-${reference.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`, [reference])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    canvas.width = 800
    canvas.height = 800

    const gradient = ctx.createLinearGradient(0, 0, 800, 800)
    gradient.addColorStop(0, '#0d1f4e')
    gradient.addColorStop(1, '#1a3a7a')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 800, 800)

    ctx.globalAlpha = 0.15
    ctx.fillStyle = '#D4A843'
    ctx.fillRect(388, 160, 24, 300)
    ctx.fillRect(300, 270, 200, 24)
    ctx.globalAlpha = 1

    ctx.strokeStyle = '#D4A843'
    ctx.lineWidth = 2
    ctx.strokeRect(24, 24, 752, 752)

    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'italic 42px Georgia'
    ctx.textAlign = 'center'
    const lines = wrapText(ctx, text, 620)
    const lineHeight = 56
    const startY = 330 - (lines.length * lineHeight) / 2
    lines.forEach((line, i) => ctx.fillText(line, 400, startY + i * lineHeight))

    ctx.fillStyle = '#D4A843'
    ctx.font = '700 28px Arial'
    ctx.fillText(reference, 400, startY + lines.length * lineHeight + 46)

    ctx.fillStyle = '#D4A843'
    ctx.font = '700 20px Arial'
    ctx.fillText('AbidingAnchor', 400, 730)
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.font = '16px Arial'
    ctx.fillText('Anchored in His Word', 400, 758)
  }, [text, reference])

  const handleDownload = () => {
    const url = canvasRef.current.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    incrementSharedCount()
  }

  const handleShare = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!navigator.share) {
      handleDownload()
      return
    }
    canvas.toBlob(async (blob) => {
      if (!blob) return handleDownload()
      const file = new File([blob], fileName, { type: 'image/png' })
      try {
        await navigator.share({ files: [file], title: reference, text })
        incrementSharedCount()
      } catch {
        handleDownload()
      }
    }, 'image/png')
  }

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/70 p-4">
      <article className="w-full max-w-[860px] rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md">
        <canvas ref={canvasRef} className="w-full rounded-xl border border-white/20" />
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button type="button" onClick={handleDownload} className="rounded-xl px-3 py-2 text-sm font-semibold text-[#1a1a1a]" style={{ background: '#D4A843' }}>
            📥 Download Image
          </button>
          <button type="button" onClick={handleShare} className="rounded-xl border border-[#D4A843] px-3 py-2 text-sm font-semibold text-white">
            📤 Share
          </button>
          <button type="button" onClick={onClose} className="rounded-xl border border-white/30 px-3 py-2 text-sm font-semibold text-white">
            ✕ Close
          </button>
        </div>
      </article>
    </div>
  )
}
