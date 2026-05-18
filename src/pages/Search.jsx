import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import BibleReader from '../components/BibleReader'
import { saveToJournal } from '../utils/journal'
import SaveToast from '../components/SaveToast'
import FirstJournalEntryCelebration from '../components/FirstJournalEntryCelebration'
import ShareVerse from '../components/ShareVerse'
import { TOPIC_VERSES } from '../utils/topicVerses'
import BookOverviewCard from '../components/BookOverviewCard'
import { bibleBooks } from '../data/bibleBooks'
import { searchBrowseBooks } from '../data/searchBrowseBooks'
import { useAuth } from '../context/AuthContext'
import { userStorageKey } from '../utils/userStorage'
import { BIBLE_LANG_MAP } from '../utils/bibleTranslation'

const quickSuggestionsRow1 = ['faith', 'love', 'peace', 'strength', 'hope']
const quickSuggestionsRow2 = ['fear', 'greed', 'healing', 'forgiveness', 'anger']
const topics = [
  'Faith', 'Hope', 'Love', 'Peace',
  'Strength', 'Forgiveness', 'Prayer', 'Courage',
  'Anxiety', 'Salvation', 'Grace', 'Wisdom',
  'Joy', 'Healing', 'Protection', 'Gratitude',
  'Humility', 'Trust'
]
const FULL_BIBLE_PAGE_SIZE = 20

const BOOK_NAMES = {
  1: 'Genesis',
  2: 'Exodus',
  3: 'Leviticus',
  4: 'Numbers',
  5: 'Deuteronomy',
  6: 'Joshua',
  7: 'Judges',
  8: 'Ruth',
  9: '1 Samuel',
  10: '2 Samuel',
  11: '1 Kings',
  12: '2 Kings',
  13: '1 Chronicles',
  14: '2 Chronicles',
  15: 'Ezra',
  16: 'Nehemiah',
  17: 'Esther',
  18: 'Job',
  19: 'Psalms',
  20: 'Proverbs',
  21: 'Ecclesiastes',
  22: 'Song of Solomon',
  23: 'Isaiah',
  24: 'Jeremiah',
  25: 'Lamentations',
  26: 'Ezekiel',
  27: 'Daniel',
  28: 'Hosea',
  29: 'Joel',
  30: 'Amos',
  31: 'Obadiah',
  32: 'Jonah',
  33: 'Micah',
  34: 'Nahum',
  35: 'Habakkuk',
  36: 'Zephaniah',
  37: 'Haggai',
  38: 'Zechariah',
  39: 'Malachi',
  40: 'Matthew',
  41: 'Mark',
  42: 'Luke',
  43: 'John',
  44: 'Acts',
  45: 'Romans',
  46: '1 Corinthians',
  47: '2 Corinthians',
  48: 'Galatians',
  49: 'Ephesians',
  50: 'Philippians',
  51: 'Colossians',
  52: '1 Thessalonians',
  53: '2 Thessalonians',
  54: '1 Timothy',
  55: '2 Timothy',
  56: 'Titus',
  57: 'Philemon',
  58: 'Hebrews',
  59: 'James',
  60: '1 Peter',
  61: '2 Peter',
  62: '1 John',
  63: '2 John',
  64: '3 John',
  65: 'Jude',
  66: 'Revelation',
}

function isVerseReferenceQuery(query) {
  return /^[1-3]?\s?[A-Za-z][A-Za-z\s]+?\s\d+:\d+(-\d+)?$/i.test(query.trim())
}

