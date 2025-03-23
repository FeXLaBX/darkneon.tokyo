// manga-comics-news.js - Module for fetching and displaying manga/comics news
// Similar approach to entertainment-news.js but for manga/comics content

import { ErrorRecovery } from './error-recovery.js';
import { LoadingIndicator } from './loading-indicators.js';
import { PerformanceMonitor } from './performance-monitoring.js';

// Configuration for news sources
const newsConfig = {
  // Primary manga/comics RSS feeds
  rssFeeds: [
    // K-Comics Beat (Korean webtoons/manhwa)
    {
      url: 'https://kcomicsbeat.com/feed/',
      name: 'K-Comics Beat',
      category: 'webtoons'
    },
    // Anime and manga blog
    {
      url: 'https://anime.astronerdboy.com/feed',
      name: 'AstroNerdBoy\'s Blog',
      category: 'manga'
    },
    // MangaGamer blog
    {
      url: 'https://blog.mangagamer.org/feed/',
      name: 'MangaGamer Blog',
      category: 'manga'
    },
    // Comic Book Resources - Comics section (Added as another option)
    {
      url: 'https://www.cbr.com/category/comics/feed/',
      name: 'CBR Comics',
      category: 'comics'
    },
    // Bleeding Cool - Comics section
    {
      url: 'https://www.bleedingcool.com/comics/feed/',
      name: 'Bleeding Cool',
      category: 'comics'
    }
  ],
  // Current feed index for rotation
  currentFeedIndex: 0,
  // CORS proxy URL to bypass CORS restrictions with RSS feeds
  corsProxyUrl: 'https://api.cors.lol/?url=',
  // Caching settings
  updateInterval: 30 * 60 * 1000, // 30 minutes in milliseconds
  cacheTTL: 60 * 60 * 1000, // 1 hour in milliseconds
  maxItems: 6,
  // Fallback news data in case RSS feed fails
  fallbackNewsData: [
    {
      title: "New Manga Releases This Month",
      description: "A roundup of the most anticipated manga releases coming to bookstores in the next few weeks.",
      source: "Manga News",
      image: "https://placehold.co/100x60/333/666?text=Manga+News",
      url: "#"
    },
    {
      title: "Popular Manga Series Gets Anime Adaptation",
      description: "Fans rejoice as a beloved manga series is confirmed for an anime adaptation next year.",
      source: "Manga News",
      image: "https://placehold.co/100x60/333/666?text=Manga+Adaptation",
      url: "#"
    },
    {
      title: "Comics Industry Sees Growth in Digital Sales",
      description: "Recent report shows significant growth in digital comic sales compared to traditional print.",
      source: "Comics News",
      image: "https://placehold.co/100x60/333/666?text=Comics+Digital",
      url: "#"
    },
    {
      title: "Interview with Renowned Manga Artist",
      description: "Exclusive interview with an award-winning manga artist about their creative process.",
      source: "Manga News",
      image: "https://placehold.co/100x60/333/666?text=Manga+Artist",
      url: "#"
    },
    {
      title: "New Comics Convention Announced",
      description: "Major comics convention reveals dates and special guests for next year's event.",
      source: "Comics News", 
      image: "https://placehold.co/100x60/333/666?text=Comics+Con",
      url: "#"
    },
    {
      title: "Manga Creator Launches New Series",
      description: "After concluding their previous hit work, the popular creator begins a new story.",
      source: "Manga News",
      image: "https://placehold.co/100x60/333/666?text=New+Manga",
      url: "#"
    }
  ]
};

// Cache mechanism
const newsCache = {
  data: null,
  timestamp: 0,
  
  set(data) {
    this.data = data;
    this.timestamp = Date.now();
  },
  
  get() {
    // Check if cache is valid
    if (this.data && (Date.now() - this.timestamp) < newsConfig.cacheTTL) {
      return this.data;
    }
    return null;
  },
  
  isValid() {
    return this.data && (Date.now() - this.timestamp) < newsConfig.cacheTTL;
  }
};

// Initialize module
export async function initializeMangaComicsNews() {
  console.log("Initializing Manga & Comics News module");
  
  try {
    // Pre-fetch news to have it ready
    fetchMangaComicsNews();
    return true;
  } catch (error) {
    console.error("Failed to initialize Manga & Comics News module:", error);
    return false;
  }
}

