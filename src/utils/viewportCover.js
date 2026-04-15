/** Size for full-bleed canvas/background layers on mobile/PWA (avoids gaps vs 100dvh). */
export function getViewportCoverSize() {
  const w = Math.max(window.innerWidth, document.documentElement?.clientWidth || 0)
  const h = Math.max(
    window.innerHeight,
    document.documentElement?.clientHeight || 0,
    window.visualViewport?.height || 0,
  )
  return { w: Math.max(1, w), h: Math.max(1, h) }
}
