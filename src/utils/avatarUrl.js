/** MIME → normalized file extension for storage paths */
const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])

/**
 * Pick extension for avatar upload: prefer MIME, then filename; default jpg.
 * Supports jpg, jpeg, png, webp, gif (jpeg → jpg).
 */
export function getAvatarUploadExtension(file) {
  if (!file) return 'jpg'
  if (file.type && MIME_TO_EXT[file.type]) {
    return MIME_TO_EXT[file.type]
  }
  const raw = file.name?.split('.').pop()?.toLowerCase()
  if (raw && ALLOWED_EXT.has(raw)) {
    return raw === 'jpeg' ? 'jpg' : raw
  }
  return 'jpg'
}

/**
 * Append cache-busting query for display only (do not save this to the DB).
 * Wrap with useMemo(() => appendAvatarCacheBust(url), [url]) in components.
 */
export function appendAvatarCacheBust(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null
  const sep = rawUrl.includes('?') ? '&' : '?'
  return `${rawUrl}${sep}t=${Date.now()}`
}
