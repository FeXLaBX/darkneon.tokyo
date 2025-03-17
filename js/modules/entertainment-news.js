// entertainment-news.js - Refactored to use Anime RSS feeds
// Module for fetching and displaying anime/entertainment news

import { ErrorRecovery } from './error-recovery.js';
import { LoadingIndicator } from './loading-indicators.js';
import { PerformanceMonitor } from './performance-monitoring.js';

// Configuration for news sources
const newsConfig = {
  // Primary RSS feed URL (Anime News Network)
  rssUrl: 'https://www.animenewsnetwork.com/all/rss.xml?ann-edition=w',
  // Alternative feeds if the primary fails
  alternativeFeeds: [
    'https://feeds.feedburner.com/crunchyroll/rss/anime?lang=enUS', // Crunchyroll anime feed
    'https://myanimelist.net/rss/news.xml', // MyAnimeList feed
    'https://otakumode.com/news/feed' // Tokyo Otaku Mode feed
    // Removed Anime Trending feed as it's not working
  ],
  // Current feed index for rotation
  currentFeedIndex: 0,
  // All feeds combined for rotation (will be populated in init)
  allFeeds: [],
  // CORS proxy URL to bypass CORS restrictions with RSS feeds
  corsProxyUrl: 'https://api.cors.lol/?url=',
  // Caching settings
  updateInterval: 30 * 60 * 1000, // 30 minutes in milliseconds
  cacheTTL: 60 * 60 * 1000, // 1 hour in milliseconds
  maxItems: 6,
  // Fallback news data in case RSS feed fails
  fallbackNewsData: [
    {
      title: "Anime News Network Announces New Anime Season Lineup",
      description: "The popular site revealed its extensive slate of new and returning shows for the upcoming season.",
      source: "Anime News Network",
      image: "https://placehold.co/100x60/333/666?text=Anime+News",
      url: "#"
    },
    {
      title: "Popular Manga Series Gets Anime Adaptation",
      description: "Fans rejoice as the beloved manga will finally be adapted into an anime series next year.",
      source: "Anime News Network",
      image: "https://placehold.co/100x60/333/666?text=Anime+Adaptation",
      url: "#"
    },
    {
      title: "Studio Announces Delay for Anticipated Anime Film",
      description: "Due to production challenges, the release date has been pushed back by several months.",
      source: "Anime News Network",
      image: "https://placehold.co/100x60/333/666?text=Anime+Delay",
      url: "#"
    },
    {
      title: "Voice Actor Interview: Behind the Scenes of Hit Series",
      description: "The talented voice cast shares insights about their characters and the recording process.",
      source: "Anime News Network",
      image: "https://placehold.co/100x60/333/666?text=Voice+Actor",
      url: "#"
    },
    {
      title: "Anime Expo Announces Special Guest Lineup",
      description: "Major industry figures and creators will be attending this year's biggest anime convention.",
      source: "Anime News Network", 
      image: "https://placehold.co/100x60/333/666?text=Anime+Expo",
      url: "#"
    },
    {
      title: "Manga Creator Launches New Series",
      description: "After concluding their previous hit work, the popular creator begins a new story in a different genre.",
      source: "Anime News Network",
      image: "https://placehold.co/100x60/333/666?text=New+Manga",
      url: "#"
    },
    {
      title: "Classic Anime Series Gets 4K Remaster",
      description: "The beloved show from the 90s has been remastered for modern screens with enhanced visuals and audio.",
      source: "Anime News Network",
      image: "https://placehold.co/100x60/333/666?text=Anime+Remaster",
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
export async function initializeEntertainmentNews() {
  console.log("Initializing Entertainment News module with Anime News Network RSS");
  
  try {
    // IMPORTANT FIX: Make sure this sets up the feeds array properly
    newsConfig.allFeeds = [newsConfig.rssUrl, ...newsConfig.alternativeFeeds];
    newsConfig.currentFeedIndex = 0;
    
    console.log("Initialized news feeds array:", newsConfig.allFeeds);
    
    // Pre-fetch news to have it ready
    fetchEntertainmentNews();
    return true;
  } catch (error) {
    console.error("Failed to initialize Entertainment News module:", error);
    return false;
  }
}


// Main function to fetch entertainment news from RSS feeds
export async function fetchEntertainmentNews() {
  return ErrorRecovery.retryOperation('fetchEntertainmentNews', async () => {
    const sourceName = getSourceNameFromFeed(newsConfig.rssUrl);
    LoadingIndicator.startLoading('entertainment-news', `Loading ${sourceName} news...`);
    PerformanceMonitor.startTiming('fetchEntertainmentNews');
    
    try {
      // Check if we have valid cached data
      if (newsCache.isValid()) {
        console.log("Using cached entertainment news data");
        LoadingIndicator.endLoading('entertainment-news');
        return newsCache.get();
      }
      
      // Try to fetch from primary RSS feed
      try {
        const sourceName = getSourceNameFromFeed(newsConfig.rssUrl);
        console.log(`Fetching news from ${sourceName} RSS feed:`, newsConfig.rssUrl);
        const newsData = await fetchFromRssFeed();
        
        // Cache the results
        newsCache.set(newsData);
        
        LoadingIndicator.endLoading('entertainment-news');
        PerformanceMonitor.endTiming('fetchEntertainmentNews');
        
        return newsData;
      } catch (rssError) {
        console.error("Error fetching from primary RSS feed:", rssError);
        
        // Try alternative feeds before falling back to sample data
        let success = false;
        for (const alternativeFeed of newsConfig.alternativeFeeds) {
          try {
            console.log(`Trying alternative RSS feed: ${alternativeFeed}`);
            // Temporarily set the URL to the alternative
            const originalUrl = newsConfig.rssUrl;
            const originalSource = getSourceNameFromFeed(originalUrl);
            newsConfig.rssUrl = alternativeFeed;
            
            const newsData = await fetchFromRssFeed();
            
            // On success, make it clear this is fallback content
            console.log(`Successfully loaded fallback feed: ${getSourceNameFromFeed(alternativeFeed)}`);
            
            // Add a note to each item that this is fallback content
            if (newsData && Array.isArray(newsData)) {
              newsData.forEach(item => {
                item.fallbackSource = true;
                item.originalSource = originalSource;
              });
            }
            
            // Cache the results
            newsCache.set(newsData);
            
            LoadingIndicator.endLoading('entertainment-news');
            PerformanceMonitor.endTiming('fetchEntertainmentNews');
            
            success = true;
            return newsData;
          } catch (altError) {
            console.error(`Error fetching from alternative feed ${alternativeFeed}:`, altError);
            // Continue to the next alternative
          }
        }
        
        // If all alternatives failed, fall through to fallback data
      }
      
      // If API call failed or API is disabled, use fallback data
      console.log("Using fallback entertainment news data");
      const fallbackData = getFallbackNewsData();
      
      // Still cache the fallback data
      newsCache.set(fallbackData);
      
      LoadingIndicator.endLoading('entertainment-news');
      PerformanceMonitor.endTiming('fetchEntertainmentNews');
      
      return fallbackData;
    } catch (error) {
      LoadingIndicator.endLoading('entertainment-news');
      throw error; // Rethrow for retry system
    }
  });
}

// Fetch news from RSS feed
async function fetchFromRssFeed() {
  try {
    // Use CORS proxy to bypass CORS restrictions
    const fullUrl = newsConfig.corsProxyUrl + encodeURIComponent(newsConfig.rssUrl);
    
    console.log("Fetching RSS from:", fullUrl);
    
    const response = await fetch(fullUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.status} ${response.statusText}`);
    }
    
    const xmlText = await response.text();
    
    // Check if the response is actually XML (some proxies might return error pages as HTML)
    if (!xmlText.trim().startsWith('<?xml') && !xmlText.trim().startsWith('<rss')) {
      console.log("First 100 chars of response:", xmlText.substring(0, 100));
      // Additional check for common proxy response formats
      if (xmlText.includes('<html') || xmlText.includes('<!DOCTYPE html>')) {
        console.error("Received HTML instead of XML - proxy might be returning an error page");
        throw new Error("Received HTML instead of XML from proxy");
      }
      
      // Print more of the response if debug mode is on
      if (window.DebugTools && window.DebugTools.debugMode) {
        console.log("Full response:", xmlText);
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
    return processRSSFeed(xmlDoc);
    
  } catch (error) {
    console.error("Error fetching from anime RSS feed:", error);
    throw error;
  }
}

// Process the RSS feed XML into our standard format
function processRSSFeed(xmlDoc) {
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
      
      // Debug info for Crunchyroll feed
      if (newsConfig.rssUrl.includes('crunchyroll')) {
        console.log(`Processing Crunchyroll item: "${title}"`);
        console.log(`  Link: ${link}`);
        console.log(`  Normalized title: "${normalizedTitle}"`);
      }
      
      // Add to tracking sets
      processedUrls.add(link);
      processedTitleHashes.add(normalizedTitle);
      
      // Extract content:encoded field if available
      const contentEncoded = item.querySelector("content\\:encoded")?.textContent || "";
      
      // For image, try multiple methods to extract from different feed formats
      let image = null; // Start with null to track if we found an image
      
      // Different extraction based on feed source
      const feedUrl = newsConfig.rssUrl;
      let imageFound = false;
      let imageSource = "none";
      
      // METHOD 1: Direct media:thumbnail element (used by MyAnimeList)
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
      
      // METHOD 2: Check for media:content element (used by some feeds)
      if (!imageFound) {
        const mediaContent = item.querySelector("media\\:content, content");
        if (mediaContent && mediaContent.getAttribute("url")) {
          image = mediaContent.getAttribute("url");
          imageFound = true;
          imageSource = "media:content";
          console.log(`Image found via media:content: ${image}`);
        }
      }
      
      // METHOD 3: Check for enclosure element (used by some feeds)
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
      
      // METHOD 4: Feed-specific extraction patterns
      if (!imageFound) {
        if (feedUrl.includes('myanimelist')) {
          // Try direct pattern match for MyAnimeList (should be caught by METHOD 1 but just in case)
          const mediaPattern = /<media:thumbnail>([^<]+)<\/media:thumbnail>/i;
          const mediaMatch = description.match(mediaPattern);
          if (mediaMatch && mediaMatch[1]) {
            image = mediaMatch[1];
            imageFound = true;
            imageSource = "myanimelist pattern";
            console.log(`Image found via MyAnimeList direct pattern: ${image}`);
          }
        }
        else if (feedUrl.includes('animenewsnetwork')) {
          // ANN doesn't include images in the feed, we'll use fallback
          imageSource = "ann fallback";
        }
      }
      
      // METHOD 5: General patterns for other feeds - try to find in description/content
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
      
      // If no image found, set to null (will be handled by fallback mechanism)
      if (!image) {
        console.log(`No image found for item: ${title}`);
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
      let sourceName = getSourceNameFromFeed(newsConfig.rssUrl);
      
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
function getSourceNameFromFeed(feedUrl) {
  if (feedUrl.includes('animenewsnetwork')) {
    return "Anime News Network";
  } else if (feedUrl.includes('crunchyroll') || feedUrl.includes('feedburner.com/crunchyroll')) {
    return "Crunchyroll";
  } else if (feedUrl.includes('myanimelist')) {
    return "MyAnimeList";
  } else if (feedUrl.includes('otakumode')) {
    return "Tokyo Otaku Mode";
  }
  return "Anime News";
}

// Helper function for source-specific fallback images
function getSourceSpecificFallbackImage(source, title) {
  // Create a placeholder with source-specific styling
  switch(source) {
    case 'Anime News Network':
      return `https://placehold.co/100x60/003366/ffffff?text=ANN`;
    case 'Crunchyroll':
      return `https://placehold.co/100x60/F47521/ffffff?text=CR`;
    case 'MyAnimeList':
      return `https://placehold.co/100x60/2E51A2/ffffff?text=MAL`;
    case 'Tokyo Otaku Mode':
      return `https://placehold.co/100x60/00AEEF/ffffff?text=TOM`;
    default:
      return `https://placehold.co/100x60/333/666?text=Anime+News`;
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

// Debug helper function to diagnose feed issues
export function debugFeedItem(itemIndex = 0) {
  if (!newsCache.data || !newsCache.data[itemIndex]) {
    console.log("No cached news data available");
    return;
  }
  
  const item = newsCache.data[itemIndex];
  console.log("Current feed:", newsConfig.rssUrl);
  console.log("Feed index:", newsConfig.currentFeedIndex);
  console.log("Item details:", {
    title: item.title,
    source: item.source,
    imageSource: item.imageSource,
    image: item.image,
    url: item.url,
    isReal: item.isReal
  });
  
  // Optionally expose this to window for easy console access
  window.lastDebuggedItem = item;
}

// Function to rotate to the next news source
export async function rotateNewsSource() {
  console.log("rotateNewsSource function called");
  
  // Get the button element 
  const rotateButton = document.getElementById('rotate-news-source');
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
  
  // IMPORTANT FIX: Verify allFeeds is initialized
  if (!newsConfig.allFeeds || newsConfig.allFeeds.length === 0) {
    console.log("News feeds array is empty - initializing");
    newsConfig.allFeeds = [newsConfig.rssUrl, ...newsConfig.alternativeFeeds];
  }
  
  // Save original URL and index before rotation
  const originalUrl = newsConfig.rssUrl;
  const originalIndex = newsConfig.currentFeedIndex;
  
  // Rotate to next feed index with safety check
  newsConfig.currentFeedIndex = (newsConfig.currentFeedIndex + 1) % newsConfig.allFeeds.length;
  
  // Update the current RSS URL
  newsConfig.rssUrl = newsConfig.allFeeds[newsConfig.currentFeedIndex];
  
  console.log(`Rotating news source from index ${originalIndex} to ${newsConfig.currentFeedIndex}: ${newsConfig.rssUrl}`);
  
  try {
    // Load and display new content
    const success = await loadAndDisplayEntertainmentNews();
    
    if (!success) {
      // If failed, revert to original feed
      console.log(`Failed to load ${getSourceNameFromFeed(newsConfig.rssUrl)}, reverting to previous source`);
      newsConfig.rssUrl = originalUrl;
      newsConfig.currentFeedIndex = originalIndex;
    } else {
      console.log("News content updated successfully");
    }
  } catch (err) {
    console.error("Error rotating news source:", err);
    // Revert to original feed on error
    newsConfig.rssUrl = originalUrl;
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

// Update the Jellyfin right content box with news
export function updateNewsDisplay(newsData, forceUpdate = false) {
  // Get the media-news box for Jellyfin
  const newsBox = window.contentBoxes?.jellyfin?.right;
  if (!newsBox) {
    console.error("Jellyfin right content box (news) not found");
    return;
  }

  const contentDiv = newsBox.querySelector('.content-box-content');
  if (!contentDiv) {
    console.error("Content div not found in news box");
    return;
  }

  // Get the current source name for the indicator
  const getCurrentSourceName = () => {
    return getSourceNameFromFeed(newsConfig.rssUrl);
  };

  // Start with empty HTML
  let html = '';

  // Make sure we have news data
  if (!newsData || !Array.isArray(newsData) || newsData.length === 0) {
    html = '<div class="news-error">No anime news available at this time.</div>';
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
    
    html += `
      ${linkStart}
        <div class="news-item ${dataTypeClass}">
          <img src="${news.image}" class="news-image" alt="${news.title}" 
          onerror="this.src='${getSourceSpecificFallbackImage(news.source, news.title)}'">
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
  console.log(`Entertainment news display updated from ${getCurrentSourceName()}`);

  // Find the existing header
  const headerElement = newsBox.querySelector('.content-box-header');
  if (headerElement) {
    // Check if we already have a button
    let button = headerElement.querySelector('#rotate-news-source');
    
    // If no button exists, create one
    if (!button) {
      button = document.createElement('button');
      button.id = 'rotate-news-source';
      button.className = 'rotate-source-btn-round';
      button.title = 'Switch News Source';
      button.innerHTML = '<span class="rotate-icon">↻</span>';
      
      // Add to header
      headerElement.appendChild(button);
      console.log("Created new rotation button");
    }
    
    // IMPORTANT FIX: Instead of replacing the button with a clone,
    // just remove and reattach the event listener
    
    // First remove any existing click listeners to avoid duplicates
    button.onclick = null;
    
    // Add a direct onclick handler (more reliable than addEventListener in this context)
    button.onclick = function(e) {
      console.log("Rotate button clicked!");
      // Prevent default and stop propagation
      e.preventDefault();
      e.stopPropagation();
      
      // Call the rotation function
      window.EntertainmentNews.rotateNewsSource();
      // Return false as a belt-and-suspenders approach to prevent default
      return false;
    };
    
    console.log("Attached new click handler to rotation button");
  }
}

// Main function to load and display news
export async function loadAndDisplayEntertainmentNews() {
  try {
    console.log("Loading and displaying anime news from RSS feeds");
    const newsData = await fetchEntertainmentNews();
    updateNewsDisplay(newsData);
    return true;
  } catch (error) {
    console.error("Failed to load and display entertainment news:", error);
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
  if (window.newsRefreshInterval) {
    clearInterval(window.newsRefreshInterval);
  }
  
  // Set up new interval
  window.newsRefreshInterval = setInterval(async () => {
    console.log("Auto-refreshing entertainment news");
    // Only refresh if the Jellyfin app is active
    if (window.mainPageState?.activeAppName === 'jellyfin') {
      await loadAndDisplayEntertainmentNews();
    }
  }, intervalMs);
  
  console.log(`Entertainment news auto-refresh set up for ${intervalMinutes} minute intervals`);
}

// Add custom CSS to style real vs fallback news - UPDATED to load external CSS file
function addCustomStyles() {
  // Check if our styles already exist
  if (document.getElementById('entertainment-news-styles')) {
    return;
  }
  
  // Create a link element to load the external CSS file
  const linkElement = document.createElement('link');
  linkElement.id = 'entertainment-news-styles';
  linkElement.rel = 'stylesheet';
  linkElement.href = 'css/entertainment-news.css'; // Path to the new CSS file
  
  // Add to document head
  document.head.appendChild(linkElement);
  
  console.log("Entertainment news styles loaded from external CSS file");
}

// Connect the Jellyfin logo click to rotate news sources
export function connectJellyfinLogoClick() {
  // This function should be called after DOM is loaded
  console.log("Setting up Jellyfin logo click handler for news rotation");
  
  // Find the Jellyfin logo
  const jellyfinLogo = document.querySelector('.jellyfin-logo');
  if (jellyfinLogo) {
    // We'll use a flag to ensure we don't perform rotation on the first click
    // (first click should just show the default source)
    let firstClickDone = false;
    
    // Create new click handler
    jellyfinLogo.addEventListener('click', function(e) {
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
    
    console.log("Jellyfin logo click handler set up for news rotation");
  } else {
    console.warn("Jellyfin logo not found for click handler setup");
  }
}

export const EntertainmentNews = {
  initialize: initializeEntertainmentNews,
  fetch: fetchEntertainmentNews,
  display: updateNewsDisplay,
  loadAndDisplay: loadAndDisplayEntertainmentNews,
  setupAutoRefresh: setupNewsAutoRefresh,
  // IMPORTANT FIX: Make sure to expose this directly
  rotateNewsSource: rotateNewsSource,
  connectJellyfinLogoClick: connectJellyfinLogoClick,
  debugFeedItem: debugFeedItem, // Added debug helper function
  setRssUrl: (url) => {
    if (url && typeof url === 'string') {
      newsConfig.rssUrl = url;
      console.log(`RSS URL changed to: ${url}`);
      return true;
    }
    return false;
  },
  getAvailableFeeds: () => {
    return [...newsConfig.allFeeds];
  }
};

// Automatically initialize when imported if window is defined
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', async () => {
    // Add custom styles
    addCustomStyles();
    
    // Initialize news module
    await initializeEntertainmentNews();
    
    // Make the API globally available
    window.EntertainmentNews = EntertainmentNews;
    
    // Set up Jellyfin logo click handler if we can
    // Delay this slightly to ensure other handlers are set up first
    setTimeout(() => {
      connectJellyfinLogoClick();
    }, 1000);
    
    console.log("Entertainment News module initialized with anime RSS feeds");
  });
}

// Add a debugging tool to the window object for testing
if (typeof window !== 'undefined') {
  window.debugRotateNews = rotateNewsSource;
}