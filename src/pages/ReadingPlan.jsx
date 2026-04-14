import { useState } from 'react'
import BibleReader from '../components/BibleReader'
import AudioBible from './AudioBible'

function ReadingPlan({ onOpenWorship: _onOpenWorship }) {
  const [mode, setMode] = useState('read') // 'read' or 'listen'

  return (
    <div
      className="w-full max-w-[680px] mx-auto px-4"
      style={{
        position: 'relative',
        minHeight: 'calc(100dvh - 56px - 80px)',
        boxSizing: 'border-box',
      }}
    >
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