// Main function to fetch manga/comics news from RSS feeds
export async function fetchMangaComicsNews() {
  return ErrorRecovery.retryOperation('fetchMangaComicsNews', async () => {
    const currentFeed = newsConfig.rssFeeds[newsConfig.currentFeedIndex];
    const sourceName = currentFeed.name;
    
    LoadingIndicator.startLoading('manga-comics-news', `Loading ${sourceName} news...`);
    PerformanceMonitor.startTiming('fetchMangaComicsNews');
    
    try {
      // Check if we have valid cached data
      if (newsCache.isValid()) {
        console.log("Using cached manga/comics news data");
        LoadingIndicator.endLoading('manga-comics-news');
        return newsCache.get();
      }
      
      // Try to fetch from current RSS feed
      try {
        console.log(`Fetching news from ${sourceName}: ${currentFeed.url}`);
        const newsData = await fetchFromRssFeed(currentFeed.url);
        
        // Cache the results
        newsCache.set(newsData);
        
        LoadingIndicator.endLoading('manga-comics-news');
        PerformanceMonitor.endTiming('fetchMangaComicsNews');
        
        return newsData;
      } catch (rssError) {
        console.error(`Error fetching from ${sourceName}:`, rssError);
        
        // Try alternative feeds before falling back to sample data
        let success = false;
        for (let i = 0; i < newsConfig.rssFeeds.length; i++) {
          // Skip the current feed that just failed
          if (i === newsConfig.currentFeedIndex) continue;
          
          const alternateFeed = newsConfig.rssFeeds[i];
          try {
            console.log(`Trying alternative RSS feed: ${alternateFeed.name}`);
            
            const newsData = await fetchFromRssFeed(alternateFeed.url);
            
            // On success, make it clear this is fallback content
            console.log(`Successfully loaded fallback feed: ${alternateFeed.name}`);
            
            // Add a note to each item that this is fallback content
            if (newsData && Array.isArray(newsData)) {
              newsData.forEach(item => {
                item.fallbackSource = true;
                item.originalSource = sourceName;
                item.source = alternateFeed.name;
              });
            }
            
            // Cache the results
            newsCache.set(newsData);
            
            LoadingIndicator.endLoading('manga-comics-news');
            PerformanceMonitor.endTiming('fetchMangaComicsNews');
            
            success = true;
            return newsData;
          } catch (altError) {
            console.error(`Error fetching from alternative feed ${alternateFeed.name}:`, altError);
            // Continue to the next alternative
          }
        }
        
        // If all alternatives failed, fall through to fallback data
      }
      
      // If all RSS feeds failed, use fallback data
      console.log("Using fallback manga/comics news data");
      const fallbackData = getFallbackNewsData();
      
      // Still cache the fallback data
      newsCache.set(fallbackData);
      
      LoadingIndicator.endLoading('manga-comics-news');
      PerformanceMonitor.endTiming('fetchMangaComicsNews');
      
      return fallbackData;
    } catch (error) {
      LoadingIndicator.endLoading('manga-comics-news');
      throw error; // Rethrow for retry system
    }
  });
}

