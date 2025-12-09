/**
 * Leaderboard Firebase Integration
 * 
 * This module provides Firebase/Firestore integration for the leaderboard feature.
 * It uses the modular Firebase SDK (v12.6.0+) with ES module imports.
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
  var app = null;
  var db = null;
  var auth = null;
  var analytics = null;

  // Firebase SDK modules (loaded dynamically)
  var firebaseModules = {};

  /**
   * Initialize Firebase connection
   * Requires window.FIREBASE_CONFIG to be set
   * @returns {Promise<boolean>} - Success status
   */
  async function initialize() {
    if (initialized) return true;

    // Check for configuration
    var config = window.FIREBASE_CONFIG;
    if (!config) {
      console.warn('Firebase configuration not found. Set window.FIREBASE_CONFIG before loading this module.');
      console.info('See config/firebase.config.js.example for configuration instructions.');
      return false;
    }

    try {
      // Dynamically import Firebase modules
      const { initializeApp, getApps, getApp } = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js');
      const { getFirestore, collection, doc, getDoc, getDocs, addDoc, deleteDoc, query, where, orderBy, limit, startAfter, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js');
      const { getAuth, signInWithEmailAndPassword, signOut: firebaseSignOut, onAuthStateChanged: firebaseOnAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js');
      const { getAnalytics } = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js');

      // Store module references for later use
      firebaseModules = {
        collection, doc, getDoc, getDocs, addDoc, deleteDoc, query, where, orderBy, limit, startAfter, serverTimestamp,
        signInWithEmailAndPassword, firebaseSignOut, firebaseOnAuthStateChanged
      };

      // Initialize Firebase app if not already initialized
      if (getApps().length === 0) {
        app = initializeApp(config);
      } else {
        app = getApp();
      }

      db = getFirestore(app);
      auth = getAuth(app);
      
      // Initialize Analytics (optional, may fail in some environments)
      try {
        analytics = getAnalytics(app);
      } catch (e) {
        console.info('Analytics not available:', e.message);
      }

      initialized = true;
      console.info('Firebase initialized successfully with modular SDK');
      return true;
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      return false;
    }
  }

  /**
   * Get leaderboard entries for a module
   * @param {string} moduleId - Module ID
   * @param {number} limitNum - Maximum entries to return
   * @returns {Promise<Array>} - Leaderboard entries
   */
  async function getLeaderboard(moduleId, limitNum) {
    if (!await initialize()) {
      throw new Error('Firebase not initialized - falling back to sample data');
    }

    limitNum = limitNum || 10;
    const { doc, getDoc } = firebaseModules;

    try {
      // Try materialized leaderboard first (faster, updated by Cloud Functions)
      var leaderboardDoc = await getDoc(doc(db, 'leaderboard', moduleId));
      
      if (leaderboardDoc.exists()) {
        var data = leaderboardDoc.data();
        return (data.entries || []).slice(0, limitNum);
      }

      // Fallback: Aggregate from attempts collection (slower, but works without Cloud Functions)
      return await aggregateLeaderboard(moduleId, limitNum);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      throw error; // Propagate error to trigger fallback to sample data
    }
  }

  /**
   * Aggregate leaderboard from attempts collection
   * This is a fallback when materialized view is not available.
   * NOTE: For production, implement server-side aggregation via Cloud Functions
   * to avoid high document read costs and improve performance.
   * @param {string} moduleId - Module ID
   * @param {number} limitNum - Maximum entries
   * @returns {Promise<Array>} - Aggregated leaderboard
   */
  async function aggregateLeaderboard(moduleId, limitNum) {
    const { collection, query, where, orderBy, limit, getDocs } = firebaseModules;
    
    try {
      // Get recent attempts for this module, ordered by score
      // Limited to 100 to reduce Firestore costs; use Cloud Functions for full aggregation
      var attemptsQuery = query(
        collection(db, 'attempts'),
        where('moduleId', '==', moduleId),
        orderBy('score', 'desc'),
        limit(100)
      );
      var attemptsSnapshot = await getDocs(attemptsQuery);

      // Aggregate by user
      var userStats = {};
      attemptsSnapshot.forEach(function(docSnap) {
        var attempt = docSnap.data();
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
      
      return entries.slice(0, limitNum);
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

    const { collection, addDoc, serverTimestamp } = firebaseModules;

    // Sanitize data
    var sanitizedAttempt = {
      username: String(attempt.username).substring(0, 30),
      moduleId: String(attempt.moduleId),
      examId: String(attempt.examId),
      score: Math.max(0, Math.min(100, Math.round(attempt.score))),
      timestamp: attempt.timestamp || new Date().toISOString(),
      createdAt: serverTimestamp()
    };

    // Add user ID if authenticated
    if (auth.currentUser) {
      sanitizedAttempt.userId = auth.currentUser.uid;
    }

    try {
      var docRef = await addDoc(collection(db, 'attempts'), sanitizedAttempt);
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
   * @param {number} limitNum - Maximum attempts to return
   * @returns {Promise<Array>} - User's attempts
   */
  async function getUserAttempts(username, limitNum) {
    if (!await initialize()) {
      return [];
    }

    limitNum = limitNum || 50;
    const { collection, query, where, orderBy, limit, getDocs } = firebaseModules;

    try {
      var attemptsQuery = query(
        collection(db, 'attempts'),
        where('username', '==', username),
        orderBy('timestamp', 'desc'),
        limit(limitNum)
      );
      var snapshot = await getDocs(attemptsQuery);

      var attempts = [];
      snapshot.forEach(function(docSnap) {
        var data = docSnap.data();
        data.id = docSnap.id;
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
   * In this simplified implementation, any authenticated GitHub user is considered an admin
   * For production, you can add custom claims or whitelist specific users
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
      // Check for custom claims first (if configured via Cloud Functions)
      var tokenResult = await auth.currentUser.getIdTokenResult();
      if (tokenResult.claims.admin === true) {
        return true;
      }
      
      // Restrict admin access to specific GitHub usernames
      const adminUsers = ['StudyWithJesus']; // Replace with your GitHub username
      const username = auth.currentUser.reloadUserInfo?.screenName || 
                       auth.currentUser.displayName;
      return adminUsers.includes(username);
    } catch (error) {
      console.error('Failed to check admin status:', error);
      
      // If there's an error checking claims, treat authenticated users as admin
      return auth.currentUser !== null;
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

    const { signInWithEmailAndPassword } = firebaseModules;

    try {
      var result = await signInWithEmailAndPassword(auth, email, password);
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

    const { firebaseSignOut } = firebaseModules;

    try {
      await firebaseSignOut(auth);
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
    return firebaseModules.firebaseOnAuthStateChanged(auth, callback);
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

    const { collection, query, orderBy, limit, getDocs } = firebaseModules;

    try {
      // Aggregate user stats from recent attempts
      // NOTE: For production with many users, implement pagination or
      // server-side aggregation via Cloud Functions to reduce costs
      var attemptsQuery = query(
        collection(db, 'attempts'),
        orderBy('timestamp', 'desc'),
        limit(200)
      );
      var snapshot = await getDocs(attemptsQuery);

      var userStats = {};
      snapshot.forEach(function(docSnap) {
        var attempt = docSnap.data();
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
    var limitNum = options.limit || 50;
    const { collection, query, where, orderBy, limit, getDocs, startAfter } = firebaseModules;

    try {
      // Build query constraints
      var constraints = [
        orderBy('timestamp', 'desc'),
        limit(limitNum)
      ];

      if (options.username) {
        constraints.unshift(where('username', '==', options.username));
      }
      if (options.moduleId) {
        constraints.unshift(where('moduleId', '==', options.moduleId));
      }
      if (options.startAfter) {
        constraints.push(startAfter(options.startAfter));
      }

      var attemptsQuery = query(collection(db, 'attempts'), ...constraints);
      var snapshot = await getDocs(attemptsQuery);
      var attempts = [];
      var lastDoc = null;

      snapshot.forEach(function(docSnap) {
        var data = docSnap.data();
        data.id = docSnap.id;
        attempts.push(data);
        lastDoc = docSnap;
      });

      return { attempts: attempts, lastDoc: lastDoc };
    } catch (error) {
      console.error('Failed to fetch attempt history:', error);
      return { attempts: [], lastDoc: null };
    }
  }

  /**
   * Delete a specific attempt (admin only)
   * @param {string} username - Username of the attempt
   * @param {string} moduleId - Module ID
   * @param {string} examId - Exam ID
   * @param {string} timestamp - ISO timestamp
   * @returns {Promise<boolean>} - Success status
   */
  async function deleteAttempt(username, moduleId, examId, timestamp) {
    if (!await initialize()) {
      return false;
    }

    if (!await isAdmin()) {
      console.error('Admin access required to delete attempts');
      return false;
    }

    const { collection, query, where, getDocs, deleteDoc, doc } = firebaseModules;

    try {
      // Find the attempt document that matches all criteria
      var attemptsQuery = query(
        collection(db, 'attempts'),
        where('username', '==', username),
        where('moduleId', '==', moduleId),
        where('examId', '==', examId),
        where('timestamp', '==', timestamp)
      );
      
      var snapshot = await getDocs(attemptsQuery);
      
      if (snapshot.empty) {
        console.warn('No matching attempt found to delete');
        return false;
      }

      // Delete all matching documents (should typically be just one)
      var deletePromises = [];
      snapshot.forEach(function(docSnap) {
        deletePromises.push(deleteDoc(doc(db, 'attempts', docSnap.id)));
      });
      
      await Promise.all(deletePromises);
      
      console.log('Successfully deleted attempt(s):', { username, moduleId, examId, timestamp });
      return true;
    } catch (error) {
      console.error('Failed to delete attempt:', error);
      return false;
    }
  }

  // Export public API
  window.LeaderboardFirebase = {
    initialize: initialize,
    isInitialized: function() { return initialized; },
    getLeaderboard: getLeaderboard,
    submitAttempt: submitAttempt,
    getUserAttempts: getUserAttempts,
    isAdmin: isAdmin,
    signIn: signIn,
    signOut: signOut,
    getCurrentUser: getCurrentUser,
    onAuthStateChanged: onAuthStateChanged,
    getAdminUserStats: getAdminUserStats,
    getAdminAttemptHistory: getAdminAttemptHistory,
    deleteAttempt: deleteAttempt
  };

})();
