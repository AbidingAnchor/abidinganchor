import { useState } from 'react'
import BibleReader from '../components/BibleReader'
import AudioBible from './AudioBible'

function ReadingPlan({ onOpenWorship }) {
  const [mode, setMode] = useState('read') // 'read' or 'listen'

  return (
    <div className="content-scroll min-h-screen px-4 pt-6 pb-32">
      {/* Read/Listen Toggle */}
      <div className="flex justify-center mb-6">
        <div className="glass rounded-full p-1.5 flex gap-1">
          <button
            onClick={() => setMode('read')}
            className={`px-8 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
              mode === 'read'
                ? 'bg-[#D4A843] text-[#0a1a3e] shadow-lg shadow-[#D4A843]/30'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            📖 Read
          </button>
          <button
            onClick={() => setMode('listen')}
            className={`px-8 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
              mode === 'listen'
                ? 'bg-[#D4A843] text-[#0a1a3e] shadow-lg shadow-[#D4A843]/30'
                : 'text-white/70 hover:text-white hover:bg-white/5'
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
