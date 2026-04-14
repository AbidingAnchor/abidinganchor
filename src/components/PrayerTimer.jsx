import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { userStorageKey } from '../utils/userStorage'

const presets = [5, 10, 15, 30]
const prompts = [
  'Praise God for who He is',
  'Thank Him for His blessings',
  'Confess and receive His grace',
  'Pray for others',
  'Listen in silence',
]

export default function PrayerTimer({ open, onClose }) {
  const { user } = useAuth()
  const [minutes, setMinutes] = useState(10)
  const [customMinutes, setCustomMinutes] = useState('20')
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!open) return
    setSecondsLeft(minutes * 60)
  }, [minutes, open])

  useEffect(() => {
    if (!running || secondsLeft <= 0) return
    const id = setInterval(() => setSecondsLeft((value) => value - 1), 1000)
    return () => clearInterval(id)
  }, [running, secondsLeft])

  useEffect(() => {
    if (secondsLeft > 0 || !running) return
    setRunning(false)
    const elapsed = minutes * 60
    const pk = userStorageKey(user?.id, 'prayer-time-seconds')
    const current = Number(localStorage.getItem(pk) || '0') || 0
    localStorage.setItem(pk, String(current + elapsed))
    if (navigator.vibrate) navigator.vibrate([180, 120, 180])
    try {
      const audio = new Audio('/notification.mp3')
      audio.volume = 0.2
      audio.play().catch(() => {})
    } catch {
      // no-op
    }
  }, [secondsLeft, running, minutes])

  const prompt = useMemo(() => prompts[Math.floor((Date.now() / 60000) % prompts.length)], [secondsLeft])
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9300, background: 'rgba(13,31,78,0.95)', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <article style={{ width: '100%', maxWidth: '420px', borderRadius: '20px', border: '1px solid var(--glass-border-hover)', background: 'var(--card-parchment)', padding: '18px', textAlign: 'center' }}>
        <h2 style={{ color: '#D4A843', margin: 0 }}>Prayer Timer</h2>
        <div style={{ margin: '16px auto', width: '220px', height: '220px', borderRadius: '999px', border: '6px solid rgba(212,168,67,0.7)', boxShadow: '0 0 25px rgba(212,168,67,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '44px', fontWeight: 700 }}>
          {mm}:{ss}
        </div>
        <p style={{ color: 'rgba(255,255,255,0.85)', margin: '0 0 12px' }}>{prompt}</p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {presets.map((p) => (
            <button key={p} type="button" onClick={() => { setMinutes(p); setRunning(false) }} className="back-btn">{p} min</button>
          ))}
          <input value={customMinutes} onChange={(e) => setCustomMinutes(e.target.value)} placeholder="Custom" style={{ width: '76px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.12)', color: '#fff', padding: '6px 8px' }} />
          <button type="button" onClick={() => { const next = Math.max(1, Number(customMinutes) || 10); setMinutes(next); setRunning(false) }} className="back-btn">Set</button>
        </div>
        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
          <button type="button" className="gold-btn" style={{ flex: 1 }} onClick={() => setRunning((v) => !v)}>{running ? 'Pause' : 'Start'}</button>
          <button type="button" className="back-btn" style={{ flex: 1 }} onClick={() => { setRunning(false); onClose() }}>End Early</button>
        </div>
      </article>
    </div>
  )
}
