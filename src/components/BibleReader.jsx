import { useEffect, useLayoutEffect, useState, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { dedupeVersesByNumber, prepareBibleReaderVerseText } from '../utils/kjvVerseText'
import { BOOK_CDN_TO_OSIS } from '../utils/bookOsisMap'
import { fetchApiBibleChapterVerses, resolveBibleIdForLanguage } from '../services/apiBible'
import { fetchGetBibleChapter, resolveGetBibleTranslationId } from '../services/getBibleApi'
import { POPULAR_BIBLES, getSavedBibleId, saveBibleId } from '../services/bibleApi'
import {
  isChapterDownloaded,
  loadChapter as loadOfflineChapter,
  saveChapter as saveOfflineChapter,
  deleteBook,
} from '../services/offlineStorage'
import BibleTranslationSelector from './BibleTranslationSelector'
import { useAuth } from '../context/AuthContext'
import { useThemeBackgroundType } from '../hooks/useThemeBackgroundType'
import { userStorageKey } from '../utils/userStorage'
import { supabase } from '../lib/supabase'
import { BIBLE_LANG_MAP, fetchBollsGetTextForUiLang, fetchBollsGetTextForTranslationId } from '../utils/bibleTranslation'
import tobitData from '../data/deuterocanonical/tobit.json'
import judithData from '../data/deuterocanonical/judith.json'
import wisdomData from '../data/deuterocanonical/wisdom.json'
import sirachData from '../data/deuterocanonical/sirach.json'
import baruchData from '../data/deuterocanonical/baruch.json'
import maccabees1Data from '../data/deuterocanonical/1maccabees.json'
import maccabees2Data from '../data/deuterocanonical/2maccabees.json'

/** Free JSON API — see https://bible-api.com/ and GET /data for supported translations (public domain). */
const BIBLE_API_COM = 'https://bible-api.com'

const BIBLE_FONT_MIN = 14
const BIBLE_FONT_MAX = 24
const BIBLE_FONT_DEFAULT = 18
const BIBLE_FONT_STEP = 2

/** Layout zones (viewport-fixed). Zone 1 = app header, Zone 5 = tab bar — defined in App; not styled here. */
const APP_BAR_HEIGHT_PX = 56
/** Scroll offset ~ compact chapter header (title row + pills; border below both). */
const CHAPTER_ZONE_HEIGHT_PX = 118
const BOTTOM_CHROME_NAV_PX = 60
const BOTTOM_TAB_BAR_PX = 60
const APP_BAR_TOP_OFFSET = `calc(env(safe-area-inset-top, 0px) + ${APP_BAR_HEIGHT_PX}px)`
const BIBLE_SCROLL_TOP_OFFSET = `calc(env(safe-area-inset-top, 0px) + ${APP_BAR_HEIGHT_PX + CHAPTER_ZONE_HEIGHT_PX}px)`
const BIBLE_SCROLL_BOTTOM_PX = BOTTOM_CHROME_NAV_PX + BOTTOM_TAB_BAR_PX

function clampBibleFontSize(n) {
  if (!Number.isFinite(n)) return BIBLE_FONT_DEFAULT
  return Math.min(BIBLE_FONT_MAX, Math.max(BIBLE_FONT_MIN, Math.round(n)))
}

function cleanVerseText(text) {
  if (!text) return ''
  return text
    // Remove patterns like "word: Heb." or "phrase: Heb." at end of sentence
    .replace(/\s*[\w\s]+:\s*(Heb|Gr|Or|Lit|Marg|i\.e|Aram|Lat)\./gi, '')
    // Remove standalone "Heb." "Gr." etc
    .replace(/\b(Heb|Gr|Or|Lit|Marg|Aram|Lat)\./gi, '')
    // Remove bracketed content
    .replace(/\[.*?\]/g, '')
    // Remove parenthetical translator notes
    .replace(/\(.*?(Heb|Gr|Or|Lit).*?\)/gi, '')
    // Clean up double spaces and trailing punctuation artifacts
    .replace(/\s{2,}/g, ' ')
    .replace(/\.\s*\./g, '.')
    .trim()
}

/** Default for bible-api.com when no API.Bible key or when using non-getBible English texts — WEB is reliable on bible-api.com. */
const DEFAULT_BIBLE_API_COM_TRANSLATION = 'web'

const HAS_API_BIBLE = Boolean(import.meta.env.VITE_API_BIBLE_KEY)

/** bible-api.com `translation` ids — labels match the actual public-domain texts. */
const BIBLE_READER_TRANSLATIONS = [
  { id: 'kjv', labelKey: 'bible.kjv', subtitleKey: 'bible.subtitleKjv', denomination: 'Protestant' },
  { id: 'web', labelKey: 'bible.web', subtitleKey: 'bible.subtitleWeb', denomination: 'Protestant' },
  { id: 'asv', labelKey: 'bible.asv', subtitleKey: 'bible.subtitleAsv', denomination: 'Protestant' },
  { id: 'webbe', labelKey: 'bible.webbe', subtitleKey: 'bible.subtitleWebbe', denomination: 'Protestant' },
  { id: 'bbe', labelKey: 'bible.bbe', subtitleKey: 'bible.subtitleBbe', denomination: 'Protestant' },
  { id: 'darby', labelKey: 'bible.darby', subtitleKey: 'bible.subtitleDarby', denomination: 'Protestant' },
  { id: 'dra', label: 'Douay-Rheims 1899 (DRA)', subtitle: 'Catholic translation with Deuterocanonical books', isCatholic: true, denomination: 'Catholic' },
  { id: 'lxxe', label: 'Orthodox', subtitle: 'Brenton Septuagint with Deuterocanonical books', isOrthodox: true, denomination: 'Orthodox' },
]

function translationStorageKey(userId) {
  return userStorageKey(userId, 'bible-reader-translation')
}

function getStoredTranslationId(userId) {
  if (typeof window === 'undefined') return DEFAULT_BIBLE_API_COM_TRANSLATION
  const k = translationStorageKey(userId)
  let raw = localStorage.getItem(k)
  if (raw == null && userId) {
    const legacy = localStorage.getItem('abidinganchor-bible-reader-translation')
    if (legacy) {
      raw = legacy
      try {
        localStorage.setItem(k, legacy)
      } catch {
        /* ignore */
      }
    }
  }
  // OEB ids were returning 404 from bible-api.com; migrate to WEB.
  if (raw === 'oeb-us' || raw === 'oeb') {
    try {
      localStorage.setItem(k, DEFAULT_BIBLE_API_COM_TRANSLATION)
    } catch {
      /* ignore */
    }
    return DEFAULT_BIBLE_API_COM_TRANSLATION
  }
  if (raw && BIBLE_READER_TRANSLATIONS.some((t) => t.id === raw)) return raw
  return DEFAULT_BIBLE_API_COM_TRANSLATION
}

// Protestant books - 66 books only (Genesis to Revelation), no Deuterocanonical books
const PROTESTANT_BOOKS = [
  {name:'Genesis',cdnName:'genesis',chapters:50,bookNumber:1},
  {name:'Exodus',cdnName:'exodus',chapters:40,bookNumber:2},
  {name:'Leviticus',cdnName:'leviticus',chapters:27,bookNumber:3},
  {name:'Numbers',cdnName:'numbers',chapters:36,bookNumber:4},
  {name:'Deuteronomy',cdnName:'deuteronomy',chapters:34,bookNumber:5},
  {name:'Joshua',cdnName:'joshua',chapters:24,bookNumber:6},
  {name:'Judges',cdnName:'judges',chapters:21,bookNumber:7},
  {name:'Ruth',cdnName:'ruth',chapters:4,bookNumber:8},
  {name:'1 Samuel',cdnName:'1samuel',chapters:31,bookNumber:9},
  {name:'2 Samuel',cdnName:'2samuel',chapters:24,bookNumber:10},
  {name:'1 Kings',cdnName:'1kings',chapters:22,bookNumber:11},
  {name:'2 Kings',cdnName:'2kings',chapters:25,bookNumber:12},
  {name:'1 Chronicles',cdnName:'1chronicles',chapters:29,bookNumber:13},
  {name:'2 Chronicles',cdnName:'2chronicles',chapters:36,bookNumber:14},
  {name:'Ezra',cdnName:'ezra',chapters:10,bookNumber:15},
  {name:'Nehemiah',cdnName:'nehemiah',chapters:13,bookNumber:16},
  {name:'Esther',cdnName:'esther',chapters:10,bookNumber:17},
  {name:'Job',cdnName:'job',chapters:42,bookNumber:18},
  {name:'Psalms',cdnName:'psalms',chapters:150,bookNumber:19},
  {name:'Proverbs',cdnName:'proverbs',chapters:31,bookNumber:20},
  {name:'Ecclesiastes',cdnName:'ecclesiastes',chapters:12,bookNumber:21},
  {name:'Song of Solomon',cdnName:'songofsolomon',chapters:8,bookNumber:22},
  {name:'Isaiah',cdnName:'isaiah',chapters:66,bookNumber:23},
  {name:'Jeremiah',cdnName:'jeremiah',chapters:52,bookNumber:24},
  {name:'Lamentations',cdnName:'lamentations',chapters:5,bookNumber:25},
  {name:'Ezekiel',cdnName:'ezekiel',chapters:48,bookNumber:26},
  {name:'Daniel',cdnName:'daniel',chapters:12,bookNumber:27},
  {name:'Hosea',cdnName:'hosea',chapters:14,bookNumber:28},
  {name:'Joel',cdnName:'joel',chapters:3,bookNumber:29},
  {name:'Amos',cdnName:'amos',chapters:9,bookNumber:30},
  {name:'Obadiah',cdnName:'obadiah',chapters:1,bookNumber:31},
  {name:'Jonah',cdnName:'jonah',chapters:4,bookNumber:32},
  {name:'Micah',cdnName:'micah',chapters:7,bookNumber:33},
  {name:'Nahum',cdnName:'nahum',chapters:3,bookNumber:34},
  {name:'Habakkuk',cdnName:'habakkuk',chapters:3,bookNumber:35},
  {name:'Zephaniah',cdnName:'zephaniah',chapters:3,bookNumber:36},
  {name:'Haggai',cdnName:'haggai',chapters:2,bookNumber:37},
  {name:'Zechariah',cdnName:'zechariah',chapters:14,bookNumber:38},
  {name:'Malachi',cdnName:'malachi',chapters:4,bookNumber:39},
  {name:'Matthew',cdnName:'matthew',chapters:28,bookNumber:40},
  {name:'Mark',cdnName:'mark',chapters:16,bookNumber:41},
  {name:'Luke',cdnName:'luke',chapters:24,bookNumber:42},
  {name:'John',cdnName:'john',chapters:21,bookNumber:43},
  {name:'Acts',cdnName:'acts',chapters:28,bookNumber:44},
  {name:'Romans',cdnName:'romans',chapters:16,bookNumber:45},
  {name:'1 Corinthians',cdnName:'1corinthians',chapters:16,bookNumber:46},
  {name:'2 Corinthians',cdnName:'2corinthians',chapters:13,bookNumber:47},
  {name:'Galatians',cdnName:'galatians',chapters:6,bookNumber:48},
  {name:'Ephesians',cdnName:'ephesians',chapters:6,bookNumber:49},
  {name:'Philippians',cdnName:'philippians',chapters:4,bookNumber:50},
  {name:'Colossians',cdnName:'colossians',chapters:4,bookNumber:51},
  {name:'1 Thessalonians',cdnName:'1thessalonians',chapters:5,bookNumber:52},
  {name:'2 Thessalonians',cdnName:'2thessalonians',chapters:3,bookNumber:53},
  {name:'1 Timothy',cdnName:'1timothy',chapters:6,bookNumber:54},
  {name:'2 Timothy',cdnName:'2timothy',chapters:4,bookNumber:55},
  {name:'Titus',cdnName:'titus',chapters:3,bookNumber:56},
  {name:'Philemon',cdnName:'philemon',chapters:1,bookNumber:57},
  {name:'Hebrews',cdnName:'hebrews',chapters:13,bookNumber:58},
  {name:'James',cdnName:'james',chapters:5,bookNumber:59},
  {name:'1 Peter',cdnName:'1peter',chapters:5,bookNumber:60},
  {name:'2 Peter',cdnName:'2peter',chapters:3,bookNumber:61},
  {name:'1 John',cdnName:'1john',chapters:5,bookNumber:62},
  {name:'2 John',cdnName:'2john',chapters:1,bookNumber:63},
  {name:'3 John',cdnName:'3john',chapters:1,bookNumber:64},
  {name:'Jude',cdnName:'jude',chapters:1,bookNumber:65},
  {name:'Revelation',cdnName:'revelation',chapters:22,bookNumber:66},
]

// Catholic books - 73 books (Protestant 66 + 7 Deuterocanonical)
const CATHOLIC_BOOKS = [
  {name:'Genesis',cdnName:'genesis',chapters:50,bookNumber:1},
  {name:'Exodus',cdnName:'exodus',chapters:40,bookNumber:2},
  {name:'Leviticus',cdnName:'leviticus',chapters:27,bookNumber:3},
  {name:'Numbers',cdnName:'numbers',chapters:36,bookNumber:4},
  {name:'Deuteronomy',cdnName:'deuteronomy',chapters:34,bookNumber:5},
  {name:'Joshua',cdnName:'joshua',chapters:24,bookNumber:6},
  {name:'Judges',cdnName:'judges',chapters:21,bookNumber:7},
  {name:'Ruth',cdnName:'ruth',chapters:4,bookNumber:8},
  {name:'1 Samuel',cdnName:'1samuel',chapters:31,bookNumber:9},
  {name:'2 Samuel',cdnName:'2samuel',chapters:24,bookNumber:10},
  {name:'1 Kings',cdnName:'1kings',chapters:22,bookNumber:11},
  {name:'2 Kings',cdnName:'2kings',chapters:25,bookNumber:12},
  {name:'1 Chronicles',cdnName:'1chronicles',chapters:29,bookNumber:13},
  {name:'2 Chronicles',cdnName:'2chronicles',chapters:36,bookNumber:14},
  {name:'Ezra',cdnName:'ezra',chapters:10,bookNumber:15},
  {name:'Nehemiah',cdnName:'nehemiah',chapters:13,bookNumber:16},
  {name:'Tobit',cdnName:'tobit',chapters:14,bookNumber:68,deuterocanonical:true},
  {name:'Judith',cdnName:'judith',chapters:16,bookNumber:69,deuterocanonical:true},
  {name:'Wisdom',cdnName:'wisdom',chapters:19,bookNumber:72,deuterocanonical:true},
  {name:'Sirach',cdnName:'sirach',chapters:51,bookNumber:73,deuterocanonical:true},
  {name:'Baruch',cdnName:'baruch',chapters:6,bookNumber:74,deuterocanonical:true},
  {name:'1 Maccabees',cdnName:'1maccabees',chapters:16,bookNumber:70,deuterocanonical:true},
  {name:'2 Maccabees',cdnName:'2maccabees',chapters:15,bookNumber:71,deuterocanonical:true},
  {name:'Esther',cdnName:'esther',chapters:10,bookNumber:17},
  {name:'Job',cdnName:'job',chapters:42,bookNumber:18},
  {name:'Psalms',cdnName:'psalms',chapters:150,bookNumber:19},
  {name:'Proverbs',cdnName:'proverbs',chapters:31,bookNumber:20},
  {name:'Ecclesiastes',cdnName:'ecclesiastes',chapters:12,bookNumber:21},
  {name:'Song of Solomon',cdnName:'songofsolomon',chapters:8,bookNumber:22},
  {name:'Isaiah',cdnName:'isaiah',chapters:66,bookNumber:23},
  {name:'Jeremiah',cdnName:'jeremiah',chapters:52,bookNumber:24},
  {name:'Lamentations',cdnName:'lamentations',chapters:5,bookNumber:25},
  {name:'Ezekiel',cdnName:'ezekiel',chapters:48,bookNumber:26},
  {name:'Daniel',cdnName:'daniel',chapters:12,bookNumber:27},
  {name:'Hosea',cdnName:'hosea',chapters:14,bookNumber:28},
  {name:'Joel',cdnName:'joel',chapters:3,bookNumber:29},
  {name:'Amos',cdnName:'amos',chapters:9,bookNumber:30},
  {name:'Obadiah',cdnName:'obadiah',chapters:1,bookNumber:31},
  {name:'Jonah',cdnName:'jonah',chapters:4,bookNumber:32},
  {name:'Micah',cdnName:'micah',chapters:7,bookNumber:33},
  {name:'Nahum',cdnName:'nahum',chapters:3,bookNumber:34},
  {name:'Habakkuk',cdnName:'habakkuk',chapters:3,bookNumber:35},
  {name:'Zephaniah',cdnName:'zephaniah',chapters:3,bookNumber:36},
  {name:'Haggai',cdnName:'haggai',chapters:2,bookNumber:37},
  {name:'Zechariah',cdnName:'zechariah',chapters:14,bookNumber:38},
  {name:'Malachi',cdnName:'malachi',chapters:4,bookNumber:39},
  {name:'Matthew',cdnName:'matthew',chapters:28,bookNumber:40},
  {name:'Mark',cdnName:'mark',chapters:16,bookNumber:41},
  {name:'Luke',cdnName:'luke',chapters:24,bookNumber:42},
  {name:'John',cdnName:'john',chapters:21,bookNumber:43},
  {name:'Acts',cdnName:'acts',chapters:28,bookNumber:44},
  {name:'Romans',cdnName:'romans',chapters:16,bookNumber:45},
  {name:'1 Corinthians',cdnName:'1corinthians',chapters:16,bookNumber:46},
  {name:'2 Corinthians',cdnName:'2corinthians',chapters:13,bookNumber:47},
  {name:'Galatians',cdnName:'galatians',chapters:6,bookNumber:48},
  {name:'Ephesians',cdnName:'ephesians',chapters:6,bookNumber:49},
  {name:'Philippians',cdnName:'philippians',chapters:4,bookNumber:50},
  {name:'Colossians',cdnName:'colossians',chapters:4,bookNumber:51},
  {name:'1 Thessalonians',cdnName:'1thessalonians',chapters:5,bookNumber:52},
  {name:'2 Thessalonians',cdnName:'2thessalonians',chapters:3,bookNumber:53},
  {name:'1 Timothy',cdnName:'1timothy',chapters:6,bookNumber:54},
  {name:'2 Timothy',cdnName:'2timothy',chapters:4,bookNumber:55},
  {name:'Titus',cdnName:'titus',chapters:3,bookNumber:56},
  {name:'Philemon',cdnName:'philemon',chapters:1,bookNumber:57},
  {name:'Hebrews',cdnName:'hebrews',chapters:13,bookNumber:58},
  {name:'James',cdnName:'james',chapters:5,bookNumber:59},
  {name:'1 Peter',cdnName:'1peter',chapters:5,bookNumber:60},
  {name:'2 Peter',cdnName:'2peter',chapters:3,bookNumber:61},
  {name:'1 John',cdnName:'1john',chapters:5,bookNumber:62},
  {name:'2 John',cdnName:'2john',chapters:1,bookNumber:63},
  {name:'3 John',cdnName:'3john',chapters:1,bookNumber:64},
  {name:'Jude',cdnName:'jude',chapters:1,bookNumber:65},
  {name:'Revelation',cdnName:'revelation',chapters:22,bookNumber:66},
]

// Orthodox books - 76 books (Catholic 73 + 3 additional Orthodox additions)
const ORTHODOX_BOOKS = [
  {name:'Genesis',cdnName:'genesis',chapters:50,bookNumber:1},
  {name:'Exodus',cdnName:'exodus',chapters:40,bookNumber:2},
  {name:'Leviticus',cdnName:'leviticus',chapters:27,bookNumber:3},
  {name:'Numbers',cdnName:'numbers',chapters:36,bookNumber:4},
  {name:'Deuteronomy',cdnName:'deuteronomy',chapters:34,bookNumber:5},
  {name:'Joshua',cdnName:'joshua',chapters:24,bookNumber:6},
  {name:'Judges',cdnName:'judges',chapters:21,bookNumber:7},
  {name:'Ruth',cdnName:'ruth',chapters:4,bookNumber:8},
  {name:'1 Samuel',cdnName:'1samuel',chapters:31,bookNumber:9},
  {name:'2 Samuel',cdnName:'2samuel',chapters:24,bookNumber:10},
  {name:'1 Kings',cdnName:'1kings',chapters:22,bookNumber:11},
  {name:'2 Kings',cdnName:'2kings',chapters:25,bookNumber:12},
  {name:'1 Chronicles',cdnName:'1chronicles',chapters:29,bookNumber:13},
  {name:'2 Chronicles',cdnName:'2chronicles',chapters:36,bookNumber:14},
  {name:'Ezra',cdnName:'ezra',chapters:10,bookNumber:15},
  {name:'Nehemiah',cdnName:'nehemiah',chapters:13,bookNumber:16},
  {name:'Tobit',cdnName:'tobit',chapters:14,bookNumber:68,deuterocanonical:true},
  {name:'Judith',cdnName:'judith',chapters:16,bookNumber:69,deuterocanonical:true},
  {name:'Wisdom',cdnName:'wisdom',chapters:19,bookNumber:70,deuterocanonical:true},
  {name:'Sirach',cdnName:'sirach',chapters:51,bookNumber:71,deuterocanonical:true},
  {name:'Baruch',cdnName:'baruch',chapters:6,bookNumber:73,deuterocanonical:true},
  {name:'1 Maccabees',cdnName:'1maccabees',chapters:16,bookNumber:74,deuterocanonical:true},
  {name:'2 Maccabees',cdnName:'2maccabees',chapters:15,bookNumber:75,deuterocanonical:true},
  {name:'1 Esdras',cdnName:'1esdras',chapters:9,bookNumber:67,deuterocanonical:true},
  {name:'3 Maccabees',cdnName:'3maccabees',chapters:7,bookNumber:76,deuterocanonical:true},
  {name:'Esther',cdnName:'esther',chapters:10,bookNumber:17},
  {name:'Job',cdnName:'job',chapters:42,bookNumber:18},
  {name:'Psalms',cdnName:'psalms',chapters:150,bookNumber:19},
  {name:'Proverbs',cdnName:'proverbs',chapters:31,bookNumber:20},
  {name:'Ecclesiastes',cdnName:'ecclesiastes',chapters:12,bookNumber:21},
  {name:'Song of Solomon',cdnName:'songofsolomon',chapters:8,bookNumber:22},
  {name:'Isaiah',cdnName:'isaiah',chapters:66,bookNumber:23},
  {name:'Jeremiah',cdnName:'jeremiah',chapters:52,bookNumber:24},
  {name:'Lamentations',cdnName:'lamentations',chapters:5,bookNumber:25},
  {name:'Ezekiel',cdnName:'ezekiel',chapters:48,bookNumber:26},
  {name:'Daniel',cdnName:'daniel',chapters:12,bookNumber:27},
  {name:'Hosea',cdnName:'hosea',chapters:14,bookNumber:28},
  {name:'Joel',cdnName:'joel',chapters:3,bookNumber:29},
  {name:'Amos',cdnName:'amos',chapters:9,bookNumber:30},
  {name:'Obadiah',cdnName:'obadiah',chapters:1,bookNumber:31},
  {name:'Jonah',cdnName:'jonah',chapters:4,bookNumber:32},
  {name:'Micah',cdnName:'micah',chapters:7,bookNumber:33},
  {name:'Nahum',cdnName:'nahum',chapters:3,bookNumber:34},
  {name:'Habakkuk',cdnName:'habakkuk',chapters:3,bookNumber:35},
  {name:'Zephaniah',cdnName:'zephaniah',chapters:3,bookNumber:36},
  {name:'Haggai',cdnName:'haggai',chapters:2,bookNumber:37},
  {name:'Zechariah',cdnName:'zechariah',chapters:14,bookNumber:38},
  {name:'Malachi',cdnName:'malachi',chapters:4,bookNumber:39},
  {name:'Matthew',cdnName:'matthew',chapters:28,bookNumber:40},
  {name:'Mark',cdnName:'mark',chapters:16,bookNumber:41},
  {name:'Luke',cdnName:'luke',chapters:24,bookNumber:42},
  {name:'John',cdnName:'john',chapters:21,bookNumber:43},
  {name:'Acts',cdnName:'acts',chapters:28,bookNumber:44},
  {name:'Romans',cdnName:'romans',chapters:16,bookNumber:45},
  {name:'1 Corinthians',cdnName:'1corinthians',chapters:16,bookNumber:46},
  {name:'2 Corinthians',cdnName:'2corinthians',chapters:13,bookNumber:47},
  {name:'Galatians',cdnName:'galatians',chapters:6,bookNumber:48},
  {name:'Ephesians',cdnName:'ephesians',chapters:6,bookNumber:49},
  {name:'Philippians',cdnName:'philippians',chapters:4,bookNumber:50},
  {name:'Colossians',cdnName:'colossians',chapters:4,bookNumber:51},
  {name:'1 Thessalonians',cdnName:'1thessalonians',chapters:5,bookNumber:52},
  {name:'2 Thessalonians',cdnName:'2thessalonians',chapters:3,bookNumber:53},
  {name:'1 Timothy',cdnName:'1timothy',chapters:6,bookNumber:54},
  {name:'2 Timothy',cdnName:'2timothy',chapters:4,bookNumber:55},
  {name:'Titus',cdnName:'titus',chapters:3,bookNumber:56},
  {name:'Philemon',cdnName:'philemon',chapters:1,bookNumber:57},
  {name:'Hebrews',cdnName:'hebrews',chapters:13,bookNumber:58},
  {name:'James',cdnName:'james',chapters:5,bookNumber:59},
  {name:'1 Peter',cdnName:'1peter',chapters:5,bookNumber:60},
  {name:'2 Peter',cdnName:'2peter',chapters:3,bookNumber:61},
  {name:'1 John',cdnName:'1john',chapters:5,bookNumber:62},
  {name:'2 John',cdnName:'2john',chapters:1,bookNumber:63},
  {name:'3 John',cdnName:'3john',chapters:1,bookNumber:64},
  {name:'Jude',cdnName:'jude',chapters:1,bookNumber:65},
  {name:'Revelation',cdnName:'revelation',chapters:22,bookNumber:66},
]

// Mapping of Deuterocanonical books to their bolls.life book numbers (for Orthodox LXXE)
const ORTHODOX_DEUTEROCANONICAL_BOOK_MAP = {
  'tobit': 68,
  'judith': 69,
  'wisdom': 70,
  'sirach': 71,
  'baruch': 73,
  '1maccabees': 74,
  '2maccabees': 75,
  '1esdras': 67,
  '3maccabees': 76,
}

// Mapping of Deuterocanonical books to their bolls.life book numbers (for Catholic DRA)
const CATHOLIC_DEUTEROCANONICAL_BOOK_MAP = {
  'tobit': 68,
  'judith': 69,
  'wisdom': 72,
  'sirach': 73,
  'baruch': 74,
  '1maccabees': 70,
  '2maccabees': 71,
}

// Mapping of Deuterocanonical CDN names to their local JSON data
const DEUTEROCANONICAL_JSON_MAP = {
  'tobit': tobitData,
  'judith': judithData,
  'wisdom': wisdomData,
  'sirach': sirachData,
  'baruch': baruchData,
  '1maccabees': maccabees1Data,
  '2maccabees': maccabees2Data,
}

let crossReferencesDatasetPromise = null
function loadCrossReferencesDataset() {
  if (!crossReferencesDatasetPromise) {
    crossReferencesDatasetPromise = import('../data/crossReferences.json')
      .then((m) => m.default || {})
      .catch(() => ({}))
  }
  return crossReferencesDatasetPromise
}

let strongsHebrewDatasetPromise = null
let strongsGreekDatasetPromise = null
const strongsWordLookupCache = {
  hebrew: new Map(),
  greek: new Map(),
}

function loadStrongsHebrewDataset() {
  if (!strongsHebrewDatasetPromise) {
    strongsHebrewDatasetPromise = import('../data/strongsHebrew.json')
      .then((m) => m.default || {})
      .catch(() => ({}))
  }
  return strongsHebrewDatasetPromise
}

function loadStrongsGreekDataset() {
  if (!strongsGreekDatasetPromise) {
    strongsGreekDatasetPromise = import('../data/strongsGreek.json')
      .then((m) => m.default || {})
      .catch(() => ({}))
  }
  return strongsGreekDatasetPromise
}

export default function BibleReader({ open, onModeChange }) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const skyPeriod = useThemeBackgroundType()
  const dayTheme = skyPeriod === 'day'

  /** Normalize locale (e.g. ar-SA) to 2-letter language code. */
  const uiLang = (i18n.resolvedLanguage || i18n.language || 'en').toLowerCase().slice(0, 2)

  const [bookIndex, setBookIndex] = useState(0)
  const [chapter, setChapter] = useState(1)
  const [verses, setVerses] = useState([])
  const [loading, setLoading] = useState(true)
  const [highlightsByVerse, setHighlightsByVerse] = useState({})
  const [notesByVerse, setNotesByVerse] = useState({})
  const [activeVerse, setActiveVerse] = useState(null)
  const [verseMenuRect, setVerseMenuRect] = useState(null)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [showNoteViewer, setShowNoteViewer] = useState(false)
  const [showCrossRefsModal, setShowCrossRefsModal] = useState(false)
  const [crossRefsLoading, setCrossRefsLoading] = useState(false)
  const [crossRefs, setCrossRefs] = useState([])
  const [showStrongsModal, setShowStrongsModal] = useState(false)
  const [strongsWords, setStrongsWords] = useState([])
  const [selectedStrongsEntry, setSelectedStrongsEntry] = useState(null)
  const [jumpHighlightTarget, setJumpHighlightTarget] = useState(null)
  const [showBookPicker, setShowBookPicker] = useState(false)
  const [testamentFilter, setTestamentFilter] = useState('old')
  const [bibleCategory, setBibleCategory] = useState('protestant')
  const [currentBooks, setCurrentBooks] = useState(PROTESTANT_BOOKS)
  const [showChapterPicker, setShowChapterPicker] = useState(false)
  const [showTranslationPicker, setShowTranslationPicker] = useState(false)
  const [translationDropdownRect, setTranslationDropdownRect] = useState(null)
  const translationButtonRef = useRef(null)
  const [activeTranslationId, setActiveTranslationId] = useState(DEFAULT_BIBLE_API_COM_TRANSLATION)
  const [bibleId, setBibleId] = useState(() => getSavedBibleId() || DEFAULT_BIBLE_API_COM_TRANSLATION)
  const bibleIdRef = useRef(bibleId)
  const [fontSize, setFontSize] = useState(BIBLE_FONT_DEFAULT)
  const [showReadingControls, setShowReadingControls] = useState(false)
  const [isCurrentChapterOffline, setIsCurrentChapterOffline] = useState(false)
  const [showHindiBiblePicker, setShowHindiBiblePicker] = useState(false)
  const [cachedHindiCatalogId, setCachedHindiCatalogId] = useState(null)
  const [hindiSavedBibleId, setHindiSavedBibleId] = useState(null)
  const [immersiveMode, setImmersiveMode] = useState(false)
  const [showImmersiveHint, setShowImmersiveHint] = useState(false)
  const verseContainerRef = useRef(null)
  const prefetchedChaptersRef = useRef(new Set())

  const selectedBook = useMemo(() => {
    const book = currentBooks[bookIndex];
    if (book) {
      // bookNumber is already set correctly in each denomination's book list
      return book;
    }
    return null;
  }, [bookIndex, currentBooks]);

  const getBibleSlug = resolveGetBibleTranslationId(uiLang, activeTranslationId)
  const showEnglishBibleVersions = uiLang === 'en'
  const showHindiApiBiblePicker = uiLang === 'hi' && HAS_API_BIBLE
  const bollsTranslationId = BIBLE_LANG_MAP[uiLang] || null
  const getStorageTranslationKey = useCallback(
    (overrideBibleId = null) => getBibleSlug || bollsTranslationId || activeTranslationId || uiLang || overrideBibleId || bibleIdRef.current,
    [getBibleSlug, bollsTranslationId, activeTranslationId, uiLang],
  )

  const loadChapter = useCallback(async (overrideBibleId, currentBook, currentChapter) => {
    console.log('loadChapter called, translation:', activeTranslationId)
    console.log('Loading chapter with translation:', activeTranslationId)
    let cancelled = false
    setLoading(true)

    // Show static message for Orthodox placeholder
    if (activeTranslationId === 'orthodox-coming-soon') {
      setVerses([{ verse: 1, text: 'Orthodox Bible coming soon. We are working on adding full Orthodox Bible support.' }])
      setLoading(false)
      return
    }

    const idToUse = overrideBibleId || bibleIdRef.current
    const storageTranslation = getStorageTranslationKey(overrideBibleId)
    const isDeuterocanonicalBook = currentBook.deuterocanonical
    const isDraTranslation = activeTranslationId === 'dra'
    
    const offlineLookupKeys = Array.from(
      new Set(
        [storageTranslation, overrideBibleId, idToUse, getBibleSlug, bollsTranslationId, activeTranslationId, uiLang]
          .filter(Boolean)
          .map((x) => String(x)),
      ),
    )

    const saveOfflineWithFallbackKeys = async (rows) => {
      const keysToSave = Array.from(new Set([storageTranslation, idToUse].filter(Boolean).map((x) => String(x))))
      await Promise.all(
        keysToSave.map((k) => saveOfflineChapter(k, currentBook.bookNumber, currentChapter, rows)),
      )
    }

    try {
      // Only use offline cache if activeTranslationId is WEB (the downloaded translation)
      if (activeTranslationId === 'WEB') {
        console.log('Checking offline cache for keys:', offlineLookupKeys)
        for (const key of offlineLookupKeys) {
          const downloaded = await isChapterDownloaded(key, currentBook.bookNumber, currentChapter)
          if (!downloaded) continue
          const offlineVerses = await loadOfflineChapter(key, currentBook.bookNumber, currentChapter)
          if (!cancelled && Array.isArray(offlineVerses)) {
            console.log('Found offline cache, returning cached verses')
            setVerses(offlineVerses)
            setIsCurrentChapterOffline(true)
            setLoading(false)
            return
          }
        }
        console.log('No offline cache found, proceeding to API fetch')
      } else {
        console.log('Skipping offline cache for non-WEB translation:', activeTranslationId)
      }
    } catch {
      // Ignore offline read errors and continue with normal network fetch flow.
    }

    const loadFromBibleApiCom = () => {
      const url = `https://bible-api.com/${currentBook.cdnName}+${currentChapter}?translation=${activeTranslationId}`
      console.log('Fetching URL:', url)
      return fetch(url)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        })
        .then((data) => {
          console.log('API Response verse 1:', data?.verses?.[0]?.text)
          const rows = dedupeVersesByNumber(data.verses || [])
          return rows.map((v) => ({
            verse: v.verse,
            text: prepareBibleReaderVerseText(v.text),
          }))
        })
    }

    try {
      // For LXXE (Orthodox), always route to bolls.life API
      if (activeTranslationId === 'lxxe') {
        if (isDeuterocanonicalBook) {
          // Use specific bolls.life book numbers for Deuterocanonical books
          const bollsBookNumber = ORTHODOX_DEUTEROCANONICAL_BOOK_MAP[currentBook.cdnName]
          console.log(`[BibleReader] LXXE Deuterocanonical book fetch: book=${currentBook.cdnName}, bollsBookNumber=${bollsBookNumber}, chapter=${currentChapter}`)
          if (bollsBookNumber) {
            const bollsUrl = `https://bolls.life/get-text/LXXE/${bollsBookNumber}/${currentChapter}/`
            console.log(`[BibleReader] LXXE Deuterocanonical fetch URL: ${bollsUrl}`)
            const response = await fetch(bollsUrl)
            console.log(`[BibleReader] LXXE Deuterocanonical response status: ${response.status}, ok: ${response.ok}`)
            if (response.ok) {
              const data = await response.json()
              console.log(`[BibleReader] LXXE Deuterocanonical raw response:`, data)
              if (Array.isArray(data) && data.length) {
                const normalized = data.map((v) => ({
                  verse: v.verse,
                  text: prepareBibleReaderVerseText(v.text),
                }))
                setVerses(normalized)
                setIsCurrentChapterOffline(true)
                setLoading(false)
                return
              }
            }
            console.log('[BibleReader] bolls.life returned non-OK for LXXE Deuterocanonical book')
          } else {
            console.log(`[BibleReader] No bollsBookNumber found for ${currentBook.cdnName} in ORTHODOX_DEUTEROCANONICAL_BOOK_MAP`)
          }
        } else {
          // Use regular book number for non-Deuterocanonical books
          console.log(`[BibleReader] LXXE regular book fetch: book=${currentBook.cdnName}, bookNumber=${currentBook.bookNumber}, chapter=${currentChapter}`)
          const bollsUrl = `https://bolls.life/get-text/LXXE/${currentBook.bookNumber}/${currentChapter}/`
          console.log(`[BibleReader] LXXE regular fetch URL: ${bollsUrl}`)
          const response = await fetch(bollsUrl)
          console.log(`[BibleReader] LXXE regular response status: ${response.status}, ok: ${response.ok}`)
          if (response.ok) {
            const data = await response.json()
            console.log(`[BibleReader] LXXE regular raw response:`, data)
            if (Array.isArray(data) && data.length) {
              const normalized = data.map((v) => ({
                verse: v.verse,
                text: prepareBibleReaderVerseText(v.text),
              }))
              setVerses(normalized)
              setIsCurrentChapterOffline(true)
              setLoading(false)
              return
            }
          }
          console.log('[BibleReader] bolls.life returned non-OK for LXXE book')
        }
        // If bolls.life fails for LXXE, show error and don't fall through to other APIs
        if (!cancelled) {
          setVerses([{ verse: 1, text: 'Unable to load chapter. Please try again.' }])
          setIsCurrentChapterOffline(false)
          setLoading(false)
        }
        return
      }

      // For Deuterocanonical books with DRA or Catholic translations, use local JSON
      if (isDeuterocanonicalBook && (isDraTranslation || activeTranslationId === 'cpdv')) {
        const localData = DEUTEROCANONICAL_JSON_MAP[currentBook.cdnName]
        if (localData && localData.chapters && localData.chapters[currentChapter]) {
          console.log(`[BibleReader] Loading Deuterocanonical book from local JSON: ${currentBook.cdnName} chapter ${currentChapter}`)
          const chapterVerses = localData.chapters[currentChapter]
          if (!cancelled) {
            const normalized = chapterVerses.map((v) => ({
              verse: v.verse,
              text: prepareBibleReaderVerseText(v.text),
            }))
            setVerses(normalized)
            setIsCurrentChapterOffline(true)
            setLoading(false)
          }
          return
        }
      }

      // TRANSLATION-SPECIFIC BIBLE — use activeTranslationId instead of uiLang for translation picker
      // Skip bolls.life for DRA (not supported) and go straight to bible-api.com, EXCEPT for Deuterocanonical books
      const skipBolls = ['dra']
      let bollsRows = null

      if (!skipBolls.includes(activeTranslationId) || (isDraTranslation && isDeuterocanonicalBook)) {
        try {
          if (isDraTranslation && isDeuterocanonicalBook) {
            // For Deuterocanonical books with DRA, use specific bolls.life book numbers
            const bollsBookNumber = CATHOLIC_DEUTEROCANONICAL_BOOK_MAP[currentBook.cdnName]
            if (bollsBookNumber) {
              console.log(`[BibleReader] Fetching Deuterocanonical book from bolls.life: DRA/${bollsBookNumber}/${currentChapter}`)
              const bollsUrl = `https://bolls.life/get-text/DRA/${bollsBookNumber}/${currentChapter}/`
              const response = await fetch(bollsUrl)
              if (response.ok) {
                const data = await response.json()
                if (Array.isArray(data) && data.length) {
                  bollsRows = data
                }
              } else {
                console.log('[BibleReader] bolls.life returned non-OK for Deuterocanonical book')
              }
            }
          } else {
            bollsRows = await fetchBollsGetTextForTranslationId(activeTranslationId, currentBook.bookNumber, currentChapter)
          }
        } catch (err) {
          console.error('[BibleReader] bolls.life error:', err)
        }
      } else {
        console.log('[BibleReader] Skipping bolls.life for translation:', activeTranslationId)
      }
      if (bollsRows?.length) {
        if (!cancelled) {
          const normalized = bollsRows.map((v) => ({
            verse: v.verse,
            text: prepareBibleReaderVerseText((v.text || '').replace(/[ⓐ-ⓩ]/g, '').replace(/<[^>]*>/g, '').replace(/\s{2,}/g, ' ').trim()),
          }))
          setVerses(normalized)
          await saveOfflineWithFallbackKeys(normalized)
          setIsCurrentChapterOffline(true)
          setLoading(false)
        }
        return
      }

      if (getBibleSlug) {
        const { verses: rawGb } = await fetchGetBibleChapter(getBibleSlug, currentBook.bookNumber, currentChapter)
        if (!cancelled) {
          if (rawGb?.length) {
            const normalized = dedupeVersesByNumber(
              rawGb.map((v) => ({
                verse: v.verse,
                text: prepareBibleReaderVerseText(v.text),
              })),
            )
            setVerses(normalized)
            await saveOfflineWithFallbackKeys(normalized)
            setIsCurrentChapterOffline(true)
          } else {
            setVerses([])
            await saveOfflineWithFallbackKeys([])
            setIsCurrentChapterOffline(false)
          }
          setLoading(false)
          return
        }
      }
      if (HAS_API_BIBLE && (showEnglishBibleVersions || uiLang === 'hi')) {
        let currentBibleId = await resolveBibleIdForLanguage(uiLang)
        if (uiLang === 'hi') {
          const catalogHi = currentBibleId
          if (catalogHi && !cancelled) setCachedHindiCatalogId(catalogHi)
          let saved = hindiSavedBibleId
          try {
            saved = saved ?? getSavedBibleId()
          } catch {
            saved = null
          }
          const hindiIds = new Set(
            POPULAR_BIBLES.filter((b) => b.language === 'हिंदी' && b.id).map((b) => b.id),
          )
          if (catalogHi) hindiIds.add(catalogHi)
          if (saved && hindiIds.has(saved)) currentBibleId = saved
        }
        const osis = BOOK_CDN_TO_OSIS[currentBook.cdnName]
        if (idToUse && osis) { // Use idToUse here
          console.log('[BibleReader] Fetching Bible with ID:', idToUse) // Fixed console.log
          const raw = await fetchApiBibleChapterVerses(idToUse, osis, currentChapter) // Use idToUse here
          if (!cancelled && raw?.length) {
            const normalized = dedupeVersesByNumber(
              raw.map((v) => ({
                verse: v.verse,
                text: prepareBibleReaderVerseText(v.text),
              })),
            )
            setVerses(normalized)
            await saveOfflineWithFallbackKeys(normalized)
            setIsCurrentChapterOffline(true)
            setLoading(false)
            return
          }
        }
      }

      const rows = await loadFromBibleApiCom()
      if (!cancelled) {
        // Special handling for Deuterocanonical books that failed to load
        if (isDeuterocanonicalBook && isDraTranslation && (!rows || rows.length === 0)) {
          setVerses([{ verse: 1, text: 'This book is coming soon in a future update.' }])
          setIsCurrentChapterOffline(false)
          setLoading(false)
        } else {
          setVerses(rows || [])
          await saveOfflineWithFallbackKeys(rows || [])
          setIsCurrentChapterOffline(Boolean(rows?.length))
          setLoading(false)
        }
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error loading verses:', err)
      if (!cancelled) {
        // Special handling for Deuterocanonical books that failed to load
        if (isDeuterocanonicalBook && isDraTranslation) {
          setVerses([{ verse: 1, text: 'This book is coming soon in a future update.' }])
          setIsCurrentChapterOffline(false)
          setLoading(false)
        } else {
          setVerses([])
          setIsCurrentChapterOffline(false)
          setLoading(false)
        }
      }
    }

  }, [
    activeTranslationId,
    bollsTranslationId,
    getBibleSlug,
    hindiSavedBibleId,
    showEnglishBibleVersions,
    uiLang,
    getStorageTranslationKey,
  ])

  useEffect(() => {
    if (!open || !selectedBook || !chapter) {
      setIsCurrentChapterOffline(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const translationKey = getStorageTranslationKey()
        const downloaded = await isChapterDownloaded(translationKey, selectedBook.bookNumber, chapter)
        if (!cancelled) setIsCurrentChapterOffline(downloaded)
      } catch {
        if (!cancelled) setIsCurrentChapterOffline(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, selectedBook, chapter, getStorageTranslationKey])

  useEffect(() => {
    setActiveTranslationId(getStoredTranslationId(user?.id))
    try {
      const raw = localStorage.getItem(userStorageKey(user?.id, 'bible-font-size'))
      if (raw != null) setFontSize(clampBibleFontSize(parseInt(raw, 10)))
    } catch {
      /* ignore */
    }
  }, [user?.id])

  useEffect(() => {
    bibleIdRef.current = bibleId
  }, [bibleId])

  useEffect(() => {
    if (uiLang === 'hi') {
      try {
        const savedId = getSavedBibleId()
        setHindiSavedBibleId(savedId)
        // Auto-switch to Hindi Bible if still using default English KJV
        const HINDI_BIBLE_ID = '1e8ab327edbce67f-01'
        const DEFAULT_ENGLISH_ID = 'de4e12af7f28f599-02'
        const ENGLISH_IDS = new Set([
          DEFAULT_ENGLISH_ID,
          '592420522e16049f-01', // ESV
          '7142879509583d59-04', // NIV
          'b32b9d1b64b4ef29-04', // NLT
          '592420522e16049f-02', // NKJV
        ])
        // Only auto-switch if current Bible is an English version
        if (ENGLISH_IDS.has(savedId)) {
          console.log('[BibleReader] Auto-switching to Hindi Bible:', HINDI_BIBLE_ID)
          saveBibleId(HINDI_BIBLE_ID)
          setHindiSavedBibleId(HINDI_BIBLE_ID)
          bibleIdRef.current = HINDI_BIBLE_ID
        }
      } catch {
        setHindiSavedBibleId(null)
      }
    } else {
      setHindiSavedBibleId(null)
      setCachedHindiCatalogId(null)
      // Restore to English when switching back from Hindi
      try {
        const savedId = getSavedBibleId()
        const HINDI_BIBLE_ID = '1e8ab327edbce67f-01'
        if (savedId === HINDI_BIBLE_ID) {
          console.log('[BibleReader] Restoring to English Bible:', 'de4e12af7f28f599-02')
          saveBibleId('de4e12af7f28f599-02')
        }
      } catch {
        /* ignore */
      }
    }
  }, [uiLang, user?.id])

  useEffect(() => {
    let newBibleId = null;
    if (uiLang === 'hi') {
      newBibleId = hindiSavedBibleId;
    } else {
      newBibleId = activeTranslationId;
    }
    setBibleId(newBibleId);
  }, [uiLang, activeTranslationId, hindiSavedBibleId]);

  useEffect(() => {
    try {
      localStorage.setItem(userStorageKey(user?.id, 'bible-font-size'), String(fontSize))
    } catch {
      /* ignore */
    }
  }, [fontSize, user?.id])

  const maxChapter = selectedBook?.chapters || 1
  const hindiBiblePickerList = useMemo(() => {
    if (!showHindiApiBiblePicker) return []
    const fromPopular = POPULAR_BIBLES.filter((b) => b.language === 'हिंदी' && b.id)
    const fromCatalog = cachedHindiCatalogId
      ? [
          {
            id: cachedHindiCatalogId,
            name: 'Hindi Bible',
            abbr: 'HINIRV',
            language: 'हिंदी',
          },
        ]
      : []
    const byId = new Map()
    for (const b of [...fromCatalog, ...fromPopular]) {
      if (b.id) byId.set(b.id, b)
    }
    return Array.from(byId.values())
  }, [showHindiApiBiblePicker, cachedHindiCatalogId])
  const hindiPillAbbr =
    hindiBiblePickerList.find((b) => b.id === (hindiSavedBibleId || cachedHindiCatalogId))?.name || 'Hindi Bible (IRV)'
  const bookKey = selectedBook?.cdnName || ''

  useEffect(() => {
    if (!open || uiLang !== 'hi' || !HAS_API_BIBLE) return
    let cancelled = false
    ;(async () => {
      const id = await resolveBibleIdForLanguage('hi')
      if (!cancelled && id) setCachedHindiCatalogId(id)
    })()
    const navBtnStyle = {
    background: 'transparent',
    border: '1px solid #D4A843',
    borderRadius: '16px',
    color: '#D4A843',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    padding: '6px 14px',
    lineHeight: 1.2,
  };

  return () => {
      cancelled = true
    }
  }, [open, uiLang])

  const OLD_TESTAMENT_LAST_INDEX = useMemo(() => {
    // Find the index of Matthew (first NT book) in currentBooks
    const matthewIndex = currentBooks.findIndex(book => book.cdnName === 'matthew')
    return matthewIndex !== -1 ? matthewIndex - 1 : currentBooks.length - 1
  }, [currentBooks])

  const filteredBooks = useMemo(() => {
    // For Protestant, Catholic, and Orthodox, each has its own book list
    // No filtering needed since each denomination has its own complete list
    const start = testamentFilter === 'old' ? 0 : OLD_TESTAMENT_LAST_INDEX + 1
    const end = testamentFilter === 'old' ? OLD_TESTAMENT_LAST_INDEX : currentBooks.length - 1
    const booksInTestament = currentBooks.slice(start, end + 1)
    
    return booksInTestament.map((book, offset) => ({
      book,
      index: start + offset,
    }))
  }, [testamentFilter, currentBooks, OLD_TESTAMENT_LAST_INDEX])

  const translationOptions = useMemo(
    () =>
      BIBLE_READER_TRANSLATIONS.map((tr) => ({
        id: tr.id,
        label: tr.label || t(tr.labelKey),
        subtitle: tr.subtitle || t(tr.subtitleKey),
        isCatholic: tr.isCatholic || false,
        isOrthodox: tr.isOrthodox || false,
        denomination: tr.denomination || 'Protestant',
      })),
    [t],
  )
  
  const filteredTranslationOptions = useMemo(() => {
    if (bibleCategory === 'protestant') {
      return translationOptions.filter(opt => opt.denomination === 'Protestant')
    } else if (bibleCategory === 'catholic') {
      return translationOptions.filter(opt => opt.denomination === 'Catholic')
    } else if (bibleCategory === 'orthodox') {
      return translationOptions.filter(opt => opt.denomination === 'Orthodox')
    }
    return translationOptions
  }, [translationOptions, bibleCategory])
  
  const selectedTranslation = translationOptions.find((x) => x.id === activeTranslationId) ?? translationOptions[0]

  const bookDisplayName = (book) =>
    book ? t(`bible.books.${book.cdnName}`, { defaultValue: book.name }) : ''

  useEffect(() => {
    if (!showEnglishBibleVersions) setShowTranslationPicker(false)
  }, [showEnglishBibleVersions])

  // Auto-switch Bible category based on translation selection
  useEffect(() => {
    if (activeTranslationId === 'cpdv' || activeTranslationId === 'dra') {
      setBibleCategory('catholic')
    } else if (activeTranslationId === 'lxxe') {
      setBibleCategory('orthodox')
    } else {
      setBibleCategory('protestant')
    }
  }, [activeTranslationId])

  // Switch book lists when denomination changes and reset to Genesis chapter 1
  useEffect(() => {
    if (bibleCategory === 'catholic') {
      setCurrentBooks(CATHOLIC_BOOKS)
    } else if (bibleCategory === 'orthodox') {
      setCurrentBooks(ORTHODOX_BOOKS)
    } else {
      setCurrentBooks(PROTESTANT_BOOKS)
    }
    // Reset to Genesis chapter 1 when denomination changes
    setBookIndex(0)
    setChapter(1)
    setVerses([])
  }, [bibleCategory])


  const measureTranslationDropdownPosition = useCallback(() => {
    const el = translationButtonRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const gap = 6
    const menuWidth = Math.min(200, window.innerWidth - 16)
    let left = r.right - menuWidth
    left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8))
    const top = r.bottom + gap
    setTranslationDropdownRect({ top, left })
  }, [])

  useLayoutEffect(() => {
    if (!showTranslationPicker || !showEnglishBibleVersions) {
      setTranslationDropdownRect(null)
      return undefined
    }
    measureTranslationDropdownPosition()
    const onScrollOrResize = () => measureTranslationDropdownPosition()
    window.addEventListener('resize', onScrollOrResize)
    window.addEventListener('scroll', onScrollOrResize, true)
    return () => {
      window.removeEventListener('resize', onScrollOrResize)
      window.removeEventListener('scroll', onScrollOrResize, true)
    }
  }, [showTranslationPicker, showEnglishBibleVersions, measureTranslationDropdownPosition])

  useEffect(() => {
    if (!showTranslationPicker || !showEnglishBibleVersions) return undefined
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setShowTranslationPicker(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showTranslationPicker, showEnglishBibleVersions])

  useEffect(() => {
    if (!open) return

    const savedBookIndex = localStorage.getItem(userStorageKey(user?.id, 'bible-book-index'))
    const savedChapter = localStorage.getItem(userStorageKey(user?.id, 'bible-chapter'))

    if (savedBookIndex !== null) {
      setBookIndex(parseInt(savedBookIndex, 10))
    }
    if (savedChapter !== null) {
      setChapter(parseInt(savedChapter, 10))
    }
  }, [open, user?.id])



  useEffect(() => {
    if (!open || !selectedBook) return
    console.log('Translation changed to:', activeTranslationId)
    setVerses([])
    loadChapter(null, selectedBook, chapter)
  }, [open, selectedBook, chapter, activeTranslationId])

  // Pre-fetch next chapter in background when current chapter loads
  useEffect(() => {
    if (!open || !selectedBook || loading || !chapter) return

    const prefetchKey = `${activeTranslationId}-${selectedBook.bookNumber}-${chapter}`
    if (prefetchedChaptersRef.current.has(prefetchKey)) return

    prefetchedChaptersRef.current.add(prefetchKey)

    const prefetchNextChapter = async () => {
      const maxChapter = selectedBook.chapters
      let nextBook = selectedBook
      let nextChapter = chapter + 1

      if (nextChapter > maxChapter && bookIndex < currentBooks.length - 1) {
        nextBook = currentBooks[bookIndex + 1]
        nextChapter = 1
      }

      if (nextBook && nextChapter <= nextBook.chapters) {
        const nextPrefetchKey = `${activeTranslationId}-${nextBook.bookNumber}-${nextChapter}`
        if (!prefetchedChaptersRef.current.has(nextPrefetchKey)) {
          try {
            const url = `https://bible-api.com/${nextBook.cdnName}+${nextChapter}?translation=${activeTranslationId}`
            await fetch(url).then(r => r.json())
            prefetchedChaptersRef.current.add(nextPrefetchKey)
          } catch {
            // Silent fail for pre-fetch
          }
        }
      }
    }

    prefetchNextChapter()
  }, [open, selectedBook, chapter, loading, activeTranslationId, bookIndex, currentBooks])

  useEffect(() => {
    if (verseContainerRef.current) {
      verseContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [chapter])

  useEffect(() => {
    if (!showBookPicker) return
    setTestamentFilter(bookIndex <= OLD_TESTAMENT_LAST_INDEX ? 'old' : 'new')
  }, [showBookPicker, bookIndex, OLD_TESTAMENT_LAST_INDEX])

  useEffect(() => {
    if (!open) return
    setActiveVerse(null)
    setVerseMenuRect(null)
    setShowNoteModal(false)
    setShowNoteViewer(false)
    setShowCrossRefsModal(false)
    setShowStrongsModal(false)
    setStrongsWords([])
    setSelectedStrongsEntry(null)
    setCrossRefs([])
    setCrossRefsLoading(false)
    setNoteDraft('')
  }, [open, bookKey, chapter, activeTranslationId])

  useEffect(() => {
    if (!jumpHighlightTarget) return undefined
    const timeoutId = setTimeout(() => setJumpHighlightTarget(null), 4500)
    return () => clearTimeout(timeoutId)
  }, [jumpHighlightTarget])

  useEffect(() => {
    if (!open || !user?.id || !bookKey || !chapter) {
      setHighlightsByVerse({})
      setNotesByVerse({})
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const [hiRes, noteRes] = await Promise.all([
          supabase
            .from('verse_highlights')
            .select('verse,color')
            .eq('user_id', user.id)
            .eq('book', bookKey)
            .eq('chapter', chapter),
          supabase
            .from('verse_notes')
            .select('verse,note_text')
            .eq('user_id', user.id)
            .eq('book', bookKey)
            .eq('chapter', chapter),
        ])

        if (cancelled) return

        const nextHighlights = {}
        for (const row of hiRes?.data || []) {
          nextHighlights[String(row.verse)] = row.color || 'gold'
        }
        const nextNotes = {}
        for (const row of noteRes?.data || []) {
          nextNotes[String(row.verse)] = row.note_text || ''
        }

        setHighlightsByVerse(nextHighlights)
        setNotesByVerse(nextNotes)
      } catch (err) {
        if (import.meta.env.DEV) console.error('Load verse highlights/notes:', err)
        if (!cancelled) {
          setHighlightsByVerse({})
          setNotesByVerse({})
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, user?.id, bookKey, chapter])

  useEffect(() => {
    if (!verseMenuRect && !showNoteModal && !showNoteViewer && !showCrossRefsModal && !showStrongsModal) return undefined
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setVerseMenuRect(null)
        setActiveVerse(null)
        setShowNoteModal(false)
        setShowNoteViewer(false)
        setShowCrossRefsModal(false)
        setShowStrongsModal(false)
        setSelectedStrongsEntry(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [verseMenuRect, showNoteModal, showNoteViewer, showCrossRefsModal, showStrongsModal])

  const openVerseMenu = (verseNum, clientX, clientY) => {
    if (!verseNum) return
    setActiveVerse(Number(verseNum))
    const menuWidth = 230
    const gap = 10
    const maxLeft = window.innerWidth - menuWidth - 8
    const left = Math.max(8, Math.min(clientX - menuWidth / 2, maxLeft))
    const top = Math.max(8, clientY + gap)
    setVerseMenuRect({ top, left, width: menuWidth })
  }

  const saveHighlight = async (verseNum) => {
    if (!user?.id || !bookKey || !chapter || !verseNum) return
    const verse = Number(verseNum)
    const color = 'gold'
    setHighlightsByVerse((prev) => ({ ...(prev || {}), [String(verse)]: color }))
    setVerseMenuRect(null)
    try {
      const { error } = await supabase
        .from('verse_highlights')
        .upsert(
          { user_id: user.id, book: bookKey, chapter, verse, color },
          { onConflict: 'user_id,book,chapter,verse' },
        )
      if (error) throw error
    } catch (err) {
      if (import.meta.env.DEV) console.error('Save highlight:', err)
    }
  }

  const openAddNote = (verseNum) => {
    const verse = Number(verseNum)
    setVerseMenuRect(null)
    setShowNoteViewer(false)
    setActiveVerse(verse)
    setNoteDraft(notesByVerse[String(verse)] || '')
    setShowNoteModal(true)
  }

  const saveNote = async () => {
    if (!user?.id || !bookKey || !chapter || !activeVerse) return
    const verse = Number(activeVerse)
    const note_text = String(noteDraft || '').trim()
    setNotesByVerse((prev) => ({ ...(prev || {}), [String(verse)]: note_text }))
    setShowNoteModal(false)
    try {
      const { error } = await supabase
        .from('verse_notes')
        .upsert(
          { user_id: user.id, book: bookKey, chapter, verse, note_text },
          { onConflict: 'user_id,book,chapter,verse' },
        )
      if (error) throw error
    } catch (err) {
      if (import.meta.env.DEV) console.error('Save note:', err)
    }
  }

  const openNoteViewer = (verseNum) => {
    const verse = Number(verseNum)
    setActiveVerse(verse)
    setShowNoteModal(false)
    setVerseMenuRect(null)
    setShowNoteViewer(true)
  }

  const resolveBookFromCdn = (cdnName) => currentBooks.find((b) => b.cdnName === cdnName)

  const fetchReferenceVerseText = async (ref) => {
    try {
      const chapterUrl = `${BIBLE_API_COM}/${encodeURIComponent(ref.book)}+${ref.chapter}?translation=${encodeURIComponent(activeTranslationId)}`
      const res = await fetch(chapterUrl)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const chapterVerses = dedupeVersesByNumber(data.verses || [])
      const hit = chapterVerses.find((v) => Number(v.verse) === Number(ref.verseStart))
      if (!hit) return ''
      return prepareBibleReaderVerseText(hit.text)
    } catch {
      return ''
    }
  }

  const openCrossReferences = async (verseNum) => {
    const verse = Number(verseNum)
    if (!bookKey || !chapter || !verse) return
    setActiveVerse(verse)
    setVerseMenuRect(null)
    setShowNoteModal(false)
    setShowNoteViewer(false)
    setShowCrossRefsModal(true)
    setCrossRefsLoading(true)

    const key = `${bookKey}.${chapter}.${verse}`
    const dataset = await loadCrossReferencesDataset()
    const refs = dataset[key] || []
    try {
      const rows = await Promise.all(
        refs.map(async (ref) => {
          const book = resolveBookFromCdn(ref.book)
          const text = await fetchReferenceVerseText(ref)
          return {
            ...ref,
            referenceLabel:
              Number(ref.chapter) === Number(ref.chapterEnd) && Number(ref.verseStart) === Number(ref.verseEnd)
                ? `${book?.name || ref.book} ${ref.chapter}:${ref.verseStart}`
                : `${book?.name || ref.book} ${ref.chapter}:${ref.verseStart}-${ref.chapterEnd}:${ref.verseEnd}`,
            text: text || 'Verse text unavailable for this translation.',
            bookIndex: book ? currentBooks.findIndex((b) => b.cdnName === ref.book) : -1,
          }
        }),
      )
      setCrossRefs(rows)
    } finally {
      setCrossRefsLoading(false)
    }
  }

  const jumpToCrossReference = (ref) => {
    if (!ref || ref.bookIndex < 0) return
    setShowCrossRefsModal(false)
    setShowNoteViewer(false)
    setShowNoteModal(false)
    setShowBookPicker(false)
    setShowChapterPicker(false)
    setBookIndex(ref.bookIndex)
    setChapter(ref.chapter)
    setJumpHighlightTarget({
      book: ref.book,
      chapter: ref.chapter,
      verse: Number(ref.verseStart),
    })
  }

  const openStrongsConcordance = async (verseNum) => {
    const verse = Number(verseNum)
    const verseObj = verses.find((v) => Number(v.verse) === verse)
    if (!verseObj) return
    const words = String(verseObj.text || '')
      .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
      .split(/\s+/)
      .map((w) => w.trim())
      .filter(Boolean)
      .filter((w, idx, arr) => arr.findIndex((x) => x.toLowerCase() === w.toLowerCase()) === idx)
    setActiveVerse(verse)
    setVerseMenuRect(null)
    setShowNoteModal(false)
    setShowNoteViewer(false)
    setShowCrossRefsModal(false)
    setSelectedStrongsEntry(null)
    setStrongsWords(words)
    setShowStrongsModal(true)
  }

  const isOldTestamentBook = bookIndex < 39

  const findStrongsEntryForWord = (dictionary, rawWord) => {
    const needle = String(rawWord || '').toLowerCase()
    if (!needle) return null
    for (const [strongsNumber, entry] of Object.entries(dictionary || {})) {
      const kjvDef = String(entry?.kjv_def || '').toLowerCase()
      if (!kjvDef) continue
      const tokens = kjvDef
        .replace(/[^a-z0-9\s'-]/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
      if (tokens.includes(needle)) {
        return { strongsNumber, entry }
      }
    }
    return null
  }

  const openStrongsWordDetail = async (rawWord) => {
    const wordKey = String(rawWord || '').toLowerCase()
    const cacheBucket = isOldTestamentBook ? strongsWordLookupCache.hebrew : strongsWordLookupCache.greek
    if (cacheBucket.has(wordKey)) {
      setSelectedStrongsEntry(cacheBucket.get(wordKey))
      return
    }
    const dictionary = isOldTestamentBook
      ? await loadStrongsHebrewDataset()
      : await loadStrongsGreekDataset()
    const hit = findStrongsEntryForWord(dictionary, rawWord)
    if (hit) {
      const mapped = {
        word: rawWord,
        strongsNumber: hit.strongsNumber,
        originalWord: hit.entry.lemma || rawWord,
        transliteration: hit.entry.translit || hit.entry.xlit || '',
        definition: hit.entry.strongs_def || hit.entry.kjv_def || 'No definition available.',
      }
      cacheBucket.set(wordKey, mapped)
      setSelectedStrongsEntry(mapped)
      return
    }
    const fallback = {
      word: rawWord,
      strongsNumber: 'N/A',
      originalWord: rawWord,
      transliteration: String(rawWord || '').toLowerCase(),
      definition: `Strong's entry not found in the ${isOldTestamentBook ? 'Hebrew' : 'Greek'} dictionary for this word yet.`,
    }
    cacheBucket.set(wordKey, fallback)
    setSelectedStrongsEntry(fallback)
  }

  useEffect(() => {
    if (selectedBook) {
      try {
        localStorage.setItem(userStorageKey(user?.id, 'bible-book-index'), bookIndex.toString())
        localStorage.setItem(userStorageKey(user?.id, 'bible-chapter'), chapter.toString())
      } catch {
        /* ignore */
      }
    }
  }, [bookIndex, chapter, selectedBook, user?.id])

  useEffect(() => {
    try {
      localStorage.setItem(translationStorageKey(user?.id), activeTranslationId)
    } catch {
      /* ignore */
    }
  }, [activeTranslationId, user?.id])

  const handleBookSelect = (index) => {
    setBookIndex(index)
    setChapter(1)
    setShowBookPicker(false)
    setShowChapterPicker(true)
  }

  const handleChapterSelect = (num) => {
    setChapter(num)
    setShowChapterPicker(false)
  }

  const goToPreviousChapter = () => {
    if (chapter > 1) {
      setChapter(chapter - 1)
    }
  }

  const goToNextChapter = () => {
    if (chapter < maxChapter) {
      setChapter(chapter + 1)
    }
  }

  if (!open) return null

  const navBtnStyle = {
    background: 'transparent',
    border: '1px solid #D4A843',
    borderRadius: '16px',
    color: '#D4A843',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    padding: '6px 14px',
    lineHeight: 1.2,
  };

  return (
    <div style={{ position: 'relative', zIndex: 10, width: '100%', minHeight: '100dvh', background: 'transparent' }}>
      {/*
        ZONE 1 — App bar (logo, Read title, settings): fixed in App — do not style here.
        ZONE 2 — Chapter header + Read/Listen (fixed below app bar)
      */}
      <div
        className="bible-reader-header home-gold-glass"
        style={{
          position: 'fixed',
          top: APP_BAR_TOP_OFFSET,
          left: 0,
          right: 0,
          height: 'auto',
          zIndex: 90,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          paddingTop: 16,
          paddingBottom: 16,
          paddingLeft: 20,
          paddingRight: 20,
          transition: 'opacity 0.3s ease',
          opacity: immersiveMode ? 0 : 1,
        }}
      >
        <div style={{ maxWidth: '680px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0 16px' }}>
            <button
              type="button"
              className="home-gold-glass rounded-full px-4 py-2"
              onClick={() => {
                if (chapter > 1) {
                  setChapter(chapter - 1)
                } else if (bookIndex > 0) {
                  setBookIndex(bookIndex - 1)
                  setChapter(currentBooks[bookIndex - 1]?.chapters || 1)
                }
              }}
              disabled={bookIndex === 0 && chapter === 1}
              style={{
                color: dayTheme ? '#8B6914' : '#D4A843',
                fontSize: dayTheme ? '18px' : '20px',
                cursor: (bookIndex === 0 && chapter === 1) ? 'not-allowed' : 'pointer',
                lineHeight: '1',
                opacity: (bookIndex === 0 && chapter === 1) ? 0.3 : 1,
                transition: 'all 0.2s ease',
                alignSelf: 'center',
                border: dayTheme ? '1px solid rgba(212,175,55,0.4)' : 'none',
                background: dayTheme ? 'rgba(212,175,55,0.15)' : 'transparent',
                borderRadius: '999px',
                width: dayTheme ? '36px' : undefined,
                height: dayTheme ? '36px' : undefined,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ←
            </button>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowBookPicker(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: dayTheme ? '#2C1810' : '#ffffff',
                  fontSize: '32px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '0 8px',
                  letterSpacing: '-0.02em',
                  lineHeight: '1.1',
                  fontFamily: 'Georgia, serif',
                  textShadow: dayTheme ? '0 1px 3px rgba(180,120,60,0.15)' : 'none',
                }}
              >
                {selectedBook ? bookDisplayName(selectedBook) : t('bible.loading')}
              </button>
              <button
                type="button"
                onClick={() => setShowChapterPicker(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: dayTheme ? 'rgba(160,100,40,0.8)' : 'rgba(251, 191, 36, 0.7)',
                  fontSize: '13px',
                  fontWeight: 400,
                  cursor: 'pointer',
                  padding: '0 8px',
                  lineHeight: '1.2',
                  fontStyle: 'italic',
                  fontFamily: dayTheme ? 'Georgia, serif' : undefined,
                }}
              >
                {t('bible.chapter', { n: chapter })}
              </button>
            </div>
            
            <button
              type="button"
              className="home-gold-glass rounded-full px-4 py-2"
              onClick={() => {
                if (chapter < maxChapter) {
                  setChapter(chapter + 1)
                } else if (bookIndex < currentBooks.length - 1) {
                  setBookIndex(bookIndex + 1)
                  setChapter(1)
                }
              }}
              disabled={bookIndex === currentBooks.length - 1 && chapter === maxChapter}
              style={{
                color: dayTheme ? '#8B6914' : '#D4A843',
                fontSize: dayTheme ? '18px' : '20px',
                cursor: (bookIndex === currentBooks.length - 1 && chapter === maxChapter) ? 'not-allowed' : 'pointer',
                lineHeight: '1',
                opacity: (bookIndex === currentBooks.length - 1 && chapter === maxChapter) ? 0.3 : 1,
                transition: 'all 0.2s ease',
                alignSelf: 'center',
                border: dayTheme ? '1px solid rgba(212,175,55,0.4)' : 'none',
                background: dayTheme ? 'rgba(212,175,55,0.15)' : 'transparent',
                borderRadius: '999px',
                width: dayTheme ? '36px' : undefined,
                height: dayTheme ? '36px' : undefined,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              →
            </button>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 4, marginBottom: 0, gap: '6px', flexShrink: 0 }}>
            {showEnglishBibleVersions && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setBibleCategory('protestant')
                    const categoryTranslations = translationOptions.filter(opt => opt.denomination === 'Protestant')
                    const currentInCategory = categoryTranslations.some(opt => opt.id === activeTranslationId)
                    if (!currentInCategory && categoryTranslations.length > 0) {
                      setActiveTranslationId(categoryTranslations[0].id)
                    }
                  }}
                  style={{
                    background: bibleCategory === 'protestant'
                      ? 'linear-gradient(135deg, #C8960C, #D4AF37)'
                      : (dayTheme ? 'transparent' : 'rgba(255, 255, 255, 0.05)'),
                    border: bibleCategory === 'protestant'
                      ? 'none'
                      : (dayTheme ? 'none' : '1px solid rgba(255, 255, 255, 0.1)'),
                    borderRadius: '999px',
                    color: bibleCategory === 'protestant' ? '#1A0F00' : (dayTheme ? 'rgba(100,70,20,0.7)' : 'rgba(255, 255, 255, 0.6)'),
                    fontSize: '11px',
                    fontWeight: bibleCategory === 'protestant' ? 700 : 500,
                    cursor: 'pointer',
                    padding: '6px 16px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: bibleCategory === 'protestant' ? '0 2px 8px rgba(212,175,55,0.4)' : 'none',
                  }}
                >
                  Protestant
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBibleCategory('catholic')
                    const categoryTranslations = translationOptions.filter(opt => opt.denomination === 'Catholic')
                    const currentInCategory = categoryTranslations.some(opt => opt.id === activeTranslationId)
                    if (!currentInCategory && categoryTranslations.length > 0) {
                      setActiveTranslationId(categoryTranslations[0].id)
                    }
                  }}
                  style={{
                    background: bibleCategory === 'catholic'
                      ? 'linear-gradient(135deg, #C8960C, #D4AF37)'
                      : (dayTheme ? 'transparent' : 'rgba(255, 255, 255, 0.05)'),
                    border: bibleCategory === 'catholic'
                      ? 'none'
                      : (dayTheme ? 'none' : '1px solid rgba(255, 255, 255, 0.1)'),
                    borderRadius: '999px',
                    color: bibleCategory === 'catholic' ? '#1A0F00' : (dayTheme ? 'rgba(100,70,20,0.7)' : 'rgba(255, 255, 255, 0.6)'),
                    fontSize: '11px',
                    fontWeight: bibleCategory === 'catholic' ? 700 : 500,
                    cursor: 'pointer',
                    padding: '6px 16px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: bibleCategory === 'catholic' ? '0 2px 8px rgba(212,175,55,0.4)' : 'none',
                  }}
                >
                  Catholic
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBibleCategory('orthodox')
                    const categoryTranslations = translationOptions.filter(opt => opt.denomination === 'Orthodox')
                    const currentInCategory = categoryTranslations.some(opt => opt.id === activeTranslationId)
                    if (!currentInCategory && categoryTranslations.length > 0) {
                      setActiveTranslationId(categoryTranslations[0].id)
                    }
                  }}
                  style={{
                    background: bibleCategory === 'orthodox'
                      ? 'linear-gradient(135deg, #C8960C, #D4AF37)'
                      : (dayTheme ? 'transparent' : 'rgba(255, 255, 255, 0.05)'),
                    border: bibleCategory === 'orthodox'
                      ? 'none'
                      : (dayTheme ? 'none' : '1px solid rgba(255, 255, 255, 0.1)'),
                    borderRadius: '999px',
                    color: bibleCategory === 'orthodox' ? '#1A0F00' : (dayTheme ? 'rgba(100,70,20,0.7)' : 'rgba(255, 255, 255, 0.6)'),
                    fontSize: '11px',
                    fontWeight: bibleCategory === 'orthodox' ? 700 : 500,
                    cursor: 'pointer',
                    padding: '6px 16px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: bibleCategory === 'orthodox' ? '0 2px 8px rgba(212,175,55,0.4)' : 'none',
                  }}
                >
                  Orthodox
                </button>
              </>
            )}
            {showEnglishBibleVersions || showHindiApiBiblePicker ? (
              <button
                ref={translationButtonRef}
                type="button"
                className="bible-translation-btn"
                onClick={() => {
                  if (showHindiApiBiblePicker) setShowHindiBiblePicker(true)
                  else setShowTranslationPicker((o) => !o)
                }}
                style={{
                  background: 'rgba(240, 192, 64, 0.1)',
                  border: '1px solid rgba(240, 192, 64, 0.4)',
                  borderRadius: '50px',
                  color: dayTheme ? '#D4A843' : 'rgba(255, 255, 255, 0.7)',
                  borderColor: dayTheme ? '#D4A843' : 'rgba(240, 192, 64, 0.4)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '0 16px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.2s ease',
                }}
                aria-expanded={showHindiApiBiblePicker ? showHindiBiblePicker : showTranslationPicker}
                aria-haspopup="listbox"
              >
                {HAS_API_BIBLE && showHindiApiBiblePicker
                  ? hindiPillAbbr
                  : HAS_API_BIBLE
                    ? uiLang.toUpperCase()
                    : selectedTranslation.label}
              </button>
            ) : (
              <span className="bible-translation-btn" style={{
                fontSize: '12px',
                fontWeight: 600,
                color: dayTheme ? '#D4A843' : 'rgba(255, 255, 255, 0.7)',
                borderColor: dayTheme ? '#D4A843' : 'rgba(240, 192, 64, 0.4)',
                padding: '0 16px',
                height: '40px',
                display: 'inline-flex',
                alignItems: 'center',
                background: 'rgba(240, 192, 64, 0.1)',
                border: '1px solid rgba(240, 192, 64, 0.4)',
                borderRadius: '50px',
              }}>
                {getBibleSlug ? String(getBibleSlug).toUpperCase() : ''}
              </span>
            )}

            <span
              title={isCurrentChapterOffline ? 'Available offline' : 'Not saved offline'}
              aria-label={isCurrentChapterOffline ? 'Chapter available offline' : 'Chapter not available offline'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: '50px',
                background: isCurrentChapterOffline ? 'rgba(212, 168, 67, 0.18)' : 'rgba(255, 255, 255, 0.08)',
                border: `1px solid ${isCurrentChapterOffline ? 'rgba(212, 168, 67, 0.5)' : 'rgba(255, 255, 255, 0.2)'}`,
                color: isCurrentChapterOffline ? '#D4A843' : 'rgba(255, 255, 255, 0.7)',
                fontSize: '16px',
                lineHeight: 1,
              }}
            >
              {isCurrentChapterOffline ? '📥' : '🌐'}
            </span>
            
            {onModeChange && (
              <button
                type="button"
                className="bible-read-btn"
                onClick={() => onModeChange('read')}
                style={{
                  background: '#D4A843',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '50px',
                  padding: '0 16px',
                  height: '40px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.2s ease',
                }}
              >
                {t('bible.read')}
              </button>
            )}
            
            <button
              type="button"
              className="home-gold-glass rounded-full"
              onClick={() => setShowReadingControls(true)}
              style={{
                color: '#D4A843',
                fontSize: '18px',
                cursor: 'pointer',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                border: 'none',
                background: 'transparent',
              }}
              aria-label="Reading settings"
            >
              ⚙
            </button>
          </div>
        </div>
      </div>

      {/* ZONE 3 — Scrollable Bible text only */}
      <div
        ref={verseContainerRef}
        onClick={() => {
          if (!immersiveMode) {
            setImmersiveMode(true)
            setShowImmersiveHint(true)
            setTimeout(() => setShowImmersiveHint(false), 2000)
          } else {
            setImmersiveMode(false)
          }
        }}
        style={{
          position: 'fixed',
          top: BIBLE_SCROLL_TOP_OFFSET,
          bottom: BIBLE_SCROLL_BOTTOM_PX,
          left: 0,
          right: 0,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          paddingTop: '8px',
          paddingBottom: '0',
          paddingLeft: '16px',
          paddingRight: '16px',
          zIndex: 40,
          boxSizing: 'border-box',
          background: 'transparent',
        }}
      >
        <div style={{ maxWidth: '680px', margin: '0 auto', width: '100%', animation: 'fadeIn 0.6s ease-out', padding: '0', minHeight: '50vh' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', paddingBottom: '80px', padding: '80px 24px' }}>
              {/* Gold skeleton loading state */}
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: `${60 + Math.random() * 30}%`,
                    height: '12px',
                    background: 'rgba(212, 168, 67, 0.2)',
                    borderRadius: '4px',
                    marginBottom: '12px',
                    animation: 'pulse 1.5s ease-in-out infinite',
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          ) : (
            <div
              className="bible-verse-well"
              style={{
                color: dayTheme ? '#1C1008' : 'rgba(255, 255, 255, 0.92)',
                fontSize: `${fontSize}px`,
                lineHeight: dayTheme ? '1.75' : '1.9',
                fontFamily: 'Georgia, serif',
                minHeight: '50vh',
              }}
            >
              {verses.map((v) => (
                (() => {
                  const isJumpHighlight =
                    jumpHighlightTarget &&
                    jumpHighlightTarget.book === bookKey &&
                    Number(jumpHighlightTarget.chapter) === Number(chapter) &&
                    Number(jumpHighlightTarget.verse) === Number(v.verse)
                  return (
                <p
                  key={v.verse}
                  onClick={(e) => {
                    e.stopPropagation()
                    openVerseMenu(v.verse, e.clientX, e.clientY)
                  }}
                  style={{
                    marginBottom: dayTheme ? '8px' : '16px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    background: dayTheme
                      ? 'transparent'
                      : (highlightsByVerse[String(v.verse)] || isJumpHighlight ? 'rgba(251, 191, 36, 0.08)' : 'transparent'),
                    color: dayTheme ? '#1C1008' : 'rgba(255, 255, 255, 0.92)',
                    borderLeft: dayTheme
                      ? (highlightsByVerse[String(v.verse)] || isJumpHighlight ? '3px solid rgba(251,191,36,0.6)' : 'none')
                      : (highlightsByVerse[String(v.verse)] || isJumpHighlight ? '3px solid rgba(251, 191, 36, 0.6)' : 'none'),
                    borderTop: 'none',
                    borderRight: 'none',
                    borderBottom: 'none',
                    paddingTop: '4px',
                    paddingBottom: '4px',
                    paddingLeft: (highlightsByVerse[String(v.verse)] || isJumpHighlight) ? '12px' : '0',
                    paddingRight: '0',
                    borderRadius: dayTheme ? '0' : (highlightsByVerse[String(v.verse)] || isJumpHighlight ? '0' : '0'),
                    boxShadow: 'none',
                    backdropFilter: 'none',
                    WebkitBackdropFilter: 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <sup
                    style={{
                      color: dayTheme ? '#C8960C' : '#FBBF24',
                      fontSize: '11px',
                      fontWeight: 700,
                      marginRight: '6px',
                      verticalAlign: 'super',
                      fontFamily: dayTheme ? 'Georgia, serif' : undefined,
                    }}
                  >
                    {v.verse}
                  </sup>
                  {cleanVerseText(v.text)}
                  {notesByVerse[String(v.verse)] ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        openNoteViewer(v.verse)
                      }}
                      style={{
                        background: 'rgba(251, 191, 36, 0.15)',
                        border: '1px solid rgba(251, 191, 36, 0.3)',
                        cursor: 'pointer',
                        padding: '4px 10px',
                        margin: '0 0 0 8px',
                        color: '#FBBF24',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '99px',
                        transition: 'all 0.2s ease',
                      }}
                      aria-label={`View note for verse ${v.verse}`}
                      title="View note"
                    >
                      📝
                    </button>
                  ) : null}
                </p>
                  )
                })()
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Verse action menu (portaled) */}
      {verseMenuRect &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <div
              onClick={() => {
                setVerseMenuRect(null)
                setActiveVerse(null)
              }}
              style={{ position: 'fixed', inset: 0, zIndex: 10030, background: 'rgba(0, 0, 0, 0.5)' }}
              aria-hidden
            />
            <div
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 10031,
                background: 'rgba(6, 15, 38, 0.75)',
                backdropFilter: 'blur(28px)',
                WebkitBackdropFilter: 'blur(28px)',
                borderTop: '1px solid rgba(255, 255, 255, 0.09)',
                borderRadius: '24px 24px 0 0',
                padding: '24px',
                animation: 'slideUp 0.3s ease-out',
              }}
              onClick={(e) => e.stopPropagation()}
              role="menu"
              aria-label="Verse options"
            >
              <div style={{ maxWidth: '680px', margin: '0 auto' }}>
                <p style={{ margin: '0 0 20px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.18em', color: '#F0C040', textTransform: 'uppercase', textAlign: 'center' }}>
                  Verse {activeVerse ?? ''}
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => saveHighlight(activeVerse)}
                    style={{
                      background: 'rgba(240, 192, 64, 0.15)',
                      border: '1px solid rgba(240, 192, 64, 0.3)',
                      color: '#F0C040',
                      borderRadius: '16px',
                      padding: '12px 20px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    � Highlight
                  </button>
                  <button
                    type="button"
                    onClick={() => openAddNote(activeVerse)}
                    style={{
                      background: 'rgba(240, 192, 64, 0.15)',
                      border: '1px solid rgba(240, 192, 64, 0.3)',
                      color: '#F0C040',
                      borderRadius: '16px',
                      padding: '12px 20px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    📝 Note
                  </button>
                  <button
                    type="button"
                    onClick={() => openCrossReferences(activeVerse)}
                    style={{
                      background: 'rgba(240, 192, 64, 0.15)',
                      border: '1px solid rgba(240, 192, 64, 0.3)',
                      color: '#F0C040',
                      borderRadius: '16px',
                      padding: '12px 20px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    🔗 Cross Ref
                  </button>
                  <button
                    type="button"
                    onClick={() => openStrongsConcordance(activeVerse)}
                    style={{
                      background: 'rgba(240, 192, 64, 0.15)',
                      border: '1px solid rgba(240, 192, 64, 0.3)',
                      color: '#F0C040',
                      borderRadius: '16px',
                      padding: '12px 20px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    📖 Strong's
                  </button>
                </div>
              </div>
            </div>
          </>,
          document.body,
        )}

      {/* Add Note modal */}
      {showNoteModal && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="glass-scrim"
              style={{ position: 'fixed', inset: 0, zIndex: 10040, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => setShowNoteModal(false)}
            >
              <div
                className="glass-panel"
                style={{
                  width: 'min(520px, calc(100vw - 24px))',
                  borderRadius: '18px',
                  padding: '16px',
                  border: '1px solid rgba(255,255,255,0.10)',
                  background: 'rgba(10, 20, 50, 0.6)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
                  color: 'var(--card-text, var(--text-primary))',
                }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Add note"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <p style={{ margin: 0, fontWeight: 900, letterSpacing: '0.02em', color: 'var(--text-primary)' }}>
                    📝 Note — {selectedBook ? bookDisplayName(selectedBook) : ''} {chapter}:{activeVerse}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowNoteModal(false)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '14px' }}
                  >
                    ✕
                  </button>
                </div>
                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Type your note…"
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    resize: 'vertical',
                    borderRadius: '12px',
                    border: '1px solid var(--input-border, rgba(255,255,255,0.14))',
                    background: 'var(--input-bg, rgba(255,255,255,0.06))',
                    color: 'var(--text-primary)',
                    padding: '12px',
                    fontSize: '14px',
                    lineHeight: 1.4,
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setShowNoteModal(false)}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--input-border, rgba(255,255,255,0.14))',
                      color: 'var(--text-primary)',
                      borderRadius: '14px',
                      padding: '10px 14px',
                      cursor: 'pointer',
                      fontWeight: 800,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveNote}
                    style={{
                      background: '#D4AF37',
                      border: 'none',
                      color: '#0b1026',
                      borderRadius: '14px',
                      padding: '10px 14px',
                      cursor: 'pointer',
                      fontWeight: 900,
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {/* Cross References modal */}
      {showCrossRefsModal && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="glass-scrim"
              style={{ position: 'fixed', inset: 0, zIndex: 10045, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => setShowCrossRefsModal(false)}
            >
              <div
                className="glass-panel"
                style={{
                  width: 'min(560px, calc(100vw - 24px))',
                  maxHeight: 'min(78vh, 720px)',
                  overflowY: 'auto',
                  borderRadius: '18px',
                  padding: '16px',
                  border: '1px solid rgba(255,255,255,0.10)',
                  background: 'rgba(10, 20, 50, 0.6)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
                  color: 'var(--card-text, var(--text-primary))',
                }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Cross references"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <p style={{ margin: 0, fontWeight: 900, letterSpacing: '0.02em', color: 'var(--text-primary)' }}>
                    🔗 Cross References — {selectedBook ? bookDisplayName(selectedBook) : ''} {chapter}:{activeVerse}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowCrossRefsModal(false)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '14px' }}
                  >
                    ✕
                  </button>
                </div>

                {crossRefsLoading ? (
                  <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Loading cross references…</p>
                ) : crossRefs.length === 0 ? (
                  <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                    No cross references are available for this verse in the local dataset yet.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {crossRefs.map((ref) => (
                      <button
                        key={`${ref.book}-${ref.chapter}-${ref.verseStart}-${ref.chapterEnd}-${ref.verseEnd}`}
                        type="button"
                        onClick={() => jumpToCrossReference(ref)}
                        style={{
                          background: 'var(--input-bg, rgba(255,255,255,0.06))',
                          border: '1px solid var(--input-border, rgba(255,255,255,0.14))',
                          borderRadius: '12px',
                          padding: '10px 12px',
                          textAlign: 'left',
                          cursor: ref.bookIndex >= 0 ? 'pointer' : 'not-allowed',
                          opacity: ref.bookIndex >= 0 ? 1 : 0.65,
                        }}
                      >
                        <p style={{ margin: 0, color: '#D4AF37', fontWeight: 800, fontSize: '13px' }}>{ref.referenceLabel}</p>
                        <p style={{ margin: '6px 0 0', color: 'var(--text-primary)', fontSize: '13px', lineHeight: 1.45 }}>
                          {ref.text}
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setShowCrossRefsModal(false)}
                    style={{
                      background: '#D4AF37',
                      border: 'none',
                      color: '#1a1a1a',
                      borderRadius: '14px',
                      padding: '10px 14px',
                      cursor: 'pointer',
                      fontWeight: 900,
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {/* Strong's Concordance modal */}
      {showStrongsModal && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="glass-scrim"
              style={{ position: 'fixed', inset: 0, zIndex: 10047, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => {
                setShowStrongsModal(false)
                setSelectedStrongsEntry(null)
              }}
            >
              <div
                className="glass-panel"
                style={{
                  width: 'min(560px, calc(100vw - 24px))',
                  maxHeight: 'min(80vh, 760px)',
                  overflowY: 'auto',
                  borderRadius: '18px',
                  padding: '16px',
                  border: '1px solid rgba(255,255,255,0.10)',
                  background: 'rgba(10, 20, 50, 0.6)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
                  color: 'var(--card-text, var(--text-primary))',
                }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Strong's Concordance"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <p style={{ margin: 0, fontWeight: 900, letterSpacing: '0.02em', color: 'var(--text-primary)' }}>
                    📚 Strong&apos;s Concordance - {selectedBook ? bookDisplayName(selectedBook) : ''} {chapter}:{activeVerse}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowStrongsModal(false)
                      setSelectedStrongsEntry(null)
                    }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '14px' }}
                  >
                    ✕
                  </button>
                </div>

                {selectedStrongsEntry ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => setSelectedStrongsEntry(null)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--input-border, rgba(255,255,255,0.14))',
                        color: 'var(--text-primary)',
                        borderRadius: '12px',
                        padding: '8px 12px',
                        cursor: 'pointer',
                        fontWeight: 700,
                        marginBottom: '12px',
                      }}
                    >
                      ← Back
                    </button>
                    <div
                      style={{
                        borderRadius: '12px',
                        border: '1px solid var(--input-border, rgba(255,255,255,0.14))',
                        background: 'var(--input-bg, rgba(255,255,255,0.06))',
                        padding: '12px',
                      }}
                    >
                      <p style={{ margin: 0, color: '#D4AF37', fontWeight: 900, fontSize: '16px' }}>
                        {selectedStrongsEntry.strongsNumber}
                      </p>
                      <p style={{ margin: '8px 0 0', color: 'var(--text-primary)', fontSize: '14px' }}>
                        <strong>Word:</strong> {selectedStrongsEntry.originalWord}
                      </p>
                      <p style={{ margin: '6px 0 0', color: 'var(--text-primary)', fontSize: '14px' }}>
                        <strong>Transliteration:</strong> {selectedStrongsEntry.transliteration}
                      </p>
                      <p style={{ margin: '6px 0 0', color: 'var(--text-primary)', fontSize: '14px', lineHeight: 1.5 }}>
                        <strong>Definition:</strong> {selectedStrongsEntry.definition}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={{ margin: '0 0 10px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      Tap a word to view its Strong&apos;s entry.
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {strongsWords.map((word, idx) => (
                        <button
                          key={`${word}-${idx}`}
                          type="button"
                          onClick={() => openStrongsWordDetail(word)}
                          style={{
                            borderRadius: '999px',
                            border: '1px solid rgba(212,175,55,0.42)',
                            background: 'rgba(212,175,55,0.14)',
                            color: 'var(--text-primary)',
                            padding: '6px 12px',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {word}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowStrongsModal(false)
                      setSelectedStrongsEntry(null)
                    }}
                    style={{
                      background: '#D4AF37',
                      border: 'none',
                      color: '#1a1a1a',
                      borderRadius: '14px',
                      padding: '10px 14px',
                      cursor: 'pointer',
                      fontWeight: 900,
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {/* Note viewer */}
      {showNoteViewer && activeVerse && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="glass-scrim"
              style={{ position: 'fixed', inset: 0, zIndex: 10050, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => setShowNoteViewer(false)}
            >
              <div
                className="glass-panel"
                style={{
                  width: 'min(520px, calc(100vw - 24px))',
                  borderRadius: '18px',
                  padding: '16px',
                  border: '1px solid rgba(255,255,255,0.10)',
                  background: 'rgba(10, 20, 50, 0.6)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
                  color: 'var(--card-text, var(--text-primary))',
                }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="View note"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <p style={{ margin: 0, fontWeight: 900, letterSpacing: '0.02em', color: 'var(--text-primary)' }}>
                    📝 Note — {selectedBook ? bookDisplayName(selectedBook) : ''} {chapter}:{activeVerse}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowNoteViewer(false)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '14px' }}
                  >
                    ✕
                  </button>
                </div>
                <div
                  style={{
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.5,
                    fontSize: '14px',
                    padding: '12px',
                    borderRadius: '12px',
                    border: '1px solid var(--input-border, rgba(255,255,255,0.14))',
                    background: 'var(--input-bg, rgba(255,255,255,0.06))',
                    color: 'var(--text-primary)',
                  }}
                >
                  {notesByVerse[String(activeVerse)] || ''}
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNoteViewer(false)
                      openAddNote(activeVerse)
                    }}
                    style={{
                      background: '#D4AF37',
                      border: 'none',
                      color: '#1a1a1a',
                      borderRadius: '14px',
                      padding: '10px 14px',
                      cursor: 'pointer',
                      fontWeight: 900,
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNoteViewer(false)}
                    style={{
                      background: '#D4AF37',
                      border: 'none',
                      color: '#0b1026',
                      borderRadius: '14px',
                      padding: '10px 14px',
                      cursor: 'pointer',
                      fontWeight: 900,
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {/* ZONE 4 — Chapter / font nav (floating pill above bottom tab bar). ZONE 5 — tab bar: fixed in App. */}
      <div
        className="bible-reader-bottom-controls home-gold-glass rounded-full"
        style={{
          position: 'fixed',
          bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
          left: 16,
          right: 16,
          height: 'auto',
          zIndex: 90,
          paddingTop: '8px',
          paddingBottom: '8px',
          paddingLeft: '24px',
          paddingRight: '24px',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          maxWidth: '680px',
          margin: '0 auto',
          background: dayTheme ? 'rgba(255,248,230,0.92)' : undefined,
          backdropFilter: dayTheme ? 'blur(16px)' : undefined,
          WebkitBackdropFilter: dayTheme ? 'blur(16px)' : undefined,
          border: dayTheme ? '1px solid rgba(212,175,55,0.35)' : undefined,
          borderRadius: '999px',
          boxShadow: dayTheme
            ? '0 4px 24px rgba(180,140,60,0.2), inset 0 1px 0 rgba(255,255,255,0.8)'
            : '0 8px 32px rgba(0, 0, 0, 0.4)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
          opacity: immersiveMode ? 0 : 1,
          transform: immersiveMode ? 'translateY(20px)' : 'translateY(0)',
          animation: 'slideUp 0.4s ease-out 0.2s both',
        }}
      >
        <div style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'flex-start' }}>
          <button
            type="button"
            onClick={goToPreviousChapter}
            disabled={chapter === 1 || loading}
            style={{
              background: 'transparent',
              border: 'none',
              color: dayTheme ? '#8B6914' : 'rgba(255, 255, 255, 0.6)',
              fontSize: '14px',
              fontWeight: dayTheme ? 600 : 500,
              cursor: chapter === 1 || loading ? 'not-allowed' : 'pointer',
              padding: '4px 12px',
              lineHeight: 1.2,
              opacity: chapter === 1 || loading ? 0.3 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            ← Prev
          </button>
        </div>
        <div
          style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: '8px' }}
          aria-label="Bible text size"
        >
          <button
            type="button"
            onClick={() => {
              setFontSize((s) => {
                const next = clampBibleFontSize(s - BIBLE_FONT_STEP)
                try {
                  localStorage.setItem(userStorageKey(user?.id, 'bible-font-size'), String(next))
                } catch {
                  /* ignore */
                }
                return next
              })
            }}
            disabled={fontSize <= BIBLE_FONT_MIN}
            style={{
              background: dayTheme ? 'rgba(212,175,55,0.15)' : 'transparent',
              border: dayTheme ? '1px solid rgba(212,175,55,0.3)' : '1px solid rgba(255, 255, 255, 0.2)',
              color: dayTheme ? '#8B6914' : 'rgba(255, 255, 255, 0.8)',
              fontSize: '14px',
              fontWeight: 700,
              cursor: fontSize <= BIBLE_FONT_MIN ? 'not-allowed' : 'pointer',
              padding: '4px 12px',
              opacity: fontSize <= BIBLE_FONT_MIN ? 0.35 : 1,
              borderRadius: '8px',
              transition: 'all 0.2s ease',
            }}
          >
            A-
          </button>
          <button
            type="button"
            onClick={() => {
              setFontSize((s) => {
                const next = clampBibleFontSize(s + BIBLE_FONT_STEP)
                try {
                  localStorage.setItem(userStorageKey(user?.id, 'bible-font-size'), String(next))
                } catch {
                  /* ignore */
                }
                return next
              })
            }}
            disabled={fontSize >= BIBLE_FONT_MAX}
            style={{
              background: dayTheme ? 'rgba(212,175,55,0.15)' : 'transparent',
              border: dayTheme ? '1px solid rgba(212,175,55,0.3)' : '1px solid rgba(255, 255, 255, 0.2)',
              color: dayTheme ? '#8B6914' : 'rgba(255, 255, 255, 0.8)',
              fontSize: '14px',
              fontWeight: 700,
              cursor: fontSize >= BIBLE_FONT_MAX ? 'not-allowed' : 'pointer',
              padding: '4px 12px',
              opacity: fontSize >= BIBLE_FONT_MAX ? 0.35 : 1,
              borderRadius: '8px',
              transition: 'all 0.2s ease',
            }}
          >
            A+
          </button>
        </div>
        <div style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={goToNextChapter}
            disabled={chapter === maxChapter || loading}
            style={{
              background: 'transparent',
              border: 'none',
              color: dayTheme ? '#8B6914' : '#D4A843',
              fontSize: '14px',
              fontWeight: dayTheme ? 600 : 600,
              cursor: chapter === maxChapter || loading ? 'not-allowed' : 'pointer',
              padding: '4px 12px',
              lineHeight: 1.2,
              opacity: chapter === maxChapter || loading ? 0.3 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            Next →
          </button>
        </div>
      </div>

      {/* Immersive mode hint indicator */}
      {showImmersiveHint && immersiveMode && (
        <div
          style={{
            position: 'fixed',
            bottom: 'calc(140px + env(safe-area-inset-bottom, 0px))',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            padding: '8px 16px',
            borderRadius: '999px',
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '12px',
            fontWeight: 500,
            animation: 'fadeIn 0.3s ease-out',
          }}
        >
          Tap to exit
        </div>
      )}

      {/* Book Picker Modal */}
      {showBookPicker && typeof document !== 'undefined' ? createPortal(
        <>
          <div
            onClick={() => setShowBookPicker(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0, 0, 0, 0.5)' }}
            aria-hidden
          />
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 201,
              maxHeight: '85vh',
              background: dayTheme ? 'rgba(245, 240, 225, 0.95)' : 'rgba(6, 15, 38, 0.75)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              borderTop: dayTheme ? '1px solid rgba(212, 168, 67, 0.3)' : '1px solid rgba(255, 255, 255, 0.09)',
              borderRadius: '24px 24px 0 0',
              padding: '24px',
              animation: 'slideUp 0.3s ease-out',
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Book selector"
          >
            <div style={{ maxWidth: '680px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{
                  color: dayTheme ? '#D4A843' : '#F0C040',
                  fontSize: '20px',
                  fontWeight: 600,
                  margin: 0
                }}>
                  {t('bible.selectBook')}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowBookPicker(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '24px',
                    cursor: 'pointer',
                    padding: '8px',
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{
                maxHeight: '50vh',
                overflowY: 'auto',
                paddingBottom: '20px'
              }}>
                {/* Old Testament Section */}
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{
                    color: dayTheme ? '#D4A843' : '#F0C040',
                    fontSize: '14px',
                    fontWeight: 600,
                    margin: '0 0 12px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}>
                    Old Testament
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px',
                  }}>
                    {currentBooks.slice(0, OLD_TESTAMENT_LAST_INDEX + 1)
                      .map((book, idx) => (
                        <button
                          key={book.name}
                          type="button"
                          onClick={() => handleBookSelect(idx)}
                          style={{
                            background: idx === bookIndex
                              ? (dayTheme ? 'rgba(212, 168, 67, 0.2)' : 'rgba(240, 192, 64, 0.15)')
                              : (dayTheme ? 'rgba(212, 168, 67, 0.08)' : 'rgba(255, 255, 255, 0.04)'),
                            border: idx === bookIndex
                              ? (dayTheme ? '1px solid rgba(212, 168, 67, 0.5)' : '1px solid rgba(240, 192, 64, 0.4)')
                              : (dayTheme ? '1px solid rgba(212, 168, 67, 0.2)' : '1px solid rgba(255, 255, 255, 0.1)'),
                            color: idx === bookIndex
                              ? (dayTheme ? '#D4A843' : '#F0C040')
                              : (dayTheme ? 'rgba(10, 20, 50, 0.85)' : 'rgba(255, 255, 255, 0.85)'),
                            fontSize: '14px',
                            fontWeight: idx === bookIndex ? 600 : 500,
                            cursor: 'pointer',
                            padding: '14px 12px',
                            borderRadius: '12px',
                            textAlign: 'left',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {bookDisplayName(book)}
                        </button>
                      ))}
                  </div>
                </div>

                {/* Deuterocanonical Section - shown inline in OT for Catholic/Orthodox since each denomination has its own list */}

                {/* New Testament Section */}
                <div>
                  <h3 style={{
                    color: dayTheme ? '#D4A843' : '#F0C040',
                    fontSize: '14px',
                    fontWeight: 600,
                    margin: '0 0 12px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}>
                    New Testament
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px',
                  }}>
                    {currentBooks.slice(OLD_TESTAMENT_LAST_INDEX + 1)
                      .map((book, idx) => {
                        const actualIndex = OLD_TESTAMENT_LAST_INDEX + 1 + idx
                        return (
                          <button
                            key={book.name}
                            type="button"
                            onClick={() => handleBookSelect(actualIndex)}
                            style={{
                              background: actualIndex === bookIndex
                                ? (dayTheme ? 'rgba(212, 168, 67, 0.2)' : 'rgba(240, 192, 64, 0.15)')
                                : (dayTheme ? 'rgba(212, 168, 67, 0.08)' : 'rgba(255, 255, 255, 0.04)'),
                              border: actualIndex === bookIndex
                                ? (dayTheme ? '1px solid rgba(212, 168, 67, 0.5)' : '1px solid rgba(240, 192, 64, 0.4)')
                                : (dayTheme ? '1px solid rgba(212, 168, 67, 0.2)' : '1px solid rgba(255, 255, 255, 0.1)'),
                              color: actualIndex === bookIndex
                                ? (dayTheme ? '#D4A843' : '#F0C040')
                                : (dayTheme ? 'rgba(10, 20, 50, 0.85)' : 'rgba(255, 255, 255, 0.85)'),
                              fontSize: '14px',
                              fontWeight: actualIndex === bookIndex ? 600 : 500,
                              cursor: 'pointer',
                              padding: '14px 12px',
                              borderRadius: '12px',
                              textAlign: 'left',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {bookDisplayName(book)}
                          </button>
                        )
                      })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body,
      ) : null}

      {/* Translation dropdown — portaled + anchored to WEB pill (see Journal modals pattern) */}
      {showTranslationPicker &&
        showEnglishBibleVersions &&
        translationDropdownRect &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <div
              onClick={() => setShowTranslationPicker(false)}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10019,
                background: 'transparent',
              }}
              aria-hidden
            />
            <div
              className="read-translation-picker"
              style={{
                position: 'fixed',
                top: `max(${translationDropdownRect.top}px, calc(env(safe-area-inset-top, 0px) + 8px))`,
                left: translationDropdownRect.left,
                width: 200,
                boxSizing: 'border-box',
                zIndex: 10020,
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border-hover)',
                borderRadius: '12px',
                padding: '10px 8px 8px',
                maxHeight: 'min(200px, calc(100dvh - env(safe-area-inset-top, 0px) - 16px))',
                overflowY: 'auto',
                overflowX: 'hidden',
                pointerEvents: 'auto',
                boxShadow: 'var(--glass-shadow)',
                color: 'var(--text-primary)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }}
              role="listbox"
              aria-label={t('bible.translation')}
              onClick={(e) => e.stopPropagation()}
            >
              <p
                className="read-translation-picker__title"
                style={{
                  color: 'var(--text-primary)',
                  fontSize: '11px',
                  fontWeight: 700,
                  margin: '0 6px 6px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                {t('bible.translation')}
              </p>
              <p
                className="read-translation-picker__note"
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '10px',
                  margin: '0 6px 8px',
                  lineHeight: 1.35,
                }}
              >
                {HAS_API_BIBLE ? t('bible.apiFollowsAppLanguage') : t('bible.publicDomainNote')}
              </p>
              {!HAS_API_BIBLE ? (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {filteredTranslationOptions.map((opt, index) => {
                    const active = opt.id === activeTranslationId
                    return (
                      <li
                        key={opt.id}
                        style={{
                          margin: 0,
                          padding: 0,
                          borderBottom:
                            index < filteredTranslationOptions.length - 1
                              ? '1px solid var(--glass-border)'
                              : 'none',
                        }}
                      >
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          onClick={() => {
                            setActiveTranslationId(opt.id)
                            setShowTranslationPicker(false)
                          }}
                          style={{
                            background: active ? 'var(--glass-bg-hover)' : 'transparent',
                            border: active ? '1px solid var(--glass-border-hover)' : '1px solid transparent',
                            borderRadius: '8px',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            padding: '10px 10px',
                            textAlign: 'left',
                            width: '100%',
                            display: 'block',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <span
                              className="read-translation-picker__label"
                              style={{
                                fontSize: '14px',
                                fontWeight: 700,
                                color: active ? '#F0C040' : 'var(--text-primary)',
                                display: 'block',
                                flex: 1,
                              }}
                            >
                              {opt.label}
                            </span>
                            <span
                              style={{
                                fontSize: '9px',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: opt.denomination === 'Catholic' 
                                  ? 'rgba(192, 64, 64, 0.2)' 
                                  : opt.denomination === 'Orthodox'
                                    ? 'rgba(64, 128, 192, 0.2)'
                                    : 'rgba(240, 192, 64, 0.15)',
                                color: opt.denomination === 'Catholic'
                                  ? '#E06666'
                                  : opt.denomination === 'Orthodox'
                                    ? '#6699CC'
                                    : '#D4A843',
                                border: `1px solid ${opt.denomination === 'Catholic'
                                  ? 'rgba(192, 64, 64, 0.3)'
                                  : opt.denomination === 'Orthodox'
                                    ? 'rgba(64, 128, 192, 0.3)'
                                    : 'rgba(240, 192, 64, 0.3)'}`,
                              }}
                            >
                              {opt.denomination}
                            </span>
                          </div>
                          <span
                            className="read-translation-picker__sublabel"
                            style={{
                              fontSize: '11px',
                              fontWeight: 500,
                              color: 'var(--text-secondary)',
                              display: 'block',
                              marginTop: '2px',
                              lineHeight: 1.3,
                            }}
                          >
                            {opt.subtitle}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : null}
              <button
                type="button"
                className="read-translation-picker__close"
                onClick={() => setShowTranslationPicker(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  marginTop: '6px',
                  padding: '8px 10px',
                  width: '100%',
                }}
              >
                {t('common.close')}
              </button>
            </div>
          </>,
          document.body,
        )}

      {/* Chapter Picker Modal */}
      {showChapterPicker && typeof document !== 'undefined' ? createPortal(
        <>
          <div
            onClick={() => setShowChapterPicker(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0, 0, 0, 0.5)' }}
            aria-hidden
          />
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 201,
              maxHeight: '85vh',
              background: 'rgba(6, 15, 38, 0.75)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              borderTop: '1px solid rgba(255, 255, 255, 0.09)',
              borderRadius: '24px 24px 0 0',
              padding: '24px',
              animation: 'slideUp 0.3s ease-out',
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Chapter selector"
          >
            <div style={{ maxWidth: '680px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ 
                  color: '#F0C040', 
                  fontSize: '20px', 
                  fontWeight: 600, 
                  margin: 0
                }}>
                  {selectedBook ? bookDisplayName(selectedBook) : ''}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowChapterPicker(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '24px',
                    cursor: 'pointer',
                    padding: '8px',
                  }}
                >
                  ✕
                </button>
              </div>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(6, 1fr)', 
                gap: '12px',
                maxHeight: '50vh',
                overflowY: 'auto',
                paddingBottom: '20px'
              }}>
                {Array.from({ length: maxChapter }, (_, i) => i + 1).map((chapterNum) => (
                  <button
                    key={chapterNum}
                    type="button"
                    onClick={() => handleChapterSelect(chapterNum)}
                    style={{
                      background: chapterNum === chapter ? 'rgba(240, 192, 64, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                      color: chapterNum === chapter ? '#F0C040' : 'rgba(255, 255, 255, 0.85)',
                      borderRadius: '12px',
                      width: '48px',
                      height: '48px',
                      border: chapterNum === chapter ? '1px solid rgba(240, 192, 64, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                      cursor: 'pointer',
                      fontSize: '15px',
                      fontWeight: chapterNum === chapter ? 600 : 500,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {chapterNum}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>,
        document.body,
      ) : null}

      {/* Reading Controls Modal */}
      {showReadingControls && typeof document !== 'undefined' ? createPortal(
        <>
          <div
            onClick={() => setShowReadingControls(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0, 0, 0, 0.5)' }}
            aria-hidden
          />
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 201,
              maxHeight: '85vh',
              background: 'rgba(6, 15, 38, 0.75)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              borderTop: '1px solid rgba(255, 255, 255, 0.09)',
              borderRadius: '24px 24px 0 0',
              padding: '24px',
              animation: 'slideUp 0.3s ease-out',
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Reading controls"
          >
            <div style={{ maxWidth: '680px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ 
                  color: '#F0C040', 
                  fontSize: '20px', 
                  fontWeight: 600, 
                  margin: 0
                }}>
                  Reading Settings
                </h2>
                <button
                  type="button"
                  onClick={() => setShowReadingControls(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '24px',
                    cursor: 'pointer',
                    padding: '8px',
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <p style={{ 
                  color: 'rgba(255, 255, 255, 0.7)', 
                  fontSize: '13px', 
                  fontWeight: 600, 
                  marginBottom: '12px',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase'
                }}>
                  Font Size
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <button
                    type="button"
                    onClick={() => setFontSize(Math.max(BIBLE_FONT_MIN, fontSize - BIBLE_FONT_STEP))}
                    disabled={fontSize <= BIBLE_FONT_MIN}
                    style={{
                      background: 'transparent',
                      border: '1px solid #D4A843',
                      borderRadius: '16px',
                      color: '#D4A843',
                      fontSize: '20px',
                      cursor: fontSize <= BIBLE_FONT_MIN ? 'not-allowed' : 'pointer',
                      padding: '12px 16px',
                      opacity: fontSize <= BIBLE_FONT_MIN ? 0.3 : 1,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    −
                  </button>
                  <div style={{
                    background: 'rgba(240, 192, 64, 0.1)',
                    border: '1px solid rgba(240, 192, 64, 0.3)',
                    borderRadius: '12px',
                    padding: '12px 24px',
                    minWidth: '80px',
                    textAlign: 'center',
                    color: '#F0C040',
                    fontSize: '16px',
                    fontWeight: 600,
                  }}>
                    {fontSize}px
                  </div>
                  <button
                    type="button"
                    onClick={() => setFontSize(Math.min(BIBLE_FONT_MAX, fontSize + BIBLE_FONT_STEP))}
                    disabled={fontSize >= BIBLE_FONT_MAX}
                    style={{
                      background: 'transparent',
                      border: '1px solid #D4A843',
                      borderRadius: '16px',
                      color: '#D4A843',
                      fontSize: '20px',
                      cursor: fontSize >= BIBLE_FONT_MAX ? 'not-allowed' : 'pointer',
                      padding: '12px 16px',
                      opacity: fontSize >= BIBLE_FONT_MAX ? 0.3 : 1,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setFontSize(BIBLE_FONT_MIN)}
                  style={{
                    flex: 1,
                    background: 'rgba(240, 192, 64, 0.1)',
                    border: '1px solid rgba(240, 192, 64, 0.3)',
                    borderRadius: '12px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: '12px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Small
                </button>
                <button
                  type="button"
                  onClick={() => setFontSize(BIBLE_FONT_DEFAULT)}
                  style={{
                    flex: 1,
                    background: 'rgba(240, 192, 64, 0.15)',
                    border: '1px solid rgba(240, 192, 64, 0.4)',
                    borderRadius: '12px',
                    color: '#F0C040',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '12px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Default
                </button>
                <button
                  type="button"
                  onClick={() => setFontSize(BIBLE_FONT_MAX)}
                  style={{
                    flex: 1,
                    background: 'rgba(240, 192, 64, 0.1)',
                    border: '1px solid rgba(240, 192, 64, 0.3)',
                    borderRadius: '12px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: '12px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Large
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body,
      ) : null}

      {showHindiApiBiblePicker ? (
        <BibleTranslationSelector
          isOpen={showHindiBiblePicker}
          onClose={() => setShowHindiBiblePicker(false)}
          currentBibleId={hindiSavedBibleId || cachedHindiCatalogId || ''}
          bibles={hindiBiblePickerList}
          onSelect={(id) => {
            setHindiSavedBibleId(id)
          }}
        />
      ) : null}
    </div>
  )
}
