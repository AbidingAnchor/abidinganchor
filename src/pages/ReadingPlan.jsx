import { useState } from 'react'
import BibleReader from '../components/BibleReader'
import AudioBible from './AudioBible'

function ReadingPlan({ onOpenWorship }) {
  const [mode, setMode] = useState('read') // 'read' or 'listen'

  return (
    <div
      className="content-scroll px-4 pt-6 pb-32"
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: '680px',
        margin: '0 auto',
        boxSizing: 'border-box',
        height: 'calc(100dvh - 56px - 80px)',
        minHeight: 'calc(100dvh - 56px - 80px)',
      }}
    >
      {/* Content based on mode */}
      {mode === 'read' ? (
        <BibleReader open={true} onClose={() => {}} mode={mode} onModeChange={setMode} />
      ) : (
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', width: '100%' }}>
          <AudioBible />
        </div>
      )}
    </div>
  )
}

export default ReadingPlan
