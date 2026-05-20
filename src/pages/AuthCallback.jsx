import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import LoadingScreen from '../components/LoadingScreen'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleCallback = async () => {
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
          navigate('/', { replace: true })
          return
        }
      }
      // Fallback: check if a session already exists (e.g. implicit flow)
      const { data: { session } } = await supabase.auth.getSession()
      navigate(session ? '/' : '/auth', { replace: true })
    }
    handleCallback()
  }, [navigate])

  return <LoadingScreen />
}