const keywordVerses = {
  faith: [
    { ref: 'Hebrews 11:1', text: 'Now faith is assurance of things hoped for, proof of things not seen.' },
    { ref: 'Romans 10:17', text: 'So faith comes by hearing, and hearing by the word of God.' },
    { ref: 'James 2:17', text: 'Even so faith, if it has no works, is dead in itself.' },
    { ref: 'Mark 11:24', text: 'Whatever things you ask in prayer, believe that you receive them, and you shall have them.' },
    { ref: '2 Corinthians 5:7', text: 'For we walk by faith, not by sight.' },
    { ref: 'Ephesians 2:8', text: 'For by grace you have been saved through faith. It is the gift of God.' },
    { ref: 'Galatians 2:20', text: 'I have been crucified with Christ, and it is no longer I who live, but Christ lives in me.' },
    { ref: 'Romans 1:17', text: 'The righteous shall live by faith.' },
    { ref: 'Luke 17:5', text: 'The apostles said to the Lord, Increase our faith.' },
    { ref: '1 Peter 1:8', text: 'Though now you do not see him, yet believing, you rejoice with joy that is full of glory.' },
  ],
  love: [
    { ref: 'John 3:16', text: 'For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.' },
    { ref: '1 Corinthians 13:4', text: 'Love is patient and is kind. Love does not envy. Love does not brag, is not proud.' },
    { ref: '1 Corinthians 13:7', text: 'Love bears all things, believes all things, hopes all things, and endures all things.' },
    { ref: '1 Corinthians 13:8', text: 'Love never fails.' },
    { ref: '1 John 4:8', text: 'He who does not love does not know God, for God is love.' },
    { ref: '1 John 4:19', text: 'We love him, because he first loved us.' },
    { ref: 'Romans 8:38', text: 'Neither death, nor life, nor angels, nor principalities can separate us from the love of God.' },
    { ref: 'John 15:12', text: 'This is my commandment, that you love one another, even as I have loved you.' },
    { ref: 'Colossians 3:14', text: 'Above all these things, walk in love, which is the bond of perfection.' },
    { ref: 'Romans 12:10', text: 'In love of the brothers be tenderly affectionate to one another.' },
  ],
  peace: [
    { ref: 'Philippians 4:7', text: 'The peace of God, which surpasses all understanding, will guard your hearts and your thoughts in Christ Jesus.' },
    { ref: 'John 14:27', text: 'Peace I leave with you. My peace I give to you. I do not give to you as the world gives.' },
    { ref: 'Isaiah 26:3', text: 'You will keep whoever is steadfast in perfect peace, because they trust in you.' },
    { ref: 'Colossians 3:15', text: 'Let the peace of God rule in your hearts.' },
    { ref: 'Romans 15:13', text: 'Now may the God of hope fill you with all joy and peace in believing.' },
    { ref: 'Psalm 29:11', text: 'The Lord will bless his people with peace.' },
    { ref: '2 Thessalonians 3:16', text: 'Now may the Lord of peace himself give you peace at all times in all ways.' },
    { ref: 'Romans 12:18', text: 'As much as it is up to you, be at peace with all men.' },
    { ref: 'Matthew 5:9', text: 'Blessed are the peacemakers, for they shall be called children of God.' },
    { ref: 'Psalm 4:8', text: 'In peace I will both lay myself down and sleep.' },
  ],
  strength: [
    { ref: 'Philippians 4:13', text: 'I can do all things through Christ, who strengthens me.' },
    { ref: 'Isaiah 40:31', text: 'Those who wait for the Lord will renew their strength.' },
    { ref: 'Psalm 46:1', text: 'God is our refuge and strength, a very present help in trouble.' },
    { ref: 'Nehemiah 8:10', text: 'The joy of the Lord is your strength.' },
    { ref: 'Ephesians 6:10', text: 'Be strong in the Lord, and in the strength of his might.' },
    { ref: 'Psalm 28:7', text: 'The Lord is my strength and my shield.' },
    { ref: 'Isaiah 41:10', text: 'Do not be afraid. I will strengthen you. I will help you.' },
    { ref: '2 Corinthians 12:9', text: 'My grace is sufficient for you, for my power is made perfect in weakness.' },
    { ref: 'Psalm 73:26', text: 'God is the strength of my heart and my portion forever.' },
    { ref: 'Exodus 15:2', text: 'The Lord is my strength and song, and he has become my salvation.' },
  ],
  hope: [
    { ref: 'Jeremiah 29:11', text: 'For I know the thoughts that I think toward you, says the Lord, to give you hope and a future.' },
    { ref: 'Romans 15:13', text: 'Now may the God of hope fill you with all joy and peace in believing.' },
    { ref: 'Hebrews 6:19', text: 'This hope we have as an anchor of the soul, sure and steadfast.' },
    { ref: 'Psalm 42:11', text: 'Why are you in despair, my soul? Hope in God.' },
    { ref: 'Lamentations 3:24', text: 'The Lord is my portion. Therefore I will hope in him.' },
    { ref: 'Romans 5:5', text: 'Hope does not disappoint us.' },
    { ref: 'Psalm 62:5', text: 'My soul, wait in silence for God alone, for my expectation is from him.' },
    { ref: '1 Peter 1:3', text: 'He caused us to be born again to a living hope.' },
    { ref: 'Isaiah 40:31', text: 'Those who wait for the Lord will renew their strength.' },
    { ref: 'Psalm 39:7', text: 'Now, Lord, what do I wait for? My hope is in you.' },
  ],
  fear: [
    { ref: 'Isaiah 41:10', text: 'Do not be afraid, for I am with you. Do not be dismayed, for I am your God.' },
    { ref: '2 Timothy 1:7', text: 'God did not give us a spirit of fear, but of power, love, and self-control.' },
    { ref: 'Psalm 23:4', text: 'Even though I walk through the valley of the shadow of death, I will fear no evil.' },
    { ref: 'Psalm 27:1', text: 'The Lord is my light and my salvation. Whom shall I fear?' },
    { ref: 'Joshua 1:9', text: 'Be strong and courageous. Do not be afraid.' },
    { ref: 'Isaiah 43:1', text: 'Do not be afraid, for I have redeemed you.' },
    { ref: 'Psalm 34:4', text: 'I sought the Lord, and he delivered me from all my fears.' },
    { ref: '1 John 4:18', text: 'Perfect love casts out fear.' },
    { ref: 'Deuteronomy 31:6', text: 'Be strong and courageous. He will not fail you nor forsake you.' },
    { ref: 'Psalm 56:3', text: 'When I am afraid, I will put my trust in you.' },
  ],
  greed: [
    { ref: '1 Timothy 6:10', text: 'The love of money is a root of all kinds of evil.' },
    { ref: 'Luke 12:15', text: 'Beware of covetousness, for a life does not consist in abundance of possessions.' },
    { ref: 'Proverbs 28:25', text: 'A greedy man stirs up strife, but one who trusts in the Lord will prosper.' },
    { ref: 'Hebrews 13:5', text: 'Be free from the love of money, content with such things as you have.' },
    { ref: 'Ecclesiastes 5:10', text: 'He who loves silver shall not be satisfied with silver.' },
    { ref: 'Colossians 3:5', text: 'Put to death covetousness, which is idolatry.' },
    { ref: 'Proverbs 15:27', text: 'He who is greedy for gain troubles his own house.' },
    { ref: 'Luke 16:13', text: 'You cannot serve both God and Mammon.' },
    { ref: 'Mark 8:36', text: 'What does it profit a man, to gain the whole world, and forfeit his life?' },
    { ref: 'Proverbs 11:24', text: 'One gives freely and gains even more; another withholds and gains poverty.' },
  ],
  healing: [
    { ref: 'Jeremiah 17:14', text: 'Heal me, O Lord, and I will be healed. Save me, and I will be saved.' },
    { ref: 'James 5:15', text: 'The prayer of faith will heal the one who is sick, and the Lord will raise him up.' },
    { ref: 'Isaiah 53:5', text: 'By his wounds we are healed.' },
    { ref: 'Psalm 103:2-3', text: 'Bless the Lord, who forgives all your sins, who heals all your diseases.' },
    { ref: 'Exodus 15:26', text: 'I am the Lord who heals you.' },
    { ref: 'Psalm 147:3', text: 'He heals the broken in heart, and binds up their wounds.' },
    { ref: '3 John 1:2', text: 'Beloved, I pray that you may prosper in all things and be healthy.' },
    { ref: 'Matthew 8:17', text: 'He took our infirmities and bore our diseases.' },
    { ref: 'Mark 5:34', text: 'Daughter, your faith has made you well. Go in peace.' },
    { ref: 'Psalm 30:2', text: 'Lord my God, I cried to you, and you have healed me.' },
  ],
  forgiveness: [
    { ref: 'Colossians 3:13', text: 'Forgiving each other, even as Christ forgave you.' },
    { ref: 'Matthew 6:14', text: 'If you forgive men their trespasses, your heavenly Father will also forgive you.' },
    { ref: 'Ephesians 4:32', text: 'Be kind and forgiving each other, just as God in Christ forgave you.' },
    { ref: '1 John 1:9', text: 'If we confess our sins, he is faithful and righteous to forgive us.' },
    { ref: 'Psalm 103:12', text: 'As far as the east is from the west, so far has he removed our transgressions.' },
    { ref: 'Micah 7:18', text: 'Who is a God like you, who pardons iniquity and passes over disobedience?' },
    { ref: 'Luke 6:37', text: 'Forgive, and you will be forgiven.' },
    { ref: 'Mark 11:25', text: 'When you stand praying, forgive, if you have anything against anyone.' },
    { ref: 'Isaiah 1:18', text: 'Though your sins are as scarlet, they shall be as white as snow.' },
    { ref: 'Psalm 86:5', text: 'For you, Lord, are good, and ready to forgive.' },
  ],
  anger: [
    { ref: 'Ephesians 4:26', text: 'Be angry, and do not sin. Do not let the sun go down on your wrath.' },
    { ref: 'Proverbs 15:1', text: 'A gentle answer turns away wrath, but a harsh word stirs up anger.' },
    { ref: 'James 1:19', text: 'Let every man be swift to hear, slow to speak, and slow to anger.' },
    { ref: 'Proverbs 16:32', text: 'One who is slow to anger is better than the mighty.' },
    { ref: 'Ecclesiastes 7:9', text: 'Do not be hasty in your spirit to be angry.' },
    { ref: 'Psalm 37:8', text: 'Cease from anger and forsake wrath.' },
    { ref: 'Colossians 3:8', text: 'Put away anger, wrath, malice, slander, and shameful speaking.' },
    { ref: 'Proverbs 14:29', text: 'He who is slow to anger has great understanding.' },
    { ref: 'Romans 12:19', text: 'Do not seek revenge yourselves. Leave room for Gods wrath.' },
    { ref: 'Proverbs 29:11', text: 'A fool vents all his anger, but a wise man keeps himself under control.' },
  ],
}

