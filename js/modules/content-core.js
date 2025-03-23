// content-core.js - UPDATED with Kavita integration
import { initializeContentBoxes, showContentBoxes, hideContentBoxes } from './content-box-manager.js';
import { setupJellyfinAPI } from './jellyfin-api.js';
import { setupKavitaAPI } from './kavita-api.js'; // Added Kavita API
import { initializeExternalContent } from './external-content.js';
import { AppState } from './app-state.js';
import { EventBus } from './event-bus.js';
import { ErrorRecovery } from './error-recovery.js';
import { LoadingIndicator } from './loading-indicators.js';
import { PerformanceMonitor } from './performance-monitoring.js';
import { DebugTools } from './debug-tools.js';
import './anime-trailer-integration.js';
import './kavita-trailer-integration.js'; // Added Kavita trailer integration
import { TMDBIntegration } from './tmdb-integration.js';
import KavitaIntegration from './kavita-integration.js'; // Added main Kavita integration
import { MangaComicsNews } from './manga-comics-news.js'; // Added Manga Comics News
import { MangaComicsCharts } from './manga-comics-charts.js'; // Added Manga Comics Charts


console.log("content-core.js is loading...");

// Store config paths - updated to include multiple alternatives
export const CONFIG_PATHS = {
  apiConfig: [
    '/api/api-config.json',       // Absolute from web root
    'api/api-config.json',        // Relative path 
    '../api/api-config.json',     // One directory up
    './api/api-config.json',      // Explicit current directory
    '/api-config.json'               // Directly in web root
  ]
};

// Utility function to find a valid config path
export async function findValidConfigPath(pathOptions) {
  if (typeof pathOptions === 'string') {
    pathOptions = [pathOptions]; // Convert single string to array
  }
  
  for (const path of pathOptions) {
    try {
      console.log(`Trying config path: ${path}`);
      const response = await fetch(path);
      if (response.ok) {
        // Validate it's actually JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          console.log(`Found valid config at: ${path}`);
          return { path, response };
        } else {
          console.warn(`File at ${path} is not JSON (content-type: ${contentType})`);
        }
      }
    } catch (err) {
      console.warn(`Error trying path ${path}:`, err.message);
    }
  }
  
  console.error("No valid config path found after trying all options");
  return { path: null, response: null };
}

// Track our initialization state
let isInitialized = false;

// Main content handler - initializes after DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log("Initializing dynamic content handler...");
  
  // Execute initialization in proper sequence
  initializeContentSystem()
    .then(() => {
      console.log("Content system initialization complete");
      // Store a reference to this module globally for other modules to access
      window.contentCore = {
        isReady: true,
        loadContentForApp,
        findValidConfigPath // Expose the utility function
      };
    })
    .catch(error => {
      console.error("Error initializing content system:", error);
      
      // Even on error, make a minimal version available
      window.contentCore = {
        isReady: false,
        loadContentForApp, // Still expose the function, it will handle errors
        findValidConfigPath
      };
    });
});

// Initialize the content system in the correct sequence
async function initializeContentSystem() {
  // Don't initialize twice
  if (isInitialized) return;
  
  try {
    // Step 1: Create content boxes
    console.log("Step 1: Initializing content boxes");
    const contentBoxes = initializeContentBoxes();
    
    // Step 2: Set up Jellyfin detail structure
    console.log("Step 2: Setting up Jellyfin detail structure");
    setupJellyfinDetailStructure();
    
    // Step 2b: Set up Kavita detail structure (ADDED)
    console.log("Step 2b: Setting up Kavita detail structure");
    setupKavitaDetailStructure();
    
    // Step 3: Set up Jellyfin API
    console.log("Step 3: Setting up Jellyfin API");
    
    // Set a timeout to prevent getting stuck on API setup
    const jellyfinSetupPromise = setupJellyfinAPI();
    const jellyfinTimeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        console.warn("Jellyfin API setup timed out, continuing initialization");
        resolve(false);
      }, 5000); // 5 second timeout
    });
    
    // Wait for setup to complete or timeout to occur
    await Promise.race([jellyfinSetupPromise, jellyfinTimeoutPromise]);
    
    // Step 3b: Set up Kavita API (ADDED)
    console.log("Step 3b: Setting up Kavita API");
    
    const kavitaSetupPromise = setupKavitaAPI();
    const kavitaTimeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        console.warn("Kavita API setup timed out, continuing initialization");
        resolve(false);
      }, 5000); // 5 second timeout
    });
    
    // Wait for Kavita setup to complete or timeout to occur
    await Promise.race([kavitaSetupPromise, kavitaTimeoutPromise]);
    
    // Step 4: Initialize external content (movie charts, trailers, news)
    console.log("Step 4: Initializing external content");
    initializeExternalContent();
    
    // Step 5: Initialize Manga/Comics News and Charts (ADDED)
    console.log("Step 5: Initializing Manga & Comics modules");
    try {
      await Promise.all([
        MangaComicsNews.initialize(),
        MangaComicsCharts.initialize()
      ]);
    } catch (e) {
      console.warn("Error initializing Manga & Comics modules, continuing anyway:", e);
    }
    
    // Make loadContentForApp function available globally
    window.contentLoader = { 
      loadContentForApp,
      showContentBoxes,
      hideContentBoxes
    };
    
    // Mark as initialized
    isInitialized = true;
    
    // Dispatch an event that the content system is ready
    const event = new CustomEvent('contentSystemReady');
    window.dispatchEvent(event);
    
    // Also use the event bus
    if (EventBus) {
      EventBus.emit('contentSystemReady', { success: true });
    }
    
    console.log("Content system initialization sequence completed");
    
  } catch (error) {
    console.error("Error during content system initialization:", error);
    
    // Try to dispatch a failure event
    if (EventBus) {
      EventBus.emit('contentSystemReady', { 
        success: false, 
        error: error.message 
      });
    }
    
    throw error; // Re-throw to be caught by the main initialization
  }
}

