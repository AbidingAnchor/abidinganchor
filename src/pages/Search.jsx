import { useEffect, useState } from 'react'
import BibleReader from '../components/BibleReader'
import { saveToJournal } from '../utils/journal'
import SaveToast from '../components/SaveToast'

const quickSuggestionsRow1 = ['faith', 'love', 'peace', 'strength', 'hope']
const quickSuggestionsRow2 = ['fear', 'greed', 'healing', 'forgiveness', 'anger']
const FULL_BIBLE_PAGE_SIZE = 20
const MAX_FULL_BIBLE_RESULTS = 20

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

export const books = {
  old: [
    { name: 'Genesis', apiName: 'genesis', chapters: 50 }, { name: 'Exodus', apiName: 'exodus', chapters: 40 }, { name: 'Leviticus', apiName: 'leviticus', chapters: 27 }, { name: 'Numbers', apiName: 'numbers', chapters: 36 },
    { name: 'Deuteronomy', apiName: 'deuteronomy', chapters: 34 }, { name: 'Joshua', apiName: 'joshua', chapters: 24 }, { name: 'Judges', apiName: 'judges', chapters: 21 }, { name: 'Ruth', apiName: 'ruth', chapters: 4 },
    { name: '1 Samuel', apiName: '1samuel', chapters: 31 }, { name: '2 Samuel', apiName: '2samuel', chapters: 24 }, { name: '1 Kings', apiName: '1kings', chapters: 22 }, { name: '2 Kings', apiName: '2kings', chapters: 25 },
    { name: '1 Chronicles', apiName: '1chronicles', chapters: 29 }, { name: '2 Chronicles', apiName: '2chronicles', chapters: 36 }, { name: 'Ezra', apiName: 'ezra', chapters: 10 }, { name: 'Nehemiah', apiName: 'nehemiah', chapters: 13 },
    { name: 'Esther', apiName: 'esther', chapters: 10 }, { name: 'Job', apiName: 'job', chapters: 42 }, { name: 'Psalms', apiName: 'psalms', chapters: 150 }, { name: 'Proverbs', apiName: 'proverbs', chapters: 31 },
    { name: 'Ecclesiastes', apiName: 'ecclesiastes', chapters: 12 }, { name: 'Song of Solomon', apiName: 'songofsolomon', chapters: 8 }, { name: 'Isaiah', apiName: 'isaiah', chapters: 66 }, { name: 'Jeremiah', apiName: 'jeremiah', chapters: 52 },
    { name: 'Lamentations', apiName: 'lamentations', chapters: 5 }, { name: 'Ezekiel', apiName: 'ezekiel', chapters: 48 }, { name: 'Daniel', apiName: 'daniel', chapters: 12 }, { name: 'Hosea', apiName: 'hosea', chapters: 14 },
    { name: 'Joel', apiName: 'joel', chapters: 3 }, { name: 'Amos', apiName: 'amos', chapters: 9 }, { name: 'Obadiah', apiName: 'obadiah', chapters: 1 }, { name: 'Jonah', apiName: 'jonah', chapters: 4 },
    { name: 'Micah', apiName: 'micah', chapters: 7 }, { name: 'Nahum', apiName: 'nahum', chapters: 3 }, { name: 'Habakkuk', apiName: 'habakkuk', chapters: 3 }, { name: 'Zephaniah', apiName: 'zephaniah', chapters: 3 },
    { name: 'Haggai', apiName: 'haggai', chapters: 2 }, { name: 'Zechariah', apiName: 'zechariah', chapters: 14 }, { name: 'Malachi', apiName: 'malachi', chapters: 4 },
  ],
  new: [
    { name: 'Matthew', apiName: 'matthew', chapters: 28 }, { name: 'Mark', apiName: 'mark', chapters: 16 }, { name: 'Luke', apiName: 'luke', chapters: 24 }, { name: 'John', apiName: 'john', chapters: 21 },
    { name: 'Acts', apiName: 'acts', chapters: 28 }, { name: 'Romans', apiName: 'romans', chapters: 16 }, { name: '1 Corinthians', apiName: '1corinthians', chapters: 16 }, { name: '2 Corinthians', apiName: '2corinthians', chapters: 13 },
    { name: 'Galatians', apiName: 'galatians', chapters: 6 }, { name: 'Ephesians', apiName: 'ephesians', chapters: 6 }, { name: 'Philippians', apiName: 'philippians', chapters: 4 }, { name: 'Colossians', apiName: 'colossians', chapters: 4 },
    { name: '1 Thessalonians', apiName: '1thessalonians', chapters: 5 }, { name: '2 Thessalonians', apiName: '2thessalonians', chapters: 3 }, { name: '1 Timothy', apiName: '1timothy', chapters: 6 }, { name: '2 Timothy', apiName: '2timothy', chapters: 4 },
    { name: 'Titus', apiName: 'titus', chapters: 3 }, { name: 'Philemon', apiName: 'philemon', chapters: 1 }, { name: 'Hebrews', apiName: 'hebrews', chapters: 13 }, { name: 'James', apiName: 'james', chapters: 5 },
    { name: '1 Peter', apiName: '1peter', chapters: 5 }, { name: '2 Peter', apiName: '2peter', chapters: 3 }, { name: '1 John', apiName: '1john', chapters: 5 }, { name: '2 John', apiName: '2john', chapters: 1 },
    { name: '3 John', apiName: '3john', chapters: 1 }, { name: 'Jude', apiName: 'jude', chapters: 1 }, { name: 'Revelation', apiName: 'revelation', chapters: 22 },
  ],
}