function mapBibleApiToResults(data) {
  if (Array.isArray(data?.verses) && data.verses.length > 0) {
    return (data.verses || []).map((verse) => ({
      id: `${verse.book_name}-${verse.chapter}-${verse.verse}`,
      reference: `${verse.book_name} ${verse.chapter}:${verse.verse}`,
      text: verse.text?.trim() ?? '',
    }))
  }

  if (data?.reference && data?.text) {
    return [{ id: data.reference, reference: data.reference, text: data.text.trim() }]
  }

  return []
}

async function fetchKeywordSearch(query, uiLang = 'en', t) {
  const encoded = encodeURIComponent(query.trim())
  const translation = BIBLE_LANG_MAP[uiLang] || 'WEB'
  const url = `https://bolls.life/v2/find/${translation}?search=${encoded}&match_case=false&match_whole=false&limit=20&page=1`
  const res = await fetch(url)
  if (!res.ok) throw new Error(t('search.unableToSearch'))
  const data = await res.json()

  // API returns { exact_matches, total, results: [...] }
  const verses = data.results || data
  if (!Array.isArray(verses) || verses.length === 0) {
    throw new Error(t('search.noVersesFoundSearch'))
  }

  return verses.slice(0, 20).map((v) => ({
    reference: `${t(`bible.books.${bibleBooks[Math.max(0, Number(v.book) - 1)]?.apiName}`, { defaultValue: BOOK_NAMES[v.book] || String(v.book) })} ${v.chapter}:${v.verse}`,
    text: (v.text || '').replace(/[ⓐ-ⓩ]/gu, '').replace(/<[^>]*>/g, '').replace(/\s{2,}/g, ' ').trim(),
  }))
}

