import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEUTEROCANONICAL_BOOKS = [
  { name: 'Tobit', cdnName: 'tobit', jsonKey: 'Tobit' },
  { name: 'Judith', cdnName: 'judith', jsonKey: 'Judith' },
  { name: 'Wisdom', cdnName: 'wisdom', jsonKey: 'Wisdom' },
  { name: 'Sirach', cdnName: 'sirach', jsonKey: 'Sirach' },
  { name: 'Baruch', cdnName: 'baruch', jsonKey: 'Baruch' },
  { name: '1 Maccabees', cdnName: '1maccabees', jsonKey: '1-Maccabees' },
  { name: '2 Maccabees', cdnName: '2maccabees', jsonKey: '2-Maccabees' },
];

const CPDV_JSON_URL = 'https://bitbucket.org/sbruno/cpdv-json-encoder/raw/master/CPDV-JSON/EntireBible-CPDV.json';

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function extractBookFromCpdvJson(cpdvJson, bookKey) {
  const chapters = {};
  
  // CPDV JSON format: { "bookName": { "chapterNum": { "verseNum": "text" } } }
  const bookData = cpdvJson[bookKey];
  
  if (!bookData) {
    console.log(`    Warning: Book "${bookKey}" not found in CPDV JSON`);
    return chapters;
  }
  
  for (const chapterNum in bookData) {
    const chapterData = bookData[chapterNum];
    const verses = [];
    
    for (const verseNum in chapterData) {
      verses.push({
        verse: parseInt(verseNum),
        text: chapterData[verseNum]
      });
    }
    
    // Sort verses by number
    verses.sort((a, b) => a.verse - b.verse);
    chapters[chapterNum] = verses;
  }
  
  return chapters;
}

function transformToOurFormat(chapters) {
  // Sort verses within each chapter
  for (const chapterNum in chapters) {
    chapters[chapterNum].sort((a, b) => a.verse - b.verse);
  }
  
  return {
    chapters: chapters
  };
}

async function main() {
  console.log('Fetching entire CPDV Bible from Bitbucket...');
  
  const outputDir = path.join(__dirname, '../src/data/deuterocanonical');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  try {
    const cpdvJsonText = await fetchText(CPDV_JSON_URL);
    console.log(`Fetched ${cpdvJsonText.length} characters`);
    
    const cpdvJson = JSON.parse(cpdvJsonText);
    console.log(`Parsed CPDV JSON with ${Object.keys(cpdvJson).length} books`);
    
    for (const book of DEUTEROCANONICAL_BOOKS) {
      console.log(`Processing ${book.name}...`);
      
      try {
        const chapters = extractBookFromCpdvJson(cpdvJson, book.jsonKey);
        const chapterCount = Object.keys(chapters).length;
        console.log(`  Extracted ${chapterCount} chapters`);
        
        const output = {
          book: book.name,
          chapters: chapters
        };
        
        const outputFile = path.join(outputDir, `${book.cdnName}.json`);
        fs.writeFileSync(outputFile, JSON.stringify(output, null, 2), 'utf-8');
        console.log(`  Saved to ${book.cdnName}.json`);
        
      } catch (error) {
        console.error(`  Error processing ${book.name}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('Error fetching CPDV JSON:', error.message);
    throw error;
  }
  
  console.log('Done! Deuterocanonical books saved to src/data/deuterocanonical/');
}

main();
