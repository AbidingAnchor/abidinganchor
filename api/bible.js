export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  const apiKey = process.env.BIBLE_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured', key: 'missing' });
  }

  const { path } = req.query;
  const url = `https://api.bible/v1/${path}`;
  
  console.log('Fetching:', url);
  console.log('API Key present:', !!apiKey);
  console.log('API Key length:', apiKey.length);
  
  try {
    const response = await fetch(url, {
      headers: { 
        'api-key': apiKey,
        'Accept': 'application/json'
      }
    });
    
    const text = await response.text();
    console.log('Response status:', response.status);
    console.log('Response text preview:', text.substring(0, 200));
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    try {
      const data = JSON.parse(text);
      res.status(response.status).json(data);
    } catch {
      res.status(response.status).json({ 
        error: 'API returned non-JSON', 
        status: response.status,
        preview: text.substring(0, 500) 
      });
    }
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({ error: error.message });
  }
}
