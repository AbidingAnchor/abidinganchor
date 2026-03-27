export default function BookOverviewCard({ book, onClose, onStart }) {
  if (!book) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9200,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '12px',
      }}
    >
      <article
        style={{
          width: '100%',
          maxWidth: '680px',
          background: 'rgba(13,31,78,0.92)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.28)',
          borderRadius: '18px 18px 8px 8px',
          padding: '16px',
          color: '#fff',
          animation: 'page-fade-in 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, color: '#D4A843', fontSize: '24px', fontWeight: 700 }}>{book.name}</h2>
          <button type="button" onClick={onClose} style={{ color: 'rgba(255,255,255,0.75)', background: 'none', border: 'none', fontSize: '13px' }}>
            Skip
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
          <span className="app-card" style={{ padding: '6px 10px' }}>Author: {book.author}</span>
          <span className="app-card" style={{ padding: '6px 10px' }}>Date: {book.dateWritten}</span>
          <span className="app-card" style={{ padding: '6px 10px' }}>Chapters: {book.chapters}</span>
          <span className="app-card" style={{ padding: '6px 10px', color: '#D4A843' }}>{book.testament} Testament</span>
        </div>

        <p style={{ marginTop: '12px', fontStyle: 'italic', color: 'rgba(255,255,255,0.92)' }}>{book.theme}</p>
        <p style={{ marginTop: '10px', color: '#F1D07A', fontStyle: 'italic' }}>"{book.famousVerse}"</p>
        <p style={{ marginTop: '10px', color: 'rgba(255,255,255,0.84)' }}>💡 {book.funFact}</p>
        <p style={{ marginTop: '8px', color: 'rgba(255,255,255,0.84)', lineHeight: 1.55 }}>{book.context}</p>

        <button type="button" className="gold-btn" onClick={onStart} style={{ width: '100%', marginTop: '12px' }}>
          Start Reading →
        </button>
      </article>
    </div>
  )
}
