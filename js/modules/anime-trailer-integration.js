// anime-trailer-integration.js
import { EventBus } from './event-bus.js';
import { getTrailerManager, cleanupAllTrailerManagers } from './anime-trailer-manager.js';

// Export all integration functions
export const AnimeTrailerIntegration = {
  // Initialize the trailer integration
  initialize() {
    console.log("Initializing anime trailer integration...");
    
    // Set up event listeners using the event bus
    this.setupEventListeners();
    
    // Pre-fetch anime trailers for Jellyfin
    this.prefetchTrailers('jellyfin');
    
    // Return this for chaining
    return this;
  },
  
  // Set up event listeners
  setupEventListeners() {
    // Listen for app selection events using EventBus
    EventBus.on(EventBus.Events.APP_SELECTED, this.handleAppSelection.bind(this));
    EventBus.on(EventBus.Events.APP_CLOSED, this.handleAppClosed.bind(this));
    
    console.log("Event listeners set up for anime trailer integration");
  },
  
  // Pre-fetch trailers for an app to have them ready
  prefetchTrailers(appName) {
    // Get the trailer manager for this app
    const manager = getTrailerManager(appName);
    
    if (manager) {
      // Initialize with a delay to avoid blocking other initialization
      setTimeout(() => {
        manager.initialize().then(() => {
          console.log(`Pre-fetched trailers for ${appName}`);
        }).catch(err => {
          console.error(`Error pre-fetching trailers for ${appName}:`, err);
        });
      }, 2000);
    }
  },
  
  // Handle app selection event
  handleAppSelection(event) {
    const appName = event.detail?.appName;
    
    if (!appName) return;
    
    console.log(`App selected: ${appName}, checking if we should show trailers`);
    
    // Only proceed for apps we want to show trailers for
    if (['jellyfin', 'kavita'].includes(appName)) {
      console.log(`${appName} selected, initializing anime trailers`);
      
      // Get the trailer manager for this app
      const manager = getTrailerManager(appName);
      
      if (manager) {
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
    AnimeTrailerIntegration.initialize();
  } else {
    // Wait for system ready event
    EventBus.once(EventBus.Events.SYSTEM_READY, () => {
      AnimeTrailerIntegration.initialize();
    });
    
    // Fallback: initialize after a timeout if system ready event doesn't fire
    setTimeout(() => {
      if (!window.AnimeTrailerIntegration) {
        console.log("System ready event not fired, initializing anime trailer integration anyway");
        AnimeTrailerIntegration.initialize();
      }
    }, 5000);
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initialize);

// Export the integration
export default AnimeTrailerIntegration;