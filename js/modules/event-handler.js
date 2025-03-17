// event-handler.js
import { getMainPageElements } from './mainpage-core.js';
import { showAppDetails, resetActiveApp } from './animation-handler.js';
import { ErrorRecovery } from './error-recovery.js';
import { EventBus } from './event-bus.js';

export function attachEventListeners() {
  const { logos, mainPage, appDetails } = getMainPageElements();

  // Attach click handlers directly to the logos
  logos.forEach(logo => {
    const appName = logo.getAttribute('data-app');
    console.log(`Setting up click handler for: ${appName} logo`);
    
    logo.addEventListener('click', function(e) {
      console.log(`Clicked on ${appName} logo`);
      
      // When a logo is clicked, reset any previous errors
      ErrorRecovery.resetRetryCounter(`load${appName}Content`);
      
      // Notify the event bus about app selection
      EventBus.emit(EventBus.Events.APP_SELECTED, { appName });
      
      e.stopPropagation();
      
      // First show app details (handles animation)
      showAppDetails(appName);
      
      // Then show content boxes - wait a small delay to ensure animations start properly
      setTimeout(() => {
        if (window.contentBoxManager) {
          window.contentBoxManager.showContentBoxes(appName);
        }
      }, 50);
      
      // If we have a content module loaded, also load content
      if (window.contentLoader && typeof window.contentLoader.loadContentForApp === 'function') {
        window.contentLoader.loadContentForApp(appName);
      }
    });
  });
  
  // Add click handler to main page to close active app when clicking outside
  mainPage.addEventListener('click', function(e) {
    console.log("Clicked on main page");
    // Stop propagation to prevent landing page expansion
    e.stopPropagation();
    
    // Close config menu if it's open
    const configMenu = document.getElementById('configMenu');
    if (configMenu && configMenu.classList.contains('visible')) {
      // Don't close if clicking on the config button or inside the menu
      const configButton = document.getElementById('configButton');
      if (!configMenu.contains(e.target) && e.target !== configButton) {
        configMenu.classList.remove('visible');
      }
    }
    
    // Only reset if we have an active app
    const logoContainer = document.querySelector('.logo-container');
    if (logoContainer.classList.contains('app-active')) {
      // First, get the active app name
      const activeCloneGroup = document.querySelector('.clone-group.active');
      let activeAppName = null;
      
      if (activeCloneGroup) {
        activeAppName = activeCloneGroup.getAttribute('data-app');
      }
      
      // If we have a content module, hide content boxes
      if (activeAppName && window.contentBoxManager) {
        window.contentBoxManager.hideContentBoxes(activeAppName);
      }
      
      // Then reset the app (handles animation)
      resetActiveApp();
    }
  });
  
  // Prevent clicks inside app details from closing
  appDetails.forEach(detail => {
    detail.addEventListener('click', function(e) {
      console.log("Click inside app details");
      
      // Check if config menu is open and the click is outside of it
      const configMenu = document.getElementById('configMenu');
      const configButton = document.getElementById('configButton');
      
      if (configMenu && configMenu.classList.contains('visible') &&
          !configMenu.contains(e.target) && e.target !== configButton) {
        configMenu.classList.remove('visible');
        e.stopPropagation();
      } else {
        e.stopPropagation();
      }
    });
  });
  
  // Add click handlers to prevent clicks inside content boxes from closing
  document.addEventListener('click', function(e) {
    // Check if click is inside a content box
    const contentBox = e.target.closest('.content-box');
    
    // Check if click is on trailer controls
    const isTrailerControl = e.target.closest('.trailer-control') ||
                             e.target.closest('.volume-slider') ||
                             e.target.closest('.anime-trailer-player') ||
                             e.target.closest('.trailer-player-container');
    
    // IMPORTANT FIX: Check if the click is on a TMDB element
    const isTmdbElement = e.target.closest('.media-chart-item') || 
                          e.target.closest('.tmdb-modal-close') ||
                          e.target.closest('.tmdb-refresh-button');
    
    // IMPORTANT FIX: Check if the click is on our rotate button or its icon 
    const isRotateButton = e.target.id === 'rotate-news-source' || 
                           e.target.closest('#rotate-news-source') ||
                           e.target.classList.contains('rotate-icon');
    
    // Skip stopPropagation for TMDB elements
    if (isTmdbElement) {
      console.log("Allowing TMDB element click to propagate", e.target);
      return; // Exit early without stopping propagation
    }
    
    // Skip stopPropagation for rotate button
    if (isRotateButton) {
      console.log("Allowing rotate button click to propagate");
      return; // Exit early without stopping propagation
    }
    
    if (contentBox || isTrailerControl) {
      console.log("Click inside content box or on trailer controls", e.target);
      e.stopPropagation();
      
      // For volume slider, also prevent default to avoid slider issues
      if (e.target.classList.contains('volume-slider')) {
        // Let the slider work but prevent bubbling
        e.stopImmediatePropagation();
      }
    }
  }, true); // Use capturing phase to catch events before they reach other handlers
  
  // Add resize listener to ensure detail boxes stay with their logo clones
  window.addEventListener('resize', handleResize);
  
  // Connect EntertainmentNews module with Jellyfin logo clicks if available
  if (window.EntertainmentNews && typeof window.EntertainmentNews.connectJellyfinLogoClick === 'function') {
    window.EntertainmentNews.connectJellyfinLogoClick();
  } else {
    // If not immediately available, wait a short time and try again
    setTimeout(() => {
      if (window.EntertainmentNews && typeof window.EntertainmentNews.connectJellyfinLogoClick === 'function') {
        window.EntertainmentNews.connectJellyfinLogoClick();
      }
    }, 2000);
  }
}

function handleResize() {
  // Find active clone group
  const activeCloneGroup = document.querySelector('.clone-group.active');
  if (activeCloneGroup) {
    const appName = activeCloneGroup.getAttribute('data-app');
    const detail = activeCloneGroup.querySelector(`.${appName}-detail`);
    
    // If the detail box is in the clone group, make sure it's properly positioned
    if (detail) {
      // Reapply the positioning to ensure it stays with the clone
      detail.style.position = 'absolute';
      detail.style.top = `${window.mainPageState.detailOffsets[appName]}px`;
      detail.style.left = '50%';
      detail.style.transform = 'translateX(-50%)';
    }
  }
}

// Add a direct test click function to the global scope for debugging
window.testClickJellyfin = function() {
  console.log("Manual test click on Jellyfin");
  try {
    showAppDetails('jellyfin');
    setTimeout(() => {
      if (window.contentBoxManager) {
        window.contentBoxManager.showContentBoxes('jellyfin');
      }
    }, 50);
  } catch (e) {
    console.error("Error in showAppDetails:", e);
  }
};