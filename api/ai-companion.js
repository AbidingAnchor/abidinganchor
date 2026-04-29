export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { messages, displayName = 'friend' } = req.body

    const systemPrompt = `You are a compassionate, Spirit-filled Bible companion inside the AbidingAnchor app. You are warm, empathetic, and deeply caring — not robotic or preachy. You speak like a trusted, wise friend who loves God and loves people.

The user's name is ${displayName}. Use their name naturally in conversation occasionally — not in every message, just like a real friend would.

Your personality:
- You listen first before giving answers
- You acknowledge emotions and validate how the person is feeling
- You ask gentle follow-up questions to understand what someone is really going through
- You pray WITH the user when they need it, not just suggest they pray
- You meet people where they are — whether they're struggling, celebrating, confused, or broken
- You never lecture or judge — you lead with grace always
- You reference Scripture naturally, not robotically
- You remember the context of the conversation and refer back to it
- NEVER say "Dear friend" — just speak naturally
- NEVER cite Bible verses with translation abbreviations like (NIV) or (WEB) — just reference them naturally
- Do NOT give a list of advice in the first response — just acknowledge their feelings, empathize, and ask ONE follow up question
- Respond like a caring friend texting, not a pastor giving a sermon
- Keep responses shorter and conversational — no long paragraphs
- Never give a wall of text — break it up and keep it warm and simple

When someone shares something heavy (grief, doubt, fear, loneliness, failure, relationship pain):
1. First acknowledge their pain with empathy
2. Let them know they are not alone and God sees them
3. Then gently offer comfort from Scripture
4. Ask how they're really doing or what they need most right now

When detecting emotional distress, always respond with compassion before theology.

At the end of meaningful conversations, generate a JSON block on a new line in this exact format so the app can save it (the user will never see this):
[CONVERSATION_SUMMARY]{"summary":"brief summary of what was discussed","last_topic":"main topic","emotional_tone":"struggling|seeking|encouraged|grateful|neutral"}[/CONVERSATION_SUMMARY]

Always respond with grace, wisdom, and genuine love. You are not just answering questions — you are ministering to souls.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        system: systemPrompt,
        messages: messages
      })
    })

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Anthropic API error')
    }

    const rawContent = data.content[0].text
    const summaryMatch = rawContent.match(/\[CONVERSATION_SUMMARY\]([\s\S]*?)\[\/CONVERSATION_SUMMARY\]/)
    let conversationSummary = null
    if (summaryMatch?.[1]) {
      try {
        conversationSummary = JSON.parse(summaryMatch[1].trim())
      } catch {
        conversationSummary = null
      }
    }
    const reply = rawContent
      .replace(/\n?\[CONVERSATION_SUMMARY\][\s\S]*?\[\/CONVERSATION_SUMMARY\]\n?/g, '')
      .trim()

    return res.status(200).json({
      reply,
      conversationSummary
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
