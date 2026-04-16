import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'

const sourcePath = path.resolve('scripts/crossrefs/cross_references.txt')
const outputPath = path.resolve('src/data/crossReferences.json')

const BOOK_ABBR_TO_CDN = {
  Gen: 'genesis',
  Exod: 'exodus',
  Lev: 'leviticus',
  Num: 'numbers',
  Deut: 'deuteronomy',
  Josh: 'joshua',
  Judg: 'judges',
  Ruth: 'ruth',
  '1Sam': '1samuel',
  '2Sam': '2samuel',
  '1Kgs': '1kings',
  '2Kgs': '2kings',
  '1Chr': '1chronicles',
  '2Chr': '2chronicles',
  Ezra: 'ezra',
  Neh: 'nehemiah',
  Esth: 'esther',
  Job: 'job',
  Ps: 'psalms',
  Prov: 'proverbs',
  Eccl: 'ecclesiastes',
  Song: 'songofsolomon',
  Isa: 'isaiah',
  Jer: 'jeremiah',
  Lam: 'lamentations',
  Ezek: 'ezekiel',
  Dan: 'daniel',
  Hos: 'hosea',
  Joel: 'joel',
  Amos: 'amos',
  Obad: 'obadiah',
  Jonah: 'jonah',
  Mic: 'micah',
  Nah: 'nahum',
  Hab: 'habakkuk',
  Zeph: 'zephaniah',
  Hag: 'haggai',
  Zech: 'zechariah',
  Mal: 'malachi',
  Matt: 'matthew',
  Mark: 'mark',
  Luke: 'luke',
  John: 'john',
  Acts: 'acts',
  Rom: 'romans',
  '1Cor': '1corinthians',
  '2Cor': '2corinthians',
  Gal: 'galatians',
  Eph: 'ephesians',
  Phil: 'philippians',
  Col: 'colossians',
  '1Thess': '1thessalonians',
  '2Thess': '2thessalonians',
  '1Tim': '1timothy',
  '2Tim': '2timothy',
  Titus: 'titus',
  Phlm: 'philemon',
  Heb: 'hebrews',
  Jas: 'james',
  '1Pet': '1peter',
  '2Pet': '2peter',
  '1John': '1john',
  '2John': '2john',
  '3John': '3john',
  Jude: 'jude',
  Rev: 'revelation',
}

function parseVerseToken(token) {
  // e.g. John.3.16 or 1Cor.13.4
  const m = /^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)$/.exec(String(token || '').trim())
  if (!m) return null
  const abbr = m[1]
  const cdnName = BOOK_ABBR_TO_CDN[abbr]
  if (!cdnName) return null
  return {
    abbr,
    cdnName,
    chapter: Number(m[2]),
    verse: Number(m[3]),
    key: `${cdnName}.${Number(m[2])}.${Number(m[3])}`,
  }
}

function parseToRange(value) {
  const raw = String(value || '').trim()
  const [startRaw, endRaw] = raw.split('-')
  const start = parseVerseToken(startRaw)
  if (!start) return null
  const end = endRaw ? parseVerseToken(endRaw) : start
  if (!end) return null
  return {
    reference: raw,
    book: start.cdnName,
    chapter: start.chapter,
    verseStart: start.verse,
    bookEnd: end.cdnName,
    chapterEnd: end.chapter,
    verseEnd: end.verse,
  }
}

async function build() {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source file not found: ${sourcePath}`)
  }

  const map = Object.create(null)
  let lineNo = 0
  let skipped = 0

  const rl = readline.createInterface({
    input: fs.createReadStream(sourcePath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  })

  for await (const line of rl) {
    lineNo += 1
    if (!line || lineNo === 1) continue
    const parts = line.split('\t')
    if (parts.length < 3) continue
    const from = parseVerseToken(parts[0])
    const to = parseToRange(parts[1])
    const votes = Number(parts[2]) || 0
    if (!from || !to) {
      skipped += 1
      continue
    }

    const bucket = map[from.key] || (map[from.key] = [])
    bucket.push({
      reference: to.reference,
      book: to.book,
      chapter: to.chapter,
      verseStart: to.verseStart,
      bookEnd: to.bookEnd,
      chapterEnd: to.chapterEnd,
      verseEnd: to.verseEnd,
      votes,
    })
  }

  for (const key of Object.keys(map)) {
    map[key].sort((a, b) => b.votes - a.votes)
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, JSON.stringify(map))

  console.log(`Built cross references JSON.`)
  console.log(`Source lines processed: ${lineNo}`)
  console.log(`Verse keys: ${Object.keys(map).length}`)
  console.log(`Skipped lines: ${skipped}`)
  console.log(`Output: ${outputPath}`)
}

build().catch((err) => {
  console.error(err)
  process.exit(1)
})

