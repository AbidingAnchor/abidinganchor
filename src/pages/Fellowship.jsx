import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useFellowship } from '../context/FellowshipContext'
import { useThemeBackgroundType } from '../hooks/useThemeBackgroundType'
import { SHIMMER_KEYFRAMES } from '../hooks/useNameStyle'
import { supabase } from '../lib/supabase'
import { fetchVerse } from '../utils/bibleTranslation'

// Note: 'pray' is used for the prayer counter on prayer request posts

// REQUIRED SUPABASE TABLES FOR CHAT FEATURE:
// The following tables need to be created in Supabase (via migration or manually):
//
// 1. fellowship_messages table:
//    - id (uuid, primary key, default gen_random_uuid())
//    - fellowship_id (uuid, references fellowships.id)
//    - user_id (uuid, references auth.users.id)
//    - content (text, not null)
//    - created_at (timestamptz, default now())
//
// 2. fellowship_message_reactions table:
//    - id (uuid, primary key, default gen_random_uuid())
//    - message_id (uuid, references fellowship_messages.id)
//    - user_id (uuid, references auth.users.id)
//    - reaction_type (text) — values: praying, fire, love, amen
//    - created_at (timestamptz, default now())

export default function Fellowship() {
  const { t, i18n } = useTranslation()
  const themeType = useThemeBackgroundType()
  const isDaytime = themeType === 'day' || themeType === 'morning' || themeType === 'afternoon'
  const { user, profile } = useAuth()
  const {
    fellowship,
    setFellowship,
    fellowships,
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
    removeFellowship,
    selectFellowship,
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

  // Fellowship item hover state
  const [hoveredFellowshipId, setHoveredFellowshipId] = useState(null)

  // Chat feature state
  const [activeTab, setActiveTab] = useState('posts') // 'posts' | 'chat'
  const [messages, setMessages] = useState([])
  const [messageInput, setMessageInput] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [chatSearch, setChatSearch] = useState('')
  const [searchActive, setSearchActive] = useState(false)
  const [showChatSearch, setShowChatSearch] = useState(false)
  const [messageReactions, setMessageReactions] = useState({})
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState(null)
  const [reactionPickerPosition, setReactionPickerPosition] = useState({ top: 0, left: 0 })
  const messageInputRef = useRef(null)

  // Emoji constants
  const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '🙏', '🔥', '✝️', '😢', '👏', '🙌', '🙏', '💯', '🎉', '❤️‍🔥', '👀']
  const INPUT_EMOJIS = {
    'Smileys': ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳'],
    'Gestures': ['👍', '👎', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦵', '🦶', '👂', '👃', '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄'],
    'Symbols': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🈳', '🈂️', '🛂', '🛃', '🛄', '🉑', '🈹', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🈳', '🈂️', '🛂', '🛃', '🛄'],
    'Nature': ['🌸', '💮', '🏵️', '🌹', '🥀', '🌺', '🌻', '🌼', '🌷', '🌱', '🪴', '🌲', '🌳', '🌴', '🌵', '🌾', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🍇', '🍈', '🍉', '🍊', '🍋', '🍌', '🍍', '🥭', '🍎', '🍏', '🍐', '🍑', '🍒', '🍓', '🫐', '🥝', '🍅', '🫒', '🥥', '🥑', '🍆', '🥔', '🥕', '🌽', '🌶️', '🫑', '🥒', '🥬', '🥦', '🧄', '🧅', '🍄', '🥜', '🌰', '🍞', '🥐', '🥖', '🥨', '🥯', '🥞', '🧇', '🧀', '🍖', '🍗', '🥩', '🥓', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🫔', '🫕', '🥙', '🧆', '🥚', '🍳', '🥘', '🍲', '🫕', '🥣', '🥗', '🍿', '🧈', '🧂', '🥫', '🍱', '🍘', '🍙', '🍚', '🍛', '🍜', '🍝', '🍠', '🍢', '🍣', '🍤', '🍥', '🥮', '🍡', '🥟', '🥠', '🥡', '🦀', '🦞', '🦐', '🦑', '🦪', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼', '🥛', '☕', '🫖', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🥤', '🧋', '🧃', '🧉', '🧊'],
  }

  const handleEmojiInsert = (emoji) => {
    const input = messageInputRef.current
    if (!input) return
    
    const start = input.selectionStart
    const end = input.selectionEnd
    const text = messageInput
    
    const newText = text.substring(0, start) + emoji + text.substring(end)
    setMessageInput(newText)
    
    // Set cursor position after inserted emoji
    setTimeout(() => {
      input.focus()
      input.setSelectionRange(start + emoji.length, start + emoji.length)
    }, 0)
  }

  const handleReactionPickerOpen = (e, messageId) => {
    const rect = e.target.getBoundingClientRect()
    setReactionPickerPosition({
      top: rect.top - 200,
      left: rect.left - 100,
    })
    setReactionPickerMessageId(messageId)
    setShowReactionPicker(true)
  }

  const handleReactionEmojiSelect = (emoji) => {
    if (reactionPickerMessageId) {
      handleMessageReaction(reactionPickerMessageId, emoji)
    }
    setShowReactionPicker(false)
    setReactionPickerMessageId(null)
  }

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

  // Chat data loading with real-time subscription
  useEffect(() => {
    if (!fellowship?.id || view !== 'inside') return

    // Initial load
    const loadMessages = async () => {
      const { data: messagesData } = await supabase
        .from('fellowship_messages')
        .select('*')
        .eq('fellowship_id', fellowship.id)
        .order('created_at', { ascending: true })

      const userIds = [...new Set((messagesData || []).map(m => m.user_id))]
      let profilesById = {}
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, display_name, username, email, avatar_url, supporter_tier')
          .in('id', userIds)
        profilesById = (profileData || []).reduce((acc, p) => { acc[p.id] = p; return acc }, {})
      }

      const messagesWithProfiles = (messagesData || []).map(m => ({
        ...m,
        profile: profilesById[m.user_id] || null
      }))
      setMessages(messagesWithProfiles)

      // Load message reactions
      const messageIds = (messagesData || []).map(m => m.id)
      if (messageIds.length > 0) {
        const { data: reactionsData } = await supabase
          .from('fellowship_message_reactions')
          .select('*')
          .in('message_id', messageIds)

        const reactionsMap = {}
        messageIds.forEach(id => {
          reactionsMap[id] = { praying: 0, fire: 0, love: 0, amen: 0, userReaction: null }
        })
        ;(reactionsData || []).forEach(r => {
          if (reactionsMap[r.message_id]) {
            reactionsMap[r.message_id][r.reaction_type] = (reactionsMap[r.message_id][r.reaction_type] || 0) + 1
            if (r.user_id === user?.id) reactionsMap[r.message_id].userReaction = r.reaction_type
          }
        })
        setMessageReactions(reactionsMap)
      }
    }

    loadMessages()

    // Real-time subscription
    const channel = supabase
      .channel(`fellowship-chat-${fellowship.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'fellowship_messages',
        filter: `fellowship_id=eq.${fellowship.id}` 
      }, async (payload) => {
        const newMsg = payload.new
        // Fetch profile for new message
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, display_name, username, email, avatar_url, supporter_tier')
          .eq('id', newMsg.user_id)
          .maybeSingle()

        setMessages(prev => [...prev, { ...newMsg, profile: profileData || null }])
        setMessageReactions(prev => ({
          ...prev,
          [newMsg.id]: { praying: 0, fire: 0, love: 0, amen: 0, userReaction: null }
        }))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fellowship?.id, view, user?.id])

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (activeTab === 'chat' && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, activeTab])

  // Track scroll position to show/hide scroll-to-bottom button
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      setShowScrollToBottom(!isNearBottom)
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [activeTab])

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleCreateFellowship = async () => {
    if (!fellowshipName.trim() || !user?.id) return
    if (creating) {
      console.log('handleCreateFellowship called while already creating, ignoring')
      return
    }

    console.log('Creating fellowship:', fellowshipName.trim())

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

      console.log('Fellowship created successfully:', newFellowship.id, newFellowship.name)

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
      // Set the fellowship directly and load its data
      setFellowship(newFellowship)
      setView('inside')
      // Load members and posts for the new fellowship
      const { data: membersData } = await supabase
        .from('fellowship_members')
        .select('user_id, role, joined_at')
        .eq('fellowship_id', newFellowship.id)
      
      const userIds = (membersData || []).map(m => m.user_id)
      let profilesById = {}
      
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, display_name, username, email, avatar_url')
          .in('id', userIds)
        
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
      
      const { data: postsData } = await supabase
        .from('fellowship_posts')
        .select('*')
        .eq('fellowship_id', newFellowship.id)
        .order('created_at', { ascending: false })
      
      const postUserIds = (postsData || []).map(p => p.user_id)
      let postProfilesById = {}
      
      if (postUserIds.length > 0) {
        const { data: postProfileData } = await supabase
          .from('profiles')
          .select('id, display_name, username, email, avatar_url')
          .in('id', postUserIds)
        
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
      
      // Fetch the fellowship details
      const { data: fellowshipData } = await supabase
        .from('fellowships')
        .select('*')
        .eq('id', inviteData.fellowship_id)
        .maybeSingle()
      
      if (!fellowshipData) throw new Error('Fellowship not found')
      
      setInviteCode('')
      setShowJoinModal(false)
      // Set the fellowship directly and load its data
      setFellowship(fellowshipData)
      setView('inside')
      // Load members and posts for the fellowship
      const { data: membersData } = await supabase
        .from('fellowship_members')
        .select('user_id, role, joined_at')
        .eq('fellowship_id', fellowshipData.id)
      
      const userIds = (membersData || []).map(m => m.user_id)
      let profilesById = {}
      
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, display_name, username, email, avatar_url')
          .in('id', userIds)
        
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
      
      const { data: postsData } = await supabase
        .from('fellowship_posts')
        .select('*')
        .eq('fellowship_id', fellowshipData.id)
        .order('created_at', { ascending: false })
      
      const postUserIds = (postsData || []).map(p => p.user_id)
      let postProfilesById = {}
      
      if (postUserIds.length > 0) {
        const { data: postProfileData } = await supabase
          .from('profiles')
          .select('id, display_name, username, email, avatar_url')
          .in('id', postUserIds)
        
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

      console.log('Starting delete for fellowship:', fellowship.id, 'name:', fellowship.name)
      
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
      
      // Filter deleted fellowship from local fellowships array
      removeFellowship(fellowship.id)
      
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

  // Chat message handlers
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !fellowship?.id || !user?.id) return
    try {
      setSendingMessage(true)
      await supabase
        .from('fellowship_messages')
        .insert({
          fellowship_id: fellowship.id,
          user_id: user.id,
          content: messageInput.trim(),
        })
      setMessageInput('')
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSendingMessage(false)
    }
  }

  const handleMessageReaction = async (messageId, reactionType) => {
    setMessageReactions(prev => {
      const reactions = prev[messageId] || { praying: 0, fire: 0, love: 0, amen: 0, userReaction: null }
      const newReactions = { ...reactions }
      if (reactions.userReaction === reactionType) {
        newReactions[reactionType]--
        newReactions.userReaction = null
      } else {
        if (reactions.userReaction) newReactions[reactions.userReaction]--
        newReactions[reactionType]++
        newReactions.userReaction = reactionType
      }
      return { ...prev, [messageId]: newReactions }
    })

    try {
      await supabase.from('fellowship_message_reactions').delete()
        .eq('message_id', messageId).eq('user_id', user.id)

      const currentReaction = messageReactions[messageId]?.userReaction
      if (currentReaction !== reactionType) {
        await supabase.from('fellowship_message_reactions').insert({
          message_id: messageId,
          user_id: user.id,
          reaction_type: reactionType,
        })
      }
    } catch (error) {
      console.error('Error handling message reaction:', error)
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
      <div 
        onClick={() => setShowDeleteConfirm(false)}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 50,
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: isDaytime ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(20px)',
            border: isDaytime ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '24px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          }}
        >
          <h2 style={{
            fontSize: '20px',
            fontWeight: '700',
            color: '#DC2626',
            marginBottom: '12px',
          }}>
            {t('fellowship.deleteGroupConfirmTitle')}
          </h2>
          <p style={{
            fontSize: '14px',
            color: isDaytime ? '#4B5563' : 'rgba(255, 255, 255, 0.8)',
            marginBottom: '20px',
            lineHeight: '1.5',
          }}>
            Are you sure you want to delete this fellowship? This cannot be undone.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              style={{
                padding: '10px 20px',
                borderRadius: '12px',
                color: isDaytime ? '#4B5563' : 'rgba(255, 255, 255, 0.8)',
                background: isDaytime ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.1)',
                border: isDaytime ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.15)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = isDaytime ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = isDaytime ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.1)'
              }}
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleDeleteGroup}
              disabled={deletingGroup}
              style={{
                padding: '10px 20px',
                borderRadius: '12px',
                background: deletingGroup ? 'rgba(220, 38, 38, 0.5)' : 'linear-gradient(135deg, #DC2626, #EF4444)',
                color: '#FFFFFF',
                border: 'none',
                cursor: deletingGroup ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                opacity: deletingGroup ? 0.6 : 1,
                boxShadow: deletingGroup ? 'none' : '0 4px 12px rgba(220, 38, 38, 0.3)',
              }}
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
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900" style={{ background: 'transparent' }}>
      {view === 'none' && (
        <div 
          className="flex flex-col items-center justify-start h-full p-4 text-center relative overflow-hidden"
          style={{ 
            background: 'transparent', 
            color: '#1A1A1A',
            minHeight: '100vh',
            paddingTop: '5vh'
          }}
        >
          {/* Particle Effects Background */}
          <style>{`
            @keyframes float {
              0%, 100% { transform: translateY(0) translateX(0) scale(1); opacity: 0.3; }
              25% { transform: translateY(-20px) translateX(10px) scale(1.1); opacity: 0.6; }
              50% { transform: translateY(-10px) translateX(-10px) scale(1); opacity: 0.4; }
              75% { transform: translateY(-30px) translateX(5px) scale(1.05); opacity: 0.5; }
            }
            @keyframes shimmer {
              0% { background-position: -200% center; }
              100% { background-position: 200% center; }
            }
            @keyframes twinkle {
              0%, 100% { opacity: 0.2; transform: scale(1); }
              50% { opacity: 0.8; transform: scale(1.3); }
            }
            @keyframes fadeInUp {
              0% { opacity: 0; transform: translateY(8px); }
              100% { opacity: 1; transform: translateY(0); }
            }
            @keyframes slideUp {
              0% { opacity: 0; transform: translateY(20px); }
              100% { opacity: 1; transform: translateY(0); }
            }
            .particle {
              position: absolute;
              border-radius: 50%;
              pointer-events: none;
              animation: float 8s ease-in-out infinite;
            }
            .particle-1 { width: 60px; height: 60px; background: radial-gradient(circle, rgba(212,168,67,0.4) 0%, transparent 70%); top: 10%; left: 10%; animation-delay: 0s; }
            .particle-2 { width: 80px; height: 80px; background: radial-gradient(circle, rgba(147,197,253,0.3) 0%, transparent 70%); top: 20%; right: 15%; animation-delay: 2s; }
            .particle-3 { width: 50px; height: 50px; background: radial-gradient(circle, rgba(212,168,67,0.3) 0%, transparent 70%); bottom: 30%; left: 20%; animation-delay: 4s; }
            .particle-4 { width: 70px; height: 70px; background: radial-gradient(circle, rgba(147,197,253,0.25) 0%, transparent 70%); bottom: 20%; right: 10%; animation-delay: 1s; }
            .particle-5 { width: 40px; height: 40px; background: radial-gradient(circle, rgba(212,168,67,0.35) 0%, transparent 70%); top: 40%; left: 5%; animation-delay: 3s; }
            .particle-6 { width: 90px; height: 90px; background: radial-gradient(circle, rgba(147,197,253,0.2) 0%, transparent 70%); top: 60%; right: 5%; animation-delay: 5s; }
            .particle-7 { width: 4px; height: 4px; background: rgba(255,255,255,0.5); top: 15%; left: 30%; animation: twinkle 3s ease-in-out infinite; animation-delay: 0.5s; }
            .particle-8 { width: 5px; height: 5px; background: rgba(255,255,255,0.6); top: 35%; right: 25%; animation: twinkle 2.5s ease-in-out infinite; animation-delay: 1.5s; }
            .particle-9 { width: 3px; height: 3px; background: rgba(255,255,255,0.4); bottom: 40%; left: 15%; animation: twinkle 3.5s ease-in-out infinite; animation-delay: 2.5s; }
            .particle-10 { width: 6px; height: 6px; background: rgba(255,255,255,0.5); bottom: 15%; right: 30%; animation: twinkle 2.8s ease-in-out infinite; animation-delay: 0.8s; }
          `}</style>
          <div className="particle particle-1"></div>
          <div className="particle particle-2"></div>
          <div className="particle particle-3"></div>
          <div className="particle particle-4"></div>
          <div className="particle particle-5"></div>
          <div className="particle particle-6"></div>
          <div className="particle particle-7"></div>
          <div className="particle particle-8"></div>
          <div className="particle particle-9"></div>
          <div className="particle particle-10"></div>

          <div
            className="fellowship-landing-card relative z-10"
            style={{
              padding: '1px',
              background: isDaytime 
                ? 'transparent' 
                : 'linear-gradient(135deg, rgba(212,168,67,0.3) 0%, transparent 50%, rgba(212,168,67,0.15) 100%)',
              borderRadius: '25px',
            }}
          >
          <div
            style={{
              background: isDaytime 
                ? 'rgba(255, 255, 255, 0.7)' 
                : 'rgba(8, 16, 38, 0.65)',
              backdropFilter: isDaytime ? 'blur(20px)' : 'blur(24px)',
              WebkitBackdropFilter: isDaytime ? 'blur(20px)' : 'blur(24px)',
              borderRadius: '24px',
              border: isDaytime 
                ? '1px solid rgba(212,168,67,0.3)' 
                : '1px solid rgba(212,168,67,0.25)',
              padding: '40px 32px',
              textAlign: 'center',
              maxWidth: '540px',
              width: '100%',
              boxShadow: isDaytime 
                ? '0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05)' 
                : '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(212,168,67,0.08), inset 0 1px 0 rgba(212,168,67,0.15)',
            }}
          >
          <h1 
            className="text-4xl font-bold text-gray-800 dark:text-white mb-3"
            style={{
              color: isDaytime ? '#1A1A1A' : '#FFFFFF',
              textShadow: isDaytime ? 'none' : '0 0 30px rgba(212,168,67,0.4), 0 2px 4px rgba(0,0,0,0.5)',
              letterSpacing: '0.02em',
              background: isDaytime ? 'none' : 'linear-gradient(135deg, #FFFFFF 0%, rgba(255,255,255,0.9) 50%, #FFFFFF 100%)',
              backgroundSize: isDaytime ? 'auto' : '200% 200%',
              WebkitBackgroundClip: isDaytime ? 'text' : 'text',
              WebkitTextFillColor: isDaytime ? 'inherit' : 'transparent',
              backgroundClip: isDaytime ? 'text' : 'text',
              animation: isDaytime ? 'none' : 'shimmer 4s ease-in-out infinite',
            }}
          >{t('fellowship.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md" style={{ color: isDaytime ? '#4A5568' : 'rgba(255,255,255,0.8)' }}>{t('fellowship.subtitle')}</p>
          
          {fellowships.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-bold mb-3" style={{ color: isDaytime ? '#1A1A1A' : '#FFFFFF' }}>Your Fellowships</h2>
              <div className="space-y-3">
                {fellowships.map(f => (
                  <button
                    key={f.id}
                    onClick={() => selectFellowship(f.id)}
                    onMouseEnter={() => setHoveredFellowshipId(f.id)}
                    onMouseLeave={() => setHoveredFellowshipId(null)}
                    className="w-full text-left p-4 rounded-lg transition-all duration-200 flex items-center gap-3"
                    style={{
                      background: hoveredFellowshipId === f.id && !isDaytime
                        ? 'rgba(212,168,67,0.08)'
                        : isDaytime 
                          ? 'rgba(255, 255, 255, 0.8)' 
                          : 'rgba(10, 20, 40, 0.5)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      border: isDaytime 
                        ? '1px solid rgba(212,168,67,0.3)' 
                        : '1px solid rgba(212,168,67,0.25)',
                      borderLeft: !isDaytime ? '3px solid rgba(212,168,67,0.5)' : 'none',
                      boxShadow: isDaytime 
                        ? '0 4px 12px rgba(0,0,0,0.08)' 
                        : '0 4px 16px rgba(0,0,0,0.3)',
                      color: isDaytime ? '#1A1A1A' : '#FFFFFF'
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: isDaytime 
                          ? 'linear-gradient(135deg, rgba(212,168,67,0.2), rgba(212,168,67,0.1))' 
                          : 'linear-gradient(135deg, rgba(212,168,67,0.3), rgba(212,168,67,0.15))',
                        color: isDaytime ? '#D4A843' : '#D4A843'
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="font-bold text-base truncate" style={{ color: isDaytime ? '#1A1A1A' : '#FFFFFF' }}>{f.name}</div>
                      {f.description && <div className="text-sm opacity-70 truncate" style={{ color: isDaytime ? '#6B7280' : 'rgba(255,255,255,0.7)' }}>{f.description}</div>}
                    </div>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-5 w-5 flex-shrink-0 transition-transform duration-200" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor" 
                      style={{
                        color: isDaytime ? '#D4A843' : 'rgba(212,168,67,0.8)',
                        transform: hoveredFellowshipId === f.id ? 'translateX(3px)' : 'translateX(0)',
                      }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <button
            onClick={() => setView('create')}
            className="font-bold py-3 px-8 rounded-full text-lg mb-4 transition-all duration-300 transform hover:scale-105"
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #C49A2E 0%, #F0C84A 40%, #E8B830 70%, #C49A2E 100%)',
              backgroundSize: '200% 200%',
              animation: 'shimmer 3s ease-in-out infinite',
              color: '#0A1428',
              boxShadow: '0 6px 24px rgba(212,168,67,0.5), 0 0 40px rgba(212,168,67,0.2), inset 0 1px 0 rgba(255,255,255,0.2)',
              border: '1px solid rgba(212, 168, 67, 0.5)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            {t('fellowship.createFellowship')}
          </button>
          <button
            onClick={() => setShowJoinModal(true)}
            className="font-semibold py-3 px-8 rounded-full text-lg transition-all duration-300 transform hover:scale-105"
            style={{
              width: '100%',
              background: isDaytime 
                ? 'linear-gradient(135deg, rgba(212,168,67,0.1) 0%, rgba(212,168,67,0.05) 100%)' 
                : 'linear-gradient(135deg, rgba(212,168,67,0.15) 0%, rgba(212,168,67,0.08) 100%)',
              color: isDaytime ? '#D4A843' : '#D4A843',
              boxShadow: isDaytime 
                ? '0 2px 10px rgba(212, 168, 67, 0.2)' 
                : 'inset 0 0 20px rgba(212,168,67,0.05), 0 4px 15px rgba(0,0,0,0.3)',
              border: isDaytime 
                ? '1px solid rgba(212, 168, 67, 0.3)' 
                : '1.5px solid rgba(212, 168, 67, 0.5)',
              backdropFilter: 'blur(10px)'
            }}
          >
            {t('fellowship.joinWithCode')}
          </button>

          {/* Inspirational Quote Section */}
          <div 
            className="mt-8 pt-6 border-t"
            style={{
              borderColor: isDaytime 
                ? 'rgba(212,168,67,0.2)' 
                : 'rgba(212,168,67,0.15)'
            }}
          >
            <div 
              className="leading-relaxed"
              style={{
                color: isDaytime 
                  ? 'rgba(26, 26, 26, 0.7)' 
                  : 'rgba(255, 255, 255, 0.75)',
                fontFamily: 'Georgia, serif',
                fontSize: '0.9rem',
                fontStyle: 'italic',
              }}
            >
              <span 
                style={{
                  color: 'rgba(212,168,67,0.6)',
                  fontSize: '3rem',
                  lineHeight: 0,
                  verticalAlign: '-0.5rem',
                  marginRight: '0.25rem',
                }}
              >
                "
              </span>
              {communityVerseLoading ? (
                <span>{t('common.loading')}</span>
              ) : (
                <span>{communityVerseText}</span>
              )}
            </div>
            <div 
              className="text-xs mt-3 font-medium"
              style={{
                color: isDaytime 
                  ? 'rgba(212,168,67,0.7)' 
                  : 'rgba(212,168,67,0.9)',
                letterSpacing: '0.08em',
              }}
            >
              — Matthew 18:20
            </div>
          </div>
          </div>
          </div>
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
        <div className="flex flex-col flex-grow" style={{ height: '100%' }}>
          <header
            className="shadow-sm p-4 border-b border-gray-200 dark:border-gray-700"
            style={{ background: isDaytime ? '#F5EFE0' : 'transparent', color: isDaytime ? '#1A1A1A' : undefined }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => setView('none')}
                  className="mr-3 p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition duration-200"
                  style={{ color: isDaytime ? '#1A1A1A' : undefined }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h1 className="text-xl font-bold" style={{ color: isDaytime ? '#1A1A1A' : undefined }}>{fellowship.name}</h1>
              </div>
              <div className="relative flex items-center gap-2">
                {activeTab === 'chat' && (
                  <button
                    onClick={() => setShowChatSearch(!showChatSearch)}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition duration-200"
                    style={{ color: isDaytime ? '#1A1A1A' : undefined }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => setShowDeleteMenu(!showDeleteMenu)}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition duration-200"
                  style={{ color: isDaytime ? '#1A1A1A' : undefined }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
                {showDeleteMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg z-10">
                    <button
                      onClick={() => { setShowInviteModal(true); setShowDeleteMenu(false); }}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600"
                      style={{ color: '#ffffff' }}
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

          {/* Tab Bar */}
          <div style={{
            display: 'flex',
            borderBottom: isDaytime ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(212,168,67,0.15)',
            background: isDaytime ? '#F5EFE0' : 'transparent',
          }}>
            {['posts', 'chat'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '12px',
                  fontWeight: activeTab === tab ? '700' : '400',
                  fontSize: '15px',
                  color: activeTab === tab ? '#D4A843' : (isDaytime ? '#6B7280' : 'rgba(255,255,255,0.5)'),
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab ? '2px solid #D4A843' : '2px solid transparent',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.2s ease',
                }}
              >
                {tab === 'posts' ? '📋 Posts' : '💬 Chat'}
              </button>
            ))}
          </div>

          <div className="flex flex-col flex-grow overflow-hidden" style={{ height: '100%' }}>
            {/* Posts Tab */}
            <div style={{ display: activeTab === 'posts' ? 'flex' : 'none', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
              <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700" style={{ background: isDaytime ? '#F5EFE0' : undefined }}>
                <h2 className="text-lg font-bold mb-2" style={{ color: isDaytime ? '#1A1A1A' : undefined }}>{t('fellowship.membersLabel')} ({members.length})</h2>
                <div className="flex flex-wrap gap-2 mb-4">
                  {members.map(member => (
                    <div
                      key={member.user_id}
                      onClick={() => handleProfileTap(member.user_id)}
                      className="flex items-center rounded-full pr-3 cursor-pointer transition duration-200"
                      style={{ background: isDaytime ? '#F3F4F6' : 'rgba(10, 15, 38, 0.4)', color: isDaytime ? '#1A1A1A' : '#FFFFFF' }}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mr-2" style={{ background: isDaytime ? '#BFDBFE' : 'rgba(212,168,67,0.2)', color: isDaytime ? '#1E40AF' : '#D4A843' }}>
                        {getInitials(getMemberDisplayName(member))}
                      </div>
                      <span className="text-sm">{getMemberDisplayName(member)}</span>
                      {member.role === 'admin' && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full" style={{ background: isDaytime ? '#FEF3C7' : 'rgba(212,168,67,0.3)', color: isDaytime ? '#92400E' : '#D4A843' }}>{t('fellowship.admin')}</span>
                      )}
                      {isAdmin && member.user_id !== user?.id && (
                        <button onClick={(e) => { e.stopPropagation(); setShowRemoveConfirm(member.user_id); }} className="ml-2" style={{ color: isDaytime ? '#6B7280' : 'rgba(255,255,255,0.5)' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="rounded-lg p-4 mb-4" style={{ background: isDaytime ? '#F3F4F6' : 'rgba(10, 15, 38, 0.4)', border: isDaytime ? 'none' : '1px solid rgba(212,168,67,0.15)' }}>
                  <h3 className="text-lg font-bold mb-2" style={{ color: isDaytime ? '#1A1A1A' : '#FFFFFF' }}>{t('fellowship.communityVerseLabel')}</h3>
                  {communityVerseLoading ? (
                    <p style={{ color: isDaytime ? '#6B7280' : 'rgba(255,255,255,0.5)' }}>{t('common.loading')}</p>
                  ) : (
                    <p className="italic" style={{ color: isDaytime ? '#374151' : 'rgba(255,255,255,0.8)' }}>"{communityVerseText}"</p>
                  )}
                </div>
              </div>

              <div className="flex-shrink-0 p-4" style={{ background: isDaytime ? '#F5EFE0' : 'transparent' }}>
                <button
                  onClick={() => setShowPostModal(true)}
                  className="w-full font-bold py-2 px-4 rounded-full flex items-center justify-center shadow-md hover:opacity-90 transition duration-200"
                  style={{ background: '#D4A843', color: '#1A1A1A' }}
                >
                  <span className="text-xl mr-2">+
                  </span> {t('fellowship.shareUpdate')}
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-4" style={{ background: isDaytime ? '#F5EFE0' : undefined }}>
                {posts.length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400 text-center mt-8" style={{ color: isDaytime ? '#1A1A1A' : 'rgba(255,255,255,0.5)' }}>
                    {t('fellowship.noPosts')}
                  </p>
                )}
                {posts.map(post => (
                  <div key={post.id} className="rounded-lg shadow p-4 mb-4" style={{ background: isDaytime ? '#FFFFFF' : 'rgba(10, 15, 38, 0.6)', border: isDaytime ? 'none' : '1px solid rgba(212,168,67,0.2)' }}>
                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold mr-3" style={{ background: isDaytime ? '#BFDBFE' : 'rgba(212,168,67,0.2)', color: isDaytime ? '#1E40AF' : '#D4A843' }}>
                        {getInitials(getDisplayName(post.profile, post.user_id))}
                      </div>
                      <div>
                        <p className="font-bold" style={{ ...getNameStyle(post.profile?.supporter_tier), color: isDaytime ? '#1A1A1A' : '#FFFFFF' }}>{getDisplayName(post.profile, post.user_id)}</p>
                        <p className="text-sm" style={{ color: isDaytime ? '#6B7280' : 'rgba(255,255,255,0.5)' }}>{formatDate(post.created_at)}</p>
                      </div>
                    </div>
                    <p className="mb-3" style={{ color: isDaytime ? '#1A1A1A' : 'rgba(255,255,255,0.9)' }}>{post.content}</p>
                    <div className="flex items-center justify-between text-sm" style={{ color: isDaytime ? '#6B7280' : 'rgba(255,255,255,0.6)' }}>
                      <div className="flex space-x-3">
                        {REACTION_TYPES.map(reactionType => {
                          const count = postReactions[post.id]?.[reactionType.id] || 0
                          const userReacted = postReactions[post.id]?.userReaction === reactionType.id
                          return (
                            <button
                              key={reactionType.id}
                              onClick={() => handleReaction(post.id, reactionType.id)}
                              className="flex items-center p-1 rounded-full"
                              style={{
                                background: userReacted ? 'rgba(212,168,67,0.2)' : 'transparent',
                                color: isDaytime ? '#1A1A1A' : 'rgba(255,255,255,0.8)'
                              }}
                            >
                              {reactionType.emoji} {count > 0 && <span className="ml-1">{count}</span>}
                            </button>
                          )
                        })}
                      </div>
                      <span style={{ color: isDaytime ? '#6B7280' : 'rgba(255,255,255,0.6)' }}>
                        {t('fellowship.comments', { count: postComments[post.id]?.length || 0 })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Tab */}
            <div style={{ display: activeTab === 'chat' ? 'flex' : 'none', flexDirection: 'column', height: '100%', position: 'relative' }}>
              {/* Inline Search Input */}
              {showChatSearch && (
                <div style={{
                  padding: '10px 16px',
                  borderBottom: isDaytime ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.1)',
                  background: isDaytime ? '#F5EFE0' : 'rgba(255,255,255,0.05)',
                  backdropFilter: isDaytime ? 'none' : 'blur(20px)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexShrink: 0,
                }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', opacity: 0.5 }}>🔍</span>
                    <input
                      type="text"
                      placeholder="Search messages..."
                      value={chatSearch}
                      onChange={(e) => setChatSearch(e.target.value)}
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '8px 12px 8px 32px',
                        borderRadius: '20px',
                        border: isDaytime ? '1px solid rgba(0,0,0,0.15)' : '1px solid rgba(255,255,255,0.15)',
                        background: isDaytime ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.1)',
                        color: isDaytime ? '#1A1A1A' : '#FFFFFF',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  {chatSearch && (
                    <button onClick={() => setChatSearch('')} style={{ color: isDaytime ? '#6B7280' : 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>✕</button>
                  )}
                </div>
              )}

              {/* Messages List */}
              <div 
                ref={messagesContainerRef}
                style={{ 
                  flex: 1, 
                  overflowY: 'auto', 
                  padding: '16px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '4px',
                  background: isDaytime ? '#F5EFE0' : 'transparent',
                  position: 'relative',
                }}
              >
                {/* Subtle noise texture overlay for night theme */}
                {!isDaytime && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(212,168,67,0.03) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(212,168,67,0.02) 0%, transparent 50%)',
                    pointerEvents: 'none',
                    zIndex: 0,
                  }} />
                )}
                
                {messages
                  .filter(msg => chatSearch ? msg.content.toLowerCase().includes(chatSearch.toLowerCase()) : true)
                  .map((msg, index, arr) => {
                    const isOwn = msg.user_id === user?.id
                    const prevMsg = arr[index - 1]
                    const isSameAuthor = prevMsg && prevMsg.user_id === msg.user_id
                    const displayName = getDisplayName(msg.profile, msg.user_id)
                    const reactions = messageReactions[msg.id] || {}
                    const isHighlighted = chatSearch && msg.content.toLowerCase().includes(chatSearch.toLowerCase())

                    return (
                      <div key={msg.id} style={{ marginTop: isSameAuthor ? '2px' : '12px', position: 'relative', zIndex: 1 }}>
                        {!isSameAuthor && !isOwn && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '4px',
                            justifyContent: 'flex-start',
                          }}>
                            <div style={{
                              width: '28px', height: '28px', borderRadius: '50%',
                              background: isDaytime ? '#BFDBFE' : 'rgba(212,168,67,0.2)',
                              color: isDaytime ? '#1E40AF' : '#D4A843',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', flexShrink: 0,
                            }} onClick={() => handleProfileTap(msg.user_id)}>
                              {getInitials(displayName)}
                            </div>
                            <span style={{
                              fontSize: '12px', fontWeight: '600',
                              color: isDaytime ? '#374151' : 'rgba(251,191,36,0.7)',
                              ...getNameStyle(msg.profile?.supporter_tier)
                            }}>{displayName}</span>
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
                          <div style={{
                            maxWidth: '75%',
                            padding: '10px 14px',
                            borderRadius: isOwn ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
                            background: isOwn
                              ? 'linear-gradient(135deg, #CA8A04, #F59E0B)'
                              : (isDaytime ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.05)'),
                            backdropFilter: isOwn ? 'none' : 'blur(12px)',
                            color: isOwn ? '#111827' : (isDaytime ? '#1A1A1A' : '#F3F4F6'),
                            fontSize: '14px',
                            lineHeight: '1.4',
                            boxShadow: isHighlighted
                              ? '0 0 0 2px rgba(212,168,67,0.8)'
                              : (isOwn ? '0 0 12px rgba(202,138,4,0.4)' : (isDaytime ? '0 1px 4px rgba(0,0,0,0.08)' : '0 2px 8px rgba(0,0,0,0.3)')),
                            border: isHighlighted ? 'none' : (isDaytime ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.1)'),
                            wordBreak: 'break-word',
                            animation: 'fadeInUp 0.2s ease-out',
                            position: 'relative',
                          }}>
                            {msg.content}
                            <div style={{
                              fontSize: '10px',
                              color: isOwn ? 'rgba(17,24,39,0.5)' : (isDaytime ? 'rgba(26,26,26,0.5)' : 'rgba(243,244,246,0.5)'),
                              marginTop: '4px',
                              textAlign: isOwn ? 'right' : 'left',
                            }}>
                              {formatDate(msg.created_at)}
                            </div>
                          </div>
                        </div>

                        {/* Reactions on messages */}
                        <div style={{
                          display: 'flex',
                          gap: '4px',
                          marginTop: '4px',
                          justifyContent: isOwn ? 'flex-end' : 'flex-start',
                          flexWrap: 'wrap',
                        }}>
                          {REACTION_TYPES.map(rt => {
                            const count = reactions[rt.id] || 0
                            const userReacted = reactions.userReaction === rt.id
                            if (count === 0 && !userReacted) return null
                            return (
                              <button 
                                key={rt.id} 
                                onClick={() => handleMessageReaction(msg.id, rt.id)} 
                                onMouseEnter={(e) => {
                                  if (!userReacted) {
                                    e.target.style.borderColor = 'rgba(245,158,11,0.4)'
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!userReacted) {
                                    e.target.style.borderColor = 'transparent'
                                  }
                                }}
                                style={{
                                  background: userReacted ? 'rgba(245,158,11,0.2)' : (isDaytime ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)'),
                                  border: userReacted ? '1px solid rgba(245,158,11,0.5)' : '1px solid rgba(255,255,255,0.15)',
                                  borderRadius: '9999px', 
                                  padding: '2px 8px', 
                                  fontSize: '12px', 
                                  cursor: 'pointer',
                                  color: isDaytime ? '#374151' : 'rgba(255,255,255,0.8)',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                {rt.emoji} {count}
                              </button>
                            )
                          })}
                          <button onClick={(e) => handleReactionPickerOpen(e, msg.id)} style={{
                            background: isDaytime ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)',
                            border: isDaytime ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '9999px',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '14px',
                            color: isDaytime ? '#374151' : 'rgba(255,255,255,0.8)',
                            padding: 0,
                          }} title="React">+</button>
                        </div>
                      </div>
                    )
                  })}
                {messages.filter(msg => chatSearch ? msg.content.toLowerCase().includes(chatSearch.toLowerCase()) : true).length === 0 && (
                  <div style={{ textAlign: 'center', marginTop: '40px', color: isDaytime ? '#9CA3AF' : 'rgba(255,255,255,0.3)', fontSize: '14px', position: 'relative', zIndex: 1 }}>
                    {chatSearch ? `No messages found for "${chatSearch}"` : 'No messages yet. Start the conversation! 👋'}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Scroll to bottom button */}
              {showScrollToBottom && (
                <button
                  onClick={scrollToBottom}
                  style={{
                    position: 'absolute',
                    bottom: '80px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg, #CA8A04, #F59E0B)',
                    color: '#111827',
                    border: 'none',
                    borderRadius: '20px',
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(202,138,4,0.4)',
                    zIndex: 10,
                    transition: 'all 0.2s ease',
                  }}
                >
                  ↓ New messages
                </button>
              )}

              {/* Reaction Emoji Picker */}
              {showReactionPicker && (
                <div
                  onClick={() => setShowReactionPicker(false)}
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 50,
                  }}
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      top: reactionPickerPosition.top,
                      left: reactionPickerPosition.left,
                      background: isDaytime ? 'rgba(255,255,255,0.95)' : 'rgba(15,23,42,0.95)',
                      backdropFilter: 'blur(20px)',
                      border: isDaytime ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '16px',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                      padding: '12px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, 1fr)',
                      gap: '8px',
                      zIndex: 51,
                    }}
                  >
                    {REACTION_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleReactionEmojiSelect(emoji)}
                        style={{
                          padding: '8px',
                          fontSize: '24px',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          borderRadius: '8px',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = isDaytime ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)'
                          e.target.style.transform = 'scale(1.2)'
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'transparent'
                          e.target.style.transform = 'scale(1)'
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Emoji Picker Panel */}
              {showEmojiPicker && (
                <div style={{
                  flexShrink: 0,
                  height: '250px',
                  background: isDaytime ? 'rgba(255,255,255,0.95)' : 'rgba(15,23,42,0.95)',
                  backdropFilter: 'blur(20px)',
                  border: isDaytime ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)',
                  borderTop: isDaytime ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  animation: 'slideUp 0.2s ease-out',
                }}>
                  <div style={{
                    display: 'flex',
                    borderBottom: isDaytime ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.1)',
                    overflowX: 'auto',
                    padding: '8px',
                    gap: '4px',
                  }}>
                    {Object.keys(INPUT_EMOJIS).map((category) => (
                      <button
                        key={category}
                        onClick={() => {
                          const element = document.getElementById(`emoji-category-${category}`)
                          if (element) element.scrollIntoView({ behavior: 'smooth' })
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: 'transparent',
                          border: 'none',
                          color: isDaytime ? '#374151' : 'rgba(255,255,255,0.7)',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = isDaytime ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)'
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'transparent'
                        }}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                  <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '8px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(8, 1fr)',
                    gap: '4px',
                  }}>
                    {Object.entries(INPUT_EMOJIS).map(([category, emojis]) => (
                      <div key={category} id={`emoji-category-${category}`} style={{ gridColumn: '1 / -1' }}>
                        <div style={{
                          fontSize: '11px',
                          fontWeight: '600',
                          color: isDaytime ? '#9CA3AF' : 'rgba(255,255,255,0.5)',
                          padding: '8px 4px 4px',
                          position: 'sticky',
                          top: 0,
                          background: isDaytime ? 'rgba(255,255,255,0.95)' : 'rgba(15,23,42,0.95)',
                        }}>
                          {category}
                        </div>
                        {emojis.map((emoji, index) => (
                          <button
                            key={emoji + index}
                            onClick={() => handleEmojiInsert(emoji)}
                            style={{
                              padding: '8px',
                              fontSize: '20px',
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              borderRadius: '8px',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = isDaytime ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)'
                              e.target.style.transform = 'scale(1.2)'
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = 'transparent'
                              e.target.style.transform = 'scale(1)'
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Input */}
              <div style={{
                padding: '12px 16px',
                borderTop: isDaytime ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.1)',
                background: isDaytime ? '#F5EFE0' : 'rgba(255,255,255,0.05)',
                backdropFilter: isDaytime ? 'none' : 'blur(20px)',
                display: 'flex',
                alignItems: 'flex-end',
                gap: '8px',
                flexShrink: 0,
              }}>
                <textarea
                  ref={messageInputRef}
                  placeholder="Message the fellowship..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  rows={1}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '16px',
                    border: isDaytime ? '1px solid rgba(0,0,0,0.15)' : '1px solid rgba(255,255,255,0.15)',
                    background: isDaytime ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.1)',
                    color: isDaytime ? '#1A1A1A' : '#FFFFFF',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'none',
                    maxHeight: '100px',
                    overflowY: 'auto',
                    lineHeight: '1.4',
                    transition: 'all 0.2s ease',
                  }}
                  onFocus={(e) => {
                    if (!isDaytime) {
                      e.target.style.borderColor = 'rgba(245,158,11,0.5)'
                      e.target.style.boxShadow = '0 0 0 1px rgba(245,158,11,0.3)'
                    }
                  }}
                  onBlur={(e) => {
                    if (!isDaytime) {
                      e.target.style.borderColor = 'rgba(255,255,255,0.15)'
                      e.target.style.boxShadow = 'none'
                    }
                  }}
                />
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  style={{
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    flexShrink: 0,
                    background: 'transparent',
                    color: isDaytime ? '#6B7280' : 'rgba(255,255,255,0.6)',
                    border: 'none', 
                    cursor: 'pointer',
                    fontSize: '20px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                  }}
                >
                  😊
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !messageInput.trim()}
                  style={{
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    flexShrink: 0,
                    background: messageInput.trim() ? 'linear-gradient(135deg, #CA8A04, #F59E0B)' : 'rgba(212,168,67,0.2)',
                    color: messageInput.trim() ? '#111827' : 'rgba(212,168,67,0.5)',
                    border: 'none', 
                    cursor: messageInput.trim() ? 'pointer' : 'default',
                    fontSize: '18px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    opacity: messageInput.trim() ? 1 : 0.4,
                    boxShadow: messageInput.trim() ? '0 0 12px rgba(202,138,4,0.4)' : 'none',
                  }}
                >
                  ➤
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
