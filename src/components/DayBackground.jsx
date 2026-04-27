
/**
 * Resolves sky/background type from the device clock: "day" | "sunset" | "night".
 * Uses the user's local timezone (Date getters). Bands: day 06:00–18:00, sunset 18:00–20:00, night otherwise.
 * Second parameter is accepted for API compatibility; ignored (manual theme is not used).
 */
export function getBackgroundTypeForTime(date = new Date(), _themePreferenceLegacy = null) {
  const totalMinutes = date.getHours() * 60 + date.getMinutes()
  const dayStart = 6 * 60
  const sunsetStart = 18 * 60
  const nightStart = 20 * 60

  if (totalMinutes >= dayStart && totalMinutes < sunsetStart) return "day"
  if (totalMinutes >= sunsetStart && totalMinutes < nightStart) return "sunset"
  return "night"
}

export default function DayBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
      style={{
        background: `
          linear-gradient(
            to bottom,
            #B8D9F0 0%,
            #87CEEB 30%,
            #D4EEFF 60%,
            #FFF5E6 100%
          )
        `,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 75% 8%, rgba(255, 240, 150, 0.55) 0%, transparent 45%)',
        }}
      />
    </div>
  )
}
