// jellyfin-api.js - FIXED VERSION
import { CONFIG_PATHS } from './content-core.js';
import { ErrorRecovery } from './error-recovery.js';
import { LoadingIndicator } from './loading-indicators.js';
import { PerformanceMonitor } from './performance-monitoring.js';

// Jellyfin API configuration - will be populated from config file
const jellyfinConfig = {
  baseUrl: 'https://jellyfin.darkneon.tokyo',
  apiKey: '',
  userId: '',
  enabled: false,
  clientInfo: {
    client: 'DarkNeon.Tokyo',
    device: 'Web Dashboard',
    deviceId: 'darkneon-dashboard-web',
    version: '1.0.0'
  }
};

// Export the main setup function
export function setupJellyfinAPI() {
  return new Promise((resolve) => {
    // Load config from server config file
    loadJellyfinConfig()
      .then(() => {
        // If we have credentials, test the connection
        if (jellyfinConfig.apiKey && jellyfinConfig.userId) {
          return testJellyfinConnection();
        }
        return false;
      })
      .then(success => {
        console.log("Jellyfin connection test result:", success);
        return success;
      })
      .then(success => {
        if (success) {
          console.log("Jellyfin API connection successful");
          jellyfinConfig.enabled = true;
          
          // Load initial data
          loadJellyfinContent();
          
          // Expose API to global scope
          window.jellyfinAPI = {
            loadJellyfinContent,
            loadRecentlyPlayed,
            loadRecentlyAddedMovies,
            loadRecentlyAddedSeries
          };
          
          // Resolve promise with success
          resolve(true);
        } else {
          console.error("Jellyfin API connection failed or not configured");
          jellyfinConfig.enabled = false;
          
          // We can still expose the API functions, they just won't do anything
          window.jellyfinAPI = {
            loadJellyfinContent: () => console.warn("Jellyfin API not configured"),
            loadRecentlyPlayed: () => console.warn("Jellyfin API not configured"),
            loadRecentlyAddedMovies: () => console.warn("Jellyfin API not configured"),
            loadRecentlyAddedSeries: () => console.warn("Jellyfin API not configured")
          };
          
          // Resolve promise with failure
          resolve(false);
        }
      })
      .catch(error => {
        console.error("Error setting up Jellyfin API:", error);
        resolve(false);
      });
  });
}

// FIXED: Updated loadJellyfinConfig function with multiple path attempts
async function loadJellyfinConfig() {
  try {
    // Try multiple config paths in order of preference
    const configPaths = [
      '/api/api-config.json',        // Absolute from web root
      'api/api-config.json',         // Relative path
      '../api/api-config.json',      // One directory up
      '../../api/api-config.json',   // Two directories up
      './api/api-config.json',       // Explicit current directory
      '/api-config.json'                // Directly in web root
    ];
    
    let response = null;
    let loadedPath = null;
    
    // Try each path in order until one works
    for (let path of configPaths) {
      try {
        console.log(`Attempting to load Jellyfin config from: ${path}`);
        const tempResponse = await fetch(path);
        
        if (tempResponse.ok) {
          // Check that it's really JSON
          const contentType = tempResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            response = tempResponse;
            loadedPath = path;
            console.log(`Successfully loaded Jellyfin config from: ${path}`);
            break;
          } else {
            console.warn(`The file at ${path} is not JSON. Content-Type:`, contentType);
          }
        }
      } catch (error) {
        console.warn(`Failed to load from ${path}:`, error.message);
        // Continue trying other paths
      }
    }
    
    // If we found a working config path
    if (response && loadedPath) {
      try {
        const config = await response.json();
        
        // Update our config with values from the file
        if (config.jellyfin) {
          jellyfinConfig.baseUrl = config.jellyfin.baseUrl || jellyfinConfig.baseUrl;
          jellyfinConfig.apiKey = config.jellyfin.apiKey || '';
          jellyfinConfig.userId = config.jellyfin.userId || '';
          
          // Update client info if provided
          if (config.jellyfin.clientInfo) {
            jellyfinConfig.clientInfo = {
              ...jellyfinConfig.clientInfo,
              ...config.jellyfin.clientInfo
            };
          }
          
          console.log("Loaded Jellyfin config from config file:", loadedPath);
        } else {
          console.warn("No Jellyfin configuration found in config file");
        }
      } catch (parseError) {
        console.error(`Error parsing Jellyfin config JSON from ${loadedPath}:`, parseError);
      }
    } else {
      console.warn("Could not load Jellyfin config from any path, using defaults");
      
      // NOTE: You might want to add your actual config values here as a hardcoded fallback
      // Example:
      // jellyfinConfig.apiKey = 'your-actual-api-key';
      // jellyfinConfig.userId = 'your-actual-user-id';
    }
  } catch (error) {
    console.error("Error loading Jellyfin config:", error);
  }
}

