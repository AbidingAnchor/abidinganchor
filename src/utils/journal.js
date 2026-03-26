// src/utils/journal.js
const JOURNAL_KEY = 'abidinganchor-journal';

export function getJournalEntries() {
  try {
    const raw = localStorage.getItem(JOURNAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveToJournal({ verse, reference, note = '', tags = [] }) {
  const entries = getJournalEntries();
  const newEntry = {
    id: Date.now().toString(),
    verse,
    reference,
    note,
    tags,
    savedAt: new Date().toISOString(),
  };
  const updated = [newEntry, ...entries];
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(updated));
  return newEntry;
}

export function deleteJournalEntry(id) {
  const entries = getJournalEntries();
  const updated = entries.filter((e) => e.id !== id);
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(updated));
}
