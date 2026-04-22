import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function JoinFellowship() {
  const { invite_code } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [inviteData, setInviteData] = useState(null)
  const [fellowship, setFellowship] = useState(null)
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)
  const [alreadyMember, setAlreadyMember] = useState(false)
  
  useEffect(() => {
    fetchInviteData()
  }, [invite_code])
  
  useEffect(() => {
    if (!authLoading && user && inviteData) {
      checkMembership()
    }
  }, [authLoading, user, inviteData])
  
  const fetchInviteData = async () => {
    if (!invite_code) {
      setError('Invalid invite link')
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      setError('')
      
      const { data: inviteResult, error: inviteError } = await supabase
        .from('fellowship_invites')
        .select('fellowship_id, created_by')
        .eq('invite_code', invite_code.toUpperCase())
        .maybeSingle()
      
      if (inviteError) throw inviteError
      
      if (!inviteResult) {
        setError('This invite link is invalid or expired')
        setLoading(false)
        return
      }
      
      setInviteData(inviteResult)
      
      // Fetch fellowship details
      const { data: fellowshipResult, error: fellowshipError } = await supabase
        .from('fellowships')
        .select('*')
        .eq('id', inviteResult.fellowship_id)
        .single()
      
      if (fellowshipError) throw fellowshipError
      
      setFellowship(fellowshipResult)
      
    } catch (err) {
      console.error('Error fetching invite:', err)
      setError('Failed to load invite. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  
  const checkMembership = async () => {
    if (!user?.id || !inviteData?.fellowship_id) return
    
    try {
      const { data: existingMember } = await supabase
        .from('fellowship_members')
        .select('id')
        .eq('fellowship_id', inviteData.fellowship_id)
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (existingMember) {
        setAlreadyMember(true)
        // Redirect to fellowship after a short delay
        setTimeout(() => navigate('/fellowship', { replace: true }), 1500)
      }
    } catch (err) {
      console.error('Error checking membership:', err)
    }
  }
  
  const handleJoin = async () => {
    if (!user?.id || !inviteData?.fellowship_id) return
    
    try {
      setJoining(true)
      setError('')
      
      const { error: memberError } = await supabase
        .from('fellowship_members')
        .insert({
          fellowship_id: inviteData.fellowship_id,
          user_id: user.id,
          role: 'member',
        })
      
      if (memberError) throw memberError
      
      navigate('/fellowship', { replace: true })
      
    } catch (err) {
      console.error('Error joining fellowship:', err)
      setError('Failed to join fellowship. Please try again.')
    } finally {
      setJoining(false)
    }
  }
  
  const handleSignUp = () => {
    // Store the invite code for redirect after auth
    sessionStorage.setItem('pendingInviteCode', invite_code)
    navigate('/auth', { state: { from: `/join/${invite_code}` } })
  }
  
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #081229 0%, #0b1738 55%, #091021 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}>
        <p style={{ color: '#D4A843', fontSize: '16px' }}>Loading…</p>
      </div>
    )
  }
  
  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #081229 0%, #0b1738 55%, #091021 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}>
        <div
          style={{
            width: 'min(90vw, 400px)',
            borderRadius: '20px',
            border: '1px solid rgba(212, 168, 67, 0.25)',
            background: 'rgba(10, 15, 40, 0.95)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            padding: '32px 24px',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '48px', marginBottom: '16px' }}>🔗</p>
          <h1 style={{
            color: '#D4A843',
            fontSize: '24px',
            fontWeight: 700,
            marginBottom: '12px',
          }}>
            Invalid Invite
          </h1>
          <p style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '15px',
            marginBottom: '24px',
            lineHeight: 1.6,
          }}>
            {error}
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '14px 32px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #D4A843 0%, #B8922F 100%)',
              color: '#0a0f28',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Go to Home
          </button>
        </div>
      </div>
    )
  }
  
  // User not logged in
  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #081229 0%, #0b1738 55%, #091021 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}>
        <div
          style={{
            width: 'min(90vw, 400px)',
            borderRadius: '20px',
            border: '1px solid rgba(212, 168, 67, 0.25)',
            background: 'rgba(10, 15, 40, 0.95)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            padding: '40px 32px',
            textAlign: 'center',
          }}
        >
          {/* Brand */}
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚓</div>
          <h1 style={{
            color: '#D4A843',
            fontSize: '28px',
            fontWeight: 700,
            marginBottom: '8px',
            letterSpacing: '-0.02em',
          }}>
            ABIDING ANCHOR
          </h1>
          <p style={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '14px',
            marginBottom: '32px',
          }}>
            Your private space to grow in faith
          </p>
          
          {/* Invite message */}
          <div style={{
            background: 'rgba(212, 168, 67, 0.1)',
            border: '1px solid rgba(212, 168, 67, 0.25)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
          }}>
            <p style={{
              color: '#D4A843',
              fontSize: '18px',
              fontWeight: 600,
              marginBottom: '8px',
            }}>
              You've been invited!
            </p>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '14px',
              lineHeight: 1.6,
              margin: 0,
            }}>
              You've been invited to join a Fellowship on Abiding Anchor
            </p>
          </div>
          
          <button
            onClick={handleSignUp}
            style={{
              width: '100%',
              padding: '16px 24px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #D4A843 0%, #B8922F 100%)',
              color: '#0a0f28',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: '16px',
              boxShadow: '0 4px 20px rgba(212, 168, 67, 0.3)',
            }}
          >
            Sign Up Free
          </button>
          
          <button
            onClick={() => navigate('/auth', { state: { from: `/join/${invite_code}` } })}
            style={{
              width: '100%',
              padding: '14px 24px',
              borderRadius: '12px',
              border: '1px solid rgba(212, 168, 67, 0.5)',
              background: 'transparent',
              color: '#D4A843',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }
  
  // Already a member - redirecting
  if (alreadyMember) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #081229 0%, #0b1738 55%, #091021 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}>
        <div
          style={{
            width: 'min(90vw, 400px)',
            borderRadius: '20px',
            border: '1px solid rgba(212, 168, 67, 0.25)',
            background: 'rgba(10, 15, 40, 0.95)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            padding: '32px 24px',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '48px', marginBottom: '16px' }}>✅</p>
          <h1 style={{
            color: '#D4A843',
            fontSize: '24px',
            fontWeight: 700,
            marginBottom: '12px',
          }}>
            Already a Member
          </h1>
          <p style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '15px',
            marginBottom: '24px',
            lineHeight: 1.6,
          }}>
            You're already a member of this fellowship. Redirecting…
          </p>
        </div>
      </div>
    )
  }
  
  // User logged in, valid invite, not a member - show join confirmation
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #081229 0%, #0b1738 55%, #091021 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div
        style={{
          width: 'min(90vw, 400px)',
          borderRadius: '20px',
          border: '1px solid rgba(212, 168, 67, 0.25)',
          background: 'rgba(10, 15, 40, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          padding: '40px 32px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '48px', marginBottom: '20px' }}>👥</p>
        <h1 style={{
          color: '#D4A843',
          fontSize: '24px',
          fontWeight: 700,
          marginBottom: '8px',
        }}>
          Join Fellowship
        </h1>
        <p style={{
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: '14px',
          marginBottom: '32px',
        }}>
          You've been invited to join
        </p>
        
        {/* Fellowship name */}
        <div style={{
          background: 'rgba(212, 168, 67, 0.1)',
          border: '1px solid rgba(212, 168, 67, 0.25)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
        }}>
          <p style={{
            color: '#D4A843',
            fontSize: '22px',
            fontWeight: 700,
            margin: 0,
          }}>
            {fellowship?.name || 'Fellowship'}
          </p>
          {fellowship?.description && (
            <p style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '14px',
              marginTop: '8px',
              marginBottom: 0,
            }}>
              {fellowship.description}
            </p>
          )}
        </div>
        
        {error && (
          <p style={{ color: '#ff6b6b', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </p>
        )}
        
        <button
          onClick={handleJoin}
          disabled={joining}
          style={{
            width: '100%',
            padding: '16px 24px',
            borderRadius: '12px',
            border: 'none',
            background: joining
              ? 'rgba(212, 168, 67, 0.3)'
              : 'linear-gradient(135deg, #D4A843 0%, #B8922F 100%)',
            color: '#0a0f28',
            fontSize: '16px',
            fontWeight: 600,
            cursor: joining ? 'not-allowed' : 'pointer',
            marginBottom: '16px',
            opacity: joining ? 0.6 : 1,
            boxShadow: '0 4px 20px rgba(212, 168, 67, 0.3)',
          }}
        >
          {joining ? 'Joining…' : 'Join Fellowship'}
        </button>
        
        <button
          onClick={() => navigate('/')}
          style={{
            width: '100%',
            padding: '14px 24px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'transparent',
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '15px',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
