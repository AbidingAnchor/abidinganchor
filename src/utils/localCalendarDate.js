/**
 * Local calendar helpers — same clock as greeting + theme (Home `getHours()`, BackgroundManager /
 * `getBackgroundTypeForTime`): uses the device timezone via `Date`’s local getters, never UTC
 * (`toISOString()` / `getUTC*`).
 */

/**
 * Today’s date in the user’s local timezone as YYYY-MM-DD.
 * @param {Date} [date]
 * @returns {string}
 */
export function getLocalCalendarDateKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  const now = Number.isNaN(d.getTime()) ? new Date() : d
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
