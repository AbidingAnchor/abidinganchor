import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ScriptureGallery() {
  const navigate = useNavigate()
  const [gallery, setGallery] = useState(() => {
    try {
      const stored = localStorage.getItem('scripture-gallery')
      return stored ? JSON.parse(stored) : []
    } catch { return [] }
  })
  const [selectedImage, setSelectedImage] = useState(null)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())

  const handleDelete = (idsToDelete) => {
    const idsArray = Array.isArray(idsToDelete) ? idsToDelete : [idsToDelete]
    const updated = gallery.filter((item) => !idsArray.includes(item.id))
    setGallery(updated)
    localStorage.setItem('scripture-gallery', JSON.stringify(updated))
    if (selectedImage && idsArray.includes(selectedImage.id)) setSelectedImage(null)
    setSelectedIds(new Set())
    setSelectionMode(false)
  }

  const handleCardClick = (item) => {
    if (selectionMode) {
      const newSelected = new Set(selectedIds)
      newSelected.has(item.id) ? newSelected.delete(item.id) : newSelected.add(item.id)
      setSelectedIds(newSelected)
    } else {
      setSelectedImage(item)
    }
  }

  return (
    <div style={{ padding: '16px', paddingBottom: '100px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px', position: 'relative' }}>
        <h1 style={{ color: '#D4A843', fontWeight: 700, fontSize: '22px', marginBottom: '4px' }}>Scripture Gallery</h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontStyle: 'italic' }}>Your saved scripture artwork</p>
        {!selectionMode ? (
          <button type="button" onClick={() => { setSelectionMode(true); setSelectedIds(new Set()) }}
            style={{ position: 'absolute', top: 0, right: 0, padding: '6px 14px', borderRadius: '8px', background: 'rgba(212,168,67,0.2)', border: '1px solid rgba(212,168,67,0.5)', color: '#D4A843', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>
            Select
          </button>
        ) : (
          <div style={{ position: 'absolute', top: 0, right: 0, display: 'flex', gap: '6px' }}>
            <button type="button"
              onClick={() => setSelectedIds(selectedIds.size === gallery.length ? new Set() : new Set(gallery.map(i => i.id)))}
              style={{ padding: '6px 10px', borderRadius: '8px', background: 'rgba(212,168,67,0.2)', border: '1px solid rgba(212,168,67,0.5)', color: '#D4A843', fontWeight: 600, cursor: 'pointer', fontSize: '12px' }}>
              {selectedIds.size === gallery.length ? 'Deselect All' : 'Select All'}
            </button>
            <button type="button" onClick={() => handleDelete(Array.from(selectedIds))} disabled={selectedIds.size === 0}
              style={{ padding: '6px 10px', borderRadius: '8px', background: selectedIds.size > 0 ? '#ef4444' : 'rgba(239,68,68,0.3)', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '12px' }}>
              Delete ({selectedIds.size})
            </button>
            <button type="button" onClick={() => { setSelectionMode(false); setSelectedIds(new Set()) }}
              style={{ padding: '6px 10px', borderRadius: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '12px' }}>
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Empty State */}
      {gallery.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 24px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px' }}>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '16px', marginBottom: '8px' }}>No saved artwork yet</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '16px' }}>Create and save scripture art to see it here</p>
          <button type="button" onClick={() => navigate('/share')}
            style={{ padding: '10px 24px', borderRadius: '10px', background: 'linear-gradient(135deg,#D4A843,#f0c060)', color: '#0a1a3e', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
            Create Scripture Art
          </button>
        </div>
      )}

      {/* Grid */}
      {gallery.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {gallery.map((item) => (
            <div key={item.id} style={{ position: 'relative', cursor: 'pointer' }} onClick={() => handleCardClick(item)}>
              <img src={item.dataUrl} alt={item.verseReference}
                style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '8px' }} />
              {selectionMode && (
                <div style={{ position: 'absolute', top: '8px', right: '8px', width: '26px', height: '26px', borderRadius: '50%',
                  background: selectedIds.has(item.id) ? '#D4A843' : 'rgba(255,255,255,0.3)',
                  border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {selectedIds.has(item.id) && <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>✓</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {selectedImage && (
        <div onClick={() => setSelectedImage(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '360px', borderRadius: '16px', overflow: 'hidden', background: 'rgba(8,20,50,0.98)' }}>
            <div style={{ position: 'relative' }}>
              <img src={selectedImage.dataUrl} alt={selectedImage.verseReference}
                style={{ width: '100%', height: 'auto', display: 'block' }} />
              <button type="button" onClick={() => setSelectedImage(null)}
                style={{ position: 'absolute', top: '8px', right: '8px', width: '28px', height: '28px', borderRadius: '50%',
                  background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', fontSize: '14px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ padding: '16px' }}>
              <p style={{ color: '#D4A843', fontWeight: 700, fontSize: '16px', marginBottom: '6px' }}>{selectedImage.verseReference}</p>
              <p style={{ color: '#ffffff', fontSize: '14px', marginBottom: '8px' }}>{selectedImage.verseText}</p>
              {selectedImage.userReflection && (
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13px', fontStyle: 'italic', marginBottom: '12px' }}>"{selectedImage.userReflection}"</p>
              )}
              <button type="button" onClick={() => { handleDelete(selectedImage.id) }}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#ef4444', border: 'none', color: 'white', fontWeight: 600, fontSize: '15px', cursor: 'pointer' }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