// Fetch news from an RSS feed
async function fetchFromRssFeed(feedUrl) {
  try {
    // Use CORS proxy to bypass CORS restrictions
    const fullUrl = newsConfig.corsProxyUrl + encodeURIComponent(feedUrl);
    
    console.log("Fetching RSS from:", fullUrl);
    
    const response = await fetch(fullUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.status} ${response.statusText}`);
    }
    
    const xmlText = await response.text();
    
    // Check if the response is actually XML
    if (!xmlText.trim().startsWith('<?xml') && !xmlText.trim().startsWith('<rss')) {
      console.log("First 100 chars of response:", xmlText.substring(0, 100));
      
      if (xmlText.includes('<html') || xmlText.includes('<!DOCTYPE html>')) {
        console.error("Received HTML instead of XML - proxy might be returning an error page");
        throw new Error("Received HTML instead of XML from proxy");
      }
      
      throw new Error("Invalid XML response from proxy - doesn't start with XML declaration");
    }
    
    // Parse XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
    // Check for parsing errors
    const parseError = xmlDoc.querySelector("parsererror");
    if (parseError) {
      console.error("XML parsing error details:", parseError.textContent);
      throw new Error("XML parsing error: " + parseError.textContent);
    }
    
    // Process RSS items
    return processRSSFeed(xmlDoc, feedUrl);
    
  } catch (error) {
    console.error("Error fetching from RSS feed:", error);
    throw error;
  }
}

// Process the RSS feed XML into our standard format
function processRSSFeed(xmlDoc, feedUrl) {
  try {
    // Get all items from the feed
    const items = xmlDoc.querySelectorAll("item");
    
    console.log(`Processing ${items.length} items from RSS feed`);
    
    if (items.length === 0) {
      throw new Error("No items found in RSS feed");
    }
    
    // Track processed items
    const processedItems = [];
    const processedUrls = new Set(); // Track already processed URLs
    const processedTitleHashes = new Set(); // Track normalized title hashes
    
    // Helper to normalize and hash titles for better duplicate detection
    const normalizeTitle = (title) => {
      // Remove extra whitespace, convert to lowercase, and strip any non-alphanumeric chars
      return title.trim().toLowerCase().replace(/\s+/g, ' ');
    };
    
    // Process all items in a proper loop that allows early termination
    for (let i = 0; i < Math.min(items.length, newsConfig.maxItems * 3); i++) {
      const item = items[i];
      
      // Skip processing if we already have enough items
      if (processedItems.length >= newsConfig.maxItems) {
        console.log(`Reached ${newsConfig.maxItems} items, stopping processing`);
        break;
      }
      
      // Extract item data
      const title = item.querySelector("title")?.textContent || "Untitled";
      const description = item.querySelector("description")?.textContent || "";
      const link = item.querySelector("link")?.textContent || "#";
      const pubDate = item.querySelector("pubDate")?.textContent || "";
      
      // Normalize the title for better duplicate detection
      const normalizedTitle = normalizeTitle(title);
      
      // Skip duplicate items by URL or normalized title
      if (processedUrls.has(link) || processedTitleHashes.has(normalizedTitle)) {
        console.log(`Skipping duplicate item: "${title}" (normalized: "${normalizedTitle}")`);
        continue; // Skip to next item
      }
      
      // Add to tracking sets
      processedUrls.add(link);
      processedTitleHashes.add(normalizedTitle);
      
      // Extract content:encoded field if available
      const contentEncoded = item.querySelector("content\\:encoded")?.textContent || "";
      
      // For image, try multiple methods to extract from different feed formats
      let image = null; // Start with null to track if we found an image
      
      let imageFound = false;
      let imageSource = "none";
      
      // METHOD 1: Direct media:thumbnail element
      const mediaThumbnail = item.querySelector("media\\:thumbnail, thumbnail");
      if (mediaThumbnail) {
        const thumbnailUrl = mediaThumbnail.textContent || mediaThumbnail.getAttribute("url");
        if (thumbnailUrl) {
          image = thumbnailUrl;
          imageFound = true;
          imageSource = "media:thumbnail";
          console.log(`Image found via media:thumbnail: ${image}`);
        }
      }
      
      // METHOD 2: Check for media:content element
      if (!imageFound) {
        const mediaContent = item.querySelector("media\\:content, content");
        if (mediaContent && mediaContent.getAttribute("url")) {
          image = mediaContent.getAttribute("url");
          imageFound = true;
          imageSource = "media:content";
          console.log(`Image found via media:content: ${image}`);
        }
      }
      
      // METHOD 3: Check for enclosure element
      if (!imageFound) {
        const enclosure = item.querySelector("enclosure");
        if (enclosure && enclosure.getAttribute("url") && 
            enclosure.getAttribute("type")?.startsWith("image/")) {
          image = enclosure.getAttribute("url");
          imageFound = true;
          imageSource = "enclosure";
          console.log(`Image found via enclosure: ${image}`);
        }
      }
      
      // METHOD 4: General patterns for finding images in content
      if (!imageFound) {
        // Try various image tag patterns
        const imgPatterns = [
          /<img[^>]+src="([^"]+)"/i,              // Standard img tag with double quotes
          /<img[^>]+src='([^']+)'/i,              // Standard img tag with single quotes
          /src=["']([^"']+\.(?:jpg|jpeg|png|gif|webp))["']/i  // By file extension
        ];
        
        // First try in content:encoded which has richer content
        if (contentEncoded) {
          for (const pattern of imgPatterns) {
            const match = contentEncoded.match(pattern);
            if (match && match[1]) {
              image = match[1];
              imageFound = true;
              imageSource = "content pattern";
              console.log(`Image found via content pattern: ${image}`);
              break;
            }
          }
        }
        
        // Then try in description if still not found
        if (!imageFound) {
          for (const pattern of imgPatterns) {
            const match = description.match(pattern);
            if (match && match[1]) {
              image = match[1];
              imageFound = true;
              imageSource = "description pattern";
              console.log(`Image found via description pattern: ${image}`);
              break;
            }
          }
        }
      }
      
      // Sanitize description - remove HTML tags
      const cleanDescription = description
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&nbsp;/g, ' ') // Replace &nbsp; with spaces
        .replace(/&lt;/g, '<') // Replace &lt; with <
        .replace(/&gt;/g, '>') // Replace &gt; with >
        .replace(/&amp;/g, '&') // Replace &amp; with &
        .replace(/&quot;/g, '"') // Replace &quot; with "
        .trim(); // Trim whitespace
      
      // Limit description length
      const truncatedDescription = cleanDescription.length > 120 
        ? cleanDescription.substring(0, 120) + '...' 
        : cleanDescription;
      
      // Extract source name from the feed URL
      let sourceName = getSourceNameFromUrl(feedUrl);
      
      // Add to processed items
      processedItems.push({
        title,
        description: truncatedDescription,
        source: sourceName,
        image,
        url: link,
        pubDate,
        imageSource, // For debugging, tracks where the image came from
        isReal: true // Flag to indicate this is real data, not fallback
      });
    }
    
    console.log(`Processed ${processedItems.length} unique items from feed (after deduplication)`);
    
    return processedItems;
  } catch (error) {
    console.error("Error processing RSS feed:", error);
    throw error;
  }
}

// Helper function to get source name from feed URL
function getSourceNameFromUrl(feedUrl) {
  for (const feed of newsConfig.rssFeeds) {
    if (feedUrl.includes(new URL(feed.url).hostname)) {
      return feed.name;
    }
  }
  
  // Default generic names based on domain
  if (feedUrl.includes('kcomicsbeat')) {
    return "K-Comics Beat";
  } else if (feedUrl.includes('astronerdboy')) {
    return "AstroNerdBoy's Blog";
  } else if (feedUrl.includes('mangagamer')) {
    return "MangaGamer Blog";
  } else if (feedUrl.includes('cbr.com')) {
    return "CBR Comics";
  } else if (feedUrl.includes('bleedingcool')) {
    return "Bleeding Cool";
  }
  
  return "Manga/Comics News";
}

// Helper function for source-specific fallback images
function getSourceSpecificFallbackImage(source) {
  // Create a placeholder with source-specific styling
  switch(source) {
    case 'K-Comics Beat':
      return `https://placehold.co/100x60/5E35B1/ffffff?text=K-Comics`;
    case 'AstroNerdBoy\'s Blog':
      return `https://placehold.co/100x60/225588/ffffff?text=ANB`;
    case 'MangaGamer Blog':
      return `https://placehold.co/100x60/CC3366/ffffff?text=MangaGamer`;
    case 'CBR Comics':
      return `https://placehold.co/100x60/00AEEF/ffffff?text=CBR`;
    case 'Bleeding Cool':
      return `https://placehold.co/100x60/DD0000/ffffff?text=BC`;
    default:
      return `https://placehold.co/100x60/333/666?text=Comics+News`;
  }
}

