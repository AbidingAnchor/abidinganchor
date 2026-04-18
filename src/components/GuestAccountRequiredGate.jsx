import { useEffect, useRef } from 'react'
import { useGuestSignupModal } from '../context/GuestSignupModalContext'

/**
 * Renders nothing but opens the guest signup modal once (route-intercept mode).
 * Used when a guest hits a route that requires an account instead of redirecting to /auth.
 */
export default function GuestAccountRequiredGate() {
  const { openGuestSignupModal } = useGuestSignupModal()
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true
    openGuestSignupModal({ routeIntercept: true })
  }, [openGuestSignupModal])

  return null
}
