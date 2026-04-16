/**
 * Normalize get_ministry_transparency_stats RPC payload (JSON object or legacy row shape).
 */
export function parseMinistryTransparencyStats(data) {
  if (data == null) {
    return { aiPrayers: 0, usersReached: 0 }
  }
  const stats =
    typeof data === 'object' && !Array.isArray(data)
      ? data
      : Array.isArray(data)
        ? data[0]
        : null
  if (!stats || typeof stats !== 'object') {
    return { aiPrayers: 0, usersReached: 0 }
  }
  const ai = stats.ai_answers ?? stats.ai_prayers_answered
  const users = stats.users_reached
  return {
    aiPrayers: Number(ai ?? 0),
    usersReached: Number(users ?? 0),
  }
}
