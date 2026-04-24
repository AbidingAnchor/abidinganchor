import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useFellowship } from '../context/FellowshipContext'
import { SHIMMER_KEYFRAMES } from '../hooks/useNameStyle'
import { supabase } from '../lib/supabase'
import { fetchVerse } from '../utils/bibleTranslation'

// Note: 'pray' is used for the prayer counter on prayer request posts

export default function Fellowship() {
  const { t, i18n } = useTranslation()
  const { user, profile } = useAuth()
  const {
    fellowship,
    setFellowship,
    members,
    setMembers,
    posts,
    setPosts,
    postReactions,
    setPostReactions,
    view,
    setView,
    triggerRefetch,
    addDeletedFellowshipId,
  } = useFellowship()

  const POST_TYPES = useMemo(() => [
    { id: 'general', emoji: '💬', label: t('fellowship.postTypeGeneral'), placeholder: t('fellowship.postTypeGeneralPlaceholder') },
    { id: 'prayer', emoji: '🙏', label: t('fellowship.postTypePrayer'), placeholder: t('fellowship.postTypePrayerPlaceholder') },
    { id: 'verse', emoji: '📖', label: t('fellowship.postTypeVerse'), placeholder: t('fellowship.postTypeVersePlaceholder') },
    { id: 'testimony', emoji: '✨', label: t('fellowship.postTypeTestimony'), placeholder: t('fellowship.postTypeTestimonyPlaceholder') },
  ], [t])

  const REACTION_TYPES = useMemo(() => [
    { id: 'praying', emoji: '🙏', label: t('fellowship.reactionPraying') },
    { id: 'fire', emoji: '🔥', label: t('fellowship.reactionFire') },
    { id: 'love', emoji: '❤️', label: t('fellowship.reactionLove') },
    { id: 'amen', emoji: '✝️', label: t('fellowship.reactionAmen') },
  ], [t])
  
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
  const [postComments, setPostComments] = useState({})
  
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

  // Community verse
  const [communityVerseText, setCommunityVerseText] = useState('')
  const [communityVerseLoading, setCommunityVerseLoading] = useState(true)

  useEffect(() => {
    const loadCommunityVerse = async () => {
      setCommunityVerseLoading(true)
      const lang = (i18n.resolvedLanguage || i18n.language || 'en').toLowerCase().split(/[-_]/)[0]
      try {
        const text = await fetchVerse(40, 18, 20, lang)
        setCommunityVerseText(text)
      } catch {
        // Fall back to English if fetch fails
        setCommunityVerseText('For where two or three gather in my name, there am I with them.')
      } finally {
        setCommunityVerseLoading(false)
      }
    }

    loadCommunityVerse()
  }, [i18n.resolvedLanguage, i18n.language])
  
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
      triggerRefetch()
      
    } catch (error) {
      console.error('Error creating fellowship:', error)
      setCreateError(t('fellowship.createError'))
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
        setJoinError(t('fellowship.invalidInviteCode'))
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
        setJoinError(t('fellowship.alreadyMember'))
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
      triggerRefetch()
      
    } catch (error) {
      console.error('Error joining fellowship:', error)
      setJoinError(t('fellowship.joinError'))
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
      setPostError(t('fellowship.postError'))
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
    return t('fellowship.member')
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

  const getNameStyle = (supporterTier) => {
    if (supporterTier === 'lifetime') {
      return {
        background: 'linear-gradient(90deg, #b8860b, #ffd700, #ffec8b, #ffd700, #b8860b)',
        backgroundSize: '200%',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        animation: 'shimmer-gold 2s infinite linear',
      }
    } else if (supporterTier === 'monthly') {
      return { color: '#93c5fd' }
    }
    return { color: 'inherit' }
  }
  
  const handleProfileTap = async (userId) => {
    if (!userId) return
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url, reading_streak, lessons_completed, created_at, supporter_tier')
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
      
      console.log('Starting delete for fellowship:', fellowship.id)
      
      // Delete all posts
      const { error: postsError } = await supabase
        .from('fellowship_posts')
        .delete()
        .eq('fellowship_id', fellowship.id)
      
      if (postsError) {
        console.error('Failed to delete posts:', postsError)
        throw postsError
      }
      console.log('Posts deleted successfully')
      
      // Delete all members
      const { error: membersError } = await supabase
        .from('fellowship_members')
        .delete()
        .eq('fellowship_id', fellowship.id)
      
      if (membersError) {
        console.error('Failed to delete members:', membersError)
        throw membersError
      }
      console.log('Members deleted successfully')
      
      // Delete the fellowship
      const { error: fellowshipError } = await supabase
        .from('fellowships')
        .delete()
        .eq('id', fellowship.id)
      
      if (fellowshipError) {
        console.error('Failed to delete fellowship:', fellowshipError)
        throw fellowshipError
      }
      console.log('Fellowship deleted successfully from Supabase')
      
      // Immediately add to deleted IDs set to prevent restoration
      addDeletedFellowshipId(fellowship.id)
      
      // Update local state immediately BEFORE any refetch
      setFellowship(null)
      setMembers([])
      setPosts([])
      setView('none')
      
      setShowDeleteConfirm(false)
      setShowDeleteMenu(false)
      
      // No refetch after delete - local state + deletedFellowshipIdsRef is sufficient
      
      // Show toast
      const toast = document.createElement('div')
      toast.textContent = t('fellowship.groupDeleted')
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
      // Show error toast
      const toast = document.createElement('div')
      toast.textContent = t('fellowship.deleteError')
      toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(220,38,38,0.95);
        color: white;
        padding: 12px 24px;
        borderRadius: 12px;
        fontSize: 14px;
        fontWeight: 600;
        zIndex: 2000;
      `
      document.body.appendChild(toast)
      setTimeout(() => {
        toast.remove()
      }, 3000)
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
      toast.textContent = t('fellowship.memberRemoved', { name: memberName })
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
    
    if (diffMins < 1) return t('fellowship.justNow')
    if (diffMins < 60) return t('fellowship.minutesAgo', { n: diffMins })
    if (diffHours < 24) return t('fellowship.hoursAgo', { n: diffHours })
    if (diffDays < 7) return t('fellowship.daysAgo', { n: diffDays })
    return date.toLocaleDateString()
  }
  
  const handleReaction = async (postId, reactionType) => {
    let oldUserReaction = null
    
    // Optimistic update
    setPostReactions(prev => {
      const reactions = prev[postId] || { praying: 0, fire: 0, love: 0, amen: 0, pray: 0, userReaction: null, hasPrayed: false }
      const newReactions = { ...reactions }
      
      // If user is un-reacting
      if (reactions.userReaction === reactionType) {
        newReactions[reactionType]--
        newReactions.userReaction = null
        if (reactionType === 'pray') newReactions.hasPrayed = false
      } else {
        // If user is changing reaction or adding new reaction
        if (reactions.userReaction) {
          newReactions[reactions.userReaction]--
        }
        newReactions[reactionType]++
        newReactions.userReaction = reactionType
        if (reactionType === 'pray') newReactions.hasPrayed = true
      }
      return { ...prev, [postId]: newReactions }
    })
    
    try {
      if (oldUserReaction === reactionType) {
        // Remove reaction
        await supabase
          .from('fellowship_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .eq('reaction_type', reactionType)
      } else {
        // Add or change reaction
        // First, remove existing reaction if any
        await supabase
          .from('fellowship_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)
        
        // Then, insert new reaction
        await supabase
          .from('fellowship_reactions')
          .insert({
            post_id: postId,
            user_id: user.id,
            reaction_type: reactionType,
          })
      }
    } catch (error) {
      console.error('Error handling reaction:', error)
      // Revert optimistic update on error
      setPostReactions(prev => ({ ...prev, [postId]: oldUserReaction }))
    }
  }
  
  // Modals
  const createFellowshipModal = createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">{t('fellowship.createFellowship')}</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">{t('fellowship.createFellowshipDescription')}</p>
        <input
          type="text"
          className="w-full p-3 mb-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          placeholder={t('fellowship.namePlaceholder')}
          value={fellowshipName}
          onChange={(e) => setFellowshipName(e.target.value)}
        />
        <textarea
          className="w-full p-3 mb-4 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          placeholder={t('fellowship.descriptionPlaceholder')}
          value={fellowshipDescription}
          onChange={(e) => setFellowshipDescription(e.target.value)}
        />
        {createError && <p className="text-red-500 mb-4">{createError}</p>}
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => setView('none')}
            className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition duration-200"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleCreateFellowship}
            disabled={creating || !fellowshipName.trim()}
            className="px-4 py-2 rounded-lg bg-yellow-500 text-white font-bold hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
          >
            {creating ? t('common.creating') : t('fellowship.create')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )

  const joinFellowshipModal = createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">{t('fellowship.joinFellowship')}</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">{t('fellowship.joinFellowshipDescription')}</p>
        <input
          type="text"
          className="w-full p-3 mb-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          placeholder={t('fellowship.inviteCodePlaceholder')}
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
        />
        {joinError && <p className="text-red-500 mb-4">{joinError}</p>}
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => setShowJoinModal(false)}
            className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition duration-200"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleJoinWithCode}
            disabled={joining || !inviteCode.trim()}
            className="px-4 py-2 rounded-lg bg-yellow-500 text-white font-bold hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
          >
            {joining ? t('common.joining') : t('fellowship.join')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )

  const inviteMembersModal = createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">{t('fellowship.inviteMembers')}</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">{t('fellowship.inviteMembersDescription')}</p>
        {generatedInviteCode ? (
          <div className="mb-4">
            <p className="text-gray-700 dark:text-gray-200 mb-2 font-medium">{t('fellowship.inviteCode')}:</p>
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
              <code className="flex-grow text-gray-900 dark:text-white text-lg font-mono truncate">{generatedInviteCode}</code>
              <button
                onClick={handleCopyInviteLink}
                className="ml-3 px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition duration-200"
              >
                {copied ? t('common.copied') : t('common.copy')}
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t('fellowship.inviteCodeShareInstruction')}</p>
          </div>
        ) : (
          <button
            onClick={handleGenerateInvite}
            disabled={generatingInvite}
            className="w-full px-4 py-2 rounded-lg bg-yellow-500 text-white font-bold hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
          >
            {generatingInvite ? t('fellowship.generatingCode') : t('fellowship.generateInviteCode')}
          </button>
        )}
        
        <div className="flex justify-end space-x-3 mt-4">
          <button
            onClick={() => setShowInviteModal(false)}
            className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition duration-200"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )

  const createPostModal = createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">{t('fellowship.createPost')}</h2>
        <textarea
          className="w-full p-3 mb-4 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          placeholder={t('fellowship.postContentPlaceholder')}
          value={postContent}
          onChange={(e) => setPostContent(e.target.value)}
          rows="5"
        />
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">{t('fellowship.postType')}:</label>
          <div className="flex flex-wrap gap-2">
            {POST_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setPostType(type.id)}
                className={`px-3 py-1 rounded-full text-sm font-medium ${postType === type.id ? 'bg-yellow-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}
              >
                {type.emoji} {type.label}
              </button>
            ))}
          </div>
        </div>
        {postError && <p className="text-red-500 mb-4">{postError}</p>}
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => setShowPostModal(false)}
            className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition duration-200"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleCreatePost}
            disabled={posting || !postContent.trim()}
            className="px-4 py-2 rounded-lg bg-yellow-500 text-white font-bold hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
          >
            {posting ? t('common.posting') : t('fellowship.post')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )

  const profileModal = createPortal(
    showProfileModal && profileData ? (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <style>{SHIMMER_KEYFRAMES}</style>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl">
          <div className="flex items-center mb-4">
            <div className="w-16 h-16 rounded-full bg-yellow-200 dark:bg-yellow-700 flex items-center justify-center text-3xl font-bold text-yellow-800 dark:text-yellow-200 mr-4">
              {getInitials(getDisplayName(profileData))}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white" style={getNameStyle(profileData.supporter_tier)}>{getDisplayName(profileData)}</h2>
              {profileData.username && (
                <p className="text-gray-600 dark:text-gray-400">@{profileData.username}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{t('profile.joined')}</p>
              <p className="text-gray-800 dark:text-gray-200">{new Date(profileData.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{t('profile.lessonsCompleted')}</p>
              <p className="text-gray-800 dark:text-gray-200">{profileData.lessons_completed}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{t('profile.readingStreak')}</p>
              <p className="text-gray-800 dark:text-gray-200">{profileData.reading_streak} {t('profile.days')}</p>
            </div>
          </div>
          <button
            onClick={() => setShowProfileModal(null)}
            className="w-full px-4 py-2 rounded-lg bg-yellow-500 text-white font-bold hover:bg-yellow-600 transition duration-200"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    ) : null,
    document.body
  )

  const deleteGroupConfirmModal = createPortal(
    showDeleteConfirm && fellowship ? (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl">
          <h2 className="text-2xl font-bold text-red-600 mb-4">{t('fellowship.deleteGroupConfirmTitle')}</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{t('fellowship.deleteGroupConfirmDescription', { fellowshipName: fellowship.name })}</p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition duration-200"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleDeleteGroup}
              disabled={deletingGroup}
              className="px-4 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
            >
              {deletingGroup ? t('common.deleting') : t('common.delete')}
            </button>
          </div>
        </div>
      </div>
    ) : null,
    document.body
  )

  const removeMemberConfirmModal = createPortal(
    showRemoveConfirm && fellowship ? (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl">
          <h2 className="text-2xl font-bold text-red-600 mb-4">{t('fellowship.removeMemberConfirmTitle')}</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{t('fellowship.removeMemberConfirmDescription', { memberName: getMemberDisplayName(members.find(m => m.user_id === showRemoveConfirm)) })}</p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowRemoveConfirm(null)}
              className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition duration-200"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={() => handleRemoveMember(showRemoveConfirm, getMemberDisplayName(members.find(m => m.user_id === showRemoveConfirm)))}
              disabled={removingMember}
              className="px-4 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
            >
              {removingMember ? t('common.removing') : t('common.remove')}
            </button>
          </div>
        </div>
      </div>
    ) : null,
    document.body
  )

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {view === 'none' && (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-3">{t('fellowship.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">{t('fellowship.subtitle')}</p>
          
          <button
            onClick={() => setView('create')}
            className="bg-yellow-500 text-white font-bold py-3 px-6 rounded-full text-lg mb-4 shadow-lg hover:bg-yellow-600 transition duration-200"
          >
            {t('fellowship.createFellowship')}
          </button>
          <button
            onClick={() => setShowJoinModal(true)}
            className="text-yellow-600 dark:text-yellow-400 font-semibold py-3 px-6 rounded-full text-lg hover:bg-yellow-100 dark:hover:bg-yellow-900 transition duration-200"
          >
            {t('fellowship.joinWithCode')}
          </button>
        </div>
      )}

      {view === 'create' && (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          {createFellowshipModal}
        </div>
      )}

      {showJoinModal && joinFellowshipModal}
      {showInviteModal && inviteMembersModal}
      {showPostModal && createPostModal}
      {showProfileModal && profileModal}
      {showDeleteConfirm && deleteGroupConfirmModal}
      {showRemoveConfirm && removeMemberConfirmModal}

      {view === 'inside' && fellowship && (
        <div className="flex flex-col flex-grow">
          <header className="bg-white dark:bg-gray-800 shadow-sm p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button onClick={() => setView('none')} className="text-gray-600 dark:text-gray-300 mr-3 p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition duration-200">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">{fellowship.name}</h1>
              </div>
              <div className="relative">
                <button onClick={() => setShowDeleteMenu(!showDeleteMenu)} className="text-gray-600 dark:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition duration-200">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
                {showDeleteMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg z-10">
                    <button
                      onClick={() => { setShowInviteModal(true); setShowDeleteMenu(false); }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      {t('fellowship.inviteMembers')}
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => { setShowDeleteConfirm(true); setShowDeleteMenu(false); }}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-100 dark:hover:bg-red-700"
                      >
                        {t('fellowship.deleteGroup')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </header>
          
          <div className="flex flex-col flex-grow overflow-hidden">
            <div className="flex-shrink-0 bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-2">{t('fellowship.membersLabel')} ({members.length})</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {members.map(member => (
                  <div
                    key={member.user_id}
                    onClick={() => handleProfileTap(member.user_id)}
                    className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-full pr-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition duration-200"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-200 dark:bg-blue-700 flex items-center justify-center text-sm font-medium text-blue-800 dark:text-blue-200 mr-2">
                      {getInitials(getMemberDisplayName(member))}
                    </div>
                    <span className="text-gray-800 dark:text-gray-200 text-sm font-medium">{getMemberDisplayName(member)}</span>
                    {member.role === 'admin' && (
                      <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded-full">{t('fellowship.admin')}</span>
                    )}
                    {isAdmin && member.user_id !== user?.id && (
                      <button onClick={(e) => { e.stopPropagation(); setShowRemoveConfirm(member.user_id); }} className="ml-2 text-gray-500 hover:text-red-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">{t('fellowship.communityVerseLabel')}</h3>
                {communityVerseLoading ? (
                  <p className="text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
                ) : (
                  <p className="italic text-gray-700 dark:text-gray-300">"{communityVerseText}"</p>
                )}
              </div>
            </div>

            <div className="flex-shrink-0 p-4 bg-white dark:bg-gray-800">
              <button
                onClick={() => setShowPostModal(true)}
                className="w-full bg-yellow-400 text-yellow-900 font-bold py-2 px-4 rounded-full flex items-center justify-center shadow-md hover:bg-yellow-300 transition duration-200"
              >
                <span className="text-xl mr-2">+
                </span> {t('fellowship.shareUpdate')}
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-4">
              {posts.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 text-center mt-8">
                  {t('fellowship.noPosts')}
                </p>
              )}
              {posts.map(post => (
                <div key={post.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 rounded-full bg-blue-200 dark:bg-blue-700 flex items-center justify-center text-xl font-bold text-blue-800 dark:text-blue-200 mr-3">
                      {getInitials(getDisplayName(post.profile, post.user_id))}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 dark:text-white" style={getNameStyle(post.profile?.supporter_tier)}>{getDisplayName(post.profile, post.user_id)}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(post.created_at)}</p>
                    </div>
                  </div>
                  <p className="text-gray-800 dark:text-gray-200 mb-3">{post.content}</p>
                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex space-x-3">
                      {REACTION_TYPES.map(reactionType => {
                        const count = postReactions[post.id]?.[reactionType.id] || 0
                        const userReacted = postReactions[post.id]?.userReaction === reactionType.id
                        return (
                          <button
                            key={reactionType.id}
                            onClick={() => handleReaction(post.id, reactionType.id)}
                            className={`flex items-center p-1 rounded-full ${userReacted ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                          >
                            {reactionType.emoji} {count > 0 && <span className="ml-1">{count}</span>}
                          </button>
                        )
                      })}
                    </div>
                    <span className="hover:text-gray-800 dark:hover:text-gray-200">
                      {t('fellowship.comments', { count: postComments[post.id]?.length || 0 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
