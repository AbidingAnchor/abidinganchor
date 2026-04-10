export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { messages } = req.body
    
    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}` 
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

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Groq API error')
    }

    return res.status(200).json({
      reply: data.choices[0].message.content
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
