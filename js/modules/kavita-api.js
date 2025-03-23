// kavita-api.js
import { CONFIG_PATHS, findValidConfigPath } from './content-core.js';
import { ErrorRecovery } from './error-recovery.js';
import { LoadingIndicator } from './loading-indicators.js';
import { PerformanceMonitor } from './performance-monitoring.js';

// Kavita API configuration - will be populated from config file
const kavitaConfig = {
  baseUrl: 'https://kavita.darkneon.tokyo',
  apiKey: '',
  jwtToken: null, // Will store JWT token after authentication
  enabled: false,
  clientInfo: {
    client: 'DarkNeon.Tokyo',
    device: 'Web Dashboard',
    deviceId: 'darkneon-dashboard-web',
    version: '1.0.0'
  }
};

// Cache for API responses
const kavitaCache = {
  data: {},
  timestamp: {},
  ttl: 10 * 60 * 1000, // 10 minutes cache

  // Set cache item
  set(key, data) {
    this.data[key] = data;
    this.timestamp[key] = Date.now();
  },

  // Get cache item if not expired
  get(key) {
    if (this.data[key] && (Date.now() - this.timestamp[key]) < this.ttl) {
      return this.data[key];
    }
    return null;
  },

  // Clear all cache or specific key
  clear(key = null) {
    if (key) {
      delete this.data[key];
      delete this.timestamp[key];
    } else {
      this.data = {};
      this.timestamp = {};
    }
  }
};

// Export the main setup function
export function setupKavitaAPI() {
  return new Promise((resolve) => {
    // Load config from server config file
    loadKavitaConfig()
      .then(() => {
        // If we have API key, test the connection
        if (kavitaConfig.apiKey) {
          return authenticateWithKavita();
        }
        return false;
      })
      .then(success => {
        console.log("Kavita authentication test result:", success);
        return success;
      })
      .then(success => {
        if (success) {
          console.log("Kavita API connection successful");
          kavitaConfig.enabled = true;
          
          // Load initial data
          loadKavitaContent();
          
          // Expose API to global scope
          window.kavitaAPI = {
            loadKavitaContent,
            loadRecentlyAdded,
            loadRecentlyRead,
            loadLibraryStatistics,
            loadOnDeck
          };
          
          // Resolve promise with success
          resolve(true);
        } else {
          console.error("Kavita API connection failed or not configured");
          kavitaConfig.enabled = false;
          
          // We can still expose the API functions, they just won't do anything
          window.kavitaAPI = {
            loadKavitaContent: () => console.warn("Kavita API not configured"),
            loadRecentlyAdded: () => console.warn("Kavita API not configured"),
            loadRecentlyRead: () => console.warn("Kavita API not configured"),
            loadLibraryStatistics: () => console.warn("Kavita API not configured"),
            loadOnDeck: () => console.warn("Kavita API not configured")
          };
          
          // Resolve promise with failure
          resolve(false);
        }
      })
      .catch(error => {
        console.error("Error setting up Kavita API:", error);
        resolve(false);
      });
  });
}

// Load Kavita configuration from config file
async function loadKavitaConfig() {
  try {
    const { path, response } = await findValidConfigPath(CONFIG_PATHS.apiConfig);
    
    if (response) {
      const config = await response.json();
      
      // Update our config with values from the file
      if (config.kavita) {
        kavitaConfig.baseUrl = config.kavita.baseUrl || kavitaConfig.baseUrl;
        kavitaConfig.apiKey = config.kavita.apiKey || '';
        
        // Update client info if provided
        if (config.kavita.clientInfo) {
          kavitaConfig.clientInfo = {
            ...kavitaConfig.clientInfo,
            ...config.kavita.clientInfo
          };
        }
        
        console.log("Loaded Kavita config from:", path);
      } else {
        console.warn("No Kavita configuration found in config file");
      }
    } else {
      console.error("Failed to load API config file");
    }
  } catch (error) {
    console.error("Error loading Kavita config:", error);
  }
}

