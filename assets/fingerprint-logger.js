/**
 * Fingerprint Logger
 * Computes a SHA-256 fingerprint from browser properties and POSTs to serverless endpoint
 */
(function() {
  'use strict';

  /**
   * Generate SHA-256 hash from string
   * @param {string} message - String to hash
   * @returns {Promise<string>} - Hex string of hash
   */
  async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Collect browser fingerprint data
   * @returns {string} - Concatenated fingerprint string
   */
  function collectFingerprintData() {
    const data = [
      navigator.userAgent || '',
      navigator.language || '',
      navigator.hardwareConcurrency || '',
      navigator.deviceMemory || '',
      navigator.platform || '',
      screen.width + 'x' + screen.height,
      screen.colorDepth || '',
      new Date().getTimezoneOffset(),
      !!window.sessionStorage,
      !!window.localStorage,
      !!window.indexedDB,
      navigator.cookieEnabled
    ].join('|');
    
    return data;
  }

  /**
   * Store fingerprint log locally for admin dashboard
   * @param {string} fp - Fingerprint hash
   * @param {string} name - Display name
   */
  function storeFingerprintLog(fp, name) {
    try {
      const storageKey = 'fingerprint_logs';
      const logs = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      // Check if fingerprint already exists
      const existingIndex = logs.findIndex(log => log.fingerprint === fp);
      
      if (existingIndex !== -1) {
        // Update existing entry
        logs[existingIndex].lastSeen = new Date().toISOString();
        if (name && !logs[existingIndex].name) {
          logs[existingIndex].name = name;
        }
      } else {
        // Add new entry
        logs.push({
          id: Date.now(),
          name: name || 'Guest',
          fingerprint: fp,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent || '',
          lastSeen: new Date().toISOString()
        });
      }
      
      // Keep only last 100 entries
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      localStorage.setItem(storageKey, JSON.stringify(logs));
    } catch (err) {
      // Silent failure - don't disrupt user experience
      console.debug('Failed to store fingerprint log:', err.message);
    }
  }

  /**
   * Generate and log fingerprint
   */
  async function logFingerprint() {
    try {
      // Collect fingerprint data and generate hash
      const fingerprintData = collectFingerprintData();
      const fp = await sha256(fingerprintData);

      // Get display name from localStorage if available
      const displayName = localStorage.getItem('leaderboard_username') || '';

      // Prepare payload
      const payload = {
        fp: fp,
        ua: navigator.userAgent || '',
        lang: navigator.language || '',
        tz: new Date().getTimezoneOffset(),
        ts: new Date().toISOString(),
        url: window.location.href,
        name: displayName
      };

      // Store fingerprint log locally for admin dashboard
      storeFingerprintLog(fp, displayName);

      // Send to serverless endpoint
      const endpoint = '/.netlify/functions/log-fingerprint';
      
      // Use keepalive if supported for reliability
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      };

      // Add keepalive if supported
      if ('keepalive' in Request.prototype) {
        options.keepalive = true;
      }

      // Send request (fire and forget - don't await response)
      fetch(endpoint, options).catch(function(err) {
        // Silent failure - don't disrupt user experience
        console.debug('Fingerprint logging failed:', err.message);
      });

    } catch (err) {
      // Silent failure
      console.debug('Fingerprint generation error:', err.message);
    }
  }

  // Log fingerprint when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', logFingerprint);
  } else {
    // DOM already loaded
    logFingerprint();
  }

})();
