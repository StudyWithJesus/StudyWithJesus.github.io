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
   * Generate and log fingerprint
   */
  async function logFingerprint() {
    try {
      // Collect fingerprint data and generate hash
      const fingerprintData = collectFingerprintData();
      const fp = await sha256(fingerprintData);

      // Prepare payload
      const payload = {
        fp: fp,
        ua: navigator.userAgent || '',
        lang: navigator.language || '',
        tz: new Date().getTimezoneOffset(),
        ts: new Date().toISOString(),
        url: window.location.href
      };

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
