/**
 * One-time helper: pull JOURNEY_MAP_STOPS from legacy JourneyMap.jsx export into JSON.
 * Run: node scripts/extract-journey-stops.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const src = fs.readFileSync(path.join(root, 'src/components/JourneyMap.jsx'), 'utf8')
const m = src.match(/export const JOURNEY_MAP_STOPS = (\[[\s\S]*?\])\r?\n\r?\nfunction buildPathD/)
if (!m) {
  console.error('Could not find JOURNEY_MAP_STOPS array')
  process.exit(1)
}
const arr = new Function(`return ${m[1]}`)()
const stops = {}
for (const row of arr) {
  stops[row.id] = {
    label: row.label,
    description: row.description,
    jesusVoice: row.jesusVoice,
  }
}
const out = { journeyMap: { stops } }
fs.writeFileSync(path.join(root, 'src/locales/journeyStops.en.raw.json'), JSON.stringify(out, null, 2) + '\n')
console.log('Wrote journeyStops.en.raw.json with', Object.keys(stops).length, 'stops')
