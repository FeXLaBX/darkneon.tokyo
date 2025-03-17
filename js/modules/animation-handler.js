// animation-handler.js
import { getMainPageElements } from './mainpage-core.js';
import { getCloneGroup, getClone, getCloneGroups } from './logo-manager.js';
import { PerformanceMonitor } from './performance-monitoring.js';
import { EventBus } from './event-bus.js';

export function showAppDetails(appName) {
  console.log(`Showing details for ${appName}`);
  PerformanceMonitor.startTiming(`showAppDetails_${appName}`);
  
  try {
    // First, reset any active app
    resetActiveApp();
    
    const { logoContainer, logos } = getMainPageElements();
    
    // Mark logo container as having an active app
    if (logoContainer) {
      logoContainer.classList.add('app-active');
    } else {
      console.error("Logo container not found");
      return;
    }
    
    // Get the logo, clone group, and detail elements
    const logo = document.querySelector(`.${appName}-logo`);
    const cloneGroup = getCloneGroup(appName);
    const clone = getClone(appName);
    const detail = document.querySelector(`.${appName}-detail`);
    
    // Validation checks...
    if (!logo || !cloneGroup || !clone || !detail) {
      console.error(`Required elements not found for ${appName}`);
      return;
    }
    
    // Activate the corresponding background
    activateBackground(appName);
    
    // Get the CSS variable for animation duration
    const style = getComputedStyle(document.documentElement);
    const animDuration = parseFloat(style.getPropertyValue('--jellyfin-move-duration')) * 1000 || 1200;
    
    // Hide the original logo and make it unclickable
    logo.style.opacity = '0';
    logo.style.pointerEvents = 'none';
    
    // Set opacity of other logos to 0.3 and make them unclickable
    logos.forEach(otherLogo => {
      const otherAppName = otherLogo.getAttribute('data-app');
      if (otherAppName !== appName) {
        otherLogo.style.opacity = '0.3';
        otherLogo.style.pointerEvents = 'none';
      }
    });
    
    // Make sure the clone group is visible but not yet active
    cloneGroup.style.visibility = 'visible';
    cloneGroup.style.opacity = '1';
    
    // Move the detail box into the clone group to keep them together
    if (detail.parentNode) {
      detail.parentNode.removeChild(detail);
    }
    
    // Position the detail box relative to the clone group using the stored offset
    detail.style.position = 'absolute';
    detail.style.top = `${window.mainPageState.detailOffsets[appName]}px`;
    detail.style.left = '50%';
    detail.style.removeProperty('transform');

    // Add the detail box to the clone group
    cloneGroup.appendChild(detail);
    
    // Activate the clone group to start its movement animation
    setTimeout(() => {
      cloneGroup.classList.add('active');
      clone.classList.add('active');
      console.log(`${appName} clone group activated, animation duration: ${animDuration}ms`);
    }, 100);
    
    // Start fading in the detail box after a short delay
    setTimeout(() => {
      detail.classList.add('active');
      console.log(`${appName} details fading in`);
    }, 10);
    
    // Update global state
    window.mainPageState.isAppActive = true;
    window.mainPageState.activeAppName = appName;
    
    PerformanceMonitor.endTiming(`showAppDetails_${appName}`);
  } catch (e) {
    console.error("Error in showAppDetails:", e);
    PerformanceMonitor.endTiming(`showAppDetails_${appName}`);
  }
}

function activateBackground(appName) {
  const { appBackgrounds } = getMainPageElements();
  
  // Activate the corresponding background
  const background = document.querySelector(`.${appName}-bg`);
  if (background) {
    background.classList.add('active');
    
    // Hide the main background when app background is active
    const mainBackground = document.querySelector('.main-background');
    if (mainBackground) {
      mainBackground.style.opacity = '0';
    }
  } else {
    console.warn(`${appName} background not found`);
  }
}

