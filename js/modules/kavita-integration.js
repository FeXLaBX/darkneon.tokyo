// kavita-integration.js
// Main integration module for Kavita in darkneon.tokyo

import { setupKavitaAPI, loadKavitaContent } from './kavita-api.js';
import { MangaComicsNews } from './manga-comics-news.js';
import { MangaComicsCharts } from './manga-comics-charts.js';
import { EventBus } from './event-bus.js';

// Main integration object
const KavitaIntegration = {
  // Track initialization state
  initialized: false,
  
  // Initialize the integration
  async initialize() {
    if (this.initialized) return;
    
    console.log("Initializing Kavita Integration...");
    
    // Load necessary styles
    this.loadStyles();
    
    // Initialize components in parallel
    await Promise.all([
      // Initialize the Kavita API
      setupKavitaAPI(),
      
      // Initialize the manga/comics news module
      MangaComicsNews.initialize(),
      
      // Initialize the manga/comics charts module
      MangaComicsCharts.initialize()
    ]);
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Mark as initialized
    this.initialized = true;
    
    // Make it globally accessible
    window.KavitaIntegration = this;
    
    console.log("Kavita Integration initialized successfully");
    return this;
  },
  
  // Load custom styles for Kavita content
  loadStyles() {
    // Check if our styles already exist
    if (document.getElementById('kavita-styles')) {
      return;
    }
    
    // Create a link element to load the styles
    const linkElement = document.createElement('link');
    linkElement.id = 'kavita-styles';
    linkElement.rel = 'stylesheet';
    linkElement.href = 'css/kavita-styles.css';
    
    // Add to document head
    document.head.appendChild(linkElement);
    console.log("Kavita styles loaded");
  },
  
  // Set up event listeners for the application
  setupEventListeners() {
    // Listen for app selection events
    EventBus.on(EventBus.Events.APP_SELECTED, this.handleAppSelection.bind(this));
    EventBus.on(EventBus.Events.APP_CLOSED, this.handleAppClosed.bind(this));
    
    console.log("Event listeners set up for Kavita integration");
  },
  
  // Handle app selection event
  handleAppSelection(event) {
    const appName = event.detail?.appName;
    
    if (appName === 'kavita') {
      console.log("Kavita app selected, loading content");
      
      // Wait a short moment for animations to start
      setTimeout(() => {
        this.loadKavitaContent();
      }, 300);
    }
  },
  
  // Handle app closed event
  handleAppClosed(event) {
    const appName = event.detail?.appName;
    
    if (appName === 'kavita') {
      console.log("Kavita app closed, cleaning up");
      
      // Any cleanup needed can be done here
    }
  },
  
  // Load all Kavita content
  loadKavitaContent() {
    console.log("Loading Kavita content for all sections");
    
    // Load charts into left box
    MangaComicsCharts.updateDisplay();
    
    // Load Kavita API content for center box
    loadKavitaContent();
    
    // Load manga/comics news for right box
    MangaComicsNews.loadAndDisplay();
    
    // Note: If we added a trailer module, we would load that here too
  },
  
  // Reload specific content sections
  reloadCharts() {
    MangaComicsCharts.updateDisplay();
  },
  
  reloadNews() {
    MangaComicsNews.loadAndDisplay();
  },
  
  // Helper method for the content-core.js module
  loadContentForApp() {
    this.loadKavitaContent();
  }
};

// Initialize the module when imported
const initialize = () => {
  // Check if system is ready or wait for it
  if (window.AppState && window.AppState.isSystemReady()) {
    KavitaIntegration.initialize();
  } else {
    // Wait for system ready event
    EventBus.once(EventBus.Events.SYSTEM_READY, () => {
      KavitaIntegration.initialize();
    });
    
    // Fallback: initialize after a timeout if system ready event doesn't fire
    setTimeout(() => {
      if (!window.KavitaIntegration) {
        console.log("System ready event not fired, initializing Kavita integration anyway");
        KavitaIntegration.initialize();
      }
    }, 5000);
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initialize);

// Export the integration
export default KavitaIntegration;