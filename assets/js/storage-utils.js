/**
 * Safe localStorage wrapper with error handling
 * Handles quota exceeded, disabled storage, and incognito mode issues
 */
(function(window) {
  'use strict';

  const StorageUtils = {
    /**
     * Safely get item from localStorage
     * @param {string} key - Storage key
     * @param {*} defaultValue - Default value if retrieval fails
     * @returns {*} - Stored value or default
     */
    getItem: function(key, defaultValue = null) {
      try {
        const value = localStorage.getItem(key);
        return value !== null ? value : defaultValue;
      } catch (err) {
        console.warn(`localStorage.getItem failed for key "${key}":`, err.message);
        return defaultValue;
      }
    },

    /**
     * Safely get JSON from localStorage
     * @param {string} key - Storage key
     * @param {*} defaultValue - Default value if retrieval/parse fails
     * @returns {*} - Parsed value or default
     */
    getJSON: function(key, defaultValue = null) {
      try {
        const value = localStorage.getItem(key);
        return value !== null ? JSON.parse(value) : defaultValue;
      } catch (err) {
        console.warn(`localStorage.getJSON failed for key "${key}":`, err.message);
        return defaultValue;
      }
    },

    /**
     * Safely set item in localStorage
     * @param {string} key - Storage key
     * @param {string} value - Value to store
     * @returns {boolean} - Success status
     */
    setItem: function(key, value) {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (err) {
        if (err.name === 'QuotaExceededError') {
          console.error('localStorage quota exceeded. Attempting cleanup...');
          this.cleanup();
          try {
            localStorage.setItem(key, value);
            return true;
          } catch (retryErr) {
            console.error('localStorage.setItem failed after cleanup:', retryErr.message);
            return false;
          }
        }
        console.error(`localStorage.setItem failed for key "${key}":`, err.message);
        return false;
      }
    },

    /**
     * Safely set JSON in localStorage
     * @param {string} key - Storage key
     * @param {*} value - Value to stringify and store
     * @returns {boolean} - Success status
     */
    setJSON: function(key, value) {
      try {
        return this.setItem(key, JSON.stringify(value));
      } catch (err) {
        console.error(`localStorage.setJSON failed for key "${key}":`, err.message);
        return false;
      }
    },

    /**
     * Safely remove item from localStorage
     * @param {string} key - Storage key
     * @returns {boolean} - Success status
     */
    removeItem: function(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (err) {
        console.error(`localStorage.removeItem failed for key "${key}":`, err.message);
        return false;
      }
    },

    /**
     * Check if localStorage is available
     * @returns {boolean} - Availability status
     */
    isAvailable: function() {
      try {
        const testKey = '__storage_test__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        return true;
      } catch (err) {
        return false;
      }
    },

    /**
     * Clean up old/expired localStorage data
     * Removes entries older than specified days
     * @param {Array<string>} keysToCheck - Keys to check for cleanup
     * @param {number} maxAgeDays - Maximum age in days (default: 30)
     */
    cleanup: function(keysToCheck = [], maxAgeDays = 30) {
      const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
      const now = Date.now();
      let cleanedCount = 0;

      keysToCheck.forEach(key => {
        try {
          const data = this.getJSON(key);
          if (data && Array.isArray(data)) {
            const filtered = data.filter(item => {
              if (item.timestamp) {
                const age = now - new Date(item.timestamp).getTime();
                return age < maxAgeMs;
              }
              return true; // Keep items without timestamps
            });
            
            if (filtered.length < data.length) {
              this.setJSON(key, filtered);
              cleanedCount += (data.length - filtered.length);
            }
          }
        } catch (err) {
          console.warn(`Cleanup failed for key "${key}":`, err.message);
        }
      });

      if (cleanedCount > 0) {
        console.info(`localStorage cleanup: removed ${cleanedCount} old entries`);
      }
    },

    /**
     * Get storage usage information
     * @returns {Object} - Usage stats
     */
    getUsageStats: function() {
      try {
        let totalSize = 0;
        const keys = [];
        
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          const value = localStorage.getItem(key);
          const size = new Blob([value]).size;
          totalSize += size;
          keys.push({ key, size });
        }

        // Sort by size descending
        keys.sort((a, b) => b.size - a.size);

        return {
          totalSize,
          itemCount: keys.length,
          largestItems: keys.slice(0, 5),
          estimatedQuota: 5 * 1024 * 1024, // ~5MB typical limit
          percentUsed: Math.round((totalSize / (5 * 1024 * 1024)) * 100)
        };
      } catch (err) {
        console.error('Failed to get usage stats:', err.message);
        return null;
      }
    }
  };

  // Export to window
  window.StorageUtils = StorageUtils;

  // Auto-cleanup on load (clean up old fingerprint logs and attempts)
  if (StorageUtils.isAvailable()) {
    StorageUtils.cleanup(['fingerprint_logs', 'exam_attempts'], 30);
  }

})(window);
