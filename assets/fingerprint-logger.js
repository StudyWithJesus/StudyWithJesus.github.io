/**
 * Fingerprint Logger
 * Computes a SHA-256 fingerprint from browser properties and saves to Firestore
 */
(function() {
  'use strict';

  // Initialize Firebase if not already done
  let db = null;
  
  function initFirebase() {
    if (db) return db;
    
    if (!window.FIREBASE_CONFIG) {
      console.error('Firebase config not found');
      return null;
    }
    
    try {
      // Check if Firebase is already initialized
      if (!firebase.apps || firebase.apps.length === 0) {
        firebase.initializeApp(window.FIREBASE_CONFIG);
      }
      db = firebase.firestore();
      return db;
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      return null;
    }
  }

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
   * Sanitize display name to prevent XSS and issues
   * @param {string} name - Raw display name
   * @returns {string} - Sanitized name
   */
  function sanitizeName(name) {
    if (!name || typeof name !== 'string') {
      return 'Guest';
    }
    // Remove HTML tags, limit length, trim whitespace
    return name
      .replace(/<[^>]*>/g, '')  // Remove HTML tags
      .replace(/[<>'"&]/g, '')  // Remove dangerous characters
      .trim()
      .substring(0, 30) || 'Guest';
  }

  /**
   * Store fingerprint log locally for admin dashboard
   * Also saves to Firestore for centralized tracking
   * @param {string} fp - Fingerprint hash
   * @param {string} name - Display name
   * @param {string} ip - IP address from server (IPv4 or IPv6)
   * @param {string} ipv4 - IPv4 address if available
   * @param {string} ipv6 - IPv6 address if available
   */
  async function storeFingerprintLog(fp, name, ip, ipv4, ipv6) {
    try {
      const storageKey = 'fingerprint_logs';
      const logs = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      // Sanitize the name
      const sanitizedName = sanitizeName(name);
      
      // Check if fingerprint already exists
      const existingIndex = logs.findIndex(log => log.fingerprint === fp);
      
      const entryData = {
        name: sanitizedName,
        fingerprint: fp,
        timestamp: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        userAgent: navigator.userAgent || '',
        ip: ip && ip !== 'unknown' ? ip : 'N/A'
      };
      
      if (ipv4) entryData.ipv4 = ipv4;
      if (ipv6) entryData.ipv6 = ipv6;
      
      if (existingIndex !== -1) {
        // Update existing entry
        logs[existingIndex].lastSeen = new Date().toISOString();
        if (sanitizedName && sanitizedName !== 'Guest' && !logs[existingIndex].name) {
          logs[existingIndex].name = sanitizedName;
        }
        if (ip && ip !== 'unknown') {
          logs[existingIndex].ip = ip;
        }
        if (ipv4) {
          logs[existingIndex].ipv4 = ipv4;
        }
        if (ipv6) {
          logs[existingIndex].ipv6 = ipv6;
        }
      } else {
        // Add new entry
        const entry = {
          id: Date.now(),
          ...entryData
        };
        logs.push(entry);
      }
      
      // Keep only last 100 entries in localStorage
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      localStorage.setItem(storageKey, JSON.stringify(logs));
      
      // Save to Firestore for centralized tracking
      await saveToFirestore(fp, entryData);
      
    } catch (err) {
      // Silent failure - don't disrupt user experience
      console.debug('Failed to store fingerprint log:', err.message);
    }
  }
  
  /**
   * Save fingerprint to Firestore
   * @param {string} fp - Fingerprint hash
   * @param {object} data - Fingerprint data
   */
  async function saveToFirestore(fp, data) {
    try {
      const firestore = initFirebase();
      if (!firestore) {
        console.debug('Firestore not available, skipping cloud save');
        return;
      }
      
      const docRef = firestore.collection('fingerprints').doc(fp);
      
      // Check if document exists
      const doc = await docRef.get();
      
      if (doc.exists) {
        // Update existing document
        await docRef.update({
          lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
          visitCount: firebase.firestore.FieldValue.increment(1),
          ...(data.name && data.name !== 'Guest' && { name: data.name }),
          ...(data.ip && data.ip !== 'N/A' && { ip: data.ip }),
          ...(data.ipv4 && { ipv4: data.ipv4 }),
          ...(data.ipv6 && { ipv6: data.ipv6 })
        });
      } else {
        // Create new document
        await docRef.set({
          fingerprint: fp,
          name: data.name || 'Guest',
          ip: data.ip || 'N/A',
          ipv4: data.ipv4 || null,
          ipv6: data.ipv6 || null,
          userAgent: data.userAgent || '',
          firstSeen: firebase.firestore.FieldValue.serverTimestamp(),
          lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
          visitCount: 1
        });
      }
      
      console.debug('Fingerprint saved to Firestore');
    } catch (err) {
      console.debug('Failed to save to Firestore:', err.message);
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

      // Send to Firebase Cloud Function
      // Function URL format: https://<region>-<project-id>.cloudfunctions.net/logFingerprint
      // or use Firebase Hosting rewrite for cleaner URLs
      const endpoint = 'https://us-central1-studywithjesus.cloudfunctions.net/logFingerprint';
      
      // Alternative: If using Firebase Hosting rewrites (cleaner URL)
      // const endpoint = '/api/logFingerprint';
      
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

      // Send request and get IP from response with retry logic
      const maxRetries = 2;
      let retryCount = 0;
      
      const sendRequest = () => {
        return fetch(endpoint, options)
          .then(function(response) {
            if (response.ok) {
              return response.json();
            }
            if (response.status === 429) {
              // Rate limited - don't retry
              throw new Error('Rate limited');
            }
            throw new Error('Server error: ' + response.status);
          })
          .then(function(data) {
            // Store fingerprint log with IP info from server response
            const serverIp = data.clientIp || 'unknown';
            const ipv4 = data.ipv4 || null;
            const ipv6 = data.ipv6 || null;
            storeFingerprintLog(fp, displayName, serverIp, ipv4, ipv6);
          })
          .catch(function(err) {
            if (err.message === 'Rate limited') {
              // Rate limited - store without IP
              storeFingerprintLog(fp, displayName, 'Rate limited', null, null);
              console.debug('Fingerprint logging rate limited');
              throw err; // Don't retry
            }
            
            // Retry on network errors
            if (retryCount < maxRetries) {
              retryCount++;
              const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff
              console.debug(`Retrying fingerprint log (${retryCount}/${maxRetries}) in ${delay}ms...`);
              return new Promise(resolve => setTimeout(resolve, delay)).then(sendRequest);
            }
            
            // All retries failed - still store the log locally without IP
            storeFingerprintLog(fp, displayName, 'N/A', null, null);
            console.debug('Fingerprint logging failed after retries:', err.message);
          });
      };
      
      sendRequest();

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
