// 3. ERROR RECOVERY SYSTEM
// Provides strategies for recovering from common errors

/**
 * Error Recovery System
 * Handles errors gracefully and attempts recovery when possible
 */
// error-recovery.js
export const ErrorRecovery = {
    // Maximum number of retries for operations
    MAX_RETRIES: 3,
    
    // Retry counters for different operations
    retryCounters: {},
    
    // Retry an operation with exponential backoff
    async retryOperation(operationKey, operation, ...args) {
      if (!this.retryCounters[operationKey]) {
        this.retryCounters[operationKey] = 0;
      }
      
      try {
        // Attempt the operation
        return await operation(...args);
      } catch (error) {
        this.retryCounters[operationKey]++;
        
        if (this.retryCounters[operationKey] <= this.MAX_RETRIES) {
          // Calculate backoff time (exponential with jitter)
          const backoff = Math.min(1000 * Math.pow(2, this.retryCounters[operationKey] - 1), 10000);
          const jitter = Math.random() * 300;
          const delay = backoff + jitter;
          
          console.warn(`Operation ${operationKey} failed, retrying in ${Math.round(delay)}ms (attempt ${this.retryCounters[operationKey]} of ${this.MAX_RETRIES})`, error);
          
          // Wait and retry
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.retryOperation(operationKey, operation, ...args);
        } else {
          // Max retries exceeded, escalate error
          console.error(`Operation ${operationKey} failed after ${this.MAX_RETRIES} attempts`, error);
          
          // Notify the event bus of the error
          if (window.EventBus) {
            window.EventBus.emit(window.EventBus.Events.CONTENT_ERROR, {
              operationKey,
              error: error.message,
              attempts: this.retryCounters[operationKey]
            });
          }
          
          throw error;
        }
      }
    },
    
    // Reset retry counter for an operation
    resetRetryCounter(operationKey) {
      this.retryCounters[operationKey] = 0;
    },
    
    // Reset all retry counters
    resetAllRetryCounters() {
      this.retryCounters = {};
    },
    
    // Handle a non-critical error (log but don't crash)
    handleNonCriticalError(context, error) {
      console.warn(`Non-critical error in ${context}:`, error);
      
      // Notify the event bus
      if (window.EventBus) {
        window.EventBus.emit(window.EventBus.Events.CONTENT_ERROR, {
          context,
          error: error.message,
          critical: false
        });
      }
      
      // Return graceful degradation value
      return null;
    }
  };
  
  // Make it globally available
  window.ErrorRecovery = ErrorRecovery;