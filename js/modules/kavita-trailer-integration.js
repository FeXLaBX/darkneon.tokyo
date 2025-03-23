// kavita-trailer-integration.js
// Module for handling manga/comics trailers and video content for Kavita

import { EventBus } from './event-bus.js';
import { getTrailerManager, cleanupAllTrailerManagers } from './anime-trailer-manager.js';

// Configure the trailer integration for Kavita
export const KavitaTrailerIntegration = {
  // Initialize the trailer integration
  initialize() {
    console.log("Initializing Kavita trailer integration...");
    
    // Set up event listeners using the event bus
    this.setupEventListeners();
    
    // Pre-fetch trailers for Kavita
    this.prefetchTrailers('kavita');
    
    // Return this for chaining
    return this;
  },
  
  // Set up event listeners
  setupEventListeners() {
    // Listen for app selection events using EventBus
    EventBus.on(EventBus.Events.APP_SELECTED, this.handleAppSelection.bind(this));
    EventBus.on(EventBus.Events.APP_CLOSED, this.handleAppClosed.bind(this));
    
    console.log("Event listeners set up for Kavita trailer integration");
  },
  
  // Pre-fetch trailers for an app to have them ready
  prefetchTrailers(appName) {
    // Get the trailer manager for this app
    const manager = getTrailerManager(appName, 'youtube-api');
    
    if (manager) {
      // Modify the manager to use manga/comics YouTube channels
      this.configureTrailerManager(manager);
      
      // Initialize with a delay to avoid blocking other initialization
      setTimeout(() => {
        manager.initialize().then(() => {
          console.log(`Pre-fetched manga/comics trailers for ${appName}`);
        }).catch(err => {
          console.error(`Error pre-fetching manga/comics trailers for ${appName}:`, err);
        });
      }, 2000);
    }
  },
  
  // Configure a trailer manager for Kavita (manga/comics content)
  configureTrailerManager(manager) {
    // If the manager has sourceConfig, modify it for manga/comics content
    if (manager.sourceConfig) {
      // For Kavita, we'll use manga/comics YouTube channels
      // Omnibus Collector (comics/manga collections)
      manager.sourceConfig.channelId = 'UCxPCparZBUQT1RSVNuQTVOA';
      
      // Provide fallback videos specific to manga/comics
      manager.sourceConfig.fallbackVideos = [
        {
          id: 'lIjOQ4VhTv0',
          title: 'Omnibus Collector: Modern Comic Book Collected Editions Still Needed'
        },
        {
          id: 'lbLFfB6ywMQ',
          title: 'Omnibus Collector: Awesome X-Men Announcements'
        },
        {
          id: 'NcJKGtaZyxs',
          title: 'The Greatest Manga of All Time'
        },
        {
          id: 'gzkxzvdfWQM',
          title: 'Manga Collection Room Tour 2024'
        },
        {
          id: 'SYW0ZSKs7ac',
          title: 'Top 10 Must-Read Webtoons'
        }
      ];
    }
  },
  
  // Handle app selection event
  handleAppSelection(event) {
    const appName = event.detail?.appName;
    
    if (!appName) return;
    
    // Only proceed if Kavita is selected
    if (appName === 'kavita') {
      console.log(`${appName} selected, initializing manga/comics trailers`);
      
      // Get the trailer manager for this app
      const manager = getTrailerManager(appName, 'youtube-api');
      
      if (manager) {
        // Configure the manager for manga/comics content
        this.configureTrailerManager(manager);
        
        // First clean up any existing player to prevent issues
        cleanupAllTrailerManagers();
        
        // Make sure it's initialized
        manager.initialize().then(() => {
          // Ensure content boxes are fully loaded and visible before showing the trailer
          if (window.contentBoxManager && window.contentBoxManager.isReady) {
            // Use a longer delay to ensure the UI transitions are complete
            setTimeout(() => {
              console.log(`Loading trailer player for ${appName} after delay`);
              manager.showTrailerPlayer();
            }, 1000); // Increased delay to 1000ms
          } else {
            // Wait for content boxes to be ready
            console.log(`Waiting for content boxes to be ready for ${appName}`);
            const onContentBoxesReady = () => {
              setTimeout(() => {
                console.log(`Content boxes ready, now loading trailer for ${appName}`);
                manager.showTrailerPlayer();
              }, 1000);
              window.removeEventListener('contentBoxesReady', onContentBoxesReady);
            };
            window.addEventListener('contentBoxesReady', onContentBoxesReady);
            
            // Fallback if the event never fires
            setTimeout(() => {
              console.log(`Fallback: Loading trailer for ${appName} after timeout`);
              manager.showTrailerPlayer();
              window.removeEventListener('contentBoxesReady', onContentBoxesReady);
            }, 3000);
          }
        }).catch(err => {
          console.error(`Error initializing trailer manager for ${appName}:`, err);
        });
      }
    }
  },
  
  // Handle app closed event
  handleAppClosed() {
    console.log("App closed, cleaning up trailer players");
    cleanupAllTrailerManagers();
  },
  
  // Export cleanup method for direct access
  cleanup() {
    cleanupAllTrailerManagers();
  }
};

// Initialize the module when imported
const initialize = () => {
  // Check if system is ready or wait for it
  if (window.AppState && window.AppState.isSystemReady()) {
    KavitaTrailerIntegration.initialize();
  } else {
    // Wait for system ready event
    EventBus.once(EventBus.Events.SYSTEM_READY, () => {
      KavitaTrailerIntegration.initialize();
    });
    
    // Fallback: initialize after a timeout if system ready event doesn't fire
    setTimeout(() => {
      if (!window.KavitaTrailerIntegration) {
        console.log("System ready event not fired, initializing Kavita trailer integration anyway");
        KavitaTrailerIntegration.initialize();
      }
    }, 5000);
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initialize);

// Export the integration
export default KavitaTrailerIntegration;