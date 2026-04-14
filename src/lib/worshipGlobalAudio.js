/**
 * Worship playback API — implementation and the shared `Audio` element live in WorshipMode.jsx (module scope).
 */
export {
  INITIAL_AUDIO_URL,
  globalAudio,
  globalWorshipAudio,
  readStoredVolume,
  getWorshipState,
  subscribeWorshipPlayback,
  useWorshipPlaybackState,
  resyncWorshipStateFromAudio,
  worshipLoadAndPlay,
  worshipTransportToggle,
  worshipPause,
  worshipSetVolume,
  worshipPrev,
  worshipNext,
  worshipStartPlaybackFromOverlay,
} from '../pages/WorshipMode.jsx'