// Generate Jellyfin authorization header
function getJellyfinAuthHeader() {
  // Create the MediaBrowser authorization scheme as recommended
  const { client, device, deviceId, version } = jellyfinConfig.clientInfo;
  
  return `MediaBrowser Token="${jellyfinConfig.apiKey}", Client="${client}", Device="${device}", DeviceId="${deviceId}", Version="${version}"`;
}

// FIXED: Improved error handling in test connection
async function testJellyfinConnection() {
  if (!jellyfinConfig.apiKey || !jellyfinConfig.userId) {
    console.warn("Jellyfin API key or user ID not configured, skipping connection test");
    return false;
  }
  
  try {
    console.log(`Testing Jellyfin connection to ${jellyfinConfig.baseUrl}`);
    
    // Try to get user info as a simple test
    const response = await fetch(`${jellyfinConfig.baseUrl}/Users/${jellyfinConfig.userId}`, {
      headers: {
        'Authorization': getJellyfinAuthHeader()
      }
    });
    
    if (response.ok) {
      try {
        // Try to parse the response to ensure it's valid
        const userData = await response.json();
        console.log("Jellyfin connection test successful, got user data");
        return true;
      } catch (parseError) {
        console.error("Jellyfin API returned invalid JSON:", parseError);
        return false;
      }
    } else {
      console.error(`Jellyfin API returned error: ${response.status} - ${response.statusText}`);
      
      // Try to get more info about the error
      try {
        const errorText = await response.text();
        console.error("Error details:", errorText.substring(0, 200));
      } catch (e) { /* Ignore */ }
      
      return false;
    }
  } catch (error) {
    console.error("Error testing Jellyfin connection:", error);
    return false;
  }
}

// Load content for the Jellyfin app - exported
export function loadJellyfinContent() {
  if (!jellyfinConfig.enabled) {
    console.warn("Jellyfin API not configured or disabled");
    return;
  }
  
  console.log("Loading Jellyfin content...");
  
  // Load recently played items
  loadRecentlyPlayed().catch(error => {
    console.error("Error loading recently played:", error);
  });
  
  // Load recently added movies
  loadRecentlyAddedMovies().catch(error => {
    console.error("Error loading recently added movies:", error);
  });
  
  // Load recently added TV series
  loadRecentlyAddedSeries().catch(error => {
    console.error("Error loading recently added TV series:", error);
  });
}