// Get fallback news data with randomization
function getFallbackNewsData() {
  // Shuffle the array to get different news each time
  const shuffled = [...newsConfig.fallbackNewsData].sort(() => 0.5 - Math.random());
  
  // Take the first few items and mark them as fallback data
  return shuffled.slice(0, newsConfig.maxItems).map(item => ({
    ...item,
    isReal: false // Flag to indicate this is fallback data, not real
  }));
}

// Function to rotate to the next news source
export async function rotateNewsSource() {
  console.log("rotateNewsSource function called");
  
  // Get the button element 
  const rotateButton = document.getElementById('rotate-manga-news-source');
  if (!rotateButton) {
    console.error("Rotate button not found");
    return;
  }
  
  console.log("Found rotate button, processing rotation");
  
  // Set button to loading state
  const originalContent = rotateButton.innerHTML;
  rotateButton.innerHTML = '<span class="loading-spinner-small"></span>';
  rotateButton.disabled = true;
  rotateButton.classList.add('loading');
  
  // Clear cache to force refresh
  newsCache.data = null;
  
  // Save original index before rotation
  const originalIndex = newsConfig.currentFeedIndex;
  
  // Rotate to next feed index
  newsConfig.currentFeedIndex = (newsConfig.currentFeedIndex + 1) % newsConfig.rssFeeds.length;
  
  console.log(`Rotating news source from ${newsConfig.rssFeeds[originalIndex].name} to ${newsConfig.rssFeeds[newsConfig.currentFeedIndex].name}`);
  
  try {
    // Load and display new content
    const success = await loadAndDisplayMangaComicsNews();
    
    if (!success) {
      // If failed, revert to original feed
      console.log(`Failed to load ${newsConfig.rssFeeds[newsConfig.currentFeedIndex].name}, reverting to previous source`);
      newsConfig.currentFeedIndex = originalIndex;
    } else {
      console.log("News content updated successfully");
    }
  } catch (err) {
    console.error("Error rotating news source:", err);
    // Revert to original feed on error
    newsConfig.currentFeedIndex = originalIndex;
  } finally {
    // Always restore the button state - even if there's an error
    setTimeout(() => {
      if (rotateButton) {
        rotateButton.innerHTML = originalContent;
        rotateButton.disabled = false;
        rotateButton.classList.remove('loading');
        console.log("Button state restored");
      }
    }, 500); // Give a minimum loading time for better UX
  }
}

