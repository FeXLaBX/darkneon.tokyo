// 4. LOADING INDICATOR SYSTEM
// Provides consistent loading UI feedback

/**
 * Loading Indicator System
 * Provides visual feedback during asynchronous operations
 */
// loading-indicators.js
export const LoadingIndicator = {
    // Tracks loading operations by key
    loadingOperations: {},
    
    // Start a loading operation
    startLoading(operationKey, message = 'Loading...') {
      this.loadingOperations[operationKey] = {
        startTime: Date.now(),
        message
      };
      
      this._updateLoadingUI();
      
      // Notify the event bus
      if (window.EventBus) {
        window.EventBus.emit(window.EventBus.Events.CONTENT_LOADING, {
          operationKey,
          message
        });
      }
    },
    
    // End a loading operation
    endLoading(operationKey) {
      if (this.loadingOperations[operationKey]) {
        const duration = Date.now() - this.loadingOperations[operationKey].startTime;
        delete this.loadingOperations[operationKey];
        
        this._updateLoadingUI();
        
        // Notify the event bus
        if (window.EventBus) {
          window.EventBus.emit(window.EventBus.Events.CONTENT_LOADED, {
            operationKey,
            duration
          });
        }
        
        return duration; // Return the operation duration
      }
      
      return 0;
    },
    
    // Check if any operations are loading
    isLoading() {
      return Object.keys(this.loadingOperations).length > 0;
    },
    
    // Get active loading operations
    getActiveLoadingOperations() {
      return {...this.loadingOperations};
    },
    
    // Update loading UI based on current state
    _updateLoadingUI() {
      // If we have a loading indicator element, update it
      const loadingIndicator = document.getElementById('loading-indicator');
      if (loadingIndicator) {
        if (this.isLoading()) {
          // Show loading indicator
          loadingIndicator.style.display = 'block';
          
          // Set message to the most recent operation
          const operations = Object.values(this.loadingOperations);
          if (operations.length > 0) {
            const messageElement = loadingIndicator.querySelector('.loading-message');
            if (messageElement) {
              messageElement.textContent = operations[operations.length - 1].message;
            }
          }
        } else {
          // Hide loading indicator
          loadingIndicator.style.display = 'none';
        }
      }
    },
    
    // Create the loading indicator element if it doesn't exist
    createLoadingIndicator() {
      if (!document.getElementById('loading-indicator')) {
        const loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'loading-indicator';
        loadingIndicator.className = 'loading-indicator';
        loadingIndicator.innerHTML = `
          <div class="loading-spinner"></div>
          <div class="loading-message">Loading...</div>
        `;
        
        // Add loading indicator styles
        const style = document.createElement('style');
        style.textContent = `
          .loading-indicator {
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: var(--matrix-green);
            border: 1px solid var(--matrix-green);
            padding: 10px 15px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            z-index: 1000;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            display: none;
          }
          
          .loading-spinner {
            width: 16px;
            height: 16px;
            border: 2px solid rgba(0, 255, 0, 0.3);
            border-radius: 50%;
            border-top-color: var(--matrix-green);
            animation: spin 1s linear infinite;
            margin-right: 10px;
          }
          
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(loadingIndicator);
      }
    }
  };
  
  // Initialize loading indicator when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    LoadingIndicator.createLoadingIndicator();
  });
  
  // Make it globally available
  window.LoadingIndicator = LoadingIndicator;