const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = isLocalhost ? 'https://www.googleapis.com/youtube/v3/search' : '/api/youtube';
const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

/**
 * Search YouTube for Christian sermons by keyword
 * @param {string} query - Search keyword
 * @param {number} page - Page number (default: 1)
 * @returns {Promise<Array>} Array of sermon/video objects
 */
export async function searchSermons(query, page = 1) {
  try {
    const searchQuery = `${query} sermon -music -lyrics`;
    let url;
    
    if (isLocalhost) {
      url = `${API_BASE}?part=snippet&type=video&maxResults=20&q=${encodeURIComponent(searchQuery)}&key=${API_KEY}&order=relevance&videoDefinition=high`;
    } else {
      url = `${API_BASE}?q=${encodeURIComponent(searchQuery)}&page=${page}&type=search`;
    }
    
    console.log('YouTube API URL:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.items ? data.items.map(transformVideo) : [];
  } catch (error) {
    console.error('Error searching sermons:', error);
    throw error;
  }
}

/**
 * Get latest videos from top Christian channels
 * @param {number} page - Page number (default: 1)
 * @returns {Promise<Array>} Array of sermon/video objects
 */
export async function getFeaturedSermons(page = 1) {
  try {
    const preachers = [
      'John MacArthur',
      'Charles Stanley',
      'David Jeremiah',
      'Voddie Baucham',
      'Paul Washer',
      'Alistair Begg',
      'Tony Evans'
    ];

    // Run parallel searches for each preacher
    const searchPromises = preachers.map(async (preacher) => {
      const searchQuery = `${preacher} sermon`;
      let url;
      
      if (isLocalhost) {
        url = `${API_BASE}?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(searchQuery)}&key=${API_KEY}&order=date&videoDefinition=high`;
      } else {
        url = `${API_BASE}?q=${encodeURIComponent(searchQuery)}&page=${page}&type=featured`;
      }
      
      console.log('YouTube API URL:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`Error fetching ${preacher}:`, response.status);
        return [];
      }
      
      const data = await response.json();
      return data.items ? data.items.map(transformVideo) : [];
    });

    // Wait for all searches to complete
    const allResults = await Promise.all(searchPromises);
    
    // Flatten and deduplicate by video ID
    const seenIds = new Set();
    const uniqueResults = [];
    
    for (const results of allResults) {
      for (const video of results) {
        if (!seenIds.has(video.id)) {
          seenIds.add(video.id);
          uniqueResults.push(video);
        }
      }
    }
    
    // Sort by date (newest first)
    uniqueResults.sort((a, b) => {
      const dateA = new Date(a.publishedAt || 0);
      const dateB = new Date(b.publishedAt || 0);
      return dateB - dateA;
    });
    
    // Return up to 20 results
    return uniqueResults.slice(0, 20);
  } catch (error) {
    console.error('Error getting featured sermons:', error);
    throw error;
  }
}

/**
 * Search YouTube for sermons on a specific topic
 * @param {string} topic - Topic name
 * @param {number} page - Page number (default: 1)
 * @returns {Promise<Array>} Array of sermon/video objects
 */
export async function getSermonsByTopic(topic, page = 1) {
  try {
    const searchQuery = `${topic} sermon Christian -music -lyrics`;
    let url;
    
    if (isLocalhost) {
      url = `${API_BASE}?part=snippet&type=video&maxResults=20&q=${encodeURIComponent(searchQuery)}&key=${API_KEY}&order=relevance&videoDefinition=high`;
    } else {
      url = `${API_BASE}?q=${encodeURIComponent(searchQuery)}&page=${page}&type=topic`;
    }
    
    console.log('YouTube API URL:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.items ? data.items.map(transformVideo) : [];
  } catch (error) {
    console.error('Error getting sermons by topic:', error);
    throw error;
  }
}

/**
 * Search YouTube for sermons on a specific Bible book
 * @param {string} bibleBook - Bible book name (e.g., "John", "Genesis")
 * @param {number} page - Page number (default: 1)
 * @returns {Promise<Array>} Array of sermon/video objects
 */
export async function getSermonsByBook(bibleBook, page = 1) {
  try {
    const searchQuery = `${bibleBook} sermon Bible study -music -lyrics`;
    let url;
    
    if (isLocalhost) {
      url = `${API_BASE}?part=snippet&type=video&maxResults=20&q=${encodeURIComponent(searchQuery)}&key=${API_KEY}&order=relevance&videoDefinition=high`;
    } else {
      url = `${API_BASE}?q=${encodeURIComponent(searchQuery)}&page=${page}&type=book`;
    }
    
    console.log('YouTube API URL:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.items ? data.items.map(transformVideo) : [];
  } catch (error) {
    console.error('Error getting sermons by Bible book:', error);
    throw error;
  }
}

/**
 * Transform YouTube API response to standard sermon object format
 * @param {Object} video - Video data from YouTube API
 * @returns {Object} Standardized sermon object
 */
function transformVideo(video) {
  const snippet = video.snippet || {};
  const id = video.id?.videoId || video.id;
  
  return {
    id: id,
    title: snippet.title || '',
    channel: snippet.channelTitle || '',
    thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '',
    videoUrl: `https://www.youtube.com/watch?v=${id}`,
    description: snippet.description || '',
    publishedAt: snippet.publishedAt || '',
  };
}