function mapBibleApiToResults(data) {
  if (Array.isArray(data?.verses) && data.verses.length > 0) {
    return data.verses.map((verse) => ({
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

async function fetchKeywordSearch(query) {
  const encoded = encodeURIComponent(query.trim());
  const url = `https://bolls.life/v2/find/WEB?search=${encoded}&match_case=false&match_whole=false&limit=20&page=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Search service unavailable. Try again shortly.");
  const data = await res.json();

  // API returns { exact_matches, total, results: [...] }
  const verses = data.results || data; // fallback if bare array
  if (!Array.isArray(verses) || verses.length === 0) {
    throw new Error(`No results found for "${query}".`);
  }

  return verses.slice(0, 20).map((v) => ({
    reference: `${BOOK_NAMES[v.book] || `Book ${v.book}`} ${v.chapter}:${v.verse}`,
    text: v.text.replace(/<[^>]*>/g, "").trim(),
  }));
}

function Search() {
  const [searchTerm, setSearchTerm] = useState('')
  const [testament, setTestament] = useState('new')
  const [isFocused, setIsFocused] = useState(false)
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

  const visibleBooks = testament === 'new' ? books.new : books.old
  const trimmedSearch = searchTerm.trim()
  const isVerseReference = isVerseReferenceQuery(trimmedSearch)
  const keyword = trimmedSearch.toLowerCase()
  const curatedResults = keywordVerses[keyword] ?? []
  const searchBorderClass = isFocused ? 'border-[#C9922A]' : 'border-white/40'
  const glassCard = { background: 'rgba(255, 255, 255, 0.25)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255, 255, 255, 0.5)' }
  const headingStyle = { color: '#ffffff', textShadow: '0 1px 8px rgba(0,60,120,0.4)' }
  const bodyStyle = { color: 'rgba(255,255,255,0.85)' }

  useEffect(() => {
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
      setKeywordHint(curatedResults.length > 0 ? '' : 'No curated topic yet. Try another keyword or search by reference.')
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
          setKeywordHint('No verses found. Try a different reference.')
          return
        }
        setResults(mapBibleApiToResults(data))
      } catch {
        if (!controller.signal.aborted) {
          setResults([])
          setKeywordHint('Unable to search right now. Please try again.')
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }, 450)

    return () => {
      controller.abort()
      clearTimeout(timeoutId)
    }
  }, [trimmedSearch, isVerseReference, curatedResults.length])

  const handleSaveToJournal = (result) => {
    saveToJournal({
      verse: result.text,
      reference: result.reference,
      tags: ['Search Result'],
    })
    setToastTrigger((t) => t + 1)
  }

  const handleSearchFullBible = async () => {
    if (!trimmedSearch || isVerseReference) return
    setShowFullBibleResults(true)
    setIsFullBibleLoading(true)
    setFullBibleError('')
    setFullBiblePage(1)
    try {
      const parsedResults = await fetchKeywordSearch(trimmedSearch)
      setFullBibleResults(parsedResults)
    } catch (error) {
      setFullBibleResults([])
      setFullBibleError(error instanceof Error ? error.message : 'Unable to complete full Bible search right now. Please try again.')
    } finally {
      setIsFullBibleLoading(false)
    }
  }

  const totalFullBiblePages = Math.max(1, Math.ceil(fullBibleResults.length / FULL_BIBLE_PAGE_SIZE))
  const startIndex = (fullBiblePage - 1) * FULL_BIBLE_PAGE_SIZE
  const pagedFullBibleResults = fullBibleResults.slice(startIndex, startIndex + FULL_BIBLE_PAGE_SIZE)

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <div
        className="content-scroll"
        style={{ padding: '0 16px', paddingTop: '220px', paddingBottom: '100px', maxWidth: '680px', margin: '0 auto', width: '100%' }}
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
          />
        ) : (
          <section className="space-y-6">
            <header className="space-y-1">
              <h1 className="text-3xl font-bold" style={headingStyle}>Search Scripture</h1>
              <p style={bodyStyle}>Find any verse or passage</p>
            </header>

            <section className="space-y-3">
              <label htmlFor="scripture-search" className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${searchBorderClass}`} style={glassCard}>
                <svg className="h-5 w-5 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  id="scripture-search"
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="Search by reference or keyword (e.g. John 3:16, fear, love)"
                  className="w-full bg-transparent text-white placeholder:text-white/70 focus:outline-none"
                />
              </label>

              <div
                style={{
                  background: 'rgba(10, 20, 50, 0.35)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  marginBottom: '16px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  isolation: 'isolate',
                }}
              >
                <div className="space-y-2">
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {quickSuggestionsRow1.map((suggestion) => (
                      <button key={suggestion} type="button" onClick={() => setSearchTerm(suggestion)} className="shrink-0 rounded-full px-3 py-1.5 text-sm text-white transition hover:brightness-95" style={glassCard}>
                        {suggestion}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {quickSuggestionsRow2.map((suggestion) => (
                      <button key={suggestion} type="button" onClick={() => setSearchTerm(suggestion)} className="shrink-0 rounded-full px-3 py-1.5 text-sm text-white transition hover:brightness-95" style={glassCard}>
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {trimmedSearch ? (
              <section className="space-y-3">
                <h2 className="text-lg font-semibold" style={headingStyle}>Search Results</h2>
                {isLoading ? (
                  <div className="rounded-xl p-4" style={{ ...glassCard, ...bodyStyle }}>Searching...</div>
                ) : keywordHint ? (
                  <article className="rounded-xl p-4" style={{ ...glassCard, ...bodyStyle }}>{keywordHint}</article>
                ) : null}

                {isVerseReference && results.length > 0 && (
                  <div className="space-y-3">
                    {results.map((result) => (
                      <article key={result.id} className="rounded-r-2xl rounded-l-md border-l-[3px] border-accent-gold p-4" style={glassCard}>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-gold">{result.reference}</p>
                        <p className="mt-2 text-lg text-white [font-family:'Lora',serif] italic">{result.text}</p>
                        <div className="mt-3 flex justify-end">
                          <button type="button" onClick={() => handleSaveToJournal(result)} className="rounded-lg border border-accent-gold px-3 py-1.5 text-xs font-medium text-white">
                            Save to Journal
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}

                {!isVerseReference && (
                  <div className="space-y-3">
                    {curatedResults.length > 0 ? (
                      <>
                        <p className="text-sm font-semibold uppercase tracking-[0.15em] text-accent-gold">Curated Verses for "{keyword}"</p>
                        {curatedResults.map((result) => (
                          <article key={result.ref} className="rounded-r-2xl rounded-l-md border-l-[3px] border-accent-gold p-4" style={glassCard}>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-gold">{result.ref}</p>
                            <p className="mt-2 text-lg text-white [font-family:'Lora',serif] italic">{result.text}</p>
                            <div className="mt-3 flex justify-end">
                              <button type="button" onClick={() => handleSaveToJournal({ reference: result.ref, text: result.text })} className="rounded-lg border border-accent-gold px-3 py-1.5 text-xs font-medium text-white">
                                Save to Journal
                              </button>
                            </div>
                          </article>
                        ))}
                      </>
                    ) : null}

                    <button type="button" onClick={handleSearchFullBible} className="w-full rounded-xl border border-accent-gold bg-accent-gold px-4 py-2 text-sm font-semibold text-[#1a1a1a]">
                      Search Full Bible
                    </button>
                  </div>
                )}

                {!isVerseReference && showFullBibleResults && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold uppercase tracking-[0.15em] text-accent-gold">More from Full Bible Search</p>
                    {isFullBibleLoading ? (
                      <article className="rounded-xl p-4" style={{ ...glassCard, ...bodyStyle }}>Searching full Bible...</article>
                    ) : fullBibleResults.length > 0 ? (
                      pagedFullBibleResults.map((result, index) => (
                        <article key={`${result.reference}-${index}`} className="rounded-r-2xl rounded-l-md border-l-[3px] border-accent-gold p-4" style={glassCard}>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-gold">{result.reference}</p>
                          <p className="mt-2 text-lg text-white [font-family:'Lora',serif] italic">{result.text}</p>
                          <div className="mt-3 flex justify-end">
                            <button type="button" onClick={() => handleSaveToJournal(result)} className="rounded-lg border border-accent-gold px-3 py-1.5 text-xs font-medium text-white">
                              Save to Journal
                            </button>
                          </div>
                        </article>
                      ))
                    ) : (
                      <article className="rounded-xl p-4" style={{ ...glassCard, ...bodyStyle }}>
                        {fullBibleError || 'No additional verses found for this keyword.'}
                      </article>
                    )}
                    {fullBibleResults.length > FULL_BIBLE_PAGE_SIZE ? (
                      <div className="flex items-center justify-between gap-3 rounded-xl p-3" style={glassCard}>
                        <button
                          type="button"
                          onClick={() => setFullBiblePage((prev) => Math.max(1, prev - 1))}
                          disabled={fullBiblePage === 1}
                          className="rounded-lg border border-accent-gold px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-gold">
                          Page {fullBiblePage} of {totalFullBiblePages}
                        </p>
                        <button
                          type="button"
                          onClick={() => setFullBiblePage((prev) => Math.min(totalFullBiblePages, prev + 1))}
                          disabled={fullBiblePage === totalFullBiblePages}
                          className="rounded-lg border border-accent-gold px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}

                {isVerseReference && results.length === 0 && !keywordHint && !isLoading ? (
                  <article className="rounded-xl p-4" style={{ ...glassCard, ...bodyStyle }}>No verses found. Try a different search.</article>
                ) : null}
              </section>
            ) : (
              <section className="space-y-3">
                <h2 className="text-lg font-semibold" style={headingStyle}>Browse by Book</h2>
                <div className="inline-flex rounded-xl p-1">
                  <button type="button" onClick={() => setTestament('old')} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${testament === 'old' ? 'bg-accent-gold text-white' : 'text-white'}`} style={testament === 'old' ? undefined : glassCard}>Old Testament</button>
                  <button type="button" onClick={() => setTestament('new')} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${testament === 'new' ? 'bg-accent-gold text-white' : 'text-white'}`} style={testament === 'new' ? undefined : glassCard}>New Testament</button>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '8px',
                  }}
                >
                  {visibleBooks.map((book) => (
                    <button key={book.name} type="button" onClick={() => { setSelectedBook(book); setSelectedChapter(1) }} className="rounded-lg p-3 text-left transition hover:brightness-95" style={glassCard}>
                      <p className="text-sm font-semibold text-white">{book.name}</p>
                      <p className="text-xs" style={bodyStyle}>{book.chapters} chapters</p>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </section>
        )}
        <SaveToast trigger={toastTrigger} />
      </div>
    </div>
  )
}

export default Search