export function resetActiveApp() {
  console.log("resetActiveApp called");
  
  try {
    const { logoContainer, logos, mainPage } = getMainPageElements();
    
    // Remove active class from logo container
    if (logoContainer) {
      logoContainer.classList.remove('app-active');
    }
    
    // Reset all logos and clone groups
    if (logos) {
      // Get the active clone group
      const activeCloneGroup = document.querySelector('.clone-group.active');
      console.log("Active clone group found:", !!activeCloneGroup);
      
      const detailsToMove = [];
      
      // Using the fixed function name getCloneGroups
      const cloneGroups = getCloneGroups();
      
      // Process all clone groups - using the object directly
      Object.values(cloneGroups).forEach(group => {
        const appName = group.getAttribute('data-app');
        const detail = group.querySelector(`.${appName}-detail`);
        
        if (detail) {
          detailsToMove.push({
            detail: detail,
            appName: appName
          });
          
          // Apply the fading-out class
          detail.style.visibility = 'visible';
          detail.style.opacity = '1';
          
          // Remove active class and add fading-out class
          detail.classList.remove('active');
          detail.classList.add('fading-out');
        }
      });
      
      // Remove active class from all clone groups to start transition
      Object.values(cloneGroups).forEach(group => {
        group.classList.remove('active');
        const clone = group.querySelector('.logo-clone');
        if (clone) {
          clone.classList.remove('active');
        }
      });
      
      // Handle cleanup once animations complete
      if (activeCloneGroup) {
        let cleanupDone = false;
        
        // Create a cleanup function that can be called from either the event or timeout
        const performCleanup = function() {
          // Skip if cleanup was already done
          if (cleanupDone) return;
          cleanupDone = true;
          
          console.log("Performing cleanup after animation");
          
          // Now it's safe to move detail boxes back to main page
          detailsToMove.forEach(item => {
            const { detail, appName } = item;
            
            if (detail && detail.parentNode) {
              console.log(`Moving ${appName} detail back to main page`);
              
              // Remove from clone group
              detail.parentNode.removeChild(detail);
              
              // Instead of removing all styles at once, just change what's needed
              // while keeping the current position to avoid visual jumps
              const currentStyles = window.getComputedStyle(detail);
              const currentOpacity = currentStyles.getPropertyValue('opacity');
              
              // Keep current position but ensure it's hidden
              detail.style.opacity = currentOpacity; // Preserve current opacity during transition
              detail.style.position = 'absolute';
              detail.style.left = '50%';
              detail.style.transform = 'translateX(-50%) translateY(-100vh)'; // Move off-screen to the top
              
              // Remove classes after preserving necessary styles
              detail.classList.remove('active');
              detail.classList.remove('fading-out');
              
              // Add back to main page
              mainPage.appendChild(detail);
            }
          });
          
          // After transition, reset opacity and visibility
          Object.values(cloneGroups).forEach(group => {
            group.style.opacity = '0';
            group.style.visibility = 'hidden';
          });
          
          // Show all original logos and restore clickability
          logos.forEach(logo => {
            logo.style.opacity = '1';
            logo.style.pointerEvents = 'auto'; // Restore clickability
          });
          
          console.log("Cleanup completed");
          
          // Remove the event listener
          activeCloneGroup.removeEventListener('transitionend', transitionEndHandler);
          
          // Clear the timeout
          clearTimeout(fallbackTimeoutId);
        };
        
        // TransitionEnd handler just calls the cleanup function
        const transitionEndHandler = function(e) {
          console.log("transitionend fired for", e.propertyName, "on", e.target.className);
          performCleanup();
        };
        
        console.log("Adding transitionend listener to active clone group");
        
        // Listen for the transition end event
        activeCloneGroup.addEventListener('transitionend', transitionEndHandler);
        
        // IMPORTANT: Get the transition duration from CSS
        const style = getComputedStyle(document.documentElement);
        const transitionDuration = parseFloat(style.getPropertyValue('--jellyfin-move-duration')) * 1000 || 1200;
        console.log("Transition duration:", transitionDuration, "ms");
        
        // Set up fallback timeout with a bit more buffer
        const fallbackTime = transitionDuration + 200; // Add 200ms buffer
        console.log("Setting fallback timeout for", fallbackTime, "ms");
        
        const fallbackTimeoutId = setTimeout(() => {
          console.log("Fallback timeout triggered");
          performCleanup();
        }, fallbackTime);
      } else {
        console.log("No active clone group found, resetting immediately");
        
        // No active clone group, move detail boxes immediately
        detailsToMove.forEach(item => {
          const { detail, appName } = item;
          
          if (detail && detail.parentNode) {
            // Remove from clone group
            detail.parentNode.removeChild(detail);
            
            // Instead of removing all styles at once, just change what's needed
            // while keeping the current position to avoid visual jumps
            const currentStyles = window.getComputedStyle(detail);
            const currentOpacity = currentStyles.getPropertyValue('opacity');
            
            // Keep current position but ensure it's hidden
            detail.style.opacity = currentOpacity; // Preserve current opacity during transition
            detail.style.position = 'absolute';
            detail.style.left = '50%';
            detail.style.transform = 'translateX(-50%) translateY(-100vh)'; // Move off-screen to the top
            
            // Remove classes after preserving necessary styles
            detail.classList.remove('active');
            detail.classList.remove('fading-out');
            
            // Add back to main page
            mainPage.appendChild(detail);
          }
        });
        
        // Just reset everything
        Object.values(cloneGroups).forEach(group => {
          group.style.opacity = '0';
          group.style.visibility = 'hidden';
        });
        
        // Show all original logos and restore clickability
        logos.forEach(logo => {
          logo.style.opacity = '1';
          logo.style.pointerEvents = 'auto'; // Restore clickability
        });
      }
    }
    
    // Reset all backgrounds
    resetBackgrounds();
    
    // Update global state
    window.mainPageState.isAppActive = false;
    const previousActiveApp = window.mainPageState.activeAppName;
    window.mainPageState.activeAppName = null;
    
    // Explicitly emit the APP_CLOSED event to ensure cleanup
    if (previousActiveApp) {
      console.log(`Explicitly emitting APP_CLOSED event for ${previousActiveApp}`);
      EventBus.emit(EventBus.Events.APP_CLOSED, { appName: previousActiveApp });
      
      // Clean up any trailer players directly
      if (window.AnimeTrailerIntegration && typeof window.AnimeTrailerIntegration.cleanup === 'function') {
        console.log("Calling AnimeTrailerIntegration cleanup directly");
        window.AnimeTrailerIntegration.cleanup();
      }
    }
    
  } catch (e) {
    console.error("Error in resetActiveApp:", e);
  }
}

function resetBackgrounds() {
  const { appBackgrounds } = getMainPageElements();
  
  // Reset all backgrounds
  if (appBackgrounds) {
    appBackgrounds.forEach(bg => {
      bg.classList.remove('active');
    });
  }
  
  // Restore the main background opacity
  const mainBackground = document.querySelector('.main-background');
  if (mainBackground) {
    mainBackground.style.opacity = '0.15';
  }
}