import { getDailyVerse } from './dailyVerse'

/** Verse-specific copy (overrides topic defaults when present). */
const REFERENCE_OVERRIDES = {
  'Psalm 56:3': {
    reflectionKey: 'encounter.psalm56_3.reflection',
    promptKey: 'encounter.psalm56_3.prompt',
  },
}

const TOPIC_ENCOUNTER_KEYS = {
  love: {
    reflectionKey: 'encounter.love.reflection',
    promptKey: 'encounter.love.prompt',
  },
  faith: {
    reflectionKey: 'encounter.faith.reflection',
    promptKey: 'encounter.faith.prompt',
  },
  hope: {
    reflectionKey: 'encounter.hope.reflection',
    promptKey: 'encounter.hope.prompt',
  },
  strength: {
    reflectionKey: 'encounter.strength.reflection',
    promptKey: 'encounter.strength.prompt',
  },
  peace: {
    reflectionKey: 'encounter.peace.reflection',
    promptKey: 'encounter.peace.prompt',
  },
  grace: {
    reflectionKey: 'encounter.grace.reflection',
    promptKey: 'encounter.grace.prompt',
  },
  prayer: {
    reflectionKey: 'encounter.prayer.reflection',
    promptKey: 'encounter.prayer.prompt',
  },
  forgiveness: {
    reflectionKey: 'encounter.forgiveness.reflection',
    promptKey: 'encounter.forgiveness.prompt',
  },
  trust: {
    reflectionKey: 'encounter.trust.reflection',
    promptKey: 'encounter.trust.prompt',
  },
  courage: {
    reflectionKey: 'encounter.courage.reflection',
    promptKey: 'encounter.courage.prompt',
  },
}

const FALLBACK_KEYS = {
  reflectionKey: 'encounter.fallback.reflection',
  promptKey: 'encounter.fallback.prompt',
}

/**
 * Full "Daily Encounter" payload: verse + warm reflection + guided prompt.
 */
export function getDailyEncounter() {
  const verse = getDailyVerse()
  const topic = verse.topic || 'faith'
  const base = TOPIC_ENCOUNTER_KEYS[topic] || FALLBACK_KEYS
  const override = REFERENCE_OVERRIDES[verse.reference]
  return {
    text: verse.text,
    reference: verse.reference,
    topic,
    reflectionKey: override?.reflectionKey ?? base.reflectionKey,
    promptKey: override?.promptKey ?? base.promptKey,
  }
}
