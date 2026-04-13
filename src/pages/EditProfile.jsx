import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { getAvatarUploadExtension } from '../utils/avatarUrl'

const BIO_MAX = 150

export default function EditProfile() {
  const { t } = useTranslation()
  const { user, profile, refreshProfile } = useAuth()
  const fileInputRef = useRef(null)

  const [uploadStatus, setUploadStatus] = useState('idle')
  const [uploadError, setUploadError] = useState('')
  const [pendingAvatarFile, setPendingAvatarFile] = useState(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(null)
  const [localAvatarUrl, setLocalAvatarUrl] = useState(null)

  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [favoriteVerse, setFavoriteVerse] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveNoticeVisible, setSaveNoticeVisible] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    const loadProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, username, bio, favorite_verse')
        .eq('id', user.id)
        .maybeSingle()
      if (!data) return
      setLocalAvatarUrl(data.avatar_url || null)
      setUsername(data.username || '')
      setBio(data.bio || '')
      setFavoriteVerse(data.favorite_verse || '')
    }
    loadProfile()
  }, [user?.id])

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl)
    }
  }, [avatarPreviewUrl])

  useEffect(() => {
    if (!saveNoticeVisible) return undefined
    const timer = setTimeout(() => setSaveNoticeVisible(false), 2200)
    return () => clearTimeout(timer)
  }, [saveNoticeVisible])

  const validateAvatarFile = (file) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    const ext = getAvatarUploadExtension(file)
    const extAllowed = ['jpg', 'png', 'webp', 'gif'].includes(ext)
    const mimeOk = file.type ? allowedTypes.includes(file.type) : false
    if (!mimeOk && !extAllowed) return t('settings.imageTypeError')
    if (file.size > 5 * 1024 * 1024) return t('settings.imageSizeError')
    return null
  }

  const clearAvatarPreview = () => {
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl)
    setAvatarPreviewUrl(null)
    setPendingAvatarFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const err = validateAvatarFile(file)
    if (err) {
      setUploadError(err)
      setUploadStatus('idle')
      e.target.value = ''
      return
    }
    setUploadError('')
    setUploadStatus('idle')
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl)
    setPendingAvatarFile(file)
    setAvatarPreviewUrl(URL.createObjectURL(file))
  }

  const handleSaveAvatarPhoto = async () => {
    const file = pendingAvatarFile
    const blobUrlToRevoke = avatarPreviewUrl
    if (!file || !user?.id) return
    try {
      setUploadStatus('uploading')
      setUploadError('')
      const ext = getAvatarUploadExtension(file)
      const filePath = `${user.id}/avatar-${Date.now()}.${ext}`
      const contentTypeByExt = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' }
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true, contentType: file.type || contentTypeByExt[ext] || 'image/jpeg' })
      if (uploadErr) throw uploadErr

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      const avatarUrl = data.publicUrl
      const { data: updatedRow, error: updateErr } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id)
        .select()
        .single()
      if (updateErr) throw updateErr

      await refreshProfile(updatedRow)
      setLocalAvatarUrl(avatarUrl)
      if (blobUrlToRevoke) URL.revokeObjectURL(blobUrlToRevoke)
      setAvatarPreviewUrl(null)
      setPendingAvatarFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setUploadStatus('success')
      setTimeout(() => setUploadStatus('idle'), 2500)
    } catch (error) {
      console.error('Upload error:', error)
      setUploadError(t('settings.uploadErrorGeneric'))
      setUploadStatus('idle')
    }
  }

  const handleSaveProfile = async () => {
    if (!user?.id || saving) return
    try {
      setSaving(true)
      const payload = {
        username: username.trim() || null,
        bio: bio.trim() || null,
        favorite_verse: favoriteVerse.trim() || null,
      }
      const { data, error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', user.id)
        .select()
        .single()
      if (error) throw error
      await refreshProfile(data)
      setSaveNoticeVisible(true)
    } catch (error) {
      console.error('Profile save error:', error)
    } finally {
      setSaving(false)
    }
  }

  const displayName = profile?.full_name || user?.user_metadata?.full_name || t('common.user')
  const userEmail = user?.email || ''
  const avatarUrl = avatarPreviewUrl || localAvatarUrl || profile?.avatar_url
  const hasAvatarImage = Boolean(avatarUrl)

  return (
    <div className="content-scroll" style={{ padding: '0 16px', paddingTop: '110px', paddingBottom: '120px', maxWidth: '680px', margin: '0 auto', width: '100%' }}>
      <section className="space-y-4">
        <div className="glass-panel" style={{ borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ position: 'relative' }}>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: '#D4A843',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(212,168,67,0.3)',
                  cursor: 'pointer',
                  border: hasAvatarImage ? '2px solid rgba(212,168,67,0.4)' : 'none',
                }}
              >
                <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '32px', fontWeight: 600, zIndex: 0 }}>
                  {displayName.charAt(0).toUpperCase()}
                </span>
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={t('common.profile')}
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', zIndex: 1 }}
                  />
                ) : null}
              </div>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  position: 'absolute',
                  bottom: '-4px',
                  right: '-4px',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#D4A843',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  border: '2px solid var(--glass-border-hover)',
                  fontSize: '14px',
                }}
              >
                📷
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
            </div>
            <div>
              <p style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>{displayName}</p>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>{userEmail}</p>
              {uploadStatus === 'success' ? (
                <p style={{ color: '#4ade80', fontSize: '12px', marginTop: '4px' }}>{t('settings.profilePhotoSaved')}</p>
              ) : null}
            </div>
          </div>

          {pendingAvatarFile ? (
            <div className="glass-panel" style={{ marginTop: '16px', padding: '14px 16px', borderRadius: '12px', display: 'flex', gap: '12px' }}>
              <button
                type="button"
                disabled={uploadStatus === 'uploading'}
                onClick={() => {
                  clearAvatarPreview()
                  setUploadError('')
                }}
                style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', border: '1px solid #D4A843', background: 'transparent', color: '#D4A843', fontSize: '15px', fontWeight: 600, cursor: uploadStatus === 'uploading' ? 'not-allowed' : 'pointer', opacity: uploadStatus === 'uploading' ? 0.5 : 1 }}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={uploadStatus === 'uploading'}
                onClick={handleSaveAvatarPhoto}
                style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', border: 'none', background: '#D4A843', color: '#0a1432', fontSize: '15px', fontWeight: 600, cursor: uploadStatus === 'uploading' ? 'not-allowed' : 'pointer', opacity: uploadStatus === 'uploading' ? 0.85 : 1 }}
              >
                {t('settings.savePhoto')}
              </button>
            </div>
          ) : null}
          {uploadError ? (
            <div style={{ marginTop: '16px', background: 'rgba(255,80,80,0.15)', border: '1px solid rgba(255,80,80,0.4)', borderRadius: '12px', padding: '12px 16px', color: 'var(--text-primary)', fontSize: '14px' }}>
              {uploadError}
            </div>
          ) : null}
        </div>

        <div className="glass-panel" style={{ borderRadius: '16px', padding: '20px' }}>
          <label style={{ color: 'var(--text-primary)', display: 'block', fontSize: '14px', marginBottom: '8px' }}>Username / Display name</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Your display name"
            className="glass-input-field"
            style={{ width: '100%', borderRadius: '12px', padding: '12px', marginBottom: '16px' }}
          />

          <label style={{ color: 'var(--text-primary)', display: 'block', fontSize: '14px', marginBottom: '8px' }}>Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
            placeholder="Tell others a little about you"
            rows={3}
            className="glass-input-field"
            style={{ width: '100%', borderRadius: '12px', padding: '12px', resize: 'none' }}
          />
          <p style={{ textAlign: 'right', color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginTop: '6px' }}>
            {bio.length}/{BIO_MAX}
          </p>

          <label style={{ color: 'var(--text-primary)', display: 'block', fontSize: '14px', marginBottom: '8px', marginTop: '10px' }}>Favorite verse</label>
          <input
            type="text"
            value={favoriteVerse}
            onChange={(e) => setFavoriteVerse(e.target.value)}
            placeholder="John 3:16"
            className="glass-input-field"
            style={{ width: '100%', borderRadius: '12px', padding: '12px' }}
          />

          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={saving}
            style={{
              width: '100%',
              marginTop: '16px',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 14px',
              background: '#D4A843',
              color: '#0a1432',
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.75 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </section>

      <div
        style={{
          position: 'fixed',
          bottom: '84px',
          left: '50%',
          transform: `translateX(-50%) translateY(${saveNoticeVisible ? '0' : '12px'})`,
          opacity: saveNoticeVisible ? 1 : 0,
          transition: 'opacity 0.25s ease, transform 0.25s ease',
          pointerEvents: 'none',
          zIndex: 10000,
          background: 'linear-gradient(135deg, #D4A843, #B8860B)',
          color: '#fff',
          padding: '10px 18px',
          borderRadius: '999px',
          boxShadow: '0 4px 24px rgba(212,168,67,0.35)',
          border: '1px solid rgba(255,255,255,0.25)',
          fontSize: '13px',
          fontWeight: 700,
        }}
      >
        Profile updated
      </div>
    </div>
  )
}
