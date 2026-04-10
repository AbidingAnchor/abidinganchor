export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  const apiKey = process.env.BIBLE_API_KEY; // No VITE_ prefix!
  
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const { path } = req.query;
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
    res.status(500).json({ error: error.message });
  }
}
