// State management
let isExpanding = false;
let isExpanded = false;
let hasTypedIntro = false; // Track if intro has been typed already

// Authentication configuration
const validCredentials = {
    'admin': 'password123' // Replace with your actual credentials
};

// DOM Elements
const username = document.getElementById('username');
const password = document.getElementById('password');
const enterButton = document.getElementById('enterButton');
const authForm = document.querySelector('.auth-form');
const matrixHeading = document.querySelector('.matrix-heading');
const matrixSubtext = document.querySelector('.matrix-subtext');
const authContainer = document.querySelector('.auth-container');
const maskOverlay = document.querySelector('.mask-overlay');
const glowLayers = document.querySelectorAll('.glow-layer, .wallpaper-glow, .wallpaper-outer-glow');

// Cursor elements (will be created dynamically)
let headingCursor = null;
let subtextCursor = null;

// Create cursor elements
function createCursorElements() {
    // Remove any existing cursors
    document.querySelectorAll('.cursor-element').forEach(el => el.remove());
    
    // Create heading cursor
    headingCursor = document.createElement('span');
    headingCursor.className = 'cursor-element';
    
    // Create subtext cursor
    subtextCursor = document.createElement('span');
    subtextCursor.className = 'cursor-element';
    
    // Add to DOM
    document.querySelector('.auth-container').appendChild(headingCursor);
    document.querySelector('.auth-container').appendChild(subtextCursor);
    
    // Hide subtext cursor initially
    subtextCursor.style.display = 'none';
    
    // Position them correctly
    setTimeout(() => {
        positionCursor(headingCursor, matrixHeading);
        positionCursor(subtextCursor, matrixSubtext);
    }, 100); // Short delay to ensure elements are rendered
}

// Position cursor properly
function positionCursor(cursor, textElement) {
    const rect = textElement.getBoundingClientRect();
    const containerRect = document.querySelector('.auth-container').getBoundingClientRect();
    
    cursor.style.left = (rect.left - containerRect.left) + 'px';
    cursor.style.top = (rect.top - containerRect.top) + 'px';
    cursor.style.height = rect.height + 'px';
}

// Cursor position update function
function updateMousePosition(x, y) {
    const percentX = (x / window.innerWidth) * 100;
    const percentY = (y / window.innerHeight) * 100;
    document.documentElement.style.setProperty('--x', `${percentX}%`);
    document.documentElement.style.setProperty('--y', `${percentY}%`);
}

// Simplified animation sequence
function startTextSequence() {
    console.log("Starting text sequence");
    
    // Reset text content
    matrixHeading.textContent = 'Welcome to darkneon.tokyo';
    matrixSubtext.textContent = 'To enter BoFexLab please type in your password:';
    
    // Make sure text elements are visible but with zero width
    matrixHeading.style.visibility = 'visible';
    matrixHeading.style.width = '0';
    matrixSubtext.style.visibility = 'visible';
    matrixSubtext.style.width = '0';
    
    // Create and position cursors
    createCursorElements();
    
    // Show heading cursor immediately
    headingCursor.style.display = 'block';
    
    // After 3 seconds, start heading animation
    setTimeout(() => {
        console.log("Starting heading animation");
        matrixHeading.classList.add('typing-animation');
        headingCursor.style.display = 'none'; // Hide cursor when typing starts
        
        // After heading animation completes, show subtext cursor
        setTimeout(() => {
            console.log("Heading animation complete, showing subtext cursor");
            subtextCursor.style.display = 'block';
            
            // After 3 more seconds, start subtext animation
            setTimeout(() => {
                console.log("Starting subtext animation");
                matrixSubtext.classList.add('typing-animation');
                subtextCursor.style.display = 'none'; // Hide cursor when typing starts
                
                // After subtext animation completes, show form
                setTimeout(() => {
                    console.log("Showing auth form");
                    authForm.classList.add('visible');
                    
                    // Add auto-focus to username field
                    setTimeout(() => {
                        username.focus();
                    }, 100); // Small delay to ensure form is visible
                }, 5500);
            }, 3000);
        }, 4000);
    }, 3000);
}

// CSS-based animation initialization
function initializeAuth() {
    console.log("Initialize Auth called. Expanded:", document.body.classList.contains('expanded'));
    
    if (document.body.classList.contains('expanded')) {
        console.log("Starting simplified animation sequence");
        
        // Make auth container visible
        authContainer.classList.add('visible');
        authForm.classList.remove('visible');
        
        // Reset text elements to initial state with no animations
        matrixHeading.className = 'matrix-heading';
        matrixSubtext.className = 'matrix-subtext';
        
        // Start the text sequence
        startTextSequence();
    }
}

// Expand the view
function expandView(x, y) {
    if (isExpanding || isExpanded) return;
    
    isExpanding = true;
    isExpanded = true;
    
    // Set the expansion point
    updateMousePosition(x, y);
    
    // Phase 1: Fade out effects
    document.body.classList.add('expanding');
    
    // Phase 2: Expand the mask and initialize auth
    setTimeout(() => {
        document.body.classList.add('expanded');
        initializeAuth();
    }, 200); // Match --fade-duration
    
    // Reset the expanding flag after transitions complete
    setTimeout(() => {
        isExpanding = false;
    }, 900); // fade-duration + transition-duration
    
    console.log("View expanded");
}

