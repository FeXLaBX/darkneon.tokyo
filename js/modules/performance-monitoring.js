// 5. PERFORMANCE MONITORING
// Tracks and logs performance metrics

/**
 * Performance Monitoring System
 * Tracks timing of operations for optimization
 */
// performance-monitoring.js
export const PerformanceMonitor = {
    // Performance metrics storage
    metrics: {},
    
    // Start timing an operation
    startTiming(operationKey) {
      if (!this.metrics[operationKey]) {
        this.metrics[operationKey] = {};
      }
      
      this.metrics[operationKey].startTime = performance.now();
      return this.metrics[operationKey].startTime;
    },
    
    // End timing and record metric
    endTiming(operationKey) {
      if (this.metrics[operationKey] && this.metrics[operationKey].startTime) {
        const endTime = performance.now();
        const duration = endTime - this.metrics[operationKey].startTime;
        
        // Store the duration
        if (!this.metrics[operationKey].durations) {
          this.metrics[operationKey].durations = [];
        }
        
        this.metrics[operationKey].durations.push(duration);
        
        // Calculate averages
        this.metrics[operationKey].lastDuration = duration;
        this.metrics[operationKey].avgDuration = this.metrics[operationKey].durations.reduce((sum, val) => sum + val, 0) / 
          this.metrics[operationKey].durations.length;
        
        // Log if operation is slow (> 1000ms)
        if (duration > 1000) {
          console.warn(`Slow operation detected: ${operationKey} took ${duration.toFixed(2)}ms`);
        }
        
        return duration;
      }
      
      return 0;
    },
    
    // Get metrics for an operation
    getMetrics(operationKey) {
      return this.metrics[operationKey] || null;
    },
    
    // Get all metrics
    getAllMetrics() {
      return {...this.metrics};
    },
    
    // Log performance report
    logPerformanceReport() {
      console.group('Performance Report');
      
      Object.keys(this.metrics).forEach(key => {
        const metric = this.metrics[key];
        if (metric.durations && metric.durations.length > 0) {
          console.log(`${key}:
    • Last: ${metric.lastDuration ? metric.lastDuration.toFixed(2) : 'N/A'}ms
    • Avg: ${metric.avgDuration ? metric.avgDuration.toFixed(2) : 'N/A'}ms
    • Min: ${Math.min(...metric.durations).toFixed(2)}ms
    • Max: ${Math.max(...metric.durations).toFixed(2)}ms
    • Count: ${metric.durations.length}`);
        }
      });
      
      console.groupEnd();
    }
  };
  
  // Make it globally available
  window.PerformanceMonitor = PerformanceMonitor;