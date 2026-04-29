import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { userStorageKey } from '../utils/userStorage'
import { useAiUsage } from '../hooks/useAiUsage'
import { withAiLimit } from '../utils/withAiLimit'

const quickPrompts = [
  'Explain this verse',
  'Give me a devotional',
  'Help me understand grace',
  'How should I pray?',
  'What does the gospel mean?',
]

const welcomeMessage =
  "Peace be with you! 🕊️ I'm your AI Bible Study Companion, here to help you dive deeper into God's Word. You can ask me to explain any verse or passage, explore biblical topics, or find scriptures for what you're going through. What would you like to study today?"

export default function AICompanion() {
  const { user, profile } = useAuth()
  const historyKey = useMemo(() => userStorageKey(user?.id, 'ai-chats'), [user?.id])
  const location = useLocation()
  const navigate = useNavigate()
  const { checkAndIncrement } = useAiUsage()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [messages, setMessages] = useState([{ id: 'welcome', role: 'assistant', content: welcomeMessage }])
  const [sessionId, setSessionId] = useState(() => `${Date.now()}`)
  const [limitReachedOpen, setLimitReachedOpen] = useState(false)
  const containerRef = useRef(null)

  const conversationHistory = useMemo(
    () =>
      (messages || [])
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
    const ctx = location.state?.aiCompanionContext
    if (!ctx?.verse) return
    navigate(location.pathname, { replace: true, state: {} })
  }, [location.state, location.pathname, navigate])

  useEffect(() => {
    const nonWelcome = (messages || []).filter((m) => m.id !== 'welcome')
    if (nonWelcome.length === 0) return
    const existing = JSON.parse(localStorage.getItem(historyKey) || '[]')
    const session = { id: sessionId, updatedAt: new Date().toISOString(), messages }
    const next = [session, ...(existing || []).filter((s) => s.id !== sessionId)].slice(0, 5)
    localStorage.setItem(historyKey, JSON.stringify(next))
  }, [messages, sessionId, historyKey])

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

    const aiCallFn = async () => {
      const API_URL = import.meta.env.VITE_AI_API_URL || '/api/ai-companion'
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          messages: [...conversationHistory, { role: 'user', content: text }],
          displayName: profile?.display_name || profile?.username || 'friend',
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`${response.status}: ${errorText}`)
      }

      const data = await response.json()
      const aiText = typeof data?.reply === 'string' ? data.reply.trim() : ''
      const safeText = aiText || "I couldn't generate a response right now. Please try again."
      setMessages((prev) => [...prev, { id: `${Date.now()}-assistant`, role: 'assistant', content: safeText }])
      if (user?.id && data?.conversationSummary) {
        const payload = {
          user_id: user.id,
          session_id: sessionId,
          summary: data.conversationSummary.summary,
          last_topic: data.conversationSummary.last_topic,
          emotional_tone: data.conversationSummary.emotional_tone,
          follow_up_sent: false,
          follow_up_scheduled_at: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }
        try {
          await supabase
            .from('ai_conversations')
            .upsert(payload, { onConflict: 'user_id,session_id' })
        } catch {
          await supabase
            .from('ai_conversations')
            .insert({
              user_id: payload.user_id,
              summary: payload.summary,
              last_topic: payload.last_topic,
              emotional_tone: payload.emotional_tone,
              follow_up_sent: payload.follow_up_sent,
              follow_up_scheduled_at: payload.follow_up_scheduled_at,
              updated_at: payload.updated_at,
            })
        }
      }
      if (user?.id && aiText) {
        void supabase.from('ai_logs').insert({ user_id: user.id })
      }
    }

    const result = await withAiLimit(
      checkAndIncrement,
      aiCallFn,
      {
        supporterTier: profile?.supporter_tier || 'free',
        onLimitReached: () => {
          setLimitReachedOpen(true)
          setMessages((prev) => prev.slice(0, -1))
          setInput(text)
        }
      }
    )

    if (result === null) {
      setLoading(false)
      return
    }

    try {
      await result
    } catch (err) {
      if (import.meta.env.DEV) console.error('AI companion request failed:', err)
      const errorMessage = 'Something went wrong. Please try again in a moment.'
      setError(errorMessage)
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-assistant-error`,
          role: 'assistant',
          content: errorMessage,
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

          <div ref={containerRef} className="glass-panel space-y-3 rounded-2xl p-3" style={{ minHeight: '380px', maxHeight: '56vh', overflowY: 'auto' }}>
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <article
                  className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
                  style={
                    message.role === 'user'
                      ? { background: '#D4A843', color: '#1a1a1a' }
                      : { background: 'var(--card-parchment)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)' }
                  }
                >
                  {message.role === 'assistant' ? <p className="mb-1 text-xs font-semibold" style={{ color: '#D4A843' }}>✝</p> : null}
                  <p>{message.content}</p>
                </article>
              </div>
            ))}
            {loading ? (
              <div className="flex justify-start">
                <article className="glass-panel max-w-[85%] rounded-2xl px-4 py-3 text-sm text-white">
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
            <button key={prompt} type="button" onClick={() => sendMessage(prompt)} className="glass-panel shrink-0 rounded-full border border-[#D4A843]/50 px-3 py-1 text-xs text-[#D4A843]">
              {prompt}
            </button>
          ))}
        </div>
        <div className="glass-panel flex items-center gap-2 rounded-2xl p-2">
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

      {limitReachedOpen && (
        <div
          className="fixed inset-0 z-[10050] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setLimitReachedOpen(false)}
        >
          <div
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl"
            style={{
              background: 'var(--modal-bg)',
              border: '1px solid var(--glass-border)',
              padding: '24px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: '#D4A843', fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>
              Daily Limit Reached
            </h2>
            <p style={{ color: 'white', fontSize: '15px', lineHeight: 1.5, marginBottom: '16px' }}>
              You've reached your daily limit of 5 AI interactions. Upgrade to Supporter for unlimited access to the AI Bible Study Companion.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setLimitReachedOpen(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setLimitReachedOpen(false)
                  navigate('/support')
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#D4A843',
                  color: '#0a1432',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Upgrade to Supporter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