// Load recently played items from Jellyfin
async function loadRecentlyPlayed() {
  if (!jellyfinConfig.enabled) return null;
  
  return ErrorRecovery.retryOperation('loadRecentlyPlayed', async () => {
    LoadingIndicator.startLoading('jellyfin-recently-played', 'Loading recently played...');
    PerformanceMonitor.startTiming('loadRecentlyPlayed');
    
    try {
      // Build the URL for the recently played items
      const url = `${jellyfinConfig.baseUrl}/Users/${jellyfinConfig.userId}/Items/Resume?limit=5`;
      
      // Make the API call
      const response = await fetch(url, {
        headers: {
          'Authorization': getJellyfinAuthHeader()
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch recently played items: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Update the Jellyfin detail content
      updateJellyfinDetailContent(data);
      
      // End timing and loading when done
      const duration = PerformanceMonitor.endTiming('loadRecentlyPlayed');
      LoadingIndicator.endLoading('jellyfin-recently-played');
      return data;
    } catch (error) {
      LoadingIndicator.endLoading('jellyfin-recently-played');
      throw error; // Rethrow for retry system
    }
  });
}

// Load recently added movies from Jellyfin
async function loadRecentlyAddedMovies() {
  if (!jellyfinConfig.enabled) return null;
  
  try {
    // Build the URL for the recently added movies
    const url = `${jellyfinConfig.baseUrl}/Users/${jellyfinConfig.userId}/Items/Latest?IncludeItemTypes=Movie&Limit=5`;
    
    // Make the API call
    const response = await fetch(url, {
      headers: {
        'Authorization': getJellyfinAuthHeader()
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch recently added movies: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Update the Jellyfin detail content with recently added movies
    updateJellyfinDetailContent(data, 'movies');
    
    return data;
  } catch (error) {
    console.error("Error loading recently added movies:", error);
    return null;
  }
}

// Load recently added TV series from Jellyfin
async function loadRecentlyAddedSeries() {
  if (!jellyfinConfig.enabled) return null;
  
  try {
    // Build the URL for the recently added TV series
    const url = `${jellyfinConfig.baseUrl}/Users/${jellyfinConfig.userId}/Items/Latest?IncludeItemTypes=Series&Limit=5`;
    
    // Make the API call
    const response = await fetch(url, {
      headers: {
        'Authorization': getJellyfinAuthHeader()
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch recently added TV series: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Update the Jellyfin detail content with recently added TV series
    updateJellyfinDetailContent(data, 'series');
    
    return data;
  } catch (error) {
    console.error("Error loading recently added TV series:", error);
    return null;
  }
}

// Update the Jellyfin detail content with API data
function updateJellyfinDetailContent(data, type = 'played') {
  // Get the Jellyfin detail element
  const jellyfinDetail = document.querySelector('.jellyfin-detail');
  if (!jellyfinDetail) {
    console.error("Jellyfin detail element not found");
    return;
  }
  
  // Get the detail content element
  const detailContent = jellyfinDetail.querySelector('.detail-content');
  if (!detailContent) {
    console.error("Detail content element not found");
    return;
  }
  
  console.log(`Updating Jellyfin content for type: ${type}`);
  
  // Find or create the content container - we'll replace the app description with this
  let contentContainer = detailContent.querySelector('.jellyfin-content');
  
  // If this is our first update and no container exists yet
  if (!contentContainer) {
    // Find the app description we're replacing
    const appDescription = detailContent.querySelector('.app-description');
    
    // Create our content container
    contentContainer = document.createElement('div');
    contentContainer.className = 'jellyfin-content';
    
    if (appDescription) {
      // Replace the description with our container
      appDescription.replaceWith(contentContainer);
      console.log("Replaced app description with Jellyfin content container");
      
      // Create the three columns
      const columnTypes = ['played', 'series', 'movies'];
      const columnTitles = {
        'played': '<br>Recently Played',
        'series': 'Recently Added<br>TV Series',
        'movies': 'Recently Added Movies'
      };
      
      columnTypes.forEach(colType => {
        const column = document.createElement('div');
        column.className = `jellyfin-column jellyfin-${colType}-column`;
        
        // Add header
        column.innerHTML = `
          <h4>${columnTitles[colType]}</h4>
          <div class="jellyfin-items-container jellyfin-${colType}-items"></div>
          <div class="jellyfin-item-indicator jellyfin-${colType}-indicator"></div>
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
      console.log("Added Jellyfin content container to detail content");
    }
  }
  
  // Determine which column to update based on content type
  let columnClass = '';
  
  switch(type) {
    case 'played':
      columnClass = 'jellyfin-played-column';
      break;
    case 'series':
      columnClass = 'jellyfin-series-column';
      break;
    case 'movies':
      columnClass = 'jellyfin-movies-column';
      break;
    default:
      columnClass = 'jellyfin-played-column';
  }
  
  // Get the appropriate column
  const column = contentContainer.querySelector(`.${columnClass}`);
  if (!column) {
    console.error(`Column ${columnClass} not found`);
    return;
  }
  
  // Get the items container
  const itemsContainer = column.querySelector('.jellyfin-items-container');
  if (!itemsContainer) {
    console.error("Items container not found");
    return;
  }
  
  // Get the indicator container
  const indicatorContainer = column.querySelector(`.jellyfin-${type}-indicator`);
  
  // Check the data structure - Latest endpoints return arrays, Resume returns an object with Items
  const items = Array.isArray(data) ? data : (data.Items || []);
  
  if (items.length > 0) {
    // Clear existing items
    itemsContainer.innerHTML = '';
    
    // Clear indicator dots
    if (indicatorContainer) {
      indicatorContainer.innerHTML = '';
    }
    
    // Add each item
    items.forEach((item, index) => {
      // Get the poster URL with proper authentication
      const posterUrl = item.ImageTags && item.ImageTags.Primary 
        ? `${jellyfinConfig.baseUrl}/Items/${item.Id}/Images/Primary?api_key=${encodeURIComponent(jellyfinConfig.apiKey)}` 
        : 'https://placehold.co/60x90/333/666?text=No+Image';
      
      // Format the item information
      const title = item.Name || 'Unknown Title';
      const itemType = item.Type || 'Unknown Type';
      const year = item.ProductionYear || '';
      
      // Create the media item
      const mediaItem = document.createElement('div');
      mediaItem.className = `jellyfin-media-item ${index === 0 ? 'active' : ''}`;
      mediaItem.dataset.id = item.Id;
      mediaItem.dataset.index = index;
      
      // Add the content
      mediaItem.innerHTML = `
        <img src="${posterUrl}" class="jellyfin-media-poster" alt="${title}">
        <div class="jellyfin-media-info">
          <div class="jellyfin-media-title">${title}</div>
          <div class="jellyfin-media-details">
            ${itemType} ${year ? `(${year})` : ''}
          </div>
        </div>
      `;
      
      // Add to container
      itemsContainer.appendChild(mediaItem);
      
      // Add indicator dot
      if (indicatorContainer) {
        const dot = document.createElement('div');
        dot.className = `jellyfin-indicator-dot ${index === 0 ? 'active' : ''}`;
        dot.dataset.index = index;
        indicatorContainer.appendChild(dot);
      }
    });
    
    // Initialize content cycling for this column if more than one item
    if (items.length > 1) {
      initializeContentCycling(itemsContainer, indicatorContainer, type);
    }
    
    console.log(`Added ${items.length} items to ${columnClass}`);
  } else {
    // No items found
    itemsContainer.innerHTML = `<div class="jellyfin-no-items">No items found</div>`;
    
    // Clear indicator dots
    if (indicatorContainer) {
      indicatorContainer.innerHTML = '';
    }
  }
}

const cyclingIntervals = {};

function initializeContentCycling(itemsContainer, indicatorContainer, columnType) {
  // Clear any existing interval for this column
  if (cyclingIntervals[columnType]) {
    clearInterval(cyclingIntervals[columnType]);
  }
  
  const items = itemsContainer.querySelectorAll('.jellyfin-media-item');
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
      const dots = indicatorContainer.querySelectorAll('.jellyfin-indicator-dot');
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
        const dots = indicatorContainer.querySelectorAll('.jellyfin-indicator-dot');
        dots.forEach(dot => dot.classList.remove('active'));
        if (dots[activeIndex]) {
          dots[activeIndex].classList.add('active');
        }
      }
    }, 5000);
  });
  
  // Add click handlers for indicator dots
  if (indicatorContainer) {
    const dots = indicatorContainer.querySelectorAll('.jellyfin-indicator-dot');
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