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
          model: 'llama3-70b-8192',
          messages: [
            {
              role: 'system',
              content: `You are a knowledgeable and compassionate 
              Bible companion for the AbidingAnchor app. You help 
              users understand scripture, answer Bible questions, 
              provide devotional insights, and offer spiritual 
              encouragement. Always respond with grace, wisdom and 
              biblical truth. Keep responses concise and focused 
              on God's Word.`
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
      content: data.choices[0].message.content
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