// Create empty app description for Jellyfin 
function setupJellyfinDetailStructure() {
  console.log("Setting up Jellyfin detail structure...");
  
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
  
  // Get the app description element
  const appDescription = detailContent.querySelector('.app-description');
  if (appDescription) {
    // Create empty placeholder
    appDescription.textContent = "";
    appDescription.classList.add('jellyfin-placeholder');
    console.log("Prepared Jellyfin description placeholder");
  } else {
    console.warn("App description element not found for Jellyfin");
  }
}

// Create empty app description for Kavita (ADDED)
function setupKavitaDetailStructure() {
  console.log("Setting up Kavita detail structure...");
  
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
  
  // Get the app description element
  const appDescription = detailContent.querySelector('.app-description');
  if (appDescription) {
    // Create empty placeholder
    appDescription.textContent = "";
    appDescription.classList.add('kavita-placeholder');
    console.log("Prepared Kavita description placeholder");
  } else {
    console.warn("App description element not found for Kavita");
  }
}

// Export the global interface for other modules to access
export function loadContentForApp(appName) {
  console.log(`Loading content for ${appName}...`);
  
  // First, make sure content boxes are ready
  if (!window.contentBoxManager || !window.contentBoxManager.isReady) {
    console.error(`Cannot load content for ${appName}: Content box manager not ready`);
    return;
  }
  
  // Show the content boxes for this app
  try {
    window.contentBoxManager.showContentBoxes(appName);
  } catch (error) {
    console.error(`Error showing content boxes for ${appName}:`, error);
  }
  
  // Load app-specific content
  try {
    switch(appName) {
      case 'jellyfin':
        if (window.jellyfinAPI) {
          window.jellyfinAPI.loadJellyfinContent();
        } else {
          console.warn("Jellyfin API not initialized");
          
          // Try to load some basic content anyway
          setTimeout(() => {
            // Attempt to initialize the Jellyfin API again
            setupJellyfinAPI().then(success => {
              if (success && window.jellyfinAPI) {
                window.jellyfinAPI.loadJellyfinContent();
                console.log("Late initialization of Jellyfin API succeeded");
              }
            });
          }, 1000);
        }
        break;
      case 'kavita': // ADDED Kavita case
        // Use KavitaIntegration if available
        if (window.KavitaIntegration) {
          window.KavitaIntegration.loadContentForApp();
        } else if (window.kavitaAPI) {
          // Fallback direct API call
          window.kavitaAPI.loadKavitaContent();
          
          // Also load charts and news
          if (window.MangaComicsCharts) {
            window.MangaComicsCharts.updateDisplay();
          }
          
          if (window.MangaComicsNews) {
            window.MangaComicsNews.loadAndDisplay();
          }
        } else {
          console.warn("Kavita API not initialized");
          
          // Try to load some basic content anyway
          setTimeout(() => {
            // Attempt to initialize the Kavita API again
            setupKavitaAPI().then(success => {
              if (success && window.kavitaAPI) {
                window.kavitaAPI.loadKavitaContent();
                console.log("Late initialization of Kavita API succeeded");
                
                // Also try to load charts and news
                if (window.MangaComicsCharts) {
                  window.MangaComicsCharts.updateDisplay();
                }
                
                if (window.MangaComicsNews) {
                  window.MangaComicsNews.loadAndDisplay();
                }
              }
            });
          }, 1000);
        }
        break;
      case 'romm':
        console.log("Romm content loading not yet implemented");
        break;
      default:
        console.warn(`Unknown app: ${appName}`);
    }
  } catch (error) {
    console.error(`Error loading content for ${appName}:`, error);
  }
}

// Improved event handler integration
document.addEventListener('DOMContentLoaded', function() {
  // Make sure the event handler knows about our content loading
  document.addEventListener('appDetailsShown', function(e) {
    const appName = e.detail.appName;
    if (appName) {
      loadContentForApp(appName);
    }
  });
  
  // Also check for page reload with an active app
  setTimeout(() => {
    if (window.mainPageState && window.mainPageState.activeAppName) {
      console.log(`Detected active app after page load: ${window.mainPageState.activeAppName}`);
      loadContentForApp(window.mainPageState.activeAppName);
    }
  }, 2000); // Small delay to let other systems initialize
});