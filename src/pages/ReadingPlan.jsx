import BibleReader from '../components/BibleReader'

function ReadingPlan({ onOpenWorship: _onOpenWorship }) {
  return (
    <div
      className="w-full max-w-[680px] mx-auto px-4"
      style={{
        position: 'relative',
        minHeight: 'calc(100dvh - 56px - 80px)',
        boxSizing: 'border-box',
      }}
    >
      <BibleReader open={true} onClose={() => {}} />
    </div>
  )
}

export default ReadingPlan
