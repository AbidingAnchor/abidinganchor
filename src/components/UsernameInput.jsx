import { useEffect, useRef, useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  normalizeUsername,
  checkUsernameTaken,
  fetchAvailableUsernameSuggestions,
  hasProfanityInUsername,
} from '../utils/usernameAvailability'

/**
 * @param {object} props
 * @param {string} props.value
 * @param {(v: string) => void} props.onChange
 * @param {string | undefined} props.excludeUserId
 * @param {boolean} [props.disabled]
 * @param {string} [props.placeholder]
 * @param {string} [props.labelText]
 * @param {boolean} [props.showLabel]
 * @param {string} [props.inputClassName]
 * @param {object} [props.inputStyle]
 * @param {(state: { status: string, normalized: string, canSave: boolean }) => void} [props.onAvailabilityChange]
 * @param {boolean} [props.emptyAllowsSubmit] — if true, empty field counts as OK (e.g. clear username on edit profile)
 */
export default function UsernameInput({
  value,
  onChange,
  excludeUserId,
  disabled = false,
  placeholder = 'Your username',
  labelText = 'Username / Display name',
  showLabel = true,
  inputClassName = 'glass-input-field',
  inputStyle = {},
  onAvailabilityChange,
  emptyAllowsSubmit = false,
}) {
  const [status, setStatus] = useState('idle')
  const [suggestions, setSuggestions] = useState([])
  const debounceRef = useRef(null)
  const requestIdRef = useRef(0)

  const notify = useCallback(
    (nextStatus, valueStr = value) => {
      const n = normalizeUsername(valueStr)
      const profane = Boolean(n) && hasProfanityInUsername(valueStr)
      let canSave = false
      if (!n) {
        canSave = emptyAllowsSubmit
      } else if (!profane && nextStatus === 'available') {
        canSave = true
      }
      onAvailabilityChange?.({ status: nextStatus, normalized: n, canSave })
    },
    [onAvailabilityChange, value, emptyAllowsSubmit],
  )

  const runCheck = useCallback(
    async (raw, reqId) => {
      const trimmed = String(raw || '').trim()
      const n = normalizeUsername(trimmed)
      if (!n) {
        setStatus('idle')
        setSuggestions([])
        notify('idle', '')
        return
      }
      if (hasProfanityInUsername(trimmed)) {
        setStatus('invalid')
        setSuggestions([])
        notify('invalid', trimmed)
        return
      }
      setStatus('checking')
      notify('checking', trimmed)
      const { taken, error } = await checkUsernameTaken(supabase, trimmed, excludeUserId)
      if (reqId !== requestIdRef.current) return
      if (error) {
        setStatus('idle')
        setSuggestions([])
        notify('idle', trimmed)
        return
      }
      if (taken) {
        setStatus('taken')
        const sug = await fetchAvailableUsernameSuggestions(supabase, trimmed, excludeUserId)
        if (reqId !== requestIdRef.current) return
        setSuggestions(sug)
        notify('taken', trimmed)
      } else {
        setStatus('available')
        setSuggestions([])
        notify('available', trimmed)
      }
    },
    [excludeUserId, notify],
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = String(value || '').trim()
    const n = normalizeUsername(trimmed)
    if (!n) {
      setStatus('idle')
      setSuggestions([])
      notify('idle', '')
      return
    }
    if (hasProfanityInUsername(trimmed)) {
      setStatus('invalid')
      setSuggestions([])
      notify('invalid', trimmed)
      return
    }
    const reqId = ++requestIdRef.current
    debounceRef.current = setTimeout(() => runCheck(value, reqId), 420)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [value, excludeUserId, runCheck, notify])

  const handleBlur = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const reqId = ++requestIdRef.current
    runCheck(value, reqId)
  }

  const pickSuggestion = (s) => {
    onChange(s)
  }

  const indicator = (() => {
    const n = normalizeUsername(value)
    if (!n || disabled) return null
    if (hasProfanityInUsername(value)) {
      return (
        <span style={{ color: '#f87171', fontSize: '16px' }} aria-hidden>
          ❌
        </span>
      )
    }
    if (status === 'checking') {
      return (
        <span
          aria-label="Checking username"
          style={{
            display: 'inline-block',
            width: '16px',
            height: '16px',
            border: '2px solid rgba(212,168,67,0.35)',
            borderTopColor: '#D4A843',
            borderRadius: '50%',
            animation: 'username-input-spin 0.7s linear infinite',
          }}
        />
      )
    }
    if (status === 'available') {
      return (
        <span style={{ color: '#4ade80', fontSize: '16px' }} aria-hidden>
          ✅
        </span>
      )
    }
    if (status === 'taken') {
      return (
        <span style={{ color: '#f87171', fontSize: '16px' }} aria-hidden>
          ❌
        </span>
      )
    }
    return null
  })()

  return (
    <div style={{ marginBottom: '12px' }}>
      <style>{`
        @keyframes username-input-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      {showLabel ? (
        <label style={{ color: 'var(--text-primary)', display: 'block', fontSize: '14px', marginBottom: '8px' }}>{labelText}</label>
      ) : null}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClassName}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          style={{ flex: 1, borderRadius: '12px', padding: '12px', ...inputStyle }}
          aria-invalid={status === 'taken' || status === 'invalid'}
        />
        <div style={{ width: '22px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>{indicator}</div>
      </div>
      {status === 'taken' ? (
        <p style={{ color: '#fca5a5', fontSize: '12px', marginTop: '6px', marginBottom: '4px' }}>Username already taken</p>
      ) : null}
      {status === 'invalid' ? (
        <p style={{ color: '#fca5a5', fontSize: '12px', marginTop: '6px' }}>Please choose an appropriate username.</p>
      ) : null}
      {status === 'taken' && suggestions.length > 0 ? (
        <div>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '11px', marginBottom: '6px', marginTop: '4px' }}>Try one of these:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => pickSuggestion(s)}
                style={{
                  border: '1px solid rgba(212,168,67,0.45)',
                  background: 'rgba(212,168,67,0.12)',
                  color: '#F5E6B8',
                  borderRadius: '10px',
                  padding: '6px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
