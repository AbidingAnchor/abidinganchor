/** BibleProject official channel — https://www.youtube.com/@bibleproject */
export const BIBLEPROJECT_CHANNEL_ID = 'UCVfwlh9XpX2Y_tQfjeln9QA'

const SEARCH_ENDPOINT = 'https://www.googleapis.com/youtube/v3/search'

/**
 * @param {string} apiKey YouTube Data API v3 key (browser: use HTTP-referrer–restricted key)
 * @returns {Promise<{ id: string, title: string, description: string, thumbnailUrl: string, publishedAt: string }[]>}
 */
export async function fetchBibleProjectVideos(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('Missing YouTube API key')
  }

  const params = new URLSearchParams({
    channelId: BIBLEPROJECT_CHANNEL_ID,
    type: 'video',
    part: 'snippet',
    maxResults: '50',
    order: 'date',
    key: apiKey.trim(),
  })

  const res = await fetch(`${SEARCH_ENDPOINT}?${params.toString()}`)
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const msg = data?.error?.message || res.statusText || 'YouTube API request failed'
    throw new Error(msg)
  }

  const items = Array.isArray(data.items) ? data.items : []

  return items
    .map((item) => {
      const id = item?.id?.videoId
      if (!id || !item.snippet) return null
      const th = item.snippet.thumbnails
      const thumbnailUrl =
        th?.high?.url || th?.medium?.url || th?.default?.url || ''
      return {
        id,
        title: item.snippet.title || '',
        description: (item.snippet.description || '').trim(),
        thumbnailUrl,
        publishedAt: item.snippet.publishedAt || '',
      }
    })
    .filter(Boolean)
}
