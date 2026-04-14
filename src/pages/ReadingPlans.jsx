import { useEffect, useMemo, useState } from 'react'
import { readingPlans } from '../data/readingPlans'
import { useAuth } from '../context/AuthContext'
import { userStorageKey } from '../utils/userStorage'

function readStore(storageKey) {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || '{}')
  } catch {
    return {}
  }
}

function saveStore(storageKey, v) {
  localStorage.setItem(storageKey, JSON.stringify(v))
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function yesterdayKey() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

export default function ReadingPlans() {
  const { user } = useAuth()
  const storageKey = useMemo(() => userStorageKey(user?.id, 'reading-plans'), [user?.id])
  const [store, setStore] = useState({})
  const [selectedPlanId, setSelectedPlanId] = useState(null)
  const [celebratePlanId, setCelebratePlanId] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 220)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    setStore(readStore(storageKey))
  }, [storageKey])

  const selectedPlan = selectedPlanId ? readingPlans.find((p) => p.id === selectedPlanId) : null
  const activePlanId = store.activePlanId || null
  const activePlan = activePlanId ? readingPlans.find((p) => p.id === activePlanId) : null

  const activeProgress = useMemo(() => {
    if (!activePlan) return { done: 0, total: 0, percent: 0 }
    const done = Object.keys(store[activePlan.id]?.completedDays || {}).length
    const total = activePlan.days.length
    return { done, total, percent: total ? Math.round((done / total) * 100) : 0 }
  }, [activePlan, store])

  const startPlan = (planId) => {
    const next = { ...store, activePlanId: planId, [planId]: store[planId] || { completedDays: {}, streak: 0, lastDate: null } }
    setStore(next)
    saveStore(storageKey, next)
    setSelectedPlanId(planId)
  }

  const markDayComplete = (plan, day) => {
    const current = store[plan.id] || { completedDays: {}, streak: 0, lastDate: null }
    const completedDays = { ...(current.completedDays || {}), [day]: true }
    const tk = todayKey()
    const yk = yesterdayKey()
    let streak = current.streak || 0
    if (current.lastDate !== tk) {
      streak = current.lastDate === yk ? streak + 1 : 1
    }
    const nextPlanState = { ...current, completedDays, streak, lastDate: tk }
    const next = { ...store, [plan.id]: nextPlanState, activePlanId: plan.id }
    if (Object.keys(completedDays).length === plan.days.length) {
      setCelebratePlanId(plan.id)
    }
    setStore(next)
    saveStore(storageKey, next)
  }

  if (selectedPlan) {
    const planState = store[selectedPlan.id] || { completedDays: {}, streak: 0 }
    const completedCount = Object.keys(planState.completedDays || {}).length
    const done = completedCount === selectedPlan.days.length
    return (
      <div className="content-scroll" style={{ padding: '0 16px', paddingTop: '110px', paddingBottom: '110px', maxWidth: '680px', margin: '0 auto' }}>
        <div className="mb-3 flex items-center justify-between">
          <button type="button" onClick={() => setSelectedPlanId(null)} className="rounded-lg border border-white/30 px-3 py-1 text-sm text-white/85">← Back</button>
          <p className="text-xs text-white/70">🔥 Streak: {planState.streak || 0}</p>
        </div>
        <article className="glass-panel rounded-2xl p-4 text-white">
          <h1 className="text-2xl font-bold text-[#D4A843]">{selectedPlan.icon} {selectedPlan.title}</h1>
          <p className="mt-1 text-sm text-white/80">{selectedPlan.description}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full" style={{ width: `${Math.round((completedCount / selectedPlan.days.length) * 100)}%`, background: '#D4A843' }} />
          </div>
          <p className="mt-2 text-xs text-white/70">{completedCount}/{selectedPlan.days.length} completed</p>
        </article>

        {done && celebratePlanId === selectedPlan.id ? (
          <div className="mt-3 glass-panel rounded-2xl border border-[#D4A843]/45 p-4 text-center text-white">
            <p className="text-lg font-semibold text-[#D4A843]">🏆 Plan Complete!</p>
            <p className="mt-1 text-sm text-white/85">You finished {selectedPlan.title}. Keep walking in the Word.</p>
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          {selectedPlan.days.map((d) => {
            const isDone = !!planState.completedDays?.[d.day]
            return (
              <article key={d.day} className="glass-panel rounded-2xl p-4 text-white">
                <p className="text-xs uppercase tracking-[0.12em] text-[#D4A843]">Day {d.day}</p>
                <h2 className="mt-1 text-lg font-semibold">{d.title}</h2>
                <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/70">{d.scripture}</p>
                <p className="mt-2 text-sm text-white/90">{d.reflection}</p>
                <p className="mt-2 text-sm italic text-white/80">🙏 {d.prayer}</p>
                <button type="button" disabled={isDone} onClick={() => markDayComplete(selectedPlan, d.day)} className="mt-3 rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-70" style={{ background: isDone ? 'rgba(212,168,67,0.25)' : '#D4A843', color: isDone ? '#D4A843' : '#1a1a1a' }}>
                  {isDone ? '✓ Completed' : 'Mark Day Complete'}
                </button>
              </article>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="content-scroll" style={{ padding: '0 16px', paddingTop: '110px', paddingBottom: '110px', maxWidth: '680px', margin: '0 auto' }}>
      <h1 className="text-2xl font-bold text-white">📅 <span style={{ color: '#D4A843' }}>Reading Plans</span></h1>
      <p className="mt-1 text-sm text-white/80">Start a journey with God&apos;s Word.</p>

      {activePlan ? (
        <section className="mt-4 glass-panel rounded-2xl p-4 text-white">
          <p className="text-xs uppercase tracking-[0.12em] text-[#D4A843]">Active Plan</p>
          <p className="mt-1 font-semibold">{activePlan.title}</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full" style={{ width: `${activeProgress.percent}%`, background: '#D4A843' }} />
          </div>
          <p className="mt-2 text-xs text-white/70">Day {Math.min(activeProgress.done + 1, activeProgress.total)} of {activeProgress.total}</p>
          <button type="button" onClick={() => setSelectedPlanId(activePlan.id)} className="mt-3 rounded-lg px-3 py-1.5 text-sm font-semibold text-[#1a1a1a]" style={{ background: '#D4A843' }}>
            Continue
          </button>
        </section>
      ) : null}

      <section className="mt-4 grid gap-3 sm:grid-cols-2">
        {loading ? (
          <>
            <article className="glass-panel rounded-2xl p-4"><div className="gold-skeleton" /><div className="mt-2 gold-skeleton" style={{ width: '75%' }} /></article>
            <article className="glass-panel rounded-2xl p-4"><div className="gold-skeleton" /><div className="mt-2 gold-skeleton" style={{ width: '75%' }} /></article>
          </>
        ) : readingPlans.map((p) => (
          <article key={p.id} className="glass-panel rounded-2xl p-4 text-white">
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold">{p.icon} {p.title}</p>
              <span className="rounded-full border border-[#D4A843]/60 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-[#D4A843]">{p.duration} days</span>
            </div>
            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/70">{p.topic}</p>
            <p className="mt-2 text-sm text-white/85">{p.description}</p>
            <button type="button" onClick={() => startPlan(p.id)} className="mt-3 rounded-lg px-3 py-1.5 text-sm font-semibold text-[#1a1a1a]" style={{ background: '#D4A843' }}>
              Start Plan
            </button>
          </article>
        ))}
      </section>
    </div>
  )
}
