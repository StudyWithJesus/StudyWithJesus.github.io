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
    modules: ['270201', '270202', '270203', '270204', 'PTP2E1', 'PTP2E2', 'PTP2E3', 'PTP2E4'],
    
    // Module display names
    moduleNames: {
      '270201': 'Engine Systems',
      '270202': 'Driveline & Drivetrain',
      '270203': 'Hydraulics & Air Brakes',
      '270204': 'Electrical, Auto Body & Mobile Equipment',
      'PTP2E1': 'Practice Exam 1 (270201 Engines)',
      'PTP2E2': 'Practice Exam 2 (270202 Power Train)',
      'PTP2E3': 'Practice Exam 3 (270203 Hydraulics & Air Brakes)',
      'PTP2E4': 'Practice Exam 4 (270204 Electrical & Equipment)'
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
   * Fetch leaderboard data grouped by individual exams for a specific module
   * @param {string} moduleId - Module ID (e.g., '270201')
   * @returns {Promise<Object>} - Object with examId keys and leaderboard arrays
   */
  async function fetchLeaderboardByExam(moduleId) {
    const config = getConfig();
    
    // If Firebase is enabled, try Firebase integration with fallback
    if (config.firebaseEnabled && window.LeaderboardFirebase && window.LeaderboardFirebase.getLeaderboardByExam) {
      try {
        return await window.LeaderboardFirebase.getLeaderboardByExam(moduleId, config.topN);
      } catch (error) {
        console.warn('Firebase fetch by exam failed, falling back to sample data:', error);
        return fetchSampleDataByExam(moduleId);
      }
    }
    
    // Default: fetch sample data by exam
    return fetchSampleDataByExam(moduleId);
  }

  /**
   * Fetch all leaderboards grouped by exam for all modules
   * @returns {Promise<Object>} - Object with moduleId keys, each containing examId keys with leaderboard arrays
   */
  async function fetchAllLeaderboardsByExam() {
    const config = getConfig();
    const results = {};
    
    // Fetch all modules concurrently for better performance
    const promises = config.modules.map(function(moduleId) {
      return fetchLeaderboardByExam(moduleId)
        .then(function(data) {
          return { moduleId: moduleId, data: data };
        })
        .catch(function(error) {
          console.warn('Failed to fetch leaderboard by exam for ' + moduleId + ':', error);
          return { moduleId: moduleId, data: {} };
        });
    });
    
    const responses = await Promise.all(promises);
    
    for (var i = 0; i < responses.length; i++) {
      results[responses[i].moduleId] = responses[i].data;
    }
    
    return results;
  }

  /**
   * Fetch sample data by exam from JSON file
   * @param {string} moduleId - Module ID
   * @returns {Promise<Object>} - Object with examId keys and leaderboard arrays
   */
  async function fetchSampleDataByExam(moduleId) {
    // For now, aggregate from the existing sample data
    // In production, you would have a separate endpoint for this
    const moduleData = await fetchSampleData(moduleId);
    
    // If the sample data doesn't have exam breakdown, return empty
    // You could enhance the sample data file to include per-exam data
    return {};
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
    
    // Remove HTML tags and dangerous characters, but preserve spaces
    var sanitized = name
      .replace(/<[^>]*>/g, '')  // Remove HTML tags
      .replace(/[<>"'`&]/g, '') // Remove dangerous characters but keep spaces
      .trim()
      .substring(0, 30);
    
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
   * Get exam display name from exam ID
   * @param {string} examId - Exam ID (e.g., '270201a')
   * @returns {string} - Display name
   */
  function getExamName(examId) {
    if (!examId) return 'Unknown Exam';
    
    // Extract the letter suffix if it exists
    var match = examId.match(/([a-zA-Z]+)$/);
    if (match) {
      var suffix = match[1].toUpperCase();
      return 'Section ' + suffix;
    }
    
    // If it's a practice exam like PTP2E1
    if (examId.startsWith('PTP2E')) {
      var examNum = examId.replace('PTP2E', '');
      return 'Practice Exam ' + examNum;
    }
    
    return examId;
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
   * Render leaderboard HTML for individual exams within a module
   * @param {string} moduleId - Module ID
   * @param {Object} examLeaderboards - Object with examId keys and leaderboard arrays
   * @returns {string} - HTML string
   */
  function renderLeaderboardByExam(moduleId, examLeaderboards) {
    var config = getConfig();
    var html = '<div class="leaderboard-module-group" data-module="' + moduleId + '">';
    html += '<h3 class="leaderboard-module-title">' + getModuleName(moduleId) + '</h3>';
    
    if (!examLeaderboards || Object.keys(examLeaderboards).length === 0) {
      html += '<p class="leaderboard-empty">No scores recorded yet. Be the first!</p>';
      html += '</div>';
      return html;
    }
    
    // Sort exam IDs alphabetically
    var examIds = Object.keys(examLeaderboards).sort();
    
    for (var j = 0; j < examIds.length; j++) {
      var examId = examIds[j];
      var entries = examLeaderboards[examId];
      
      if (!entries || entries.length === 0) continue;
      
      html += '<div class="leaderboard-exam" data-exam="' + examId + '">';
      html += '<h4 class="leaderboard-exam-title">' + getExamName(examId) + '</h4>';
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
    }
    
    html += '</div>';
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

  /**
   * Format time duration in seconds to human-readable format
   * @param {number} seconds - Time in seconds
   * @returns {string} - Formatted time string
   */
  function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return '-';
    
    var hours = Math.floor(seconds / 3600);
    var minutes = Math.floor((seconds % 3600) / 60);
    var secs = seconds % 60;
    
    if (hours > 0) {
      return hours + 'h ' + minutes + 'm ' + secs + 's';
    } else if (minutes > 0) {
      return minutes + 'm ' + secs + 's';
    } else {
      return secs + 's';
    }
  }

  // Export public API
  window.Leaderboard = {
    fetchLeaderboard: fetchLeaderboard,
    fetchAllLeaderboards: fetchAllLeaderboards,
    fetchLeaderboardByExam: fetchLeaderboardByExam,
    fetchAllLeaderboardsByExam: fetchAllLeaderboardsByExam,
    submitAttempt: submitAttempt,
    username: username,
    sanitizeUsername: sanitizeUsername,
    formatTimestamp: formatTimestamp,
    formatDuration: formatDuration,
    getModuleName: getModuleName,
    getExamName: getExamName,
    isBackendConfigured: isBackendConfigured,
    renderLeaderboardTable: renderLeaderboardTable,
    renderLeaderboardByExam: renderLeaderboardByExam,
    getLocalAttempts: getLocalAttempts,
    getConfig: getConfig,
    escapeHtml: escapeHtml
  };

})();
