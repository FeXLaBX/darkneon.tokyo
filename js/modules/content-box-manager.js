// content-box-manager.js
import { EventBus } from './event-bus.js';

// Initialize the contentBoxes immediately on the window object to ensure it exists
window.contentBoxes = {};

// Export the initialization function
export function initializeContentBoxes() {
  console.log("Initializing content boxes...");
  
  // Apps to create content boxes for
  const apps = ['jellyfin', 'kavita', 'romm'];
  
  apps.forEach(app => {
    createContentBoxes(app);
  });
  
  // Add these boxes to clone groups
  attachContentBoxesToCloneGroups();
  
  // Set up and expose the content box manager API
  window.contentBoxManager = {
    showContentBoxes,
    hideContentBoxes,
    isReady: true // Flag to indicate readiness
  };
  
  // Dispatch a custom event to notify other modules that content boxes are ready
  const event = new CustomEvent('contentBoxesReady');
  window.dispatchEvent(event);
  
  console.log("Content boxes initialization complete, manager exposed globally");
  
  // Emit event using EventBus
  EventBus.emit(EventBus.Events.CONTENT_BOXES_READY, { boxCount: Object.keys(window.contentBoxes).length });
  
  return window.contentBoxes; // Return for module usage
}

// Create the three content boxes for an app
function createContentBoxes(appName) {
  // Get the main page element
  const mainPage = document.querySelector('.main-page');
  if (!mainPage) {
    console.error("Main page element not found");
    return;
  }
  
  // Create the three content boxes
  const positions = ['left', 'right', 'bottom'];
  const boxTypes = {
    'jellyfin': {
      'left': 'movie-tv-charts',
      'right': 'media-news',
      'bottom': 'media-trailers'
    },
    'kavita': {
      'left': 'reading-charts',
      'right': 'reading-news',
      'bottom': 'latest-releases'
    },
    'romm': {
      'left': 'game-charts',
      'right': 'gaming-news',
      'bottom': 'game-trailers'
    }
  };
  
  // Ensure app namespace exists in contentBoxes
  if (!window.contentBoxes[appName]) {
    window.contentBoxes[appName] = {};
  }
  
  // Create boxes for this app
  positions.forEach(position => {
    const boxType = boxTypes[appName][position];
    
    // Create the content box
    const contentBox = document.createElement('div');
    contentBox.className = `content-box content-box-${position} ${appName}-${boxType}`;
    contentBox.setAttribute('data-app', appName);
    contentBox.setAttribute('data-position', position);
    contentBox.setAttribute('data-type', boxType);
    
    // Add initial content based on type
    let initialContent = '';
    let headerText = getHeaderText(boxType);
    
    // Add header and content
    contentBox.innerHTML = `
      <h3 class="content-box-header">${headerText}</h3>
      <div class="content-box-content">
        <div class="loading-content"><span class="loading-spinner"></span>Loading ${headerText.toLowerCase()}...</div>
      </div>
    `;
    
    // Add to the main page initially
    mainPage.appendChild(contentBox);
    
    // IMPORTANT: Store the content box in the global contentBoxes object
    window.contentBoxes[appName][position] = contentBox;
    
    console.log(`Created ${appName} ${position} content box for ${boxType}`);
  });
}

function getHeaderText(boxType) {
  switch(boxType) {
    case 'movie-tv-charts': return 'Top Movies & TV Shows';
    case 'media-trailers': return 'Latest Trailers';
    case 'media-news': return 'Entertainment News';
    case 'reading-charts': return 'Popular Reading';
    case 'latest-releases': return 'New Releases';
    case 'reading-news': return 'Reading News';
    case 'game-charts': return 'Top Games';
    case 'game-trailers': return 'Game Trailers';
    case 'gaming-news': return 'Gaming News';
    default: return 'Related Content';
  }
}

// Attach content boxes to their respective clone groups
function attachContentBoxesToCloneGroups() {
  // Get all clone groups
  const cloneGroups = document.querySelectorAll('.clone-group');
  
  cloneGroups.forEach(group => {
    const appName = group.getAttribute('data-app');
    if (!appName) return;
    
    // Find all content boxes for this app
    const appContentBoxes = document.querySelectorAll(`.content-box[data-app="${appName}"]`);
    
    // We store references when creating, but double-check here to be sure
    if (!window.contentBoxes[appName]) window.contentBoxes[appName] = {};
    
    appContentBoxes.forEach(box => {
      const position = box.getAttribute('data-position');
      if (position) {
        window.contentBoxes[appName][position] = box;
      }
    });
  });
  
  console.log("Content boxes attached and references stored, boxes ready to use");
}

// Show content boxes for an app
export function showContentBoxes(appName) {
  if (!window.contentBoxes || !window.contentBoxes[appName]) {
    console.error(`Cannot show content boxes for ${appName}: contentBoxes not ready`);
    return;
  }
  
  console.log(`Showing content boxes for ${appName}`);
  
  // Get the clone group for this app
  const cloneGroup = document.querySelector(`.clone-group[data-app="${appName}"]`);
  if (!cloneGroup) {
    console.error(`Clone group for ${appName} not found`);
    return;
  }
  
  // Get the positions
  const positions = ['left', 'right', 'bottom'];
  
  // Move each content box to the clone group and show it
  positions.forEach(position => {
    const box = window.contentBoxes[appName][position];
    if (!box) {
      console.warn(`Content box for ${appName} at position ${position} not found`);
      return;
    }
    
    // Remove from current parent if any
    if (box.parentNode) {
      box.parentNode.removeChild(box);
    }
    
    // Add to clone group
    cloneGroup.appendChild(box);
    
    // Show with slight delay based on position
    setTimeout(() => {
      box.classList.add('active');
      console.log(`Box ${position} for ${appName} activated`);
    }, position === 'left' ? 100 : position === 'right' ? 200 : 300);
  });
}

// Hide content boxes for an app
export function hideContentBoxes(appName) {
  if (!window.contentBoxes || !window.contentBoxes[appName]) {
    console.error(`Cannot hide content boxes for ${appName}: contentBoxes not ready`);
    return;
  }
  
  console.log(`Hiding content boxes for ${appName}`);
  
  // Get the positions
  const positions = ['left', 'right', 'bottom'];
  
  // Add the fading-out class to each content box
  positions.forEach(position => {
    const box = window.contentBoxes[appName][position];
    if (!box) {
      console.warn(`Content box for ${appName} at position ${position} not found`);
      return;
    }
    
    box.classList.remove('active');
    box.classList.add('fading-out');
  });
  
  // After the animation completes, move the boxes back to the main page
  setTimeout(() => {
    const mainPage = document.querySelector('.main-page');
    if (!mainPage) return;
    
    positions.forEach(position => {
      const box = window.contentBoxes[appName][position];
      if (!box || !box.parentNode) return;
      
      // Remove from current parent
      box.parentNode.removeChild(box);
      
      // Reset classes
      box.classList.remove('active', 'fading-out');
      
      // Add to main page (hidden)
      mainPage.appendChild(box);
    });
  }, 1000); // Match the fadeOutContent animation duration
}