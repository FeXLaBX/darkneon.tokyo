// 6. DEBUGGING TOOLS
// Provides debug features for development

/**
 * Debug Tools
 * Provides debugging utilities for development
 */
// debug-tools.js
export const DebugTools = {
    // Debug mode flag
    debugMode: false,
    
    // Initialize debug tools
    init() {
      // Check if debug mode is enabled via URL parameter
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('debug')) {
        this.enableDebugMode();
      }
      
      // Add keyboard shortcut (Ctrl+Shift+D) to toggle debug mode
      document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
          this.toggleDebugMode();
          e.preventDefault();
        }
      });
      
      console.log('Debug tools initialized. Use Ctrl+Shift+D to toggle debug mode.');
    },
    
    // Enable debug mode
    enableDebugMode() {
      this.debugMode = true;
      console.log('Debug mode enabled');
      
      // Add debug UI
      this._createDebugUI();
      
      // Listen for events to log
      this._setupEventListeners();
    },
    
    // Disable debug mode
    disableDebugMode() {
      this.debugMode = false;
      console.log('Debug mode disabled');
      
      // Remove debug UI
      const debugPanel = document.getElementById('debug-panel');
      if (debugPanel) {
        debugPanel.remove();
      }
      
      // Remove listeners (not implemented for brevity)
    },
    
    // Toggle debug mode
    toggleDebugMode() {
      if (this.debugMode) {
        this.disableDebugMode();
      } else {
        this.enableDebugMode();
      }
    },
    
    // Debug log - only prints in debug mode
    log(...args) {
      if (this.debugMode) {
        console.log('%c[DEBUG]', 'color: #00ff00', ...args);
      }
    },
    
    // Create debug UI panel
    _createDebugUI() {
      // Check if panel already exists
      if (document.getElementById('debug-panel')) {
        return;
      }
      
      // Create panel element
      const panel = document.createElement('div');
      panel.id = 'debug-panel';
      panel.style.cssText = `
        position: fixed;
        top: 0;
        right: 0;
        width: 300px;
        height: 100vh;
        background: rgba(0, 0, 0, 0.9);
        color: var(--matrix-green);
        border-left: 1px solid var(--matrix-green);
        font-family: 'Courier New', monospace;
        font-size: 12px;
        z-index: 10000;
        overflow-y: auto;
        transform: translateX(300px);
        transition: transform 0.3s ease;
      `;
      
      // Add header and content
      panel.innerHTML = `
        <div style="padding: 10px; border-bottom: 1px solid var(--matrix-green);">
          <h3 style="margin: 0;">DEBUG PANEL</h3>
          <button id="debug-toggle-panel" style="position: absolute; top: 10px; left: -30px; background: black; color: var(--matrix-green); border: 1px solid var(--matrix-green); cursor: pointer;">◀</button>
        </div>
        <div id="debug-content" style="padding: 10px;">
          <div id="debug-state"></div>
          <div id="debug-events" style="margin-top: 10px;"></div>
          <div id="debug-performance" style="margin-top: 10px;"></div>
        </div>
      `;
      
      // Add to document
      document.body.appendChild(panel);
      
      // Add toggle button handler
      const toggleButton = document.getElementById('debug-toggle-panel');
      let isPanelVisible = false;
      
      toggleButton.addEventListener('click', () => {
        isPanelVisible = !isPanelVisible;
        panel.style.transform = isPanelVisible ? 'translateX(0)' : 'translateX(300px)';
        toggleButton.textContent = isPanelVisible ? '▶' : '◀';
      });
      
      // Update UI with current state
      this._updateDebugState();
      
      // Set up periodic updates
      setInterval(() => this._updateDebugState(), 1000);
    },
    
    // Update debug panel with current state
    _updateDebugState() {
      if (!this.debugMode) return;
      
      const stateElement = document.getElementById('debug-state');
      if (stateElement) {
        // Get current state
        let stateHTML = '<h4>System State</h4>';
        
        // Add AppState info if available
        if (window.AppState) {
          stateHTML += `
            <div>Page: ${window.AppState.activePage}</div>
            <div>Active App: ${window.AppState.activeApp || 'None'}</div>
            <div>System Ready: ${window.AppState.isSystemReady()}</div>
            <h5>Components:</h5>
            <ul style="margin: 0; padding-left: 20px;">
          `;
          
          Object.entries(window.AppState.components).forEach(([component, state]) => {
            stateHTML += `<li>${component}: ${state.ready ? '✓' : '✗'}</li>`;
          });
          
          stateHTML += '</ul>';
        }
        
        // Add loading operations if available
        if (window.LoadingIndicator) {
          const operations = window.LoadingIndicator.getActiveLoadingOperations();
          const operationKeys = Object.keys(operations);
          
          if (operationKeys.length > 0) {
            stateHTML += '<h5>Loading Operations:</h5><ul style="margin: 0; padding-left: 20px;">';
            
            operationKeys.forEach(key => {
              const op = operations[key];
              const duration = Date.now() - op.startTime;
              stateHTML += `<li>${key}: ${op.message} (${duration}ms)</li>`;
            });
            
            stateHTML += '</ul>';
          }
        }
        
        stateElement.innerHTML = stateHTML;
      }
      
      // Update performance section if available
      const performanceElement = document.getElementById('debug-performance');
      if (performanceElement && window.PerformanceMonitor) {
        const metrics = window.PerformanceMonitor.getAllMetrics();
        let perfHTML = '<h4>Performance</h4>';
        
        Object.entries(metrics).forEach(([key, metric]) => {
          if (metric.durations && metric.durations.length > 0) {
            perfHTML += `
              <div>${key}: ${metric.lastDuration ? metric.lastDuration.toFixed(0) : 'N/A'}ms 
                (avg: ${metric.avgDuration ? metric.avgDuration.toFixed(0) : 'N/A'}ms)
              </div>
            `;
          }
        });
        
        performanceElement.innerHTML = perfHTML;
      }
    },
    
    // Set up event listeners
    _setupEventListeners() {
      if (!this.debugMode) return;
      
      // Listen for all custom events
      const eventTypes = [
        'contentBoxesReady',
        'jellyfinApiReady',
        'externalContentReady',
        'animationsReady',
        'systemReady',
        'appSelected',
        'appClosed',
        'contentLoading',
        'contentLoaded',
        'contentError',
        'appStateChange'
      ];
      
      eventTypes.forEach(eventType => {
        window.addEventListener(eventType, (e) => {
          this.log(`Event: ${eventType}`, e.detail);
          
          // Update event log
          const eventsElement = document.getElementById('debug-events');
          if (eventsElement) {
            const eventDiv = document.createElement('div');
            eventDiv.innerHTML = `
              <div style="border-bottom: 1px dashed rgba(0, 255, 0, 0.3); padding: 5px 0;">
                <strong>${eventType}</strong> at ${new Date().toLocaleTimeString()}
                <pre style="margin: 5px 0; font-size: 11px;">${JSON.stringify(e.detail, null, 2)}</pre>
              </div>
            `;
            
            eventsElement.insertBefore(eventDiv, eventsElement.firstChild);
            
            // Keep only last 20 events
            if (eventsElement.children.length > 20) {
              eventsElement.removeChild(eventsElement.lastChild);
            }
          }
        });
      });
    }
  };
  
  // Initialize debug tools when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    DebugTools.init();
  });
  
  // Make it globally available
  window.DebugTools = DebugTools;