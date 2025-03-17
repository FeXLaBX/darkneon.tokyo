// Config Menu Functionality
console.log("config-menu.js loaded");

// Config state with defaults - make it globally accessible
window.configState = {
    enableTransition: true,
    enableTVStatic: true,
    staticOpacity: 40, // Default opacity percentage
    sessionTimeout: 30, // minutes
    authTimestamp: null
};

// DOM Elements
const configButton = document.getElementById('configButton');
const configMenu = document.getElementById('configMenu');
const transitionToggle = document.getElementById('transitionToggle');
const staticToggle = document.getElementById('staticToggle');
const staticOpacitySlider = document.getElementById('staticOpacity');
const sessionTimeoutInput = document.getElementById('sessionTimeout');
const tvStatic = document.querySelector('.tv-static');

// Load config from localStorage
function loadConfig() {
    const savedConfig = localStorage.getItem('darkneonConfig');
    if (savedConfig) {
        try {
            const parsedConfig = JSON.parse(savedConfig);
            window.configState = { ...window.configState, ...parsedConfig };
            console.log("Loaded config:", window.configState);
            
            // Apply loaded config to UI elements
            transitionToggle.checked = window.configState.enableTransition;
            staticToggle.checked = window.configState.enableTVStatic;
            staticOpacitySlider.value = window.configState.staticOpacity;
            sessionTimeoutInput.value = window.configState.sessionTimeout;
            
            // Apply TV static setting
            if (tvStatic) {
                const opacityValue = window.configState.enableTVStatic ?
                    (window.configState.staticOpacity / 100) : '0';
                tvStatic.style.opacity = opacityValue;
            }
        } catch (error) {
            console.error("Error loading config:", error);
        }
    }
}

// Save config to localStorage - make it globally accessible
window.saveConfig = function() {
    try {
        localStorage.setItem('darkneonConfig', JSON.stringify(window.configState));
        console.log("Saved config:", window.configState);
    } catch (error) {
        console.error("Error saving config:", error);
    }
};

// Toggle config menu visibility
function toggleConfigMenu() {
    configMenu.classList.toggle('visible');
}

// Close config menu
function closeConfigMenu() {
    configMenu.classList.remove('visible');
}

// Update config when toggle changes
function updateConfig() {
    window.configState.enableTransition = transitionToggle.checked;
    window.configState.enableTVStatic = staticToggle.checked;
    window.configState.staticOpacity = parseInt(staticOpacitySlider.value, 10);
    window.configState.sessionTimeout = parseInt(sessionTimeoutInput.value, 10) || 30;
    
    // Apply TV static setting immediately
    if (tvStatic) {
        const opacityValue = window.configState.enableTVStatic ?
            (window.configState.staticOpacity / 100) : '0';
        tvStatic.style.opacity = opacityValue;
    }
    
    window.saveConfig();
}

// Store authentication timestamp
function storeAuthentication() {
    window.configState.authTimestamp = Date.now();
    window.saveConfig();
    console.log("Authentication timestamp stored");
}

// Check if authentication is still valid
function isAuthenticationValid() {
    if (!window.configState.authTimestamp) {
        return false;
    }
    
    const now = Date.now();
    const timeoutMillis = window.configState.sessionTimeout * 60 * 1000;
    const isValid = (now - window.configState.authTimestamp) < timeoutMillis;
    
    console.log("Auth check:", isValid ? "valid" : "expired",
                "Elapsed:", Math.round((now - window.configState.authTimestamp) / 1000 / 60), "minutes",
                "Timeout:", window.configState.sessionTimeout, "minutes");
    
    return isValid;
}

// Debug helper function removed

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log("Config menu initializing");
    
    // Load config first
    loadConfig();
    
    // Config button click
    if (configButton) {
        configButton.addEventListener('click', toggleConfigMenu);
    }
    
    // Toggle changes
    if (transitionToggle) {
        transitionToggle.addEventListener('change', updateConfig);
    }
    
    if (staticToggle) {
        staticToggle.addEventListener('change', updateConfig);
    }
    
    if (staticOpacitySlider) {
        staticOpacitySlider.addEventListener('input', updateConfig);
    }
    
    if (sessionTimeoutInput) {
        sessionTimeoutInput.addEventListener('change', updateConfig);
    }
    
    // Check for authentication on page load
    checkAuthenticationOnLoad();
    
    // Add click event listener to close menu when clicking outside
    document.addEventListener('click', function(event) {
        // If the menu is visible
        if (configMenu.classList.contains('visible')) {
            // Check if the click is outside the menu and not on the config button
            if (!configMenu.contains(event.target) && event.target !== configButton) {
                closeConfigMenu();
            }
        }
    });
});

// Main entry point to check authentication on page load
function checkAuthenticationOnLoad() {
    if (isAuthenticationValid()) {
        console.log("Valid authentication found, skipping landing page");
        
        // Hide landing page elements
        const landingElements = document.querySelector('.wallpaper-container');
        const authContainer = document.querySelector('.auth-container');
        
        if (landingElements) {
            landingElements.style.display = 'none';
        }
        
        if (authContainer) {
            authContainer.style.display = 'none';
        }
        
        // Show main page directly
        const mainPage = document.querySelector('.main-page');
        if (mainPage) {
            mainPage.classList.add('visible');
        }
    } else {
        console.log("No valid authentication, showing landing page");
    }
}

// Store authentication when transition completes
function storeTransitionAuthentication() {
    storeAuthentication();
}

// Override the form submission handler to use the original transition
document.addEventListener('DOMContentLoaded', function() {
    // Carefully modify the form submission behavior without disrupting animations
    setTimeout(() => {
        const authForm = document.querySelector('.auth-form');
        
        if (authForm) {
            console.log("Setting up modified form handler");
            
            // Instead of replacing the form, just add our own listener
            authForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                console.log("Form submitted with modified handler");
                
                // Check if credentials are valid
                const username = document.getElementById('username');
                const password = document.getElementById('password');
                
                if (validCredentials && validCredentials[username.value] === password.value) {
                    console.log("Valid credentials, starting transition");
                    // Start the original transition (which now respects the config setting)
                    startTransition();
                    
                    // Store authentication timestamp when transition completes
                    setTimeout(storeTransitionAuthentication, 500);
                } else {
                    console.log("Invalid credentials");
                }
            });
        }
    }, 500); // Small delay to ensure other scripts have initialized
});
