export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { messages } = req.body
    
    const apiKey = process.env.GROQ_API_KEY;
    console.log('Groq API Key present:', !!apiKey);
    console.log('Groq API Key length:', apiKey?.length || 0);
    
    if (!apiKey) {
      return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
    }
    
    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}` 
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'system',
              content: `You are the AbidingAnchor AI Bible Study Companion.

Guidelines:
- Always ground answers in Scripture with specific references.
- Be warm, encouraging, and pastoral in tone.
- Keep responses concise but meaningful (2-4 paragraphs max).
- Always point users back to prayer and their church community.
- Use the World English Bible (WEB) translation for quotes.
- Never claim to replace a pastor, church, or the Holy Spirit.
- End responses with a relevant Bible verse when appropriate.
- If asked about controversial theological topics, present multiple Christian perspectives gracefully.`
            },
            ...messages
          ],
          max_tokens: 1000,
          temperature: 0.7
        })
      }
    )

    const text = await response.text();
    console.log('Groq API response status:', response.status);
    console.log('Groq API response preview:', text.substring(0, 200));
    
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(500).json({ 
        error: 'Groq API returned non-JSON', 
        status: response.status,
        preview: text.substring(0, 500)
      });
    }
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Groq API error');
    }

    return res.status(200).json({
      reply: data.choices[0].message.content
    })
  } catch (error) {
    console.error('AI companion error:', error);
    return res.status(500).json({ error: error.message })
  }
}