function Search({ onOpenWorship }) {
  const { user } = useAuth()
  const { t, i18n } = useTranslation()
  const uiLang = (i18n.resolvedLanguage || i18n.language || 'en').toLowerCase().split(/[-_]/)[0]
  const [searchMode, setSearchMode] = useState('keyword')
  const [searchTerm, setSearchTerm] = useState('')
  const [aiQuestion, setAiQuestion] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [selectedTopic, setSelectedTopic] = useState('')
  const [testament, setTestament] = useState('new')
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [keywordHint, setKeywordHint] = useState('')
  const [selectedBook, setSelectedBook] = useState(null)
  const [selectedChapter, setSelectedChapter] = useState(1)
  const [showFullBibleResults, setShowFullBibleResults] = useState(false)
  const [fullBibleResults, setFullBibleResults] = useState([])
  const [isFullBibleLoading, setIsFullBibleLoading] = useState(false)
  const [fullBibleError, setFullBibleError] = useState('')
  const [fullBiblePage, setFullBiblePage] = useState(1)
  const [toastTrigger, setToastTrigger] = useState(0)
  const [showFirstJournalCelebration, setShowFirstJournalCelebration] = useState(false)
  const [shareVerse, setShareVerse] = useState(null)
  const [overviewBook, setOverviewBook] = useState(null)

  const visibleBooks = testament === 'new' ? searchBrowseBooks.new : searchBrowseBooks.old
  const trimmedSearch = searchTerm.trim()
  const isVerseReference = isVerseReferenceQuery(trimmedSearch)
  const keyword = trimmedSearch.toLowerCase()
  const curatedResults = keywordVerses[keyword] ?? []

  useEffect(() => {
    if (searchMode === 'topic') return
    if (!trimmedSearch) {
      setResults([])
      setKeywordHint('')
      setShowFullBibleResults(false)
      setFullBibleResults([])
      setFullBibleError('')
      setFullBiblePage(1)
      setIsLoading(false)
      return
    }

    if (!isVerseReference) {
      setResults([])
      setKeywordHint(curatedResults.length > 0 ? '' : t('search.noCuratedTopic'))
      setShowFullBibleResults(false)
      setFullBibleResults([])
      setFullBibleError('')
      setFullBiblePage(1)
      return
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(async () => {
      setIsLoading(true)
      setKeywordHint('')
      try {
        const response = await fetch(`https://bible-api.com/${encodeURIComponent(trimmedSearch)}?translation=web`, { signal: controller.signal })
        const data = await response.json()
        if (!response.ok || data.error) {
          setResults([])
          setKeywordHint(t('search.noVersesFound'))
          return
        }
        setResults(mapBibleApiToResults(data))
      } catch {
        if (!controller.signal.aborted) {
          setResults([])
          setKeywordHint(t('search.unableToSearch'))
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }, 450)

    return () => {
      controller.abort()
      clearTimeout(timeoutId)
    }
  }, [trimmedSearch, isVerseReference, curatedResults.length, searchMode, t])

  const handleSaveToJournal = async (result) => {
    const saved = await saveToJournal({
      verse: result.text,
      reference: result.reference,
      tags: ['Search Result'],
    })
    if (saved?.isFirstJournalEntry) setShowFirstJournalCelebration(true)
    setToastTrigger((t) => t + 1)
  }

  const handleSearchFullBible = async () => {
    if (!trimmedSearch || isVerseReference) return
    setShowFullBibleResults(true)
    setIsFullBibleLoading(true)
    setFullBibleError('')
    setFullBiblePage(1)
    try {
      const parsedResults = await fetchKeywordSearch(trimmedSearch, uiLang, t)
      setFullBibleResults(parsedResults)
    } catch (error) {
      setFullBibleResults([])
      setFullBibleError(error instanceof Error ? error.message : t('search.unableToSearch'))
    } finally {
      setIsFullBibleLoading(false)
    }
  }

  const totalFullBiblePages = Math.max(1, Math.ceil(fullBibleResults.length / FULL_BIBLE_PAGE_SIZE))
  const startIndex = (fullBiblePage - 1) * FULL_BIBLE_PAGE_SIZE
  const pagedFullBibleResults = fullBibleResults.slice(startIndex, startIndex + FULL_BIBLE_PAGE_SIZE)

  const handleBookTap = (book) => {
    const seen = JSON.parse(localStorage.getItem(userStorageKey(user?.id, 'book-overviews-seen')) || '[]')
    const info = bibleBooks.find((b) => b.name === book.name)
    if (seen.includes(book.name) || !info) {
      setSelectedBook(book)
      setSelectedChapter(1)
      return
    }
    setOverviewBook({ ...book, info })
  }

  const markOverviewSeen = (bookName) => {
    const sk = userStorageKey(user?.id, 'book-overviews-seen')
    const seen = JSON.parse(localStorage.getItem(sk) || '[]')
    if (!seen.includes(bookName)) {
      localStorage.setItem(sk, JSON.stringify([...seen, bookName]))
    }
  }

  const pillActive = {
    background: 'linear-gradient(135deg, #D4A843 0%, #F0C040 100%)',
    border: 'none',
    color: '#1A1200',
    fontWeight: 700,
    cursor: 'pointer',
  }
  const pillInactive = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: 'rgba(255,255,255,0.7)',
    fontWeight: 500,
    cursor: 'pointer',
  }
  const pillBase = {
    borderRadius: '50px',
    height: '40px',
    padding: '0 20px',
    fontSize: '14px',
    transition: 'all 0.2s ease',
  }

  const resultCardStyle = {
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(212,168,67,0.2)',
    borderRadius: '16px',
    padding: '16px',
    animation: 'searchFadeIn 0.3s ease both',
  }

  const highlightKeyword = (text, kw) => {
    if (!kw || kw.length < 2) return text
    const regex = new RegExp(`(${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, i) =>
      regex.test(part)
        ? <mark key={i} style={{ background: 'rgba(251,191,36,0.25)', color: '#F0C040', borderRadius: '3px', padding: '0 2px' }}>{part}</mark>
        : part
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <style>{`
        @keyframes searchFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .search-book-card-dark:hover {
          transform: translateY(-2px);
          border-color: rgba(212,168,67,0.45) !important;
          background: rgba(212,168,67,0.08) !important;
        }
        .search-input-dark:focus-within {
          border-color: rgba(251,191,36,0.5) !important;
          box-shadow: 0 0 12px rgba(251,191,36,0.2) !important;
        }
      `}</style>
      <div
        className="content-scroll search-page"
        style={{ padding: '16px 16px 0', maxWidth: '680px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}
      >
        {selectedBook ? (
          <BibleReader
            open
            onClose={() => {
              setSelectedBook(null)
              setSelectedChapter(1)
            }}
            bookDisplayName={selectedBook.name}
            apiBookName={selectedBook.apiName}
            chapterNumber={selectedChapter}
            onChapterChange={setSelectedChapter}
            totalChapters={selectedBook.chapters}
            journalTags={['Search Result']}
            showChapterPicker
            onOpenWorship={onOpenWorship}
          />
        ) : (
          <div className="flex flex-col" style={{ gap: '20px' }}>

            {/* ── Header ── */}
            <header style={{ position: 'relative', marginBottom: '4px' }}>
              <div style={{
                position: 'absolute', top: '-20px', left: '50%', transform: 'translateX(-50%)',
                width: '260px', height: '100px',
                background: 'radial-gradient(ellipse at center, rgba(212,168,67,0.12) 0%, transparent 70%)',
                pointerEvents: 'none',
              }} />
              <h1 style={{
                color: '#ffffff',
                fontSize: '32px',
                fontWeight: 800,
                margin: '0 0 6px 0',
                letterSpacing: '-0.5px',
              }}>
                {t('search.title')}
              </h1>
              <p style={{
                color: 'rgba(251,191,36,0.7)',
                fontSize: '14px',
                fontStyle: 'italic',
                margin: 0,
              }}>
                {t('search.subtitle')}
              </p>
            </header>

            {/* ── Mode Tabs ── */}
            <div style={{ display: 'inline-flex', gap: '8px' }}>
              <button type="button" onClick={() => setSearchMode('keyword')}
                style={{ ...pillBase, ...(searchMode === 'keyword' ? pillActive : pillInactive) }}>
                {t('search.byKeyword')}
              </button>
              <button type="button" onClick={() => setSearchMode('topic')}
                style={{ ...pillBase, ...(searchMode === 'topic' ? pillActive : pillInactive) }}>
                {t('search.byTopic')}
              </button>
            </div>

            {/* ── Search Input (keyword mode only) ── */}
            {searchMode === 'keyword' && (
              <label htmlFor="scripture-search" className="search-input-dark" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                borderRadius: '16px',
                padding: '14px 18px',
                border: '1.5px solid rgba(212,168,67,0.3)',
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              }}>
                <span style={{ fontSize: 18, color: 'rgba(212,168,67,0.7)', lineHeight: 1, flexShrink: 0 }}>🔍</span>
                <input
                  id="scripture-search"
                  className="search-scripture-input"
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder={t('search.placeholder')}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    color: '#ffffff',
                    fontSize: 15,
                    outline: 'none',
                    border: 'none',
                  }}
                />
                {searchTerm && (
                  <button type="button" onClick={() => setSearchTerm('')} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgba(255,255,255,0.4)', fontSize: '16px', flexShrink: 0, lineHeight: 1, padding: 0,
                  }}>✕</button>
                )}
              </label>
            )}

            {/* ── Keyword suggestion pills / Topic grid ── */}
            <div className="home-gold-glass" style={{ borderRadius: '16px', padding: '16px', background: undefined }}>
              {searchMode === 'keyword' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
                    {quickSuggestionsRow1.map((s) => (
                      <button key={s} type="button" onClick={() => setSearchTerm(s)} style={{
                        background: searchTerm === s ? 'linear-gradient(135deg,#D4A843,#F0C040)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${searchTerm === s ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: '50px',
                        color: searchTerm === s ? '#1A1200' : 'rgba(255,255,255,0.7)',
                        fontWeight: 600,
                        padding: '7px 16px',
                        fontSize: '13px',
                        flexShrink: 0,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}>
                        {t(`search.topics.${s}`)}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
                    {quickSuggestionsRow2.map((s) => (
                      <button key={s} type="button" onClick={() => setSearchTerm(s)} style={{
                        background: searchTerm === s ? 'linear-gradient(135deg,#D4A843,#F0C040)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${searchTerm === s ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: '50px',
                        color: searchTerm === s ? '#1A1200' : 'rgba(255,255,255,0.7)',
                        fontWeight: 600,
                        padding: '7px 16px',
                        fontSize: '13px',
                        flexShrink: 0,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}>
                        {t(`search.topics.${s}`)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {topics.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => setSelectedTopic(topic)}
                      style={{
                        borderRadius: '50px',
                        padding: '8px 12px',
                        fontSize: '13px',
                        fontWeight: selectedTopic === topic ? 700 : 500,
                        background: selectedTopic === topic
                          ? 'linear-gradient(135deg,#D4A843,#F0C040)'
                          : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${selectedTopic === topic ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
                        color: selectedTopic === topic ? '#1A1200' : 'rgba(255,255,255,0.7)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: selectedTopic === topic ? '0 0 10px rgba(212,168,67,0.3)' : 'none',
                      }}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── TOPIC MODE RESULTS ── */}
            {searchMode === 'topic' ? (
              <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ color: 'rgba(212,168,67,0.8)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>
                  {t('search.results')}
                </p>
                {selectedTopic ? (
                  <>
                    <p style={{ color: 'rgba(212,168,67,0.7)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>
                      {t('search.curatedVerses', { keyword: selectedTopic })}
                    </p>
                    {(TOPIC_VERSES[selectedTopic.toLowerCase()] || []).map((result) => (
                      <article key={result.ref} style={resultCardStyle}>
                        <p style={{ color: '#D4A843', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 8px 0' }}>{result.ref}</p>
                        <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '15px', fontFamily: "'Lora', serif", fontStyle: 'italic', lineHeight: 1.7, margin: '0 0 12px 0' }}>{result.text}</p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button type="button" onClick={() => handleSaveToJournal({ reference: result.ref, text: result.text })} style={{
                            borderRadius: '8px', border: '1px solid rgba(212,168,67,0.4)', padding: '6px 14px',
                            fontSize: '12px', fontWeight: 600, color: '#D4A843', background: 'transparent', cursor: 'pointer',
                          }}>
                            {t('search.saveToJournal')}
                          </button>
                          <button type="button" onClick={() => setShareVerse({ text: result.text, reference: result.ref })} style={{
                            borderRadius: '8px', border: '1px solid rgba(212,168,67,0.4)', padding: '6px 14px',
                            fontSize: '12px', fontWeight: 600, color: '#D4A843', background: 'transparent', cursor: 'pointer',
                          }}>
                            {t('search.shareAsImage')}
                          </button>
                        </div>
                      </article>
                    ))}
                  </>
                ) : (
                  <div style={{ ...resultCardStyle, textAlign: 'center', padding: '32px 16px' }}>
                    <p style={{ fontSize: '36px', marginBottom: '12px' }}>✦</p>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '15px', margin: '0 0 4px 0' }}>{t('search.pickTopic')}</p>
                    <p style={{ color: 'rgba(212,168,67,0.6)', fontSize: '13px', margin: 0 }}>Select a topic above to explore verses</p>
                  </div>
                )}
              </section>

            ) : trimmedSearch ? (
              /* ── KEYWORD SEARCH RESULTS ── */
              <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ color: 'rgba(212,168,67,0.8)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>
                  {t('search.resultsFor', { query: trimmedSearch })}
                </p>

                {isLoading && (
                  <div style={{ ...resultCardStyle, color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>{t('search.searching')}</div>
                )}
                {!isLoading && keywordHint && (
                  <div style={{ ...resultCardStyle, color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>{keywordHint}</div>
                )}

                {isVerseReference && results.length > 0 && results.map((result) => (
                  <article key={result.id} style={resultCardStyle}>
                    <p style={{ color: '#D4A843', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 8px 0' }}>{result.reference}</p>
                    <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '15px', fontFamily: "'Lora', serif", fontStyle: 'italic', lineHeight: 1.7, margin: '0 0 12px 0' }}>
                      {highlightKeyword(result.text, trimmedSearch)}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button type="button" onClick={() => handleSaveToJournal(result)} style={{
                        borderRadius: '8px', border: '1px solid rgba(212,168,67,0.4)', padding: '6px 14px',
                        fontSize: '12px', fontWeight: 600, color: '#D4A843', background: 'transparent', cursor: 'pointer',
                      }}>{t('search.saveToJournal')}</button>
                      <button type="button" onClick={() => setShareVerse({ text: result.text, reference: result.reference })} style={{
                        borderRadius: '8px', border: '1px solid rgba(212,168,67,0.4)', padding: '6px 14px',
                        fontSize: '12px', fontWeight: 600, color: '#D4A843', background: 'transparent', cursor: 'pointer',
                      }}>{t('search.shareAsImage')}</button>
                    </div>
                  </article>
                ))}

                {!isVerseReference && (
                  <>
                    {curatedResults.length > 0 && (
                      <>
                        <p style={{ color: 'rgba(212,168,67,0.7)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>
                          {t('search.curatedVerses', { keyword })}
                        </p>
                        {curatedResults.map((result) => (
                          <article key={result.ref} style={resultCardStyle}>
                            <p style={{ color: '#D4A843', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 8px 0' }}>{result.ref}</p>
                            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '15px', fontFamily: "'Lora', serif", fontStyle: 'italic', lineHeight: 1.7, margin: '0 0 12px 0' }}>
                              {highlightKeyword(result.text, keyword)}
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                              <button type="button" onClick={() => handleSaveToJournal({ reference: result.ref, text: result.text })} style={{
                                borderRadius: '8px', border: '1px solid rgba(212,168,67,0.4)', padding: '6px 14px',
                                fontSize: '12px', fontWeight: 600, color: '#D4A843', background: 'transparent', cursor: 'pointer',
                              }}>{t('search.saveToJournal')}</button>
                              <button type="button" onClick={() => setShareVerse({ text: result.text, reference: result.ref })} style={{
                                borderRadius: '8px', border: '1px solid rgba(212,168,67,0.4)', padding: '6px 14px',
                                fontSize: '12px', fontWeight: 600, color: '#D4A843', background: 'transparent', cursor: 'pointer',
                              }}>{t('search.shareAsImage')}</button>
                            </div>
                          </article>
                        ))}
                      </>
                    )}

                    <button type="button" onClick={handleSearchFullBible} style={{
                      width: '100%', borderRadius: '12px', padding: '13px',
                      background: 'linear-gradient(135deg,#D4A843,#F0C040)',
                      border: 'none', color: '#1A1200', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                    }}>
                      {t('search.searchFullBible')}
                    </button>
                  </>
                )}

                {!isVerseReference && showFullBibleResults && (
                  <>
                    <p style={{ color: 'rgba(212,168,67,0.7)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>
                      {t('search.moreFromFullBible')}
                    </p>
                    {isFullBibleLoading ? (
                      <div style={{ ...resultCardStyle, color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>{t('search.searchingFullBible')}</div>
                    ) : fullBibleResults.length > 0 ? (
                      pagedFullBibleResults.map((result, index) => (
                        <article key={`${result.reference}-${index}`} style={resultCardStyle}>
                          <p style={{ color: '#D4A843', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 8px 0' }}>{result.reference}</p>
                          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '15px', fontFamily: "'Lora', serif", fontStyle: 'italic', lineHeight: 1.7, margin: '0 0 12px 0' }}>
                            {highlightKeyword(result.text, keyword)}
                          </p>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button type="button" onClick={() => handleSaveToJournal(result)} style={{
                              borderRadius: '8px', border: '1px solid rgba(212,168,67,0.4)', padding: '6px 14px',
                              fontSize: '12px', fontWeight: 600, color: '#D4A843', background: 'transparent', cursor: 'pointer',
                            }}>{t('search.saveToJournal')}</button>
                            <button type="button" onClick={() => setShareVerse({ text: result.text, reference: result.reference })} style={{
                              borderRadius: '8px', border: '1px solid rgba(212,168,67,0.4)', padding: '6px 14px',
                              fontSize: '12px', fontWeight: 600, color: '#D4A843', background: 'transparent', cursor: 'pointer',
                            }}>{t('search.shareAsImage')}</button>
                          </div>
                        </article>
                      ))
                    ) : (
                      <div style={{ ...resultCardStyle, textAlign: 'center', padding: '32px 16px' }}>
                        <p style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</p>
                        <p style={{ color: '#ffffff', fontSize: '16px', fontWeight: 600, margin: '0 0 6px 0' }}>No verses found</p>
                        <p style={{ color: 'rgba(212,168,67,0.6)', fontSize: '13px', margin: 0 }}>
                          {fullBibleError || t('search.noVersesFoundSearch')}
                        </p>
                      </div>
                    )}
                    {fullBibleResults.length > FULL_BIBLE_PAGE_SIZE && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                        <button type="button" onClick={() => setFullBiblePage((prev) => Math.max(1, prev - 1))} disabled={fullBiblePage === 1} style={{
                          borderRadius: '8px', border: '1px solid rgba(212,168,67,0.4)', padding: '7px 16px',
                          fontSize: '12px', fontWeight: 600, color: '#D4A843', background: 'transparent', cursor: 'pointer', opacity: fullBiblePage === 1 ? 0.4 : 1,
                        }}>{t('common.back')}</button>
                        <p style={{ color: 'rgba(212,168,67,0.7)', fontSize: '12px', fontWeight: 700, margin: 0 }}>
                          {fullBiblePage}/{totalFullBiblePages}
                        </p>
                        <button type="button" onClick={() => setFullBiblePage((prev) => Math.min(totalFullBiblePages, prev + 1))} disabled={fullBiblePage === totalFullBiblePages} style={{
                          borderRadius: '8px', border: '1px solid rgba(212,168,67,0.4)', padding: '7px 16px',
                          fontSize: '12px', fontWeight: 600, color: '#D4A843', background: 'transparent', cursor: 'pointer', opacity: fullBiblePage === totalFullBiblePages ? 0.4 : 1,
                        }}>{t('common.next')}</button>
                      </div>
                    )}
                  </>
                )}

                {isVerseReference && results.length === 0 && !keywordHint && !isLoading && (
                  <div style={{ ...resultCardStyle, textAlign: 'center', padding: '32px 16px' }}>
                    <p style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</p>
                    <p style={{ color: '#ffffff', fontSize: '16px', fontWeight: 600, margin: '0 0 6px 0' }}>No verses found</p>
                    <p style={{ color: 'rgba(212,168,67,0.6)', fontSize: '13px', margin: 0 }}>{t('search.noVersesFoundSearch')}</p>
                  </div>
                )}
              </section>

            ) : (
              /* ── DEFAULT STATE (no search active) ── */
              <>
                {/* Ask AI card */}
                <section>
                  <div className="home-gold-glass" style={{ borderRadius: '16px', padding: '20px' }}>
                    <p style={{ color: '#D4A843', fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 6px 0' }}>
                      ✦ {t('search.askAI')}
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '14px', margin: '0 0 16px 0' }}>
                      {t('search.aiSubtitle')}
                    </p>
                    <Link
                      to="/ai-companion"
                      style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '50px', border: 'none',
                        background: 'linear-gradient(135deg,#D4A843,#F0C040)',
                        color: '#1A1200', fontWeight: 700, padding: '11px 24px',
                        fontSize: '14px', textDecoration: 'none',
                      }}
                    >
                      {t('search.openAI')}
                    </Link>
                  </div>
                </section>

                {/* Browse by Book */}
                <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <p style={{ color: 'rgba(212,168,67,0.85)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>
                    {t('search.browseByBook')}
                  </p>

                  <div style={{ display: 'inline-flex', gap: '8px' }}>
                    <button type="button" onClick={() => setTestament('old')}
                      style={{ ...pillBase, ...(testament === 'old' ? pillActive : pillInactive) }}>
                      {t('search.oldTestament')}
                    </button>
                    <button type="button" onClick={() => setTestament('new')}
                      style={{ ...pillBase, ...(testament === 'new' ? pillActive : pillInactive) }}>
                      {t('search.newTestament')}
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {visibleBooks.map((book) => (
                      <article key={book.name} className="search-book-card-dark home-gold-glass" style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                        borderRadius: '14px',
                        padding: '14px 16px',
                        textAlign: 'left',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer',
                      }}>
                        <button type="button" onClick={() => handleBookTap(book)} style={{
                          background: 'none', border: 'none', textAlign: 'left', padding: 0, width: '100%', cursor: 'pointer',
                        }}>
                          <p style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', margin: '0 0 4px 0' }}>
                            {t(`bible.books.${book.apiName}`)}
                          </p>
                          <p style={{ fontSize: '12px', color: 'rgba(212,168,67,0.7)', margin: 0 }}>
                            {book.chapters} {t('search.chapters')}
                          </p>
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>
        )}
        <SaveToast trigger={toastTrigger} />
        <FirstJournalEntryCelebration
          open={showFirstJournalCelebration}
          onClose={() => setShowFirstJournalCelebration(false)}
        />
        {shareVerse ? <ShareVerse text={shareVerse.text} reference={shareVerse.reference} onClose={() => setShareVerse(null)} /> : null}
        <BookOverviewCard
          book={overviewBook?.info}
          onClose={() => setOverviewBook(null)}
          onStart={() => {
            if (!overviewBook) return
            markOverviewSeen(overviewBook.name)
            setSelectedBook({ name: overviewBook.name, apiName: overviewBook.apiName, chapters: overviewBook.chapters })
            setSelectedChapter(1)
            setOverviewBook(null)
          }}
        />
      </div>
    </div>
  )
}

export default Search
