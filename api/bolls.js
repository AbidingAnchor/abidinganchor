export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { translation, book, chapter } = req.query || {}
  if (!translation || !book || !chapter) {
    return res.status(400).json({ error: 'Missing required query params: translation, book, chapter' })
  }

  const upstreamUrl = `https://bolls.life/get-text/${encodeURIComponent(String(translation))}/${encodeURIComponent(String(book))}/${encodeURIComponent(String(chapter))}/`

  try {
    const upstream = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    const bodyText = await upstream.text()
    let data = null
    try {
      data = JSON.parse(bodyText)
    } catch {
      data = null
    }

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: `bolls upstream ${upstream.status}`,
        details: data || bodyText || null,
      })
    }

    return res.status(200).json({
      ok: true,
      translation: String(translation),
      book: Number(book),
      chapter: Number(chapter),
      data: Array.isArray(data) ? data : [],
    })
  } catch (error) {
    return res.status(502).json({
      error: 'Failed to reach bolls upstream',
      details: error?.message || String(error),
    })
  }
}
