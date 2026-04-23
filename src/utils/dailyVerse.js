const baseVerses = [
  { reference: 'John 3:16', topic: 'love' },
  { reference: '1 Corinthians 13:4', topic: 'love' },
  { reference: 'Romans 5:8', topic: 'love' },
  { reference: 'Hebrews 11:1', topic: 'faith' },
  { reference: '2 Corinthians 5:7', topic: 'faith' },
  { reference: 'Mark 11:24', topic: 'faith' },
  { reference: 'Romans 15:13', topic: 'hope' },
  { reference: 'Jeremiah 29:11', topic: 'hope' },
  { reference: 'Psalm 39:7', topic: 'hope' },
  { reference: 'Philippians 4:13', topic: 'strength' },
  { reference: 'Isaiah 41:10', topic: 'strength' },
  { reference: 'Psalm 46:1', topic: 'strength' },
  { reference: 'John 14:27', topic: 'peace' },
  { reference: 'Philippians 4:7', topic: 'peace' },
  { reference: 'Romans 12:18', topic: 'peace' },
  { reference: 'Ephesians 2:8', topic: 'grace' },
  { reference: '2 Corinthians 12:9', topic: 'grace' },
  { reference: 'Hebrews 4:16', topic: 'grace' },
  { reference: 'Philippians 4:6', topic: 'prayer' },
  { reference: '1 Thessalonians 5:17', topic: 'prayer' },
  { reference: 'Jeremiah 33:3', topic: 'prayer' },
  { reference: '1 John 1:9', topic: 'forgiveness' },
  { reference: 'Ephesians 4:32', topic: 'forgiveness' },
  { reference: 'Colossians 3:13', topic: 'forgiveness' },
  { reference: 'Proverbs 3:5', topic: 'trust' },
  { reference: 'Psalm 56:3', topic: 'trust' },
  { reference: 'Isaiah 26:4', topic: 'trust' },
  { reference: 'Joshua 1:9', topic: 'courage' },
  { reference: '2 Timothy 1:7', topic: 'courage' },
  { reference: 'Psalm 27:1', topic: 'courage' },
]

export const dailyVerses = Array.from({ length: 365 }, (_, index) => {
  const verse = baseVerses[index % baseVerses.length]
  return { ...verse }
})

export function getDailyVerse() {
  const dayIndex = Math.floor(Date.now() / 86400000) % dailyVerses.length
  return dailyVerses[dayIndex]
}
