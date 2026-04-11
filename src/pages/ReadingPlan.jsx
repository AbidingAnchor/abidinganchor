import { useState } from 'react'
import BibleReader from '../components/BibleReader'
import AudioBible from './AudioBible'

function ReadingPlan({ onOpenWorship }) {
  const [mode, setMode] = useState('read') // 'read' or 'listen'

  return (
    <div className="content-scroll min-h-screen px-4 pt-6 pb-32">
      {/* Content based on mode */}
      {mode === 'read' ? (
        <BibleReader open={true} onClose={() => {}} mode={mode} onModeChange={setMode} />
      ) : (
        <AudioBible />
      )}
    </div>
  )
}

export default ReadingPlan