// Collapse the view
function collapseView() {
    if (isExpanding || !isExpanded) return;
    
    console.log("Attempting to collapse view");
    
    // Set states
    isExpanding = true;
    isExpanded = false;
    
    // Reset animations
    matrixHeading.classList.remove('typing-animation');
    matrixSubtext.classList.remove('typing-animation');
    
    // Remove any cursor elements
    document.querySelectorAll('.cursor-element').forEach(el => el.remove());
    
    // Hide the auth container
    authContainer.classList.remove('visible');
    
    // Remove expanded class
    document.body.classList.remove('expanded');
    
    // Force the mask to transition back
    maskOverlay.style.transform = 'scale(1)';
    
    // Restore the glow layers after a delay
    setTimeout(() => {
        document.body.classList.remove('expanding');
        
        // Explicitly restore opacity of glow layers
        glowLayers.forEach(layer => {
            layer.style.opacity = '1';
        });
        
        // Clear any inline styles
        maskOverlay.removeAttribute('style');
        
        // Reset the expanding flag
        isExpanding = false;
        
        console.log("View collapsed");
    }, 700); // Just before transition duration ends
}

// Credential validation
function validateCredentials() {
    const isValid = validCredentials[username.value] === password.value;
    if (isValid) {
        enterButton.classList.add('visible');
    } else {
        enterButton.classList.remove('visible');
    }
}

// Transition sequence function
function startTransition() {
    document.body.classList.add('transitioning');

    // Check if transition is disabled in config
    if (window.configState && window.configState.enableTransition === false) {
        // Simple fade out/fade in transition
        console.log("Using simple fade transition (transition disabled in config)");
        
        const landingElements = document.querySelector('.wallpaper-container');
        const authContainer = document.querySelector('.auth-container');
        const mainPage = document.querySelector('.main-page');
        
        // Fade out landing page elements
        if (landingElements) {
            landingElements.style.transition = 'opacity 1s ease-out';
            landingElements.style.opacity = '0';
        }
        
        if (authContainer) {
            authContainer.style.transition = 'opacity 1s ease-out';
            authContainer.style.opacity = '0';
        }
        
        // Wait for fade out to complete
        setTimeout(() => {
            // Hide landing page elements
            if (landingElements) landingElements.style.visibility = 'hidden';
            if (authContainer) authContainer.style.visibility = 'hidden';
            
            // Show main page with fade effect
            if (mainPage) mainPage.classList.add('visible');
            
            // Remove the landing page elements from DOM
            if (landingElements) landingElements.remove();
            if (authContainer) authContainer.remove();
            
            document.body.classList.remove('transitioning');
        }, 1000); // 1 second fade out
        
        return; // Exit early, skip the rest of the transition
    }
    
    // Original transition with GIF and sound
    const transitionOverlay = document.querySelector('.transition-overlay');
    const mainPage = document.querySelector('.main-page');
    const errorSound = document.getElementById('error-sound');
    const landingElements = document.querySelector('.wallpaper-container');
    const authContainer = document.querySelector('.auth-container');
    
    console.log("Starting transition sequence with animation");
    
    // Hide landing page elements immediately
    if (landingElements) landingElements.style.visibility = 'hidden';
    if (authContainer) authContainer.style.visibility = 'hidden';
    
    // Show transition overlay instantly
    if (transitionOverlay) transitionOverlay.classList.add('visible');
    
    // Play sound if available
    if (errorSound) {
        errorSound.currentTime = 0; // Reset to beginning
        errorSound.volume = 1.0;    // Ensure full volume
        
        const playPromise = errorSound.play();
        
        // Modern browsers return a promise from play()
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.warn("Error playing sound:", error);
            });
        }
    } else {
        console.warn("Error sound element not found");
    }
    
    // GIF duration
    const gifDuration = 7400;
    
    // Optional: Add some console errors to developer console for authenticity
    setTimeout(() => {
        console.error("SYSTEM ERROR: Authentication matrix corrupted");
        console.error("SYSTEM: Attempting recovery protocol");
    }, 500);
    
    // Set up a safety check to ensure the main page becomes visible
    let mainPageVisible = false;
    
    // Main transition completion
    setTimeout(() => {
        console.log("Transition complete, showing main page");
        
        // Hide transition overlay instantly
        if (transitionOverlay) transitionOverlay.classList.remove('visible');
        
        // Show main page with fade effect
        if (mainPage) {
            mainPage.classList.add('visible');
            mainPageVisible = true;
        } else {
            console.error("Main page element not found!");
        }
        
        // Remove the landing page elements completely from DOM to free up resources
        if (landingElements) landingElements.remove();
        if (authContainer) authContainer.remove();

        document.body.classList.remove('transitioning');
    }, gifDuration);
    
    // Safety timeout to ensure main page is visible
    setTimeout(() => {
        if (!mainPageVisible && mainPage && !mainPage.classList.contains('visible')) {
            console.warn("Safety check: Main page not visible after transition, forcing visibility");
            mainPage.classList.add('visible');
        }
    }, gifDuration + 1000);
}

// Event Listeners
document.addEventListener('mousemove', (e) => {
    if (!isExpanding && !isExpanded) {
        updateMousePosition(e.clientX, e.clientY);
    }
});

// Single click handler - expand the view
document.addEventListener('click', (e) => {
    if (!isExpanded) {
        expandView(e.clientX, e.clientY);
    }
});

// Double click handler
document.addEventListener('dblclick', (e) => {
    e.preventDefault(); // Prevent default double-click behavior
    
    // Check if view is already expanded and not currently transitioning
    if (isExpanded && !isExpanding) {
        console.log("Double-click detected, collapsing view");
        collapseView();
    }
});

// Input field event listeners
if (username && password) {
    username.addEventListener('input', validateCredentials);
    password.addEventListener('input', validateCredentials);
}

// Form submission handler
document.querySelector('.auth-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    console.log("Form submitted");
    
    // Check if credentials are valid
    if (validCredentials[username.value] === password.value) {
        console.log("Valid credentials, starting transition");
        // Start transition sequence
        startTransition();
    } else {
        console.log("Invalid credentials");
    }
});

console.log("landingpage.js loaded with hide-cursor approach");
