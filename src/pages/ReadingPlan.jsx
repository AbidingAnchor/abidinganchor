import { useState } from 'react'
import BibleReader from '../components/BibleReader'
import AudioBible from './AudioBible'

function ReadingPlan({ onOpenWorship }) {
  const [mode, setMode] = useState('read') // 'read' or 'listen'

  return (
    <div className="content-scroll min-h-screen px-4 pt-6 pb-32">
      {/* Read/Listen Toggle */}
      <div className="flex justify-center mb-6">
        <div className="glass rounded-full p-1 flex gap-1">
          <button
            onClick={() => setMode('read')}
            className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
              mode === 'read'
                ? 'bg-[#D4A843] text-[#0a1a3e]'
                : 'text-white/70 hover:text-white'
            }`}
          >
            📖 Read
          </button>
          <button
            onClick={() => setMode('listen')}
            className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
              mode === 'listen'
                ? 'bg-[#D4A843] text-[#0a1a3e]'
                : 'text-white/70 hover:text-white'
            }`}
          >
            🎧 Listen
          </button>
        </div>
      </div>

      {/* Content based on mode */}
      {mode === 'read' ? (
        <BibleReader open={true} onClose={() => {}} />
      ) : (
        <AudioBible />
      )}
    </div>
  )
}

export default ReadingPlan
