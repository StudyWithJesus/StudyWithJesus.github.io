/**
 * Simple Performance Monitor
 * Tracks page load times and API response times
 */
(function(window) {
  'use strict';

  const PerformanceMonitor = {
    metrics: [],
    maxMetrics: 100,

    /**
     * Record page load performance
     */
    recordPageLoad: function() {
      if (!window.performance || !window.performance.timing) {
        return;
      }

      const timing = window.performance.timing;
      const metrics = {
        type: 'pageLoad',
        timestamp: new Date().toISOString(),
        url: window.location.href,
        dns: timing.domainLookupEnd - timing.domainLookupStart,
        tcp: timing.connectEnd - timing.connectStart,
        request: timing.responseStart - timing.requestStart,
        response: timing.responseEnd - timing.responseStart,
        dom: timing.domComplete - timing.domLoading,
        total: timing.loadEventEnd - timing.navigationStart
      };

      this.addMetric(metrics);
      
      // Log slow pages
      if (metrics.total > 3000) {
        console.warn('Slow page load detected:', metrics.total + 'ms');
      }
    },

    /**
     * Measure API call performance
     * @param {string} endpoint - API endpoint
     * @param {Function} apiCall - Function that returns a promise
     * @returns {Promise} - Original promise result
     */
    measureAPI: async function(endpoint, apiCall) {
      const startTime = performance.now();
      
      try {
        const result = await apiCall();
        const duration = performance.now() - startTime;
        
        this.addMetric({
          type: 'apiCall',
          timestamp: new Date().toISOString(),
          endpoint,
          duration,
          success: true
        });

        if (duration > 2000) {
          console.warn('Slow API call:', endpoint, duration + 'ms');
        }

        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        
        this.addMetric({
          type: 'apiCall',
          timestamp: new Date().toISOString(),
          endpoint,
          duration,
          success: false,
          error: error.message
        });

        throw error;
      }
    },

    /**
     * Add a metric to the collection
     * @param {Object} metric - Metric data
     */
    addMetric: function(metric) {
      this.metrics.push(metric);
      
      // Keep only recent metrics
      if (this.metrics.length > this.maxMetrics) {
        this.metrics.shift();
      }
    },

    /**
     * Get performance summary
     * @returns {Object} - Summary statistics
     */
    getSummary: function() {
      if (this.metrics.length === 0) {
        return { message: 'No metrics collected yet' };
      }

      const apiMetrics = this.metrics.filter(m => m.type === 'apiCall');
      const pageMetrics = this.metrics.filter(m => m.type === 'pageLoad');

      const summary = {
        totalMetrics: this.metrics.length,
        apiCalls: {
          total: apiMetrics.length,
          successful: apiMetrics.filter(m => m.success).length,
          failed: apiMetrics.filter(m => !m.success).length,
          avgDuration: apiMetrics.length > 0 
            ? Math.round(apiMetrics.reduce((sum, m) => sum + m.duration, 0) / apiMetrics.length)
            : 0
        },
        pageLoads: {
          total: pageMetrics.length,
          avgTotal: pageMetrics.length > 0
            ? Math.round(pageMetrics.reduce((sum, m) => sum + m.total, 0) / pageMetrics.length)
            : 0
        }
      };

      return summary;
    },

    /**
     * Export metrics for debugging
     * @returns {Array} - All metrics
     */
    export: function() {
      return JSON.parse(JSON.stringify(this.metrics));
    },

    /**
     * Clear all metrics
     */
    clear: function() {
      this.metrics = [];
    }
  };

  // Export to window
  window.PerformanceMonitor = PerformanceMonitor;

  // Auto-record page load after window loads
  if (document.readyState === 'complete') {
    setTimeout(() => PerformanceMonitor.recordPageLoad(), 0);
  } else {
    window.addEventListener('load', function() {
      setTimeout(() => PerformanceMonitor.recordPageLoad(), 0);
    });
  }

})(window);
