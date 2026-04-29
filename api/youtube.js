export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { q, type = 'search' } = req.query
    const apiKey = process.env.YOUTUBE_API_KEY

    if (!apiKey) {
      return res.status(500).json({ error: 'YouTube API key not configured' })
    }

    if (!q) {
      return res.status(400).json({ error: 'Query parameter is required' })
    }

    // Calculate page token for pagination
    const maxResults = 20
    let youtubeUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${maxResults}&q=${encodeURIComponent(q)}&key=${apiKey}&order=relevance&videoDefinition=high`

    // Add specific parameters based on type
    if (type === 'featured') {
      // For featured, search for recent videos from popular channels
      youtubeUrl += '&order=date'
    } else if (type === 'topic' || type === 'book') {
      // For topic/book searches, use relevance
      youtubeUrl += '&order=relevance'
    }

    console.log('YouTube API URL:', youtubeUrl)

    const response = await fetch(youtubeUrl)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error?.message || 'YouTube API error')
    }

    return res.status(200).json(data)
  } catch (error) {
    console.error('YouTube API proxy error:', error)
    return res.status(500).json({ error: error.message })
  }
}
