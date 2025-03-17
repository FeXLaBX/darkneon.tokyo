// mainpage-core.js
console.log("mainpage-core.js is loading...");

// Global state that needs to be shared between modules
window.mainPageState = {
  isAppActive: false,
  activeAppName: null,
  detailOffsets: {
    'jellyfin': 65,
    'kavita': 75,
    'romm': 65,
  }
};

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM fully loaded, initializing app...");
  
  // Import and initialize other modules
  import('./logo-manager.js').then(module => {
    window.logoManager = module;
    module.initializeLogos();
  });
  
  import('./animation-handler.js').then(module => {
    window.animationHandler = module;
  });
  
  import('./event-handler.js').then(module => {
    window.eventHandler = module;
    module.attachEventListeners();
  });
});

// Export any functions that other modules might need
export function getMainPageElements() {
  return {
    mainPage: document.querySelector('.main-page'),
    logoContainer: document.querySelector('.logo-container'),
    logos: document.querySelectorAll('.logo'),
    appBackgrounds: document.querySelectorAll('.app-background'),
    appDetails: document.querySelectorAll('.app-detail'),
    cloneContainer: document.querySelector('.logo-clone-container')
  };
}