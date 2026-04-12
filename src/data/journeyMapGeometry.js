/**
 * Map layout + scripture refs (refs kept universal). Labels / copy come from i18n `journeyMap.stops.<id>.*`.
 * Used by Achievements for “Lamp Lighter” (visit every stop id).
 */
export const JOURNEY_MAP_GEOMETRY = [
  { id: 'bethlehem', x: 150, y: 382, scripture: 'Micah 5:2; Luke 2:7' },
  { id: 'nazareth', x: 182, y: 364, scripture: 'Luke 2:51-52' },
  { id: 'jordan', x: 210, y: 346, scripture: 'Matthew 3:16-17' },
  { id: 'wilderness', x: 231, y: 328, scripture: 'Matthew 4:1-11' },
  { id: 'capernaum', x: 241, y: 309, scripture: 'Matthew 4:13' },
  { id: 'galilee', x: 240, y: 291, scripture: 'Matthew 4:23' },
  { id: 'beatitudes', x: 228, y: 273, scripture: 'Matthew 5:1-12' },
  { id: 'caesarea-philippi', x: 206, y: 255, scripture: 'Matthew 16:13-16' },
  { id: 'jerusalem', x: 177, y: 237, scripture: 'Luke 19:41-44' },
  { id: 'gethsemane', x: 145, y: 219, scripture: 'Matthew 26:36-39' },
  { id: 'golgotha', x: 113, y: 200, scripture: 'John 19:17-18' },
  { id: 'empty-tomb', x: 86, y: 182, scripture: 'Luke 24:2-6' },
  { id: 'damascus', x: 67, y: 164, scripture: 'Acts 9:3-6' },
  { id: 'antioch', x: 58, y: 146, scripture: 'Acts 13:2-3' },
  { id: 'philippi', x: 61, y: 128, scripture: 'Acts 16:30-34' },
  { id: 'thessalonica', x: 75, y: 110, scripture: '1 Thessalonians 1:8' },
  { id: 'athens', x: 128, y: 73, scripture: 'Acts 17:22-31' },
  { id: 'corinth', x: 98, y: 91, scripture: 'Acts 18:1-8' },
  { id: 'ephesus', x: 161, y: 55, scripture: 'Acts 19:20' },
  { id: 'rome', x: 192, y: 37, scripture: 'Acts 28:30-31' },
]

/** @deprecated Use JOURNEY_MAP_GEOMETRY — kept for imports expecting this name */
export const JOURNEY_MAP_STOPS = JOURNEY_MAP_GEOMETRY
