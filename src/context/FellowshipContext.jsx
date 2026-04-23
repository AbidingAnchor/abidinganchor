import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'

const FellowshipContext = createContext(null)

export function FellowshipProvider({ children }) {
  console.log('FellowshipProvider rendering')
  
  const { user, loading: authLoading } = useAuth()
  const [fellowship, setFellowship] = useState(null)
  const [members, setMembers] = useState([])
  const [posts, setPosts] = useState([])
  const [postReactions, setPostReactions] = useState({})
  const [postComments, setPostComments] = useState({})
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState('none') // 'none', 'create', 'inside'
  const [shouldRefetch, setShouldRefetch] = useState(false)
  const deletedFellowshipIdsRef = useRef(new Set())

  const fetchUserFellowship = useCallback(async () => {
    console.log('fetchUserFellowship called from:', new Error().stack)
    
    if (!user?.id) {
      setLoading(false)
      setView('none')
      setFellowship(null)
      setMembers([])
      setPosts([])
      return
    }
    
    try {
      setLoading(true)

      // Resolve fellowship IDs explicitly
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
      
      // Filter out any fellowship IDs that were successfully deleted in this session
      deletedFellowshipIdsRef.current.forEach(id => fellowshipIdSet.delete(id))
      
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
            const reactionsForPost = reactionsByPost[postId]
            const counts = { praying: 0, fire: 0, love: 0, amen: 0, pray: 0 }
            let userReaction = null
            let hasPrayed = false
            
            reactionsForPost.forEach(r => {
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
  }, [user?.id])

  // Initial fetch on user load - only when auth is fully resolved
  useEffect(() => {
    if (!authLoading && user?.id) {
      fetchUserFellowship()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading])

  // Refetch when shouldRefetch is true (after create/join) - only when auth is fully resolved
  useEffect(() => {
    if (!authLoading && shouldRefetch && user?.id) {
      fetchUserFellowship()
      setShouldRefetch(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldRefetch, authLoading, user?.id])

  const triggerRefetch = useCallback(() => {
    setShouldRefetch(true)
  }, [])

  const addDeletedFellowshipId = useCallback((id) => {
    deletedFellowshipIdsRef.current.add(id)
  }, [])

  const value = {
    fellowship,
    setFellowship,
    members,
    setMembers,
    posts,
    setPosts,
    postReactions,
    setPostReactions,
    postComments,
    setPostComments,
    loading,
    view,
    setView,
    triggerRefetch,
    fetchUserFellowship,
    addDeletedFellowshipId,
  }

  return (
    <FellowshipContext.Provider value={value}>
      {children}
    </FellowshipContext.Provider>
  )
}

export function useFellowship() {
  const context = useContext(FellowshipContext)
  if (!context) {
    throw new Error('useFellowship must be used within a FellowshipProvider')
  }
  return context
}
