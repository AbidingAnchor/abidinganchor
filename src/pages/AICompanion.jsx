import { useEffect, useMemo, useRef, useState } from 'react'

const quickPrompts = [
  'Explain this verse',
  'Give me a devotional',
  'Help me understand grace',
  'How should I pray?',
  'What does the gospel mean?',
]

const welcomeMessage =
  "Peace be with you! 🕊️ I'm your AI Bible Study Companion, here to help you dive deeper into God's Word. You can ask me to explain any verse or passage, explore biblical topics, or find scriptures for what you're going through. What would you like to study today?"

const HISTORY_KEY = 'abidinganchor-ai-chats'

export default function AICompanion() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [messages, setMessages] = useState([{ id: 'welcome', role: 'assistant', content: welcomeMessage }])
  const [sessionId, setSessionId] = useState(() => `${Date.now()}`)
  const containerRef = useRef(null)

  const conversationHistory = useMemo(
    () =>
      messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
    [messages],
  )

  useEffect(() => {
    containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    const nonWelcome = messages.filter((m) => m.id !== 'welcome')
    if (nonWelcome.length === 0) return
    const existing = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
    const session = { id: sessionId, updatedAt: new Date().toISOString(), messages }
    const next = [session, ...existing.filter((s) => s.id !== sessionId)].slice(0, 5)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  }, [messages, sessionId])

  const resetConversation = () => {
    setMessages([{ id: 'welcome', role: 'assistant', content: welcomeMessage }])
    setInput('')
    setError('')
    setSessionId(`${Date.now()}`)
  }

  const sendMessage = async (promptText) => {
    const text = promptText.trim()
    if (!text || loading) return
    const userMessage = { id: `${Date.now()}-user`, role: 'user', content: text }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/ai-companion', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          messages: [...conversationHistory, { role: 'user', content: text }],
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`${response.status}: ${text}`)
      }

      const data = await response.json()
      const aiText = typeof data?.reply === 'string' ? data.reply.trim() : ''
      const safeText = aiText || "I couldn't generate a response right now. Please try again."
      setMessages((prev) => [...prev, { id: `${Date.now()}-assistant`, role: 'assistant', content: safeText }])
    } catch (err) {
      console.error('Full error:', err)
      setError(err?.message || JSON.stringify(err) || 'Unknown error')
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-assistant-error`,
          role: 'assistant',
          content: err?.message || JSON.stringify(err) || 'Unknown error',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <div className="content-scroll" style={{ padding: '0 16px', paddingTop: '220px', paddingBottom: '160px', maxWidth: '680px', margin: '0 auto', width: '100%' }}>
        <section className="space-y-3">
          <header className="space-y-1">
            <h1 className="text-3xl font-bold" style={{ color: '#D4A843', textShadow: '0 1px 8px rgba(0,60,120,0.4)' }}>✦ AI Bible Study Companion</h1>
            <p className="text-white/85">Ask anything about God&apos;s Word</p>
            <p className="text-xs text-white/60">Responses are AI-generated. Always compare with Scripture and seek guidance from your church community.</p>
            {error ? <p className="text-xs text-red-300">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={resetConversation} className="text-xs text-white/60 hover:text-white">Clear Conversation</button>
              <button type="button" onClick={resetConversation} className="text-xs text-white/60 hover:text-white">New Study Session</button>
            </div>
          </header>

          <div ref={containerRef} className="space-y-3 rounded-2xl border border-white/20 bg-white/5 p-3 backdrop-blur-md" style={{ minHeight: '380px', maxHeight: '56vh', overflowY: 'auto' }}>
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <article
                  className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
                  style={
                    message.role === 'user'
                      ? { background: '#D4A843', color: '#1a1a1a' }
                      : { background: 'rgba(8, 20, 50, 0.72)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)' }
                  }
                >
                  {message.role === 'assistant' ? <p className="mb-1 text-xs font-semibold" style={{ color: '#D4A843' }}>✝</p> : null}
                  <p>{message.content}</p>
                </article>
              </div>
            ))}
            {loading ? (
              <div className="flex justify-start">
                <article className="max-w-[85%] rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white">
                  <p className="mb-1 text-xs font-semibold" style={{ color: '#D4A843' }}>✝</p>
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-white/80" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-white/80" style={{ animationDelay: '120ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-white/80" style={{ animationDelay: '240ms' }} />
                  </div>
                </article>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <div style={{ position: 'fixed', bottom: '84px', left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '680px', padding: '0 16px', zIndex: 30 }}>
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
          {quickPrompts.map((prompt) => (
            <button key={prompt} type="button" onClick={() => sendMessage(prompt)} className="shrink-0 rounded-full border border-[#D4A843] bg-white/10 px-3 py-1 text-xs text-[#D4A843] backdrop-blur-md">
              {prompt}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 p-2 backdrop-blur-md">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') sendMessage(input)
            }}
            placeholder="Ask about any verse, topic, or passage..."
            className="flex-1 bg-transparent px-2 py-2 text-sm text-white placeholder:text-white/60 focus:outline-none"
          />
          <button type="button" onClick={() => sendMessage(input)} disabled={loading} className="rounded-xl px-3 py-2 text-sm font-semibold text-[#1a1a1a] disabled:opacity-60" style={{ background: '#D4A843' }}>
            →
          </button>
        </div>
      </div>
    </div>
  )
}
