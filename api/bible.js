export default async function handler(req, res) {
  const { path } = req.query;
  const apiKey = process.env.VITE_BIBLE_API_KEY;
  
  const url = `https://api.bible/v1/${path}`;
  
  try {
    const response = await fetch(url, {
      headers: { 'api-key': apiKey }
    });
    const data = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Bible API proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch from Bible API' });
  }
}
