import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

function parseEnvFile(filePath) {
  const out = {}
  try {
    const text = fs.readFileSync(filePath, 'utf8')
    for (const line of text.split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq === -1) continue
      const k = t.slice(0, eq).trim()
      let v = t.slice(eq + 1).trim()
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1)
      }
      out[k] = v
    }
  } catch {
    /* missing */
  }
  return out
}

function abbrevOf(b) {
  const a = b.abbreviation || {}
  return [a.local, a.short, a.long].filter(Boolean).join(' / ') || '(none)'
}

function scoreRow(b) {
  const ab = abbrevOf(b).toUpperCase()
  const name = String(b.name || b.title || '').toUpperCase()
  const blob = `${ab} ${name}`
  if (/HINIRV|IRVHIN|IRV.*HINDI/.test(blob)) return 0
  if (/ERV-HI|ERV.*HI\b/.test(blob)) return 1
  if (/BSI|BIBLE SOCIETY OF INDIA/.test(blob)) return 2
  return 99
}

const fromEnv = parseEnvFile(path.join(root, '.env'))
const fromLocal = parseEnvFile(path.join(root, '.env.local'))
const apiKey =
  fromEnv.VITE_API_BIBLE_KEY ||
  fromLocal.VITE_API_BIBLE_KEY ||
  process.env.VITE_API_BIBLE_KEY ||
  ''

if (!apiKey) {
  console.error(
    'No VITE_API_BIBLE_KEY found in .env, .env.local, or process environment.',
  )
  console.error('Add it from https://scripture.api.bible then re-run:')
  console.error('  node scripts/fetch-hindi-bible-id.mjs')
  process.exit(1)
}

const res = await fetch(
  'https://rest.api.bible/v1/bibles?language=hin',
  { headers: { 'api-key': apiKey } },
)
const bodyText = await res.text()
if (!res.ok) {
  console.error('API error', res.status, bodyText.slice(0, 500))
  process.exit(1)
}
const json = JSON.parse(bodyText)
const rows = json.data || []

console.log(`Hindi Bibles (${rows.length}):\n`)
for (const b of rows) {
  console.log('id:           ', b.id)
  console.log('name:         ', b.name || b.title || '')
  console.log('abbreviation: ', abbrevOf(b))
  console.log('---')
}

let best = null
let bestScore = 999
for (const b of rows) {
  const s = scoreRow(b)
  if (s < bestScore) {
    bestScore = s
    best = b
  }
}
if (!best && rows[0]) best = rows[0]
if (!best) {
  console.error('No bibles in response')
  process.exit(1)
}

const hiId = best.id
console.log(`\nSelected (preference score ${bestScore}): ${hiId}`)
console.log('  name:', best.name || best.title)
console.log('  abbr:', abbrevOf(best))

const envPath = path.join(root, '.env')
let envContent = ''
try {
  envContent = fs.readFileSync(envPath, 'utf8')
} catch {
  envContent = ''
}

const line = `VITE_API_BIBLE_ID_HI=${hiId}`
if (envContent.includes('VITE_API_BIBLE_ID_HI=')) {
  envContent = envContent.replace(/^VITE_API_BIBLE_ID_HI=.*$/m, line)
} else {
  if (envContent && !envContent.endsWith('\n')) envContent += '\n'
  envContent += `${line}\n`
}
fs.writeFileSync(envPath, envContent, 'utf8')
console.log(`\nWrote ${envPath}`)
