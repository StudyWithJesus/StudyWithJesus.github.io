/**
 * Leaderboard Firebase Integration
 * 
 * This module provides Firebase/Firestore integration for the leaderboard feature.
 * It requires the Firebase SDK to be loaded and configured.
 * 
 * IMPORTANT: Do not commit real Firebase credentials.
 * See config/firebase.config.js.example for configuration instructions.
 * 
 * Firestore Collections:
 * - users: User profiles (username, created date, settings)
 * - attempts: Individual exam attempts (userId, moduleId, examId, score, timestamp)
 * - leaderboard: Materialized leaderboard view (updated by Cloud Functions)
 * 
 * @module leaderboard-firebase
 */

;(function() {
  'use strict';

  // Module state
  var initialized = false;
  var db = null;
  var auth = null;

  /**
   * Initialize Firebase connection
   * Requires window.FIREBASE_CONFIG to be set
   * @returns {Promise<boolean>} - Success status
   */
  async function initialize() {
    if (initialized) return true;

    // Check for Firebase SDK
    if (typeof firebase === 'undefined') {
      console.error('Firebase SDK not loaded. Include Firebase scripts in your HTML.');
      return false;
    }

    // Check for configuration
    var config = window.FIREBASE_CONFIG;
    if (!config) {
      console.warn('Firebase configuration not found. Set window.FIREBASE_CONFIG before loading this module.');
      console.info('See config/firebase.config.js.example for configuration instructions.');
      return false;
    }

    try {
      // Initialize Firebase app if not already initialized
      if (!firebase.apps.length) {
        firebase.initializeApp(config);
      }

      db = firebase.firestore();
      auth = firebase.auth();
      initialized = true;
      console.info('Firebase initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      return false;
    }
  }

  /**
   * Get leaderboard entries for a module
   * @param {string} moduleId - Module ID
   * @param {number} limit - Maximum entries to return
   * @returns {Promise<Array>} - Leaderboard entries
   */
  async function getLeaderboard(moduleId, limit) {
    if (!await initialize()) {
      return [];
    }

    limit = limit || 10;

    try {
      // Try materialized leaderboard first (faster, updated by Cloud Functions)
      var leaderboardDoc = await db.collection('leaderboard').doc(moduleId).get();
      
      if (leaderboardDoc.exists) {
        var data = leaderboardDoc.data();
        return (data.entries || []).slice(0, limit);
      }

      // Fallback: Aggregate from attempts collection (slower, but works without Cloud Functions)
      return await aggregateLeaderboard(moduleId, limit);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      return [];
    }
  }

  /**
   * Aggregate leaderboard from attempts collection
   * This is a fallback when materialized view is not available.
   * NOTE: For production, implement server-side aggregation via Cloud Functions
   * to avoid high document read costs and improve performance.
   * @param {string} moduleId - Module ID
   * @param {number} limit - Maximum entries
   * @returns {Promise<Array>} - Aggregated leaderboard
   */
  async function aggregateLeaderboard(moduleId, limit) {
    try {
      // Get recent attempts for this module, ordered by score
      // Limited to 100 to reduce Firestore costs; use Cloud Functions for full aggregation
      var attemptsQuery = await db.collection('attempts')
        .where('moduleId', '==', moduleId)
        .orderBy('score', 'desc')
        .limit(100)
        .get();

      // Aggregate by user
      var userStats = {};
      attemptsQuery.forEach(function(doc) {
        var attempt = doc.data();
        var username = attempt.username;
        
        if (!userStats[username]) {
          userStats[username] = {
            username: username,
            bestScore: attempt.score,
            attemptsCount: 0,
            lastAttempt: attempt.timestamp
          };
        }
        
        userStats[username].attemptsCount++;
        if (attempt.score > userStats[username].bestScore) {
          userStats[username].bestScore = attempt.score;
        }
        if (attempt.timestamp > userStats[username].lastAttempt) {
          userStats[username].lastAttempt = attempt.timestamp;
        }
      });

      // Convert to array and sort by best score
      var entries = Object.values(userStats);
      entries.sort(function(a, b) { return b.bestScore - a.bestScore; });
      
      return entries.slice(0, limit);
    } catch (error) {
      console.error('Failed to aggregate leaderboard:', error);
      return [];
    }
  }

  /**
   * Submit an exam attempt to Firestore
   * @param {Object} attempt - Attempt data
   * @returns {Promise<string>} - Document ID of created attempt
   */
  async function submitAttempt(attempt) {
    if (!await initialize()) {
      throw new Error('Firebase not initialized');
    }

    // Validate attempt
    if (!attempt.username || !attempt.moduleId || !attempt.examId || 
        typeof attempt.score !== 'number') {
      throw new Error('Invalid attempt data');
    }

    // Sanitize data
    var sanitizedAttempt = {
      username: String(attempt.username).substring(0, 30),
      moduleId: String(attempt.moduleId),
      examId: String(attempt.examId),
      score: Math.max(0, Math.min(100, Math.round(attempt.score))),
      timestamp: attempt.timestamp || new Date().toISOString(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    // Add user ID if authenticated
    if (auth.currentUser) {
      sanitizedAttempt.userId = auth.currentUser.uid;
    }

    try {
      var docRef = await db.collection('attempts').add(sanitizedAttempt);
      console.info('Attempt submitted:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Failed to submit attempt:', error);
      throw error;
    }
  }

  /**
   * Get user's attempt history
   * @param {string} username - Username to look up
   * @param {number} limit - Maximum attempts to return
   * @returns {Promise<Array>} - User's attempts
   */
  async function getUserAttempts(username, limit) {
    if (!await initialize()) {
      return [];
    }

    limit = limit || 50;

    try {
      var query = await db.collection('attempts')
        .where('username', '==', username)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      var attempts = [];
      query.forEach(function(doc) {
        var data = doc.data();
        data.id = doc.id;
        attempts.push(data);
      });

      return attempts;
    } catch (error) {
      console.error('Failed to fetch user attempts:', error);
      return [];
    }
  }

  /**
   * Check if current user is an admin
   * Requires Firebase Auth and custom claims
   * @returns {Promise<boolean>} - Admin status
   */
  async function isAdmin() {
    if (!await initialize()) {
      return false;
    }

    if (!auth.currentUser) {
      return false;
    }

    try {
      var tokenResult = await auth.currentUser.getIdTokenResult();
      return tokenResult.claims.admin === true;
    } catch (error) {
      console.error('Failed to check admin status:', error);
      return false;
    }
  }

  /**
   * Sign in with email/password
   * @param {string} email - Email address
   * @param {string} password - Password
   * @returns {Promise<Object>} - User object
   */
  async function signIn(email, password) {
    if (!await initialize()) {
      throw new Error('Firebase not initialized');
    }

    try {
      var result = await auth.signInWithEmailAndPassword(email, password);
      return result.user;
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    }
  }

  /**
   * Sign out current user
   * @returns {Promise<void>}
   */
  async function signOut() {
    if (!await initialize()) {
      return;
    }

    try {
      await auth.signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  }

  /**
   * Get current auth state
   * @returns {Object|null} - Current user or null
   */
  function getCurrentUser() {
    return auth ? auth.currentUser : null;
  }

  /**
   * Listen for auth state changes
   * @param {Function} callback - Callback function (user) => {}
   * @returns {Function} - Unsubscribe function
   */
  function onAuthStateChanged(callback) {
    if (!auth) {
      console.warn('Firebase auth not initialized');
      return function() {};
    }
    return auth.onAuthStateChanged(callback);
  }

  // Admin-only functions

  /**
   * Get all user statistics (admin only)
   * @returns {Promise<Array>} - User statistics
   */
  async function getAdminUserStats() {
    if (!await initialize()) {
      return [];
    }

    if (!await isAdmin()) {
      console.error('Admin access required');
      return [];
    }

    try {
      // Aggregate user stats from recent attempts
      // NOTE: For production with many users, implement pagination or
      // server-side aggregation via Cloud Functions to reduce costs
      var attemptsQuery = await db.collection('attempts')
        .orderBy('timestamp', 'desc')
        .limit(200)
        .get();

      var userStats = {};
      attemptsQuery.forEach(function(doc) {
        var attempt = doc.data();
        var username = attempt.username;
        
        if (!userStats[username]) {
          userStats[username] = {
            username: username,
            totalExams: 0,
            moduleBreakdown: {}
          };
        }
        
        userStats[username].totalExams++;
        
        if (!userStats[username].moduleBreakdown[attempt.moduleId]) {
          userStats[username].moduleBreakdown[attempt.moduleId] = {
            attempts: 0,
            bestScore: 0,
            totalScore: 0
          };
        }
        
        var moduleStats = userStats[username].moduleBreakdown[attempt.moduleId];
        moduleStats.attempts++;
        moduleStats.totalScore += attempt.score;
        if (attempt.score > moduleStats.bestScore) {
          moduleStats.bestScore = attempt.score;
        }
        moduleStats.averageScore = Math.round(moduleStats.totalScore / moduleStats.attempts);
      });

      return Object.values(userStats);
    } catch (error) {
      console.error('Failed to fetch admin user stats:', error);
      return [];
    }
  }

  /**
   * Get paginated attempt history (admin only)
   * @param {Object} options - Query options
   * @param {string} options.username - Filter by username
   * @param {string} options.moduleId - Filter by module
   * @param {number} options.limit - Page size
   * @param {Object} options.startAfter - Last document from previous page
   * @returns {Promise<Object>} - { attempts, lastDoc }
   */
  async function getAdminAttemptHistory(options) {
    if (!await initialize()) {
      return { attempts: [], lastDoc: null };
    }

    if (!await isAdmin()) {
      console.error('Admin access required');
      return { attempts: [], lastDoc: null };
    }

    options = options || {};
    var limit = options.limit || 50;

    try {
      var query = db.collection('attempts')
        .orderBy('timestamp', 'desc')
        .limit(limit);

      if (options.username) {
        query = query.where('username', '==', options.username);
      }
      if (options.moduleId) {
        query = query.where('moduleId', '==', options.moduleId);
      }
      if (options.startAfter) {
        query = query.startAfter(options.startAfter);
      }

      var snapshot = await query.get();
      var attempts = [];
      var lastDoc = null;

      snapshot.forEach(function(doc) {
        var data = doc.data();
        data.id = doc.id;
        attempts.push(data);
        lastDoc = doc;
      });

      return { attempts: attempts, lastDoc: lastDoc };
    } catch (error) {
      console.error('Failed to fetch attempt history:', error);
      return { attempts: [], lastDoc: null };
    }
  }

  // Export public API
  window.LeaderboardFirebase = {
    initialize: initialize,
    getLeaderboard: getLeaderboard,
    submitAttempt: submitAttempt,
    getUserAttempts: getUserAttempts,
    isAdmin: isAdmin,
    signIn: signIn,
    signOut: signOut,
    getCurrentUser: getCurrentUser,
    onAuthStateChanged: onAuthStateChanged,
    getAdminUserStats: getAdminUserStats,
    getAdminAttemptHistory: getAdminAttemptHistory
  };

})();
