// logo-manager.js
import { getMainPageElements } from './mainpage-core.js';

const cloneGroups = {};
const clones = {};

export function initializeLogos() {
  const { logos, cloneContainer } = getMainPageElements();
  
  // Create groups for each logo-clone and its detail box
  logos.forEach(logo => {
    const appName = logo.getAttribute('data-app');
    
    // Create a group container for this app
    const group = createCloneGroup(logo, appName);
    cloneGroups[appName] = group;
    
    // Store reference to the clone for easy access
    clones[appName] = group.querySelector('.logo-clone');
  });
  
  // Add them to the container in the same order as the originals
  logos.forEach(logo => {
    const appName = logo.getAttribute('data-app');
    cloneContainer.appendChild(cloneGroups[appName]);
  });
  
  console.log(`Found ${logos.length} logos and created clone groups`);
}

// Function to create a group containing only a logo clone
function createCloneGroup(originalLogo, appName) {
  // Create the group container
  const group = document.createElement('div');
  group.className = `clone-group ${appName}-group`;
  group.setAttribute('data-app', appName);
  
  // Create the logo clone
  const clone = document.createElement('div');
  clone.className = `logo-clone ${appName}-clone`;
  clone.setAttribute('data-app', appName);
  
  // Copy the image
  const originalImg = originalLogo.querySelector('.logo-img');
  const img = document.createElement('img');
  img.src = originalImg.src;
  img.alt = originalImg.alt;
  img.className = 'logo-img';
  
  clone.appendChild(img);
  
  // Add custom styles
  if (originalLogo.classList.contains('jellyfin-logo')) {
    clone.classList.add('jellyfin-clone');
  } else if (originalLogo.classList.contains('kavita-logo')) {
    clone.classList.add('kavita-clone');
  } else if (originalLogo.classList.contains('romm-logo')) {
    clone.classList.add('romm-clone');
  }
  
  // Add the clone to the group
  group.appendChild(clone);
  
  return group;
}

export function getCloneGroup(appName) {
  return cloneGroups[appName];
}

export function getClone(appName) {
  return clones[appName];
}

// Add this new function to fix the error
export function getCloneGroups() {
  return cloneGroups;
}