// Authenticate with Kavita API
async function authenticateWithKavita() {
  if (!kavitaConfig.apiKey) {
    console.warn("Kavita API key not configured, skipping authentication");
    return false;
  }
  
  try {
    console.log(`Testing Kavita connection to ${kavitaConfig.baseUrl}`);
    
    // Try to authenticate with API key
    const response = await fetch(`${kavitaConfig.baseUrl}/api/Plugin/authenticate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        apiKey: kavitaConfig.apiKey,
        ...kavitaConfig.clientInfo
      })
    });
    
    if (response.ok) {
      try {
        const authData = await response.json();
        
        // Store the JWT token for future requests
        kavitaConfig.jwtToken = authData.token;
        console.log("Kavita authentication successful, JWT token received");
        return true;
      } catch (parseError) {
        console.error("Kavita API returned invalid JSON:", parseError);
        return false;
      }
    } else {
      console.error(`Kavita API returned error: ${response.status} - ${response.statusText}`);
      
      // Try to get more info about the error
      try {
        const errorText = await response.text();
        console.error("Error details:", errorText.substring(0, 200));
      } catch (e) { /* Ignore */ }
      
      return false;
    }
  } catch (error) {
    console.error("Error authenticating with Kavita:", error);
    return false;
  }
}

// Create headers with JWT token
function getKavitaHeaders() {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  
  if (kavitaConfig.jwtToken) {
    headers['Authorization'] = `Bearer ${kavitaConfig.jwtToken}`;
  }
  
  return headers;
}

// Execute Kavita API request with error handling and caching
async function executeKavitaRequest(endpoint, method = 'GET', body = null, skipCache = false) {
  if (!kavitaConfig.enabled) {
    console.warn(`Kavita API not enabled, skipping request to ${endpoint}`);
    return null;
  }
  
  // Generate cache key based on endpoint and method
  const cacheKey = `${method}:${endpoint}`;
  
  // Check cache first if not skipping
  if (!skipCache && method === 'GET') {
    const cachedData = kavitaCache.get(cacheKey);
    if (cachedData) {
      console.log(`Using cached data for ${endpoint}`);
      return cachedData;
    }
  }
  
  // Execute request
  try {
    const url = `${kavitaConfig.baseUrl}/api${endpoint}`;
    console.log(`Executing Kavita API request: ${method} ${url}`);
    
    const requestOptions = {
      method,
      headers: getKavitaHeaders()
    };
    
    if (body) {
      requestOptions.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, requestOptions);
    
    if (!response.ok) {
      // Check if unauthorized (401) and try to reauthenticate
      if (response.status === 401) {
        console.log("Token expired, attempting to reauthenticate");
        const authSuccess = await authenticateWithKavita();
        
        if (authSuccess) {
          // Retry the request with new token
          return executeKavitaRequest(endpoint, method, body, true);
        }
      }
      
      throw new Error(`Kavita API error: ${response.status} ${response.statusText}`);
    }
    
    // Parse response
    const data = await response.json();
    
    // Cache GET responses
    if (method === 'GET') {
      kavitaCache.set(cacheKey, data);
    }
    
    return data;
  } catch (error) {
    console.error(`Error executing Kavita request to ${endpoint}:`, error);
    throw error;
  }
}

// Load all Kavita content
export function loadKavitaContent() {
  if (!kavitaConfig.enabled) {
    console.warn("Kavita API not configured or disabled");
    return;
  }
  
  console.log("Loading Kavita content...");
  
  // Load recently added series
  loadRecentlyAdded().catch(error => {
    console.error("Error loading recently added series:", error);
  });
  
  // Load on deck (continue reading)
  loadOnDeck().catch(error => {
    console.error("Error loading on deck items:", error);
  });
  
  // Load recently read
  loadRecentlyRead().catch(error => {
    console.error("Error loading recently read:", error);
  });
  
  // Load library statistics
  loadLibraryStatistics().catch(error => {
    console.error("Error loading library statistics:", error);
  });
}

// Load recently added series
async function loadRecentlyAdded(pageSize = 5) {
  if (!kavitaConfig.enabled) return null;
  
  return ErrorRecovery.retryOperation('loadKavitaRecentlyAdded', async () => {
    LoadingIndicator.startLoading('kavita-recently-added', 'Loading recently added...');
    PerformanceMonitor.startTiming('loadKavitaRecentlyAdded');
    
    try {
      // Fetch recently added series
      const data = await executeKavitaRequest('/series/recently-added', 'POST', {
        pageSize: pageSize,
        pageNumber: 0 // First page
      });
      
      // Update the Kavita detail content
      updateKavitaDetailContent(data, 'recent');
      
      // End timing and loading when done
      const duration = PerformanceMonitor.endTiming('loadKavitaRecentlyAdded');
      LoadingIndicator.endLoading('kavita-recently-added');
      return data;
    } catch (error) {
      LoadingIndicator.endLoading('kavita-recently-added');
      throw error; // Rethrow for retry system
    }
  });
}

// Load on deck (continue reading)
async function loadOnDeck(pageSize = 5) {
  if (!kavitaConfig.enabled) return null;
  
  return ErrorRecovery.retryOperation('loadKavitaOnDeck', async () => {
    LoadingIndicator.startLoading('kavita-on-deck', 'Loading continue reading...');
    PerformanceMonitor.startTiming('loadKavitaOnDeck');
    
    try {
      // Fetch on deck items
      const data = await executeKavitaRequest('/series/on-deck', 'POST', {
        pageSize: pageSize,
        pageNumber: 0 // First page
      });
      
      // Update the Kavita detail content
      updateKavitaDetailContent(data, 'ondeck');
      
      // End timing and loading when done
      const duration = PerformanceMonitor.endTiming('loadKavitaOnDeck');
      LoadingIndicator.endLoading('kavita-on-deck');
      return data;
    } catch (error) {
      LoadingIndicator.endLoading('kavita-on-deck');
      throw error; // Rethrow for retry system
    }
  });
}

// Load recently read
async function loadRecentlyRead(pageSize = 5) {
  if (!kavitaConfig.enabled) return null;
  
  return ErrorRecovery.retryOperation('loadKavitaRecentlyRead', async () => {
    LoadingIndicator.startLoading('kavita-recently-read', 'Loading recently read...');
    PerformanceMonitor.startTiming('loadKavitaRecentlyRead');
    
    try {
      // Fetch recently read
      const data = await executeKavitaRequest('/series/recently-read', 'POST', {
        pageSize: pageSize,
        pageNumber: 0 // First page
      });
      
      // Update the Kavita detail content
      updateKavitaDetailContent(data, 'read');
      
      // End timing and loading when done
      const duration = PerformanceMonitor.endTiming('loadKavitaRecentlyRead');
      LoadingIndicator.endLoading('kavita-recently-read');
      return data;
    } catch (error) {
      LoadingIndicator.endLoading('kavita-recently-read');
      throw error; // Rethrow for retry system
    }
  });
}

// Load library statistics
async function loadLibraryStatistics() {
  if (!kavitaConfig.enabled) return null;
  
  return ErrorRecovery.retryOperation('loadKavitaLibraryStats', async () => {
    LoadingIndicator.startLoading('kavita-library-stats', 'Loading library statistics...');
    PerformanceMonitor.startTiming('loadKavitaLibraryStats');
    
    try {
      // Fetch library statistics
      const data = await executeKavitaRequest('/stat/server-stats');
      
      // Update library stats in detail view
      updateLibraryStatistics(data);
      
      // End timing and loading when done
      const duration = PerformanceMonitor.endTiming('loadKavitaLibraryStats');
      LoadingIndicator.endLoading('kavita-library-stats');
      return data;
    } catch (error) {
      LoadingIndicator.endLoading('kavita-library-stats');
      throw error; // Rethrow for retry system
    }
  });
}

// Get cover image URL for a series
function getSeriesCoverUrl(seriesId) {
  return `${kavitaConfig.baseUrl}/api/image/series-cover?seriesId=${seriesId}`;
}

// Update the Kavita detail content with API data
function updateKavitaDetailContent(data, type = 'recent') {
  // Get the Kavita detail element
  const kavitaDetail = document.querySelector('.kavita-detail');
  if (!kavitaDetail) {
    console.error("Kavita detail element not found");
    return;
  }
  
  // Get the detail content element
  const detailContent = kavitaDetail.querySelector('.detail-content');
  if (!detailContent) {
    console.error("Detail content element not found");
    return;
  }
  
  console.log(`Updating Kavita content for type: ${type}`);
  
  // Find or create the content container - we'll replace the app description with this
  let contentContainer = detailContent.querySelector('.kavita-content');
  
  // If this is our first update and no container exists yet
  if (!contentContainer) {
    // Find the app description we're replacing
    const appDescription = detailContent.querySelector('.app-description');
    
    // Create our content container
    contentContainer = document.createElement('div');
    contentContainer.className = 'kavita-content';
    
    if (appDescription) {
      // Replace the description with our container
      appDescription.replaceWith(contentContainer);
      console.log("Replaced app description with Kavita content container");
      
      // Create the three columns
      const columnTypes = ['recent', 'ondeck', 'read'];
      const columnTitles = {
        'recent': 'Recently<br>Added',
        'ondeck': 'Continue<br>Reading',
        'read': 'Recently<br>Read'
      };
      
      columnTypes.forEach(colType => {
        const column = document.createElement('div');
        column.className = `kavita-column kavita-${colType}-column`;
        
        // Add header
        column.innerHTML = `
          <h4>${columnTitles[colType]}</h4>
          <div class="kavita-items-container kavita-${colType}-items"></div>
          <div class="kavita-item-indicator kavita-${colType}-indicator"></div>
        `;
        
        contentContainer.appendChild(column);
      });
    } else {
      // If description is already gone, add before the button
      const appButton = detailContent.querySelector('.app-button');
      if (appButton) {
        detailContent.insertBefore(contentContainer, appButton);
      } else {
        detailContent.appendChild(contentContainer);
      }
      console.log("Added Kavita content container to detail content");
    }
  }
  
  // Determine which column to update based on content type
  let columnClass = '';
  
  switch(type) {
    case 'recent':
      columnClass = 'kavita-recent-column';
      break;
    case 'ondeck':
      columnClass = 'kavita-ondeck-column';
      break;
    case 'read':
      columnClass = 'kavita-read-column';
      break;
    default:
      columnClass = 'kavita-recent-column';
  }
  
  // Get the appropriate column
  const column = contentContainer.querySelector(`.${columnClass}`);
  if (!column) {
    console.error(`Column ${columnClass} not found`);
    return;
  }
  
  // Get the items container
  const itemsContainer = column.querySelector('.kavita-items-container');
  if (!itemsContainer) {
    console.error("Items container not found");
    return;
  }
  
  // Get the indicator container
  const indicatorContainer = column.querySelector(`.kavita-${type}-indicator`);
  
  // Check if we have data to display
  if (data && data.length > 0) {
    // Clear existing items
    itemsContainer.innerHTML = '';
    
    // Clear indicator dots
    if (indicatorContainer) {
      indicatorContainer.innerHTML = '';
    }
    
    // Add each item
    data.forEach((item, index) => {
      // Get the cover URL
      const coverUrl = getSeriesCoverUrl(item.id || item.seriesId);
      
      // Create the media item
      const mediaItem = document.createElement('div');
      mediaItem.className = `kavita-media-item ${index === 0 ? 'active' : ''}`;
      mediaItem.dataset.id = item.id || item.seriesId;
      mediaItem.dataset.index = index;
      
      // Get content type tag
      let formatBadge = '';
      if (item.format) {
        const formatClass = item.format.toLowerCase().replace(/[^a-z0-9]/g, '-');
        formatBadge = `<span class="kavita-format-badge format-${formatClass}">${item.format}</span>`;
      }
      
      // Add the content
      mediaItem.innerHTML = `
        <img src="${coverUrl}" class="kavita-media-cover" alt="${item.name || 'Series'}" 
          onerror="this.src='https://placehold.co/60x90/333/666?text=No+Cover'">
        <div class="kavita-media-info">
          <div class="kavita-media-title">${item.name || 'Unknown Title'}</div>
          <div class="kavita-media-details">
            ${formatBadge}
            ${item.volumeCount ? `${item.volumeCount} volumes` : ''}
            ${item.chapterCount ? `${item.chapterCount} chapters` : ''}
          </div>
        </div>
      `;
      
      // Add to container
      itemsContainer.appendChild(mediaItem);
      
      // Add indicator dot
      if (indicatorContainer) {
        const dot = document.createElement('div');
        dot.className = `kavita-indicator-dot ${index === 0 ? 'active' : ''}`;
        dot.dataset.index = index;
        indicatorContainer.appendChild(dot);
      }
    });
    
    // Initialize content cycling for this column if more than one item
    if (data.length > 1) {
      initializeContentCycling(itemsContainer, indicatorContainer, type);
    }
    
    console.log(`Added ${data.length} items to ${columnClass}`);
  } else {
    // No items found
    itemsContainer.innerHTML = `<div class="kavita-no-items">No items found</div>`;
    
    // Clear indicator dots
    if (indicatorContainer) {
      indicatorContainer.innerHTML = '';
    }
  }
}

// Update library statistics display
function updateLibraryStatistics(stats) {
  if (!stats) return;
  
  // Get the Kavita detail element
  const kavitaDetail = document.querySelector('.kavita-detail');
  if (!kavitaDetail) {
    console.error("Kavita detail element not found");
    return;
  }
  
  // Find or create the stats container
  let statsContainer = kavitaDetail.querySelector('.kavita-stats');
  
  if (!statsContainer) {
    // Create new stats container
    statsContainer = document.createElement('div');
    statsContainer.className = 'kavita-stats';
    
    // Find where to insert it (after content, before button)
    const contentContainer = kavitaDetail.querySelector('.kavita-content');
    const appButton = kavitaDetail.querySelector('.app-button');
    
    if (contentContainer && appButton) {
      kavitaDetail.insertBefore(statsContainer, appButton);
    }
  }
  
  // Format file size
  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };
  
  // Update stats content
  statsContainer.innerHTML = `
    <div class="kavita-stats-wrapper">
      <div class="kavita-stat-item">
        <div class="kavita-stat-value">${stats.totalSeries || 0}</div>
        <div class="kavita-stat-label">Series</div>
      </div>
      <div class="kavita-stat-item">
        <div class="kavita-stat-value">${stats.totalVolumes || 0}</div>
        <div class="kavita-stat-label">Volumes</div>
      </div>
      <div class="kavita-stat-item">
        <div class="kavita-stat-value">${stats.totalChapters || 0}</div>
        <div class="kavita-stat-label">Chapters</div>
      </div>
      <div class="kavita-stat-item">
        <div class="kavita-stat-value">${formatSize(stats.totalSize || 0)}</div>
        <div class="kavita-stat-label">Total Size</div>
      </div>
    </div>
  `;
  
  console.log("Library statistics updated");
}

// Cycling intervals for animations
const cyclingIntervals = {};

// Initialize content cycling for a column
function initializeContentCycling(itemsContainer, indicatorContainer, columnType) {
  // Clear any existing interval for this column
  if (cyclingIntervals[columnType]) {
    clearInterval(cyclingIntervals[columnType]);
  }
  
  const items = itemsContainer.querySelectorAll('.kavita-media-item');
  if (items.length <= 1) return; // No need to cycle if there's only one item
  
  let activeIndex = 0;
  
  // Set up the interval to cycle through items
  cyclingIntervals[columnType] = setInterval(() => {
    // Hide current active item
    items[activeIndex].classList.remove('active');
    
    // Update active index
    activeIndex = (activeIndex + 1) % items.length;
    
    // Show new active item
    items[activeIndex].classList.add('active');
    
    // Update indicator dots
    if (indicatorContainer) {
      const dots = indicatorContainer.querySelectorAll('.kavita-indicator-dot');
      dots.forEach(dot => dot.classList.remove('active'));
      if (dots[activeIndex]) {
        dots[activeIndex].classList.add('active');
      }
    }
  }, 5000); // Cycle every 5 seconds
  
  // Add pause on hover
  itemsContainer.addEventListener('mouseenter', () => {
    clearInterval(cyclingIntervals[columnType]);
  });
  
  // Resume on mouse leave
  itemsContainer.addEventListener('mouseleave', () => {
    cyclingIntervals[columnType] = setInterval(() => {
      // Hide current active item
      items[activeIndex].classList.remove('active');
      
      // Update active index
      activeIndex = (activeIndex + 1) % items.length;
      
      // Show new active item
      items[activeIndex].classList.add('active');
      
      // Update indicator dots
      if (indicatorContainer) {
        const dots = indicatorContainer.querySelectorAll('.kavita-indicator-dot');
        dots.forEach(dot => dot.classList.remove('active'));
        if (dots[activeIndex]) {
          dots[activeIndex].classList.add('active');
        }
      }
    }, 5000);
  });
  
  // Add click handlers for indicator dots
  if (indicatorContainer) {
    const dots = indicatorContainer.querySelectorAll('.kavita-indicator-dot');
    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        // Get the index from the data attribute
        const index = parseInt(dot.dataset.index, 10);
        
        // Hide current active item
        items[activeIndex].classList.remove('active');
        
        // Update active index
        activeIndex = index;
        
        // Show new active item
        items[activeIndex].classList.add('active');
        
        // Update indicator dots
        dots.forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        
        // Reset the interval
        clearInterval(cyclingIntervals[columnType]);
        cyclingIntervals[columnType] = setInterval(() => {
          // Hide current active item
          items[activeIndex].classList.remove('active');
          
          // Update active index
          activeIndex = (activeIndex + 1) % items.length;
          
          // Show new active item
          items[activeIndex].classList.add('active');
          
          // Update indicator dots
          dots.forEach(d => d.classList.remove('active'));
          if (dots[activeIndex]) {
            dots[activeIndex].classList.add('active');
          }
        }, 5000);
      });
    });
  }
}

// Clean up intervals when app is closed
function cleanupCyclingIntervals() {
  Object.values(cyclingIntervals).forEach(interval => {
    clearInterval(interval);
  });
}

// Call this when an app is closed
document.addEventListener('appClosed', () => {
  cleanupCyclingIntervals();
});