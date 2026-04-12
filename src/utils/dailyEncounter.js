import { getDailyVerse } from './dailyVerse'

/** Verse-specific copy (overrides topic defaults when present). */
const REFERENCE_OVERRIDES = {
  'Psalm 56:3': {
    reflection:
      'God is inviting you to bring your fears to Him instead of carrying them alone.',
    prompt: 'What fear do you need to surrender to God today?',
  },
}

const TOPIC_ENCOUNTER = {
  love: {
    reflection: "Love that starts with God reaches you before you've proved a thing.",
    prompt: 'Where do you need to receive His love afresh today?',
  },
  faith: {
    reflection: 'Faith is a gift to steady you—not a test you have to pass perfectly.',
    prompt: 'What step of trust is Jesus asking you to take today?',
  },
  hope: {
    reflection: 'Hope anchors you in what is true when circumstances still shift.',
    prompt: 'What situation do you want to place in His hands right now?',
  },
  strength: {
    reflection: "You weren't meant to carry everything in your own strength.",
    prompt: 'Where do you need His strength more than your striving?',
  },
  peace: {
    reflection: "Peace isn't the absence of noise—it's His presence in the middle of it.",
    prompt: 'What would it look like to receive His peace in one anxious moment today?',
  },
  grace: {
    reflection: 'Grace meets you where you are and gently calls you forward.',
    prompt: 'Where do you need to extend—or receive—grace today?',
  },
  prayer: {
    reflection: 'God bends near when you speak honestly—not when you polish every word.',
    prompt: 'What do you want to talk with God about in this moment?',
  },
  forgiveness: {
    reflection: 'Forgiveness flows from a heart that has first been forgiven much.',
    prompt: 'Is there a relationship where you need His help to forgive or seek peace?',
  },
  trust: {
    reflection: 'Trust is choosing to lean on Him when you cannot see the full path.',
    prompt: 'What uncertainty do you want to bring before Him today?',
  },
  courage: {
    reflection: 'Courage is not the absence of fear—it is walking with Him through it.',
    prompt: 'Where do you need courage to obey or speak truth in love?',
  },
}

const FALLBACK = {
  reflection: 'God is near. Pause and let His Word speak to your heart today.',
  prompt: 'What is one thing you sense God placing on your heart right now?',
}

/**
 * Full “Daily Encounter” payload: verse + warm reflection + guided prompt.
 */
export function getDailyEncounter() {
  const verse = getDailyVerse()
  const topic = verse.topic || 'faith'
  const base = TOPIC_ENCOUNTER[topic] || FALLBACK
  const override = REFERENCE_OVERRIDES[verse.reference]
  return {
    text: verse.text,
    reference: verse.reference,
    topic,
    reflection: override?.reflection ?? base.reflection,
    prompt: override?.prompt ?? base.prompt,
  }
}
