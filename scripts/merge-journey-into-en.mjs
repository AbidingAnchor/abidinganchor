import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const raw = JSON.parse(fs.readFileSync(path.join(root, 'src/locales/journeyStops.en.raw.json'), 'utf8'))
const ui = {
  mapTitle: '🗺️ Journey Map',
  back: '← Back',
  unlocksHelp:
    'Unlocks scale with trivia games and memorized verses (each activity moves you forward).',
  unlockedLabel: 'Unlocked: {{current}}/{{total}}',
  lockedPrefix: '🔒 ',
  ariaClose: 'Close',
  completionTitle: 'Well done, my good and faithful servant.',
  completionBody: 'You have walked the full journey. Your faith has carried you from Bethlehem to Rome.',
  completionVerse: 'Matthew 25:23',
  close: 'Close',
}
const journeyMap = {
  ui,
  stops: raw.journeyMap.stops,
}
const enPath = path.join(root, 'src/locales/en.json')
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'))
en.journeyMap = journeyMap
fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n')
console.log('Merged journeyMap into en.json')
