import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const POST_TYPES = [
  { id: 'general', emoji: '💬', label: 'General', placeholder: 'Share something with your fellowship...' },
  { id: 'prayer', emoji: '🙏', label: 'Prayer Request', placeholder: 'Share your prayer request...' },
  { id: 'verse', emoji: '📖', label: 'Verse Share', placeholder: 'Share a verse and what it means to you...' },
  { id: 'testimony', emoji: '✨', label: 'Testimony', placeholder: 'Share what God has done in your life...' },
]

const REACTION_TYPES = [
  { id: 'praying', emoji: '🙏', label: 'Praying' },
  { id: 'fire', emoji: '🔥', label: 'Fire' },
  { id: 'love', emoji: '❤️', label: 'Love' },
  { id: 'amen', emoji: '✝️', label: 'Amen' },
]

// Note: 'pray' is used for the prayer counter on prayer request posts

export default function Fellowship() {
  const { user, profile } = useAuth()
  const [view, setView] = useState('none') // 'none', 'create', 'inside'
  const [loading, setLoading] = useState(true)
  const [fellowship, setFellowship] = useState(null)
  const [members, setMembers] = useState([])
  const [posts, setPosts] = useState([])
  
  // Create fellowship form
  const [fellowshipName, setFellowshipName] = useState('')
  const [fellowshipDescription, setFellowshipDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  
  // Join with invite code
  const [inviteCode, setInviteCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [showJoinModal, setShowJoinModal] = useState(false)
  
  // Invite members modal
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [generatedInviteCode, setGeneratedInviteCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [generatingInvite, setGeneratingInvite] = useState(false)
  
  // Create post
  const [showPostModal, setShowPostModal] = useState(false)
  const [postContent, setPostContent] = useState('')
  const [postType, setPostType] = useState('general')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState('')
  
  // Reactions and comments
  const [postReactions, setPostReactions] = useState({})
  const [postComments, setPostComments] = useState({})
  const [showCommentsSheet, setShowCommentsSheet] = useState(null)
  const [commentInput, setCommentInput] = useState('')
  
  // Profile modal
  const [showProfileModal, setShowProfileModal] = useState(null)
  const [profileData, setProfileData] = useState(null)
  
  // Delete group
  const [showDeleteMenu, setShowDeleteMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingGroup, setDeletingGroup] = useState(false)
  
  // Remove member
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(null)
  const [removingMember, setRemovingMember] = useState(false)
  
  useEffect(() => {
    fetchUserFellowship()
  }, [user?.id])
  
  const fetchUserFellowship = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)

      // Resolve fellowship IDs explicitly (avoids PostgREST .or + subquery returning
      // multiple rows / PGRST116 when the user belongs to several groups).
      const { data: memberRows, error: memberIdsError } = await supabase
        .from('fellowship_members')
        .select('fellowship_id')
        .eq('user_id', user.id)

      if (memberIdsError) throw memberIdsError

      const { data: createdRows, error: createdIdsError } = await supabase
        .from('fellowships')
        .select('id')
        .eq('created_by', user.id)

      if (createdIdsError) throw createdIdsError

      const fellowshipIdSet = new Set([
        ...(memberRows || []).map((r) => r.fellowship_id).filter(Boolean),
        ...(createdRows || []).map((r) => r.id).filter(Boolean),
      ])
      const fellowshipIds = [...fellowshipIdSet]

      if (fellowshipIds.length === 0) {
        setView('none')
        setFellowship(null)
        setMembers([])
        setPosts([])
        return
      }

      const { data: fellowshipData, error: fellowshipError } = await supabase
        .from('fellowships')
        .select('*')
        .in('id', fellowshipIds)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (fellowshipError) throw fellowshipError

      if (!fellowshipData) {
        setView('none')
        setFellowship(null)
        setMembers([])
        setPosts([])
        return
      }
      
      setFellowship(fellowshipData)
      setView('inside')
      
      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from('fellowship_members')
        .select('user_id, role, joined_at')
        .eq('fellowship_id', fellowshipData.id)
      
      if (membersError) throw membersError
      
      const userIds = (membersData || []).map(m => m.user_id)
      let profilesById = {}
      
      if (userIds.length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, display_name, username, email, avatar_url')
          .in('id', userIds)
        
        if (profileError) throw profileError
        profilesById = (profileData || []).reduce((acc, p) => {
          acc[p.id] = p
          return acc
        }, {})
      }
      
      const membersWithProfiles = (membersData || []).map(m => ({
        ...m,
        profile: profilesById[m.user_id] || null
      }))
      
      setMembers(membersWithProfiles)
      
      // Fetch posts
      const { data: postsData, error: postsError } = await supabase
        .from('fellowship_posts')
        .select('*')
        .eq('fellowship_id', fellowshipData.id)
        .order('created_at', { ascending: false })
      
      if (postsError) throw postsError
      
      const postUserIds = (postsData || []).map(p => p.user_id)
      let postProfilesById = {}
      
      if (postUserIds.length > 0) {
        const { data: postProfileData, error: postProfileError } = await supabase
          .from('profiles')
          .select('id, display_name, username, email, avatar_url')
          .in('id', postUserIds)
        
        if (postProfileError) throw postProfileError
        postProfilesById = (postProfileData || []).reduce((acc, p) => {
          acc[p.id] = p
          return acc
        }, {})
      }
      
      const postsWithProfiles = (postsData || []).map(p => ({
        ...p,
        profile: postProfilesById[p.user_id] || null
      }))
      
      setPosts(postsWithProfiles)
      
      // Fetch reactions for all posts
      const postIds = (postsData || []).map(p => p.id)
      if (postIds.length > 0) {
        const { data: reactionsData, error: reactionsError } = await supabase
          .from('fellowship_reactions')
          .select('*')
          .in('post_id', postIds)
        
        if (!reactionsError && reactionsData) {
          // Group reactions by post_id
          const reactionsByPost = reactionsData.reduce((acc, r) => {
            if (!acc[r.post_id]) {
              acc[r.post_id] = []
            }
            acc[r.post_id].push(r)
            return acc
          }, {})
          
          // Calculate counts and user reactions
          const reactionsState = {}
          Object.keys(reactionsByPost).forEach(postId => {
            const postReactions = reactionsByPost[postId]
            const counts = { praying: 0, fire: 0, love: 0, amen: 0, pray: 0 }
            let userReaction = null
            let hasPrayed = false
            
            postReactions.forEach(r => {
              if (r.reaction_type === 'praying') counts.praying++
              if (r.reaction_type === 'fire') counts.fire++
              if (r.reaction_type === 'love') counts.love++
              if (r.reaction_type === 'amen') counts.amen++
              if (r.reaction_type === 'pray') {
                counts.pray++
                hasPrayed = r.user_id === user.id
              }
              if (r.user_id === user.id) {
                userReaction = r.reaction_type
              }
            })
            
            reactionsState[postId] = { ...counts, userReaction, hasPrayed }
          })
          
          setPostReactions(reactionsState)
        }
      }
      
    } catch (error) {
      console.error('Error fetching fellowship:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleCreateFellowship = async () => {
    if (!fellowshipName.trim() || !user?.id) return
    
    try {
      setCreating(true)
      setCreateError('')
      
      // Create fellowship
      const { data: newFellowship, error: fellowshipError } = await supabase
        .from('fellowships')
        .insert({
          name: fellowshipName.trim(),
          description: fellowshipDescription.trim() || null,
          created_by: user.id,
        })
        .select()
        .maybeSingle()
      
      if (fellowshipError) throw fellowshipError
      
      // Add creator as member
      const { error: memberError } = await supabase
        .from('fellowship_members')
        .insert({
          fellowship_id: newFellowship.id,
          user_id: user.id,
          role: 'admin',
        })
      
      if (memberError) throw memberError
      
      // Generate invite code
      const code = Math.random().toString(36).substring(2, 8).toUpperCase()
      await supabase
        .from('fellowship_invites')
        .insert({
          fellowship_id: newFellowship.id,
          invite_code: code,
          created_by: user.id,
        })
      
      setFellowshipName('')
      setFellowshipDescription('')
      setView('inside')
      await fetchUserFellowship()
      
    } catch (error) {
      console.error('Error creating fellowship:', error)
      setCreateError('Failed to create fellowship. Please try again.')
    } finally {
      setCreating(false)
    }
  }
  
  const handleJoinWithCode = async () => {
    if (!inviteCode.trim() || !user?.id) return
    
    try {
      setJoining(true)
      setJoinError('')
      
      // Find fellowship by invite code
      const { data: inviteData, error: inviteError } = await supabase
        .from('fellowship_invites')
        .select('fellowship_id')
        .eq('invite_code', inviteCode.trim().toUpperCase())
        .maybeSingle()
      
      if (inviteError) throw inviteError
      
      if (!inviteData) {
        setJoinError('Invalid invite code')
        return
      }
      
      // Check if already a member
      const { data: existingMember } = await supabase
        .from('fellowship_members')
        .select('id')
        .eq('fellowship_id', inviteData.fellowship_id)
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (existingMember) {
        setJoinError('You are already a member of this fellowship')
        return
      }
      
      // Add as member
      const { error: memberError } = await supabase
        .from('fellowship_members')
        .insert({
          fellowship_id: inviteData.fellowship_id,
          user_id: user.id,
          role: 'member',
        })
      
      if (memberError) throw memberError
      
      setInviteCode('')
      setShowJoinModal(false)
      setView('inside')
      await fetchUserFellowship()
      
    } catch (error) {
      console.error('Error joining fellowship:', error)
      setJoinError('Failed to join fellowship. Please try again.')
    } finally {
      setJoining(false)
    }
  }
  
  const handleCreatePost = async () => {
    if (!postContent.trim() || !fellowship?.id || !user?.id) return
    
    try {
      setPosting(true)
      setPostError('')
      
      const { data: newPost, error: postError } = await supabase
        .from('fellowship_posts')
        .insert({
          fellowship_id: fellowship.id,
          user_id: user.id,
          content: postContent.trim(),
          post_type: postType,
        })
        .select()
        .maybeSingle()
      
      if (postError) throw postError
      
      const postWithProfile = {
        ...newPost,
        profile: profile || null
      }
      
      setPosts(prev => [postWithProfile, ...prev])
      setPostContent('')
      setPostType('general')
      setShowPostModal(false)
      
    } catch (error) {
      console.error('Error creating post:', error)
      setPostError('Failed to create post. Please try again.')
    } finally {
      setPosting(false)
    }
  }
  
  const handleGenerateInvite = async () => {
    if (!fellowship?.id || !user?.id) return
    
    try {
      setGeneratingInvite(true)
      setGeneratedInviteCode('')
      
      const code = Math.random().toString(36).substring(2, 10).toUpperCase()
      
      const { error: inviteError } = await supabase
        .from('fellowship_invites')
        .insert({
          fellowship_id: fellowship.id,
          invite_code: code,
          created_by: user.id,
        })
      
      if (inviteError) throw inviteError
      
      setGeneratedInviteCode(code)
      setShowInviteModal(true)
      
    } catch (error) {
      console.error('Error generating invite:', error)
    } finally {
      setGeneratingInvite(false)
    }
  }
  
  const handleCopyInviteLink = () => {
    const link = `https://abidinganchor.com/join/${generatedInviteCode}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const emailLocalPart = (email) => {
    if (!email || typeof email !== 'string') return ''
    const i = email.indexOf('@')
    return i > 0 ? email.slice(0, i).trim() : ''
  }

  /**
   * Public labels for fellowship UI: display_name first (never use full_name).
   * Optional auth user used only to derive email local-part for the signed-in member/author.
   */
  const resolvePublicDisplayLabel = (profile, authUserForSelfEmail = null) => {
    const p = profile || {}
    const display = typeof p.display_name === 'string' ? p.display_name.trim() : ''
    if (display) return display
    const uname = typeof p.username === 'string' ? p.username.trim() : ''
    if (uname) return uname
    const fromProfileEmail = emailLocalPart(p.email)
    if (fromProfileEmail) return fromProfileEmail
    if (
      authUserForSelfEmail?.email &&
      (!p.id || p.id === authUserForSelfEmail.id)
    ) {
      const fromAuthEmail = emailLocalPart(authUserForSelfEmail.email)
      if (fromAuthEmail) return fromAuthEmail
    }
    return 'Member'
  }

  const getDisplayName = (profile, authorUserId) =>
    resolvePublicDisplayLabel(
      profile,
      authorUserId === user?.id ? user : null,
    )

  const getMemberDisplayName = (member) =>
    resolvePublicDisplayLabel(
      member?.profile,
      member?.user_id === user?.id ? user : null,
    )
  
  const handleProfileTap = async (userId) => {
    if (!userId) return
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url, reading_streak, lessons_completed, created_at')
        .eq('id', userId)
        .maybeSingle()
      if (error) throw error
      setProfileData(data)
      setShowProfileModal(userId)
    } catch (err) {
      console.error('Error fetching profile:', err)
    }
  }
  
  const handleDeleteGroup = async () => {
    if (!fellowship?.id) return
    try {
      setDeletingGroup(true)
      
      // Delete all posts
      await supabase
        .from('fellowship_posts')
        .delete()
        .eq('fellowship_id', fellowship.id)
      
      // Delete all members
      await supabase
        .from('fellowship_members')
        .delete()
        .eq('fellowship_id', fellowship.id)
      
      // Delete the fellowship
      await supabase
        .from('fellowships')
        .delete()
        .eq('id', fellowship.id)
      
      setShowDeleteConfirm(false)
      setShowDeleteMenu(false)
      setView('none')
      setFellowship(null)
      setMembers([])
      setPosts([])
      
      // Show toast
      const toast = document.createElement('div')
      toast.textContent = 'Fellowship group deleted'
      toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(212,168,67,0.95);
        color: #0a1428;
        padding: 12px 24px;
        borderRadius: 12px;
        fontSize: 14px;
        fontWeight: 600;
        zIndex: 2000;
        animation: fadeIn 0.3s ease-out;
      `
      document.body.appendChild(toast)
      setTimeout(() => {
        toast.remove()
      }, 3000)
    } catch (err) {
      console.error('Error deleting group:', err)
    } finally {
      setDeletingGroup(false)
    }
  }
  
  const handleRemoveMember = async (memberId, memberName) => {
    if (!fellowship?.id || !memberId) return
    try {
      setRemovingMember(true)
      
      await supabase
        .from('fellowship_members')
        .delete()
        .eq('fellowship_id', fellowship.id)
        .eq('user_id', memberId)
      
      setShowRemoveConfirm(null)
      
      // Update members list
      setMembers(prev => prev.filter(m => m.user_id !== memberId))
      
      // Show toast
      const toast = document.createElement('div')
      toast.textContent = `${memberName} has been removed`
      toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(212,168,67,0.95);
        color: #0a1428;
        padding: 12px 24px;
        borderRadius: 12px;
        fontSize: 14px;
        fontWeight: 600;
        zIndex: 2000;
        animation: fadeIn 0.3s ease-out;
      `
      document.body.appendChild(toast)
      setTimeout(() => {
        toast.remove()
      }, 3000)
    } catch (err) {
      console.error('Error removing member:', err)
    } finally {
      setRemovingMember(false)
    }
  }
  
  const isAdmin = members.some(m => m.user_id === user?.id && m.role === 'admin')
  
  const getInitials = (name) => {
    return name?.charAt(0)?.toUpperCase() || 'A'
  }
  
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }
  
  const handleReaction = async (postId, reactionType) => {
    let oldUserReaction = null
    
    // Optimistic update
    setPostReactions(prev => {
      const reactions = prev[postId] || { praying: 0, fire: 0, love: 0, amen: 0, pray: 0, userReaction: null, hasPrayed: false }
      oldUserReaction = reactions.userReaction
      
      if (reactions.userReaction === reactionType) {
        // Remove reaction
        reactions[reactionType] = Math.max(0, reactions[reactionType] - 1)
        reactions.userReaction = null
      } else {
        // Add new reaction
        if (reactions.userReaction) {
          reactions[reactions.userReaction] = Math.max(0, reactions[reactions.userReaction] - 1)
        }
        reactions[reactionType] = (reactions[reactionType] || 0) + 1
        reactions.userReaction = reactionType
      }
      
      return { ...prev, [postId]: { ...reactions } }
    })
    
    // Sync with Supabase
    try {
      if (oldUserReaction === reactionType) {
        // Delete reaction
        await supabase
          .from('fellowship_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .eq('reaction_type', reactionType)
      } else {
        // Remove old reaction if exists
        if (oldUserReaction) {
          await supabase
            .from('fellowship_reactions')
            .delete()
            .eq('post_id', postId)
            .eq('user_id', user.id)
            .eq('reaction_type', oldUserReaction)
        }
        // Add new reaction
        await supabase
          .from('fellowship_reactions')
          .insert({
            post_id: postId,
            user_id: user.id,
            reaction_type: reactionType,
          })
      }
    } catch (error) {
      console.error('Error updating reaction:', error)
      // Revert optimistic update on error
      // (In production, you'd want to refetch reactions)
    }
  }
  
  const handlePrayForPost = async (postId) => {
    let hasPrayed = false
    
    // Check if already prayed
    setPostReactions(prev => {
      const reactions = prev[postId] || { praying: 0, fire: 0, love: 0, amen: 0, pray: 0, userReaction: null, hasPrayed: false }
      hasPrayed = reactions.hasPrayed
      return prev
    })
    
    if (hasPrayed) return
    
    // Optimistic update
    setPostReactions(prev => {
      const reactions = prev[postId] || { praying: 0, fire: 0, love: 0, amen: 0, pray: 0, userReaction: null, hasPrayed: false }
      reactions.pray = (reactions.pray || 0) + 1
      reactions.hasPrayed = true
      return { ...prev, [postId]: { ...reactions } }
    })
    
    // Sync with Supabase
    try {
      await supabase
        .from('fellowship_reactions')
        .insert({
          post_id: postId,
          user_id: user.id,
          reaction_type: 'pray',
        })
    } catch (error) {
      console.error('Error adding prayer reaction:', error)
    }
  }
  
  const handleOpenComments = async (postId) => {
    setShowCommentsSheet(postId)
    
    // Fetch comments for this post
    try {
      const { data: commentsData, error: commentsError } = await supabase
        .from('fellowship_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
      
      if (!commentsError && commentsData) {
        // Fetch profiles for commenters
        const commenterIds = commentsData.map(c => c.user_id)
        let profilesById = {}
        
        if (commenterIds.length > 0) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, display_name, username, email, avatar_url')
            .in('id', commenterIds)
          
          profilesById = (profileData || []).reduce((acc, p) => {
            acc[p.id] = p
            return acc
          }, {})
        }
        
        const commentsWithProfiles = commentsData.map(c => ({
          ...c,
          profile: profilesById[c.user_id] || null
        }))
        
        setPostComments(prev => ({ ...prev, [postId]: commentsWithProfiles }))
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
    }
  }
  
  const handleCloseComments = () => {
    setShowCommentsSheet(null)
    setCommentInput('')
  }
  
  const handleSubmitComment = async () => {
    if (!commentInput.trim() || !showCommentsSheet) return
    
    const content = commentInput.trim()
    
    // Optimistic update
    const newComment = {
      id: Date.now(),
      user_id: user.id,
      profile: profile,
      content: content,
      created_at: new Date().toISOString(),
    }
    
    setPostComments(prev => ({
      ...prev,
      [showCommentsSheet]: [...(prev[showCommentsSheet] || []), newComment]
    }))
    
    setCommentInput('')
    
    // Sync with Supabase
    try {
      const { data, error } = await supabase
        .from('fellowship_comments')
        .insert({
          post_id: showCommentsSheet,
          user_id: user.id,
          content: content,
        })
        .select()
        .maybeSingle()
      
      if (error) throw error
      
      // Update with real data from Supabase
      setPostComments(prev => {
        const comments = prev[showCommentsSheet] || []
        const updatedComments = comments.map(c => 
          c.id === newComment.id ? { ...data, profile } : c
        )
        return { ...prev, [showCommentsSheet]: updatedComments }
      })
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }
  
  if (loading) {
    return (
      <div className="content-scroll" style={{ padding: '60px 16px 0' }}>
        <div className="flex items-center justify-center h-48">
          <p style={{ color: '#D4A843', fontSize: '16px' }}>Loading…</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="content-scroll" style={{ padding: '60px 16px 0' }}>
      {view === 'none' && (
        <div style={{ maxWidth: '390px', margin: '0 auto', textAlign: 'center' }}>
          {/* Gold Anchor/Cross Icon */}
          <div style={{
            fontSize: '64px',
            marginBottom: '24px',
            filter: 'drop-shadow(0 0 20px rgba(212, 168, 67, 0.4))'
          }}>
            ⚓
          </div>
          
          {/* Title */}
          <h1 style={{
            color: '#D4A843',
            fontSize: '32px',
            fontWeight: 700,
            marginBottom: '12px',
            letterSpacing: '-0.02em',
          }}>
            Fellowship
          </h1>
          
          {/* Subtitle */}
          <p style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '15px',
            marginBottom: '40px',
            lineHeight: 1.6,
          }}>
            Do faith together with the people closest to you
          </p>
          
          {/* Create Button */}
          <button
            onClick={() => setView('create')}
            style={{
              width: '100%',
              padding: '16px 24px',
              borderRadius: '16px',
              border: 'none',
              background: 'linear-gradient(135deg, #D4A843 0%, #B8922F 100%)',
              color: '#0a0f28',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: '16px',
              boxShadow: '0 4px 20px rgba(212, 168, 67, 0.3)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            Create a Fellowship
          </button>
          
          {/* Join Button */}
          <button
            onClick={() => setShowJoinModal(true)}
            style={{
              width: '100%',
              padding: '16px 24px',
              borderRadius: '16px',
              border: '1px solid rgba(212, 168, 67, 0.5)',
              background: 'transparent',
              color: '#D4A843',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: '24px',
              transition: 'background 0.2s ease, border-color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(212, 168, 67, 0.1)'
              e.currentTarget.style.borderColor = 'rgba(212, 168, 67, 0.7)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = 'rgba(212, 168, 67, 0.5)'
            }}
          >
            Join with Invite Code
          </button>
          
          {/* Small text */}
          <p style={{
            color: 'rgba(255, 255, 255, 0.45)',
            fontSize: '12px',
            lineHeight: 1.5,
          }}>
            Private and invite-only. Your faith journey, shared intentionally.
          </p>
        </div>
      )}
      
      {view === 'create' && (
        <div style={{ maxWidth: '390px', margin: '0 auto' }}>
          {/* Back button */}
          <button
            onClick={() => setView('none')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '14px',
              cursor: 'pointer',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            ← Back
          </button>
          
          {/* Title */}
          <h1 style={{
            color: '#D4A843',
            fontSize: '28px',
            fontWeight: 700,
            marginBottom: '32px',
          }}>
            Create Fellowship
          </h1>
          
          {/* Form */}
          <div style={{
            background: 'rgba(10, 15, 40, 0.95)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(212, 168, 67, 0.25)',
            borderRadius: '20px',
            padding: '24px',
          }}>
            {/* Fellowship Name */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '13px',
                fontWeight: 500,
                marginBottom: '8px',
              }}>
                Fellowship Name
              </label>
              <input
                type="text"
                value={fellowshipName}
                onChange={(e) => setFellowshipName(e.target.value)}
                placeholder="e.g., Sunday School Group"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#ffffff',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            
            {/* Description (Optional) */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '13px',
                fontWeight: 500,
                marginBottom: '8px',
              }}>
                Description <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>(optional)</span>
              </label>
              <textarea
                value={fellowshipDescription}
                onChange={(e) => setFellowshipDescription(e.target.value)}
                placeholder="A brief description of your fellowship"
                rows={3}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#ffffff',
                  fontSize: '15px',
                  outline: 'none',
                  resize: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>
            
            {/* Error */}
            {createError && (
              <p style={{ color: '#ff6b6b', fontSize: '13px', marginBottom: '16px' }}>
                {createError}
              </p>
            )}
            
            {/* Create Button */}
            <button
              onClick={handleCreateFellowship}
              disabled={!fellowshipName.trim() || creating}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '12px',
                border: 'none',
                background: !fellowshipName.trim() || creating
                  ? 'rgba(212, 168, 67, 0.3)'
                  : 'linear-gradient(135deg, #D4A843 0%, #B8922F 100%)',
                color: '#0a0f28',
                fontSize: '16px',
                fontWeight: 600,
                cursor: !fellowshipName.trim() || creating ? 'not-allowed' : 'pointer',
                marginBottom: '12px',
                opacity: !fellowshipName.trim() || creating ? 0.6 : 1,
              }}
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
            
            {/* Cancel Button */}
            <button
              onClick={() => {
                setView('none')
                setFellowshipName('')
                setFellowshipDescription('')
                setCreateError('')
              }}
              style={{
                width: '100%',
                padding: '14px',
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
      )}
      
      {view === 'inside' && fellowship && (
        <div style={{ maxWidth: '390px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '24px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1 style={{
                  color: '#ffffff',
                  fontSize: '32px',
                  fontWeight: 800,
                  marginBottom: '8px',
                }}>
                  Fellowship
                </h1>
                <p style={{
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '15px',
                  margin: 0,
                }}>
                  Grow together in faith
                </p>
              </div>
              {isAdmin && (
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    aria-label="Fellowship menu"
                    onClick={() => setShowDeleteMenu(!showDeleteMenu)}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontSize: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: 0,
                      lineHeight: 1,
                    }}
                  >
                    ⋯
                  </button>
                  {showDeleteMenu && (
                    <div style={{
                      position: 'absolute',
                      right: 0,
                      top: '100%',
                      marginTop: '8px',
                      background: 'rgba(10, 20, 50, 0.98)',
                      border: '1px solid rgba(212, 168, 67, 0.3)',
                      borderRadius: '12px',
                      padding: '8px',
                      minWidth: '160px',
                      zIndex: 100,
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
                    }}>
                      <button
                        onClick={() => {
                          setShowDeleteMenu(false)
                          setShowDeleteConfirm(true)
                        }}
                        style={{
                          width: '100%',
                          background: 'none',
                          border: 'none',
                          color: '#ff6b6b',
                          fontSize: '14px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: '8px 12px',
                          textAlign: 'left',
                          borderRadius: '8px',
                        }}
                      >
                        🗑️ Delete Group
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Members Section */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(212, 168, 67, 0.2)',
            borderRadius: '16px',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{
                color: '#D4A843',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                margin: 0,
              }}>
                MEMBERS ({members.length})
              </h2>
              <button
                onClick={handleGenerateInvite}
                disabled={generatingInvite}
                style={{
                  padding: '6px 16px',
                  borderRadius: '50px',
                  border: '1px solid #D4A843',
                  background: 'transparent',
                  color: '#D4A843',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: generatingInvite ? 'not-allowed' : 'pointer',
                  opacity: generatingInvite ? 0.6 : 1,
                }}
              >
                {generatingInvite ? 'Generating…' : 'Invite Members'}
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {members.map((member) => (
                <div
                  key={member.user_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  {/* Avatar */}
                  {member.profile?.avatar_url ? (
                    <img
                      src={member.profile.avatar_url}
                      alt=""
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'rgba(212, 168, 67, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#D4A843',
                      fontSize: '14px',
                      fontWeight: 700,
                    }}>
                      {getInitials(getMemberDisplayName(member))}
                    </div>
                  )}
                  
                  {/* Name */}
                  <div style={{ flex: 1 }}>
                    <p style={{
                      color: '#ffffff',
                      fontSize: '15px',
                      fontWeight: 500,
                      margin: 0,
                    }}>
                      {getMemberDisplayName(member)}
                    </p>
                    <p style={{
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontSize: '12px',
                      margin: '2px 0 0',
                      textTransform: 'capitalize',
                    }}>
                      {member.role}
                    </p>
                  </div>
                  
                  {/* Remove button for admin */}
                  {isAdmin && member.user_id !== user?.id && (
                    <button
                      onClick={() => setShowRemoveConfirm({
                      memberId: member.user_id,
                      memberName: getMemberDisplayName(member),
                    })}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'rgba(255, 50, 50, 0.1)',
                        border: '1px solid rgba(255, 50, 50, 0.3)',
                        color: '#ff6b6b',
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Posts Section */}
          <div>
            <h2 style={{
              color: '#D4A843',
              fontSize: '14px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '16px',
            }}>
              Feed
            </h2>
            
            {posts.length === 0 ? (
              <div style={{
                background: 'rgba(10, 15, 40, 0.95)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(212, 168, 67, 0.25)',
                borderRadius: '20px',
                padding: '32px',
                textAlign: 'center',
              }}>
                <p style={{
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '14px',
                }}>
                  No posts yet. Be the first to share!
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {posts.map((post, index) => {
                  const postTypeConfig = POST_TYPES.find(t => t.id === post.post_type) || POST_TYPES[0]
                  const getPostBorderColor = (type) => {
                    switch(type) {
                      case 'prayer': return '#9B7FD4'
                      case 'verse': return '#5B9BD5'
                      case 'testimony': return '#D4A843'
                      default: return '#D4A843'
                    }
                  }
                  const borderColor = getPostBorderColor(post.post_type)
                  return (
                    <div
                      key={post.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(212, 168, 67, 0.2)',
                        borderRadius: '16px',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        borderLeft: `3px solid ${borderColor}`,
                        padding: '20px',
                        animation: `fadeIn 0.4s ease-out ${index * 0.1}s both`,
                      }}
                    >
                      {/* Post Type Badge */}
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '50px',
                        background: 'rgba(212, 168, 67, 0.15)',
                        border: '1px solid rgba(212, 168, 67, 0.3)',
                        marginBottom: '12px',
                      }}>
                        <span style={{ fontSize: '14px' }}>{postTypeConfig.emoji}</span>
                        <span style={{
                          color: '#D4A843',
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                        }}>
                          {postTypeConfig.label}
                        </span>
                      </div>
                      
                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        {/* Avatar */}
                        {post.profile?.avatar_url ? (
                          <img
                            src={post.profile.avatar_url}
                            alt=""
                            onClick={() => handleProfileTap(post.user_id)}
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              cursor: 'pointer',
                            }}
                          />
                        ) : (
                          <div 
                            onClick={() => handleProfileTap(post.user_id)}
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #D4A843 0%, #B8860B 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              fontSize: '14px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}>
                            {getInitials(getDisplayName(post.profile, post.user_id))}
                          </div>
                        )}
                        
                        {/* Name & Time */}
                        <div style={{ flex: 1 }}>
                          <p 
                            onClick={() => handleProfileTap(post.user_id)}
                            style={{
                              color: '#ffffff',
                              fontSize: '15px',
                              fontWeight: 700,
                              margin: 0,
                              cursor: 'pointer',
                            }}>
                            {getDisplayName(post.profile, post.user_id)}
                          </p>
                          <p style={{
                            color: 'rgba(255, 255, 255, 0.4)',
                            fontSize: '12px',
                            margin: '2px 0 0',
                          }}>
                            {formatDate(post.created_at)}
                          </p>
                        </div>
                      </div>
                      
                      {/* Content */}
                      <p style={{
                        color: '#ffffff',
                        fontSize: '16px',
                        lineHeight: 1.6,
                        margin: '0 0 16px 0',
                      }}>
                        {post.content}
                      </p>
                      
                      {/* Prayer Counter for Prayer Request posts */}
                      {post.post_type === 'prayer' && (
                        <div style={{
                          textAlign: 'center',
                          padding: '16px',
                          background: 'rgba(155, 127, 212, 0.1)',
                          borderRadius: '12px',
                          marginBottom: '16px',
                          border: '1px solid rgba(155, 127, 212, 0.2)',
                        }}>
                          <p style={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontSize: '13px',
                            margin: '0 0 8px 0',
                          }}>
                            🙏 People praying for this
                          </p>
                          <p style={{
                            color: '#D4A843',
                            fontSize: '32px',
                            fontWeight: 700,
                            margin: '0 0 12px 0',
                          }}>
                            {postReactions[post.id]?.pray || 0}
                          </p>
                          <button
                            onClick={() => handlePrayForPost(post.id)}
                            disabled={postReactions[post.id]?.hasPrayed}
                            style={{
                              width: '100%',
                              padding: '12px',
                              borderRadius: '12px',
                              border: 'none',
                              background: postReactions[post.id]?.hasPrayed
                                ? 'rgba(212, 168, 67, 0.3)'
                                : 'linear-gradient(135deg, #D4A843 0%, #B8860B 100%)',
                              color: postReactions[post.id]?.hasPrayed
                                ? 'rgba(255, 255, 255, 0.6)'
                                : '#0a0f28',
                              fontSize: '15px',
                              fontWeight: 600,
                              cursor: postReactions[post.id]?.hasPrayed ? 'not-allowed' : 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {postReactions[post.id]?.hasPrayed ? 'Praying 🙏' : "I'm Praying"}
                          </button>
                        </div>
                      )}
                      
                      {/* Reactions Bar (for non-prayer posts) */}
                      {post.post_type !== 'prayer' && (
                        <div style={{
                          display: 'flex',
                          gap: '8px',
                          flexWrap: 'wrap',
                          marginBottom: '12px',
                        }}>
                          {REACTION_TYPES.map((reaction) => {
                            const reactions = postReactions[post.id] || {}
                            const isActive = reactions.userReaction === reaction.id
                            const count = reactions[reaction.id] || 0
                            return (
                              <button
                                key={reaction.id}
                                onClick={() => handleReaction(post.id, reaction.id)}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '50px',
                                  border: isActive
                                    ? '1px solid rgba(212, 168, 67, 0.4)'
                                    : '1px solid rgba(255, 255, 255, 0.12)',
                                  background: isActive
                                    ? 'rgba(212, 168, 67, 0.2)'
                                    : 'rgba(255, 255, 255, 0.08)',
                                  color: isActive
                                    ? '#D4A843'
                                    : 'rgba(255, 255, 255, 0.7)',
                                  fontSize: '13px',
                                  fontWeight: isActive ? 600 : 500,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'all 0.15s ease',
                                }}
                                onMouseDown={(e) => {
                                  e.currentTarget.style.transform = 'scale(1.3)'
                                }}
                                onMouseUp={(e) => {
                                  e.currentTarget.style.transform = 'scale(1)'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'scale(1)'
                                }}
                              >
                                <span>{reaction.emoji}</span>
                                <span>{count > 0 ? count : ''}</span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                      
                      {/* Comments Button */}
                      <button
                        onClick={() => handleOpenComments(post.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '50px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          background: 'rgba(255, 255, 255, 0.06)',
                          color: 'rgba(255, 255, 255, 0.6)',
                          fontSize: '13px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <span>💬</span>
                        <span>{(postComments[post.id]?.length || 0) > 0 ? `${postComments[post.id].length} replies` : 'Reply'}</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          
          {/* Share Button */}
          <button
            onClick={() => setShowPostModal(true)}
            style={{
              marginTop: '20px',
              width: '100%',
              padding: '16px',
              borderRadius: '50px',
              border: 'none',
              background: '#D4A843',
              color: '#0a1428',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Share with Fellowship
          </button>
          
          {/* Community Verse Card */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(212, 168, 67, 0.15)',
            borderRadius: '16px',
            padding: '20px',
            borderLeft: '3px solid #D4A843',
            marginTop: '24px',
          }}>
            <p style={{
              color: 'rgba(212, 168, 67, 0.7)',
              fontSize: '11px',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              margin: '0 0 12px 0',
              fontWeight: 600,
            }}>
              Community Verse
            </p>
            <p style={{
              color: 'rgba(255, 255, 255, 0.85)',
              fontSize: '15px',
              fontStyle: 'italic',
              lineHeight: 1.7,
              margin: '0 0 12px 0',
            }}>
              For where two or three gather in my name, there am I with them.
            </p>
            <p style={{
              color: '#D4A843',
              fontSize: '13px',
              fontWeight: 700,
              margin: 0,
            }}>
              Matthew 18:20
            </p>
          </div>
        </div>
      )}
      
      {/* Join Modal */}
      {showJoinModal && typeof document !== 'undefined' ? createPortal(
        <>
          <div
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              zIndex: 10050,
            }}
            onClick={() => {
              setShowJoinModal(false)
              setInviteCode('')
              setJoinError('')
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'min(90vw, 390px)',
              maxWidth: '390px',
              background: 'rgba(10, 15, 40, 0.97)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(212, 168, 67, 0.25)',
              borderRadius: '24px',
              padding: '24px',
              zIndex: 10051,
            }}
          >
            <h2 style={{
              color: '#D4A843',
              fontSize: '22px',
              fontWeight: 700,
              marginBottom: '8px',
              textAlign: 'center',
            }}>
              Join Fellowship
            </h2>
            <p style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '14px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              Enter the invite code shared with you
            </p>
            
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Enter invite code"
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#ffffff',
                fontSize: '16px',
                textAlign: 'center',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                outline: 'none',
                marginBottom: '16px',
                boxSizing: 'border-box',
              }}
            />
            
            {joinError && (
              <p style={{ color: '#ff6b6b', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>
                {joinError}
              </p>
            )}
            
            <button
              onClick={handleJoinWithCode}
              disabled={!inviteCode.trim() || joining}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '12px',
                border: 'none',
                background: !inviteCode.trim() || joining
                  ? 'rgba(212, 168, 67, 0.3)'
                  : 'linear-gradient(135deg, #D4A843 0%, #B8922F 100%)',
                color: '#0a0f28',
                fontSize: '16px',
                fontWeight: 600,
                cursor: !inviteCode.trim() || joining ? 'not-allowed' : 'pointer',
                marginBottom: '12px',
                opacity: !inviteCode.trim() || joining ? 0.6 : 1,
              }}
            >
              {joining ? 'Joining…' : 'Join'}
            </button>
            
            <button
              onClick={() => {
                setShowJoinModal(false)
                setInviteCode('')
                setJoinError('')
              }}
              style={{
                width: '100%',
                padding: '14px',
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
        </>,
        document.body,
      ) : null}
      
      {/* Invite Modal */}
      {showInviteModal && typeof document !== 'undefined' ? createPortal(
        <>
          <div
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              zIndex: 10050,
            }}
            onClick={() => {
              setShowInviteModal(false)
              setGeneratedInviteCode('')
              setCopied(false)
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'min(90vw, 390px)',
              maxWidth: '390px',
              background: 'rgba(10, 15, 40, 0.97)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(212, 168, 67, 0.25)',
              borderRadius: '24px',
              padding: '24px',
              zIndex: 10051,
            }}
          >
            <h2 style={{
              color: '#D4A843',
              fontSize: '22px',
              fontWeight: 700,
              marginBottom: '8px',
              textAlign: 'center',
            }}>
              Invite Members
            </h2>
            <p style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '14px',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              Share this link to invite others to your fellowship
            </p>
            
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
            }}>
              <p style={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '13px',
                margin: '0 0 8px 0',
                wordBreak: 'break-all',
              }}>
                https://abidinganchor.com/join/{generatedInviteCode}
              </p>
            </div>
            
            <button
              onClick={handleCopyInviteLink}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #D4A843 0%, #B8922F 100%)',
                color: '#0a0f28',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: '12px',
              }}
            >
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            
            <button
              onClick={() => {
                setShowInviteModal(false)
                setGeneratedInviteCode('')
                setCopied(false)
              }}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'transparent',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '15px',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </>,
        document.body,
      ) : null}
      
      {/* Create Post Modal */}
      {showPostModal && typeof document !== 'undefined' ? createPortal(
        <>
          <div
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              zIndex: 10050,
            }}
            onClick={() => {
              setShowPostModal(false)
              setPostContent('')
              setPostType('general')
              setPostError('')
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              width: '100%',
              maxWidth: '390px',
              margin: '0 auto',
              maxHeight: '85vh',
              overflowY: 'auto',
              background: 'linear-gradient(180deg, rgba(15, 20, 50, 0.98), rgba(8, 12, 35, 0.99))',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(212, 168, 67, 0.25)',
              borderTop: '1px solid rgba(212, 168, 67, 0.4)',
              borderRadius: '24px 24px 0 0',
              padding: '24px',
              zIndex: 10051,
              animation: 'slideUp 0.3s ease-out',
            }}
          >
            <h2 style={{
              color: '#D4A843',
              fontSize: '22px',
              fontWeight: 700,
              marginBottom: '8px',
              textAlign: 'center',
            }}>
              Share with Fellowship
            </h2>
            <p style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '14px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              What's on your heart today?
            </p>
            
            {/* Post Type Selector */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '16px',
              overflowX: 'auto',
              paddingBottom: '4px',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}>
              {POST_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setPostType(type.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '99px',
                    border: postType === type.id
                      ? 'none'
                      : '1px solid rgba(212, 168, 67, 0.3)',
                    background: postType === type.id
                      ? 'linear-gradient(135deg, #D4A843 0%, #B8860B 100%)'
                      : 'rgba(255, 255, 255, 0.05)',
                    color: postType === type.id
                      ? '#ffffff'
                      : '#D4A843',
                    fontSize: '13px',
                    fontWeight: postType === type.id ? 600 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                    boxShadow: postType === type.id ? '0 4px 12px rgba(212, 168, 67, 0.4)' : 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span>{type.emoji}</span>
                  <span>{type.label}</span>
                </button>
              ))}
            </div>
            
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder={POST_TYPES.find(t => t.id === postType)?.placeholder || 'Share something with your fellowship...'}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '16px',
                border: '1px solid rgba(212, 168, 67, 0.2)',
                background: 'rgba(255, 255, 255, 0.04)',
                color: '#ffffff',
                fontSize: '16px',
                outline: 'none',
                resize: 'none',
                minHeight: '120px',
                marginBottom: '16px',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                lineHeight: 1.6,
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(212, 168, 67, 0.8)'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212, 168, 67, 0.1)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(212, 168, 67, 0.2)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
            
            {postError && (
              <p style={{ color: '#ff6b6b', fontSize: '13px', marginBottom: '16px' }}>
                {postError}
              </p>
            )}
            
            <button
              onClick={handleCreatePost}
              disabled={!postContent.trim() || posting}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '12px',
                border: 'none',
                background: !postContent.trim() || posting
                  ? 'rgba(212, 168, 67, 0.3)'
                  : 'linear-gradient(135deg, #D4A843 0%, #B8922F 100%)',
                color: '#0a0f28',
                fontSize: '16px',
                fontWeight: 600,
                cursor: !postContent.trim() || posting ? 'not-allowed' : 'pointer',
                marginBottom: '12px',
                opacity: !postContent.trim() || posting ? 0.6 : 1,
                boxShadow: !postContent.trim() || posting ? 'none' : '0 4px 20px rgba(212, 168, 67, 0.4)',
                transition: 'all 0.2s ease',
              }}
            >
              {posting ? 'Posting…' : 'Post'}
            </button>
            
            <button
              onClick={() => {
                setShowPostModal(false)
                setPostContent('')
                setPostType('general')
                setPostError('')
              }}
              style={{
                width: '100%',
                padding: '14px',
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
        </>,
        document.body,
      ) : null}
      
      {/* Comments Sheet */}
      {showCommentsSheet && typeof document !== 'undefined' ? createPortal(
        <>
          <div
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              zIndex: 10050,
            }}
            onClick={handleCloseComments}
          />
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              width: '100%',
              maxWidth: '390px',
              margin: '0 auto',
              maxHeight: '70vh',
              overflowY: 'auto',
              background: 'linear-gradient(180deg, rgba(15, 20, 50, 0.98), rgba(8, 12, 35, 0.99))',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(212, 168, 67, 0.25)',
              borderTop: '1px solid rgba(212, 168, 67, 0.4)',
              borderRadius: '24px 24px 0 0',
              padding: '24px',
              zIndex: 10051,
              animation: 'slideUp 0.3s ease-out',
            }}
          >
            <h2 style={{
              color: '#D4A843',
              fontSize: '20px',
              fontWeight: 700,
              marginBottom: '16px',
            }}>
              Comments
            </h2>
            
            {/* Comments List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              {(postComments[showCommentsSheet] || []).length === 0 ? (
                <p style={{
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '14px',
                  textAlign: 'center',
                  padding: '24px 0',
                }}>
                  No comments yet. Be the first!
                </p>
              ) : (
                (postComments[showCommentsSheet] || []).map((comment) => (
                  <div
                    key={comment.id}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      borderRadius: '12px',
                    }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #D4A843 0%, #B8860B 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}>
                      {getInitials(getDisplayName(comment.profile, comment.user_id))}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: 600,
                        }}>
                          {getDisplayName(comment.profile, comment.user_id)}
                        </span>
                        <span style={{
                          color: 'rgba(255, 255, 255, 0.4)',
                          fontSize: '11px',
                        }}>
                          {formatDate(comment.created_at)}
                        </span>
                      </div>
                      <p style={{
                        color: 'rgba(255, 255, 255, 0.85)',
                        fontSize: '14px',
                        margin: 0,
                        lineHeight: 1.5,
                      }}>
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Comment Input */}
            <div style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-end',
            }}>
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Add a comment..."
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(212, 168, 67, 0.2)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212, 168, 67, 0.8)'
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212, 168, 67, 0.1)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212, 168, 67, 0.2)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
              <button
                onClick={handleSubmitComment}
                disabled={!commentInput.trim()}
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  background: !commentInput.trim()
                    ? 'rgba(212, 168, 67, 0.3)'
                    : 'linear-gradient(135deg, #D4A843 0%, #B8860B 100%)',
                  color: '#0a0f28',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: !commentInput.trim() ? 'not-allowed' : 'pointer',
                  opacity: !commentInput.trim() ? 0.6 : 1,
                }}
              >
                Send
              </button>
            </div>
          </div>
        </>,
        document.body,
      ) : null}
      
      {/* Profile Modal */}
      {showProfileModal && profileData ? (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowProfileModal(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 999,
            }}
          />
          {/* Modal */}
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(10,20,50,0.98)',
            border: '1px solid rgba(212,168,67,0.3)',
            borderRadius: '20px',
            padding: '24px',
            width: '280px',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            zIndex: 1000,
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            {/* Close button */}
            <button
              onClick={() => setShowProfileModal(null)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.4)',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              ×
            </button>
            
            {/* Avatar */}
            <div style={{ textAlign: 'center' }}>
              {profileData.avatar_url ? (
                <img
                  src={profileData.avatar_url}
                  alt=""
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid #D4A843',
                  }}
                />
              ) : (
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #D4A843 0%, #B8860B 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '24px',
                  fontWeight: 700,
                  border: '2px solid #D4A843',
                  margin: '0 auto',
                }}>
                  {getInitials(profileData.display_name || profileData.username)}
                </div>
              )}
            </div>
            
            {/* Display name */}
            <p style={{
              color: '#ffffff',
              fontSize: '20px',
              fontWeight: 800,
              textAlign: 'center',
              marginTop: '12px',
              margin: '12px 0 0 0',
            }}>
              {profileData.display_name || profileData.username}
            </p>
            
            {/* Badges row */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '8px',
            }}>
              {profileData.lessons_completed > 0 && (
                <span style={{
                  background: 'rgba(212,168,67,0.2)',
                  border: '1px solid rgba(212,168,67,0.4)',
                  borderRadius: '50px',
                  padding: '4px 12px',
                  fontSize: '12px',
                  color: '#D4A843',
                  fontWeight: 600,
                }}>
                  {profileData.lessons_completed} Badges
                </span>
              )}
            </div>
            
            {/* Streak */}
            {profileData.reading_streak > 0 && (
              <p style={{
                color: '#D4A843',
                fontSize: '13px',
                textAlign: 'center',
                marginTop: '8px',
                margin: '8px 0 0 0',
              }}>
                🔥 {profileData.reading_streak} day streak
              </p>
            )}
            
            {/* Member since */}
            <p style={{
              fontSize: '12px',
              color: 'rgba(255,255,255,0.4)',
              textAlign: 'center',
              marginTop: '4px',
              margin: '4px 0 0 0',
            }}>
              Member since {new Date(profileData.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </>
      ) : null}
      
      {/* Delete Group Confirmation Modal */}
      {showDeleteConfirm && (
        <>
          <div
            onClick={() => setShowDeleteConfirm(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 999,
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(10,20,50,0.98)',
            border: '1px solid rgba(212,168,67,0.3)',
            borderRadius: '20px',
            padding: '24px',
            width: '320px',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            zIndex: 1000,
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            <h3 style={{
              color: '#ffffff',
              fontSize: '18px',
              fontWeight: 700,
              marginBottom: '12px',
              margin: '0 0 12px 0',
            }}>
              Delete Fellowship Group
            </h3>
            <p style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: '14px',
              lineHeight: 1.6,
              marginBottom: '24px',
              margin: '0 0 24px 0',
            }}>
              Are you sure you want to delete this fellowship group? This cannot be undone. All posts and members will be removed.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deletingGroup}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  borderRadius: '50px',
                  border: '1px solid #D4A843',
                  background: 'transparent',
                  color: '#D4A843',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: deletingGroup ? 'not-allowed' : 'pointer',
                  opacity: deletingGroup ? 0.6 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteGroup}
                disabled={deletingGroup}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  borderRadius: '50px',
                  border: 'none',
                  background: '#ff6b6b',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: deletingGroup ? 'not-allowed' : 'pointer',
                  opacity: deletingGroup ? 0.6 : 1,
                }}
              >
                {deletingGroup ? 'Deleting…' : 'Delete Group'}
              </button>
            </div>
          </div>
        </>
      )}
      
      {/* Remove Member Confirmation Modal */}
      {showRemoveConfirm && (
        <>
          <div
            onClick={() => setShowRemoveConfirm(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 999,
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(10,20,50,0.98)',
            border: '1px solid rgba(212,168,67,0.3)',
            borderRadius: '20px',
            padding: '24px',
            width: '320px',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            zIndex: 1000,
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            <h3 style={{
              color: '#ffffff',
              fontSize: '18px',
              fontWeight: 700,
              marginBottom: '12px',
              margin: '0 0 12px 0',
            }}>
              Remove Member
            </h3>
            <p style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: '14px',
              lineHeight: 1.6,
              marginBottom: '24px',
              margin: '0 0 24px 0',
            }}>
              Remove {showRemoveConfirm.memberName} from the group?
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowRemoveConfirm(null)}
                disabled={removingMember}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  borderRadius: '50px',
                  border: '1px solid #D4A843',
                  background: 'transparent',
                  color: '#D4A843',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: removingMember ? 'not-allowed' : 'pointer',
                  opacity: removingMember ? 0.6 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemoveMember(showRemoveConfirm.memberId, showRemoveConfirm.memberName)}
                disabled={removingMember}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  borderRadius: '50px',
                  border: 'none',
                  background: '#ff6b6b',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: removingMember ? 'not-allowed' : 'pointer',
                  opacity: removingMember ? 0.6 : 1,
                }}
              >
                {removingMember ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
