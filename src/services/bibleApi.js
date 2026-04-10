const API_BASE = 'https://api.scripture.api.bible/v1';
const API_KEY = import.meta.env.VITE_BIBLE_API_KEY;

if (!API_KEY) {
  console.error('Bible API key missing. Please set VITE_BIBLE_API_KEY in your .env file.')
}

const headers = { 'api-key': API_KEY };

export const DEFAULT_BIBLE_ID = 'de4e12af7f28f599-02'; // KJV

export const POPULAR_BIBLES = [
  { id: 'de4e12af7f28f599-02', name: 'King James Version', abbr: 'KJV', language: 'English' },
  { id: '592420522e16049f-01', name: 'English Standard Version', abbr: 'ESV', language: 'English' },
  { id: '7142879509583d59-04', name: 'New International Version', abbr: 'NIV', language: 'English' },
  { id: 'b32b9d1b64b4ef29-04', name: 'New Living Translation', abbr: 'NLT', language: 'English' },
  { id: '592420522e16049f-02', name: 'New King James Version', abbr: 'NKJV', language: 'English' },
  { id: 'b856f6b9ee656f81-01', name: 'Reina Valera 1960', abbr: 'RVR1960', language: 'Español' },
  { id: '55212e3cf5d04d49-01', name: 'Nueva Versión Internacional', abbr: 'NVI', language: 'Español' },
  { id: '4d8e89ab47e00e51-01', name: 'Almeida Revista e Corrigida', abbr: 'ARC', language: 'Português' },
];

export async function getBooks(bibleId) {
  if (!API_KEY) {
    console.error('Bible API key missing')
    return []
  }
  const res = await fetch(`${API_BASE}/bibles/${bibleId}/books`, { headers });
  const data = await res.json();
  return data.data || [];
}

export async function getChapters(bibleId, bookId) {
  if (!API_KEY) {
    console.error('Bible API key missing')
    return []
  }
  const res = await fetch(`${API_BASE}/bibles/${bibleId}/books/${bookId}/chapters`, { headers });
  const data = await res.json();
  return data.data || [];
}

export async function getChapter(bibleId, chapterId) {
  if (!API_KEY) {
    console.error('Bible API key missing')
    return null
  }
  const res = await fetch(
    `${API_BASE}/bibles/${bibleId}/chapters/${chapterId}?content-type=json&include-notes=false&include-titles=true&include-chapter-numbers=false&include-verse-numbers=true&include-verse-spans=false`,
    { headers }
  );
  const data = await res.json();
  return data.data || null;
}

export function getSavedBibleId() {
  return localStorage.getItem('abidinganchor_bible_version') || DEFAULT_BIBLE_ID;
}

export function saveBibleId(bibleId) {
  localStorage.setItem('abidinganchor_bible_version', bibleId);
}
