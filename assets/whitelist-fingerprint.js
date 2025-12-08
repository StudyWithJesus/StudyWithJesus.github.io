/**
 * Blacklist Fingerprint Blocker
 * Computes SHA-256 fingerprint and blocks access if in the blocked list
 * 
 * BEHAVIOR:
 * - Everyone has access by default
 * - Only blocks fingerprints that are explicitly marked as "blocked" in the admin dashboard
 * - Blocked list is stored in localStorage under 'fingerprint_blocked_list'
 * 
 * USAGE:
 * 1. Visit /pages/admin/fingerprint-admin.html
 * 2. Toggle specific fingerprints to "BLOCKED" status
 * 3. Those fingerprints will be blocked across all pages
 */
(function() {
  'use strict';

  /**
   * BLOCKED LIST CONFIGURATION
   * This is now managed through the admin dashboard
   * The array below is for manual overrides only (optional)
   */
  const manuallyBlockedFingerprints = [
    // Manually add fingerprint hashes here if needed (optional)
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
   * Check fingerprint against blocked list
   */
  async function checkAccess() {
    try {
      // Get blocked list from localStorage (set by admin dashboard)
      const STORAGE_KEY_BLOCKED = 'fingerprint_blocked_list';
      const blockedListJson = localStorage.getItem(STORAGE_KEY_BLOCKED);
      const blockedFromDashboard = blockedListJson ? JSON.parse(blockedListJson) : [];
      
      // Combine manually blocked with dashboard blocked
      const allBlockedFingerprints = [
        ...manuallyBlockedFingerprints,
        ...blockedFromDashboard
      ];

      // If no fingerprints are blocked, allow access to everyone
      if (allBlockedFingerprints.length === 0) {
        return;
      }

      // Collect fingerprint data and generate hash
      const fingerprintData = collectFingerprintData();
      const fp = await sha256(fingerprintData);

      // Check if fingerprint is in blocked list
      const isBlocked = allBlockedFingerprints.includes(fp);

      if (isBlocked) {
        // Block access immediately
        blockAccess();
      }

    } catch (err) {
      // On error, fail open (allow access) to prevent false positives
      console.error('Blacklist check error:', err);
    }
  }

  // Check access immediately (before DOM loads)
  checkAccess();

})();