// Update the Kavita right content box with news
export function updateNewsDisplay(newsData, forceUpdate = false) {
  // Get the right content box for Kavita
  const newsBox = window.contentBoxes?.kavita?.right;
  if (!newsBox) {
    console.error("Kavita right content box (news) not found");
    return;
  }

  const contentDiv = newsBox.querySelector('.content-box-content');
  if (!contentDiv) {
    console.error("Content div not found in news box");
    return;
  }

  // Get the current source name for the indicator
  const getCurrentSourceName = () => {
    return newsConfig.rssFeeds[newsConfig.currentFeedIndex].name;
  };

  // Start with empty HTML
  let html = '';

  // Make sure we have news data
  if (!newsData || !Array.isArray(newsData) || newsData.length === 0) {
    html = '<div class="news-error">No manga/comics news available at this time.</div>';
    contentDiv.innerHTML = html;
    return;
  }

  // Create just the source indicator - NOT a new header
  const sourceIndicator = `
    <div class="news-source-indicator">
      Current: <span class="source-name">${getCurrentSourceName()}</span>
      ${!newsData.some(item => item.isReal) ? ' (using sample data)' : ''}
      ${newsData.some(item => item.fallbackSource) ? 
        ` <span class="fallback-note">(Fallback: ${newsData[0].originalSource} unavailable)</span>` : ''}
      <span class="news-source-count">(${newsData.length} items)</span>
    </div>
  `;

  // Add news items - now with clickable links
  newsData.forEach(news => {
    // Add a class to indicate if this is real or fallback data
    const dataTypeClass = news.isReal ? 'real-news' : 'fallback-news';
    
    // Make item clickable only if it has a real URL
    const hasValidUrl = news.url && news.url !== '#' && news.isReal;
    
    // Wrap the whole news item in an anchor tag if it has a valid URL
    const linkStart = hasValidUrl ? 
      `<a href="${news.url}" class="news-link" target="_blank" rel="noopener noreferrer">` : 
      '<div class="news-item-container">';
    
    const linkEnd = hasValidUrl ? '</a>' : '</div>';
    
    // Get placeholder image if no image is available
    const imageSrc = news.image || getSourceSpecificFallbackImage(news.source);
    
    html += `
      ${linkStart}
        <div class="news-item ${dataTypeClass}">
          <img src="${imageSrc}" class="news-image" alt="${news.title}" 
          onerror="this.src='${getSourceSpecificFallbackImage(news.source)}'">
          <div class="news-content">
            <div class="news-title">${news.title}</div>
            <div class="news-description">${news.description}</div>
            <div class="news-source">${news.source}${news.isReal ? '' : ' (Sample)'}</div>
          </div>
        </div>
      ${linkEnd}
    `;
  });

  // Update the content
  contentDiv.innerHTML = sourceIndicator + html;
  console.log(`Manga/Comics news display updated from ${getCurrentSourceName()}`);

  // Find the existing header
  const headerElement = newsBox.querySelector('.content-box-header');
  if (headerElement) {
    // Check if we already have a button
    let button = headerElement.querySelector('#rotate-manga-news-source');
    
    // If no button exists, create one
    if (!button) {
      button = document.createElement('button');
      button.id = 'rotate-manga-news-source';
      button.className = 'rotate-source-btn-round';
      button.title = 'Switch News Source';
      button.innerHTML = '<span class="rotate-icon">↻</span>';
      
      // Add to header
      headerElement.appendChild(button);
      console.log("Created new rotation button for manga news");
    }
    
    // Remove any existing click listeners to avoid duplicates
    button.onclick = null;
    
    // Add a direct onclick handler
    button.onclick = function(e) {
      console.log("Manga news rotate button clicked!");
      // Prevent default and stop propagation
      e.preventDefault();
      e.stopPropagation();
      
      // Call the rotation function
      rotateNewsSource();
      // Return false to prevent default
      return false;
    };
    
    console.log("Attached new click handler to manga news rotation button");
  }
}

