/**
 * Leaderboard Module - Generic client-side leaderboard helper
 * 
 * This module provides functions to fetch and display leaderboard data.
 * It defaults to using sample data when no backend is configured.
 * 
 * Configuration:
 * - Set window.LEADERBOARD_CONFIG.backendUrl to enable real backend
 * - Set window.LEADERBOARD_CONFIG.firebaseEnabled = true to use Firebase
 * 
 * @module leaderboard
 */

;(function() {
  'use strict';

  // Default configuration
  const DEFAULT_CONFIG = {
    // Backend REST API endpoint (set to null to use sample data)
    backendUrl: null,
    
    // Firebase integration (requires leaderboard-firebase.js)
    firebaseEnabled: false,
    
    // Path to sample data JSON (relative to root)
    sampleDataPath: '/assets/data/leaderboard-sample.json',
    
    // Number of top scores to display per module
    topN: 10,
    
    // Available modules
    modules: ['270201', '270202', '270203', '270204'],
    
    // Module display names
    moduleNames: {
      '270201': 'Engine Systems',
      '270202': 'Driveline & Drivetrain',
      '270203': 'Hydraulics & Air Brakes',
      '270204': 'Electrical, Auto Body & Mobile Equipment'
    },
    
    // Local storage keys
    storageKeys: {
      username: 'leaderboard_username',
      attempts: 'leaderboard_attempts'
    }
  };

  // Merge user config with defaults
  function getConfig() {
    const userConfig = window.LEADERBOARD_CONFIG || {};
    return Object.assign({}, DEFAULT_CONFIG, userConfig);
  }

  // Get the base path for asset loading
  function getBasePath() {
    const path = window.location.pathname;
    const parts = path.split('/').filter(function(p) { return p && !p.includes('.html'); });
    if (parts.length === 0) return '';
    return '../'.repeat(parts.length);
  }

  /**
   * Fetch leaderboard data for a specific module
   * @param {string} moduleId - Module ID (e.g., '270201')
   * @returns {Promise<Array>} - Array of leaderboard entries
   */
  async function fetchLeaderboard(moduleId) {
    const config = getConfig();
    
    // If Firebase is enabled, try Firebase integration with fallback
    if (config.firebaseEnabled && window.LeaderboardFirebase) {
      try {
        return await window.LeaderboardFirebase.getLeaderboard(moduleId, config.topN);
      } catch (error) {
        console.warn('Firebase fetch failed, falling back to sample data:', error);
        return fetchSampleData(moduleId);
      }
    }
    
    // If backend URL is configured, fetch from REST API
    if (config.backendUrl) {
      try {
        const response = await fetch(config.backendUrl + '/leaderboard/' + moduleId);
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard: ' + response.status);
        }
        return await response.json();
      } catch (error) {
        console.warn('Failed to fetch from backend, falling back to sample data:', error);
      }
    }
    
    // Default: fetch sample data
    return fetchSampleData(moduleId);
  }

  /**
   * Fetch all leaderboards for all modules
   * @returns {Promise<Object>} - Object with moduleId keys and leaderboard arrays
   */
  async function fetchAllLeaderboards() {
    const config = getConfig();
    const results = {};
    
    // Fetch all modules concurrently for better performance
    const promises = config.modules.map(function(moduleId) {
      return fetchLeaderboard(moduleId)
        .then(function(data) {
          return { moduleId: moduleId, data: data };
        })
        .catch(function(error) {
          console.warn('Failed to fetch leaderboard for ' + moduleId + ':', error);
          return { moduleId: moduleId, data: [] };
        });
    });
    
    const responses = await Promise.all(promises);
    
    for (var i = 0; i < responses.length; i++) {
      results[responses[i].moduleId] = responses[i].data;
    }
    
    return results;
  }

  /**
   * Fetch sample data from JSON file
   * @param {string} moduleId - Module ID
   * @returns {Promise<Array>} - Array of leaderboard entries
   */
  async function fetchSampleData(moduleId) {
    const config = getConfig();
    const basePath = getBasePath();
    const samplePath = basePath + config.sampleDataPath.replace(/^\//, '');
    
    try {
      const response = await fetch(samplePath);
      if (!response.ok) {
        throw new Error('Failed to load sample data');
      }
      const data = await response.json();
      return (data.leaderboard && data.leaderboard[moduleId]) || [];
    } catch (error) {
      console.warn('Failed to fetch sample data:', error);
      return [];
    }
  }

  /**
   * Submit an exam attempt
   * @param {Object} attempt - Attempt data
   * @param {string} attempt.username - Display name
   * @param {string} attempt.moduleId - Module ID
   * @param {string} attempt.examId - Exam ID
   * @param {number} attempt.score - Score (0-100)
   * @returns {Promise<boolean>} - Success status
   */
  async function submitAttempt(attempt) {
    const config = getConfig();
    
    // Validate attempt data
    if (!attempt.username || !attempt.moduleId || !attempt.examId || 
        typeof attempt.score !== 'number') {
      console.error('Invalid attempt data:', attempt);
      return false;
    }
    
    // Add timestamp
    attempt.timestamp = new Date().toISOString();
    
    // Save to local storage for offline tracking
    saveAttemptLocally(attempt);
    
    // If Firebase is enabled, submit to Firebase
    if (config.firebaseEnabled && window.LeaderboardFirebase) {
      try {
        await window.LeaderboardFirebase.submitAttempt(attempt);
        return true;
      } catch (error) {
        console.error('Failed to submit to Firebase:', error);
        return false;
      }
    }
    
    // If backend URL is configured, submit to REST API
    if (config.backendUrl) {
      try {
        const response = await fetch(config.backendUrl + '/attempts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(attempt)
        });
        return response.ok;
      } catch (error) {
        console.error('Failed to submit to backend:', error);
        return false;
      }
    }
    
    // No backend configured - local storage only
    console.info('No backend configured. Attempt saved locally only.');
    return true;
  }

  /**
   * Save attempt to local storage
   * @param {Object} attempt - Attempt data
   */
  function saveAttemptLocally(attempt) {
    const config = getConfig();
    try {
      var attempts = JSON.parse(localStorage.getItem(config.storageKeys.attempts) || '[]');
      attempts.push(attempt);
      // Keep only last 100 attempts locally
      if (attempts.length > 100) {
        attempts = attempts.slice(-100);
      }
      localStorage.setItem(config.storageKeys.attempts, JSON.stringify(attempts));
    } catch (error) {
      console.warn('Failed to save attempt locally:', error);
    }
  }

  /**
   * Get locally stored attempts
   * @returns {Array} - Array of local attempts
   */
  function getLocalAttempts() {
    const config = getConfig();
    try {
      return JSON.parse(localStorage.getItem(config.storageKeys.attempts) || '[]');
    } catch (error) {
      return [];
    }
  }

  /**
   * Get or set the current username
   * @param {string} [newUsername] - New username to set
   * @returns {string|null} - Current username
   */
  function username(newUsername) {
    const config = getConfig();
    
    if (typeof newUsername === 'string' && newUsername.trim()) {
      var sanitized = sanitizeUsername(newUsername);
      try {
        localStorage.setItem(config.storageKeys.username, sanitized);
      } catch (error) {
        console.warn('Failed to save username:', error);
      }
      return sanitized;
    }
    
    try {
      return localStorage.getItem(config.storageKeys.username) || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Sanitize username for display and storage
   * @param {string} name - Raw username
   * @returns {string} - Sanitized username
   */
  function sanitizeUsername(name) {
    if (!name || typeof name !== 'string') return 'Anonymous';
    
    // Trim and limit length
    var sanitized = name.trim().substring(0, 30);
    
    // Remove potentially dangerous characters
    sanitized = sanitized.replace(/[<>'"&]/g, '');
    
    return sanitized || 'Anonymous';
  }

  /**
   * Format a timestamp for display
   * @param {string} isoString - ISO 8601 timestamp
   * @returns {string} - Formatted date string
   */
  function formatTimestamp(isoString) {
    try {
      var date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Unknown';
    }
  }

  /**
   * Get module display name
   * @param {string} moduleId - Module ID
   * @returns {string} - Display name
   */
  function getModuleName(moduleId) {
    const config = getConfig();
    return config.moduleNames[moduleId] || 'Module ' + moduleId;
  }

  /**
   * Check if a backend is configured and working
   * @returns {Promise<boolean>} - True if backend is available
   */
  async function isBackendConfigured() {
    const config = getConfig();
    
    // Check if REST API backend is configured
    if (config.backendUrl) {
      return true;
    }
    
    // Check if Firebase is enabled and initialized
    if (config.firebaseEnabled && window.LeaderboardFirebase) {
      try {
        await window.LeaderboardFirebase.initialize();
        return window.LeaderboardFirebase.isInitialized();
      } catch (error) {
        return false;
      }
    }
    
    return false;
  }

  /**
   * Render leaderboard HTML for a module
   * @param {string} moduleId - Module ID
   * @param {Array} entries - Leaderboard entries
   * @returns {string} - HTML string
   */
  function renderLeaderboardTable(moduleId, entries) {
    var config = getConfig();
    var html = '<div class="leaderboard-module" data-module="' + moduleId + '">';
    html += '<h3 class="leaderboard-module-title">' + getModuleName(moduleId) + '</h3>';
    
    if (!entries || entries.length === 0) {
      html += '<p class="leaderboard-empty">No scores recorded yet. Be the first!</p>';
      html += '</div>';
      return html;
    }
    
    html += '<table class="leaderboard-table">';
    html += '<colgroup>';
    html += '<col class="col-rank">';
    html += '<col class="col-name">';
    html += '<col class="col-score">';
    html += '<col class="col-attempts">';
    html += '<col class="col-date">';
    html += '</colgroup>';
    html += '<thead><tr>';
    html += '<th class="leaderboard-rank">#</th>';
    html += '<th class="leaderboard-name">Name</th>';
    html += '<th class="leaderboard-score">Best Score</th>';
    html += '<th class="leaderboard-attempts">Attempts</th>';
    html += '<th class="leaderboard-date">Last Attempt</th>';
    html += '</tr></thead>';
    html += '<tbody>';
    
    for (var i = 0; i < Math.min(entries.length, config.topN); i++) {
      var entry = entries[i];
      
      // Validate entry has required properties
      if (!entry || typeof entry.username === 'undefined' || typeof entry.bestScore === 'undefined') {
        console.warn('Skipping invalid leaderboard entry:', entry);
        continue;
      }
      
      var rankClass = i < 3 ? 'rank-' + (i + 1) : '';
      html += '<tr class="leaderboard-row ' + rankClass + '">';
      html += '<td class="leaderboard-rank">' + (i + 1) + '</td>';
      html += '<td class="leaderboard-name">' + escapeHtml(entry.username) + '</td>';
      html += '<td class="leaderboard-score">' + entry.bestScore + '%</td>';
      html += '<td class="leaderboard-attempts">' + (entry.attemptsCount || 0) + '</td>';
      html += '<td class="leaderboard-date">' + formatTimestamp(entry.lastAttempt) + '</td>';
      html += '</tr>';
    }
    
    html += '</tbody></table></div>';
    return html;
  }

  /**
   * Escape HTML special characters
   * @param {string} str - Input string
   * @returns {string} - Escaped string
   */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Export public API
  window.Leaderboard = {
    fetchLeaderboard: fetchLeaderboard,
    fetchAllLeaderboards: fetchAllLeaderboards,
    submitAttempt: submitAttempt,
    username: username,
    sanitizeUsername: sanitizeUsername,
    formatTimestamp: formatTimestamp,
    getModuleName: getModuleName,
    isBackendConfigured: isBackendConfigured,
    renderLeaderboardTable: renderLeaderboardTable,
    getLocalAttempts: getLocalAttempts,
    getConfig: getConfig,
    escapeHtml: escapeHtml
  };

})();
