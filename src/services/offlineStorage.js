import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'

const BASE_PATH = 'bibles'

function toSegment(value) {
  return String(value).replace(/[\\/]+/g, '_')
}

function chapterPath(translation, book, chapter) {
  return `${BASE_PATH}/${toSegment(translation)}/${toSegment(book)}/${toSegment(chapter)}.json`
}

function bookPath(translation, book) {
  return `${BASE_PATH}/${toSegment(translation)}/${toSegment(book)}`
}

function translationPath(translation) {
  return `${BASE_PATH}/${toSegment(translation)}`
}

async function ensureDir(path) {
  try {
    await Filesystem.mkdir({
      path,
      directory: Directory.Documents,
      recursive: true,
    })
  } catch (error) {
    const message = String(error?.message || error || '').toLowerCase()
    if (message.includes('already exist')) return
    throw error
  }
}

async function exists(path) {
  try {
    await Filesystem.stat({
      path,
      directory: Directory.Documents,
    })
    return true
  } catch {
    return false
  }
}

async function collectSizeBytes(path) {
  let stat
  try {
    stat = await Filesystem.stat({
      path,
      directory: Directory.Documents,
    })
  } catch {
    return 0
  }

  if (typeof stat.size === 'number' && stat.size > 0) {
    return stat.size
  }

  let listing
  try {
    listing = await Filesystem.readdir({
      path,
      directory: Directory.Documents,
    })
  } catch {
    return 0
  }

  const files = listing.files || []
  let total = 0

  for (const file of files) {
    const childPath = `${path}/${file.name}`
    total += await collectSizeBytes(childPath)
  }

  return total
}

/**
 * Save a single chapter as JSON at:
 * bibles/{translation}/{book}/{chapter}.json
 */
export async function saveChapter(translation, book, chapter, verses) {
  const dir = bookPath(translation, book)
  await ensureDir(dir)
  await Filesystem.writeFile({
    path: chapterPath(translation, book, chapter),
    data: JSON.stringify(verses ?? []),
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
    recursive: true,
  })
}

/**
 * Load a chapter JSON file. Returns null when missing or unreadable.
 */
export async function loadChapter(translation, book, chapter) {
  try {
    const result = await Filesystem.readFile({
      path: chapterPath(translation, book, chapter),
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    })
    if (!result?.data) return null
    return JSON.parse(result.data)
  } catch {
    return null
  }
}

/**
 * Check whether a chapter file exists.
 */
export async function isChapterDownloaded(translation, book, chapter) {
  return exists(chapterPath(translation, book, chapter))
}

/**
 * Save all chapters for a book.
 * Supports:
 * - object map: { "1": [...], "2": [...] }
 * - array of items: [{ chapter: 1, verses: [...] }, ...]
 * - array of verses by index: [ [...chapter1], [...chapter2] ]
 */
export async function saveBook(translation, book, chapters) {
  if (!chapters) return

  if (Array.isArray(chapters)) {
    for (let i = 0; i < chapters.length; i += 1) {
      const item = chapters[i]
      if (item && typeof item === 'object' && !Array.isArray(item) && 'chapter' in item) {
        await saveChapter(translation, book, item.chapter, item.verses ?? [])
      } else {
        await saveChapter(translation, book, i + 1, item ?? [])
      }
    }
    return
  }

  for (const [chapter, verses] of Object.entries(chapters)) {
    await saveChapter(translation, book, chapter, verses)
  }
}

/**
 * Return numeric book ids downloaded for a translation.
 */
export async function getDownloadedBooks(translation) {
  try {
    const result = await Filesystem.readdir({
      path: translationPath(translation),
      directory: Directory.Documents,
    })
    const files = result.files || []
    return files
      .map((entry) => Number.parseInt(entry.name, 10))
      .filter((num) => Number.isFinite(num))
      .sort((a, b) => a - b)
  } catch {
    return []
  }
}

/**
 * Delete all chapter files for a book.
 */
export async function deleteBook(translation, book) {
  const path = bookPath(translation, book)

  try {
    await Filesystem.rmdir({
      path,
      directory: Directory.Documents,
      recursive: true,
    })
    return
  } catch {
    // Fall through to manual cleanup for environments without recursive rmdir support.
  }

  try {
    const result = await Filesystem.readdir({
      path,
      directory: Directory.Documents,
    })
    const files = result.files || []
    for (const file of files) {
      if (!file.name.endsWith('.json')) continue
      await Filesystem.deleteFile({
        path: `${path}/${file.name}`,
        directory: Directory.Documents,
      })
    }
    await Filesystem.rmdir({
      path,
      directory: Directory.Documents,
    })
  } catch {
    // No-op if the folder is already absent.
  }
}

/**
 * Return total downloaded bible size in megabytes.
 */
export async function getStorageSize() {
  const bytes = await collectSizeBytes(BASE_PATH)
  return bytes / (1024 * 1024)
}