// Main function to load and display news
export async function loadAndDisplayMangaComicsNews() {
  try {
    console.log("Loading and displaying manga/comics news from RSS feeds");
    const newsData = await fetchMangaComicsNews();
    updateNewsDisplay(newsData);
    return true;
  } catch (error) {
    console.error("Failed to load and display manga/comics news:", error);
    // Try to display fallback data on error
    try {
      updateNewsDisplay(getFallbackNewsData());
      return false; // Return false to indicate we used fallback data
    } catch (fallbackError) {
      console.error("Even fallback news display failed:", fallbackError);
      return false;
    }
  }
}

// Set up auto-refresh if needed
export function setupNewsAutoRefresh(intervalMinutes = 30) {
  const intervalMs = intervalMinutes * 60 * 1000;
  
  // Clear any existing interval
  if (window.mangaNewsRefreshInterval) {
    clearInterval(window.mangaNewsRefreshInterval);
  }
  
  // Set up new interval
  window.mangaNewsRefreshInterval = setInterval(async () => {
    console.log("Auto-refreshing manga/comics news");
    // Only refresh if the Kavita app is active
    if (window.mainPageState?.activeAppName === 'kavita') {
      await loadAndDisplayMangaComicsNews();
    }
  }, intervalMs);
  
  console.log(`Manga/Comics news auto-refresh set up for ${intervalMinutes} minute intervals`);
}

// Add custom CSS to style real vs fallback news
function addCustomStyles() {
  // We'll use the existing entertainment-news.css
  // Check if our styles already exist
  if (document.getElementById('entertainment-news-styles')) {
    console.log("Using existing entertainment-news styles");
    return;
  }
  
  // Create a link element to load the external CSS file
  const linkElement = document.createElement('link');
  linkElement.id = 'entertainment-news-styles';
  linkElement.rel = 'stylesheet';
  linkElement.href = 'css/entertainment-news.css'; // Path to the CSS file
  
  // Add to document head
  document.head.appendChild(linkElement);
  
  console.log("Manga/Comics news styles loaded (using entertainment-news.css)");
}

// Connect the Kavita logo click to rotate news sources
export function connectKavitaLogoClick() {
  // This function should be called after DOM is loaded
  console.log("Setting up Kavita logo click handler for news rotation");
  
  // Find the Kavita logo
  const kavitaLogo = document.querySelector('.kavita-logo');
  if (kavitaLogo) {
    // We'll use a flag to ensure we don't perform rotation on the first click
    // (first click should just show the default source)
    let firstClickDone = false;
    
    // Create new click handler
    kavitaLogo.addEventListener('click', function(e) {
      // After the first click, rotate the news source on subsequent clicks
      if (firstClickDone) {
        // Schedule rotation to happen after the normal handlers execute
        setTimeout(() => {
          rotateNewsSource();
        }, 500);
      } else {
        firstClickDone = true;
      }
    });
    
    console.log("Kavita logo click handler set up for news rotation");
  } else {
    console.warn("Kavita logo not found for click handler setup");
  }
}

export const MangaComicsNews = {
  initialize: initializeMangaComicsNews,
  fetch: fetchMangaComicsNews,
  display: updateNewsDisplay,
  loadAndDisplay: loadAndDisplayMangaComicsNews,
  setupAutoRefresh: setupNewsAutoRefresh,
  rotateNewsSource: rotateNewsSource,
  connectKavitaLogoClick: connectKavitaLogoClick
};

// Automatically initialize when imported if window is defined
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', async () => {
    // Add custom styles
    addCustomStyles();
    
    // Initialize news module
    await initializeMangaComicsNews();
    
    // Make the API globally available
    window.MangaComicsNews = MangaComicsNews;
    
    // Set up Kavita logo click handler if we can
    // Delay this slightly to ensure other handlers are set up first
    setTimeout(() => {
      connectKavitaLogoClick();
    }, 1000);
    
    console.log("Manga & Comics News module initialized");
  });
}