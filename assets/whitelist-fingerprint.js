/**
 * Whitelist Fingerprint Blocker
 * Computes SHA-256 fingerprint and blocks access if not in whitelist
 * 
 * USAGE:
 * 1. Add allowed fingerprint hashes to the allowedFingerprints array below
 * 2. To get a user's fingerprint, check the GitHub issues created by the logger
 * 3. Copy the fingerprint hash from the issue and add it to the array
 * 
 * Example:
 * const allowedFingerprints = [
 *   'a1b2c3d4e5f6...', // John's device
 *   'f6e5d4c3b2a1...'  // Jane's device
 * ];
 */
(function() {
  'use strict';

  /**
   * WHITELIST CONFIGURATION
   * Add approved fingerprint hashes here
   * Format: Array of SHA-256 hash strings (64 hex characters each)
   */
  const allowedFingerprints = [
    // Add fingerprint hashes here, one per line
    // Example: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234',
  ];

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
   * Must match the logic in fingerprint-logger.js
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
   * Block access with message
   */
  function blockAccess() {
    // Clear the page
    document.documentElement.innerHTML = '';
    
    // Create blocked page with image
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Access Restricted</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #000;
    }
    img {
      max-width: 100%;
      max-height: 100vh;
      display: block;
    }
  </style>
</head>
<body>
  <img src="https://magecomp.com/blog/wp-content/uploads/2023/01/github.png" alt="Access Restricted">
</body>
</html>`;
    
    document.open();
    document.write(html);
    document.close();
  }

  /**
   * Check fingerprint against whitelist
   */
  async function checkAccess() {
    try {
      // If whitelist is empty, allow access (disabled blocker)
      if (allowedFingerprints.length === 0) {
        return;
      }

      // Collect fingerprint data and generate hash
      const fingerprintData = collectFingerprintData();
      const fp = await sha256(fingerprintData);

      // Check if fingerprint is in whitelist
      const isAllowed = allowedFingerprints.includes(fp);

      if (!isAllowed) {
        // Block access immediately
        blockAccess();
      }

    } catch (err) {
      // On error, fail open (allow access) to prevent false positives
      console.error('Whitelist check error:', err);
    }
  }

  // Check access immediately (before DOM loads)
  checkAccess();

})();
