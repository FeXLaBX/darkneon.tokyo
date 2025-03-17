// Load version info partial
document.addEventListener('DOMContentLoaded', function() {
    // Function to load HTML partials
    function loadPartial(partialPath, targetSelector) {
        fetch(partialPath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load partial: ${partialPath}`);
                }
                return response.text();
            })
            .then(html => {
                const targetElement = document.querySelector(targetSelector);
                if (targetElement) {
                    targetElement.insertAdjacentHTML('beforeend', html);
                    
                    // Hide the version info until main page is visible
                    const versionInfo = document.querySelector('.version-info');
                    if (versionInfo) {
                        versionInfo.style.opacity = '0';
                        versionInfo.style.visibility = 'hidden';
                        
                        // Show version info when main page becomes visible
                        const mainPage = document.querySelector('.main-page');
                        if (mainPage) {
                            // Create a mutation observer to watch for class changes
                            const observer = new MutationObserver(function(mutations) {
                                mutations.forEach(function(mutation) {
                                    if (mutation.type === 'attributes' && 
                                        mutation.attributeName === 'class') {
                                        // Check if main page is now visible
                                        if (mainPage.classList.contains('visible')) {
                                            console.log("Main page visible, showing version info");
                                            // Use transition for version info
                                            versionInfo.style.transition = 'opacity 4s ease-out, visibility 0s';
                                            versionInfo.style.opacity = '0.6';
                                            versionInfo.style.visibility = 'visible';
                                            
                                            // Also show config button when main page is visible
                                            const configButton = document.getElementById('configButton');
                                            if (configButton) {
                                                console.log("Showing config button");
                                                configButton.style.transition = 'opacity 4s ease-out, visibility 0s';
                                                configButton.style.opacity = '0.6';
                                                configButton.style.visibility = 'visible';
                                            }
                                        } else {
                                            versionInfo.style.opacity = '0';
                                            versionInfo.style.visibility = 'hidden';
                                            
                                            // Also hide config button when main page is not visible
                                            const configButton = document.getElementById('configButton');
                                            if (configButton) {
                                                configButton.style.opacity = '0';
                                                configButton.style.visibility = 'hidden';
                                            }
                                        }
                                    }
                                });
                            });
                            
                            // Start observing
                            observer.observe(mainPage, { attributes: true });
                            
                            // Initial check in case main page is already visible - with delay to ensure proper transition
                            setTimeout(() => {
                                if (mainPage.classList.contains('visible')) {
                                    console.log("Main page already visible, showing version info with transition");
                                    // Reset opacity to 0 first to ensure transition is visible
                                    versionInfo.style.opacity = '0';
                                    
                                    // Use setTimeout to force a repaint before starting the transition
                                    setTimeout(() => {
                                        versionInfo.style.transition = 'opacity 4s ease-out, visibility 0s';
                                        versionInfo.style.opacity = '0.6';
                                        versionInfo.style.visibility = 'visible';
                                        
                                        // Also show config button if main page is already visible
                                        const configButton = document.getElementById('configButton');
                                        if (configButton) {
                                            console.log("Showing config button (initial check)");
                                            configButton.style.opacity = '0';
                                            setTimeout(() => {
                                                configButton.style.transition = 'opacity 4s ease-out, visibility 0s';
                                                configButton.style.opacity = '0.6';
                                                configButton.style.visibility = 'visible';
                                            }, 10);
                                        }
                                    }, 10);
                                }
                            }, 100);
                        }
                    }
                } else {
                    console.error(`Target element not found: ${targetSelector}`);
                }
            })
            .catch(error => {
                console.error('Error loading partial:', error);
            });
    }
    
    // Load the version info partial
    loadPartial('partials/version-info.html', 'body');
});

// Add keyboard shortcut to toggle TV static visibility
document.addEventListener('keydown', function(event) {
    // Check if Ctrl+O is pressed (keyCode 79 is 'o')
    if (event.ctrlKey && event.keyCode === 79) {
        event.preventDefault(); // Prevent default browser action
        
        // Toggle only the TV static opacity
        const tvStatic = document.querySelector('.tv-static');
        if (tvStatic) {
            // Get the current state
            const isCurrentlyVisible = tvStatic.style.opacity !== '0';
            
            // Toggle the visibility
            tvStatic.style.opacity = isCurrentlyVisible ? '0' : '0.4';
            
            // Update the toggle button in the config menu
            const staticToggle = document.getElementById('staticToggle');
            if (staticToggle) {
                // Set the checkbox state to match the TV static visibility
                staticToggle.checked = !isCurrentlyVisible;
                
                // Update the config state
                if (window.configState) {
                    window.configState.enableTVStatic = !isCurrentlyVisible;
                    
                    // Save to localStorage if the saveConfig function exists
                    if (typeof window.saveConfig === 'function') {
                        window.saveConfig();
                    } else {
                        // Fallback: save directly to localStorage
                        try {
                            localStorage.setItem('darkneonConfig', JSON.stringify(window.configState));
                            console.log("Saved config after shortcut toggle:", window.configState);
                        } catch (error) {
                            console.error("Error saving config after shortcut toggle:", error);
                        }
                    }
                }
            }
            
            console.log("TV static visibility toggled via shortcut. New state:", !isCurrentlyVisible);
        }
    }
});

console.log("version-info.js loaded with main page visibility detection");
