const BASE_URL = 'https://api.sermonaudio.com/v2/node/sermons';

/**
 * Get featured/latest sermons
 * @param {number} pageSize - Number of results (default: 20)
 * @returns {Promise<Array>} Array of sermon objects
 */
export async function getFeaturedSermons(pageSize = 20) {
  try {
    const url = `${BASE_URL}?pageSize=${pageSize}&sortBy=newest`;
    console.log('SermonAudio API URL:', url);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.results ? data.results.map(transformSermon) : [];
  } catch (error) {
    console.error('Error getting featured sermons:', error);
    throw error;
  }
}

/**
 * Search sermons by topic
 * @param {string} topic - Topic name
 * @param {number} pageSize - Number of results (default: 20)
 * @returns {Promise<Array>} Array of sermon objects
 */
export async function getSermonsByTopic(topic, pageSize = 20) {
  try {
    const url = `${BASE_URL}?searchText=${encodeURIComponent(topic)}&pageSize=${pageSize}`;
    console.log('SermonAudio API URL:', url);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.results ? data.results.map(transformSermon) : [];
  } catch (error) {
    console.error('Error getting sermons by topic:', error);
    throw error;
  }
}

/**
 * Search sermons by Bible book
 * @param {string} book - Bible book name (e.g., "John", "Genesis")
 * @param {number} pageSize - Number of results (default: 20)
 * @returns {Promise<Array>} Array of sermon objects
 */
export async function getSermonsByBook(book, pageSize = 20) {
  try {
    const url = `${BASE_URL}?book=${encodeURIComponent(book)}&pageSize=${pageSize}`;
    console.log('SermonAudio API URL:', url);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.results ? data.results.map(transformSermon) : [];
  } catch (error) {
    console.error('Error getting sermons by Bible book:', error);
    throw error;
  }
}

/**
 * Search sermons by keyword
 * @param {string} query - Search keyword
 * @param {number} pageSize - Number of results (default: 20)
 * @returns {Promise<Array>} Array of sermon objects
 */
export async function searchSermons(query, pageSize = 20) {
  try {
    const url = `${BASE_URL}?searchText=${encodeURIComponent(query)}&pageSize=${pageSize}`;
    console.log('SermonAudio API URL:', url);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.results ? data.results.map(transformSermon) : [];
  } catch (error) {
    console.error('Error searching sermons:', error);
    throw error;
  }
}

/**
 * Transform SermonAudio API response to standard sermon object format
 * @param {Object} apiSermon - Sermon data from API
 * @returns {Object} Standardized sermon object
 */
function transformSermon(apiSermon) {
  return {
    id: apiSermon.sermonID || apiSermon.id,
    title: apiSermon.title || apiSermon.sermonTitle || '',
    speaker: apiSermon.displayName || apiSermon.speaker || apiSermon.preacherName || '',
    church: apiSermon.broadcasterName || apiSermon.churchName || '',
    date: apiSermon.preachDate || apiSermon.date || '',
    audioUrl: apiSermon.downloadURL || apiSermon.audioUrl || apiSermon.audio_url || '',
    thumbnailUrl: apiSermon.thumbnailUrl || apiSermon.image || '',
    duration: apiSermon.duration || apiSermon.audioDuration || '',
  };
}
