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
      timeTaken: attempt.timeTaken ? Math.round(attempt.timeTaken) : null, // Time in seconds
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

    // Give auth state time to settle
    await new Promise(resolve => setTimeout(resolve, 100));

    if (!auth.currentUser) {
      console.log('No Firebase auth user found for admin check');
      return false;
    }

    try {
      // Check for custom claims first (if configured via Cloud Functions)
      var tokenResult = await auth.currentUser.getIdTokenResult();
      if (tokenResult.claims.admin === true) {
        console.log('Admin access granted via custom claims');
        return true;
      }
      
      // Restrict admin access to specific GitHub usernames or user IDs
      const adminUsers = ['StudyWithJesus', '247877581']; // GitHub username or user ID
      
      // Try multiple ways to get the GitHub username
      let username = null;
      
      // Method 1: Check providerData for GitHub username
      if (auth.currentUser.providerData && auth.currentUser.providerData.length > 0) {
        const githubProvider = auth.currentUser.providerData.find(p => p.providerId === 'github.com');
        if (githubProvider) {
          username = githubProvider.displayName || githubProvider.uid;
        }
      }
      
      // Method 2: Check reloadUserInfo
      if (!username && auth.currentUser.reloadUserInfo) {
        username = auth.currentUser.reloadUserInfo.screenName || auth.currentUser.reloadUserInfo.providerUserInfo?.[0]?.screenName;
      }
      
      // Method 3: Check displayName
      if (!username) {
        username = auth.currentUser.displayName;
      }
      
      // Method 4: Use email prefix as fallback
      if (!username && auth.currentUser.email) {
        username = auth.currentUser.email.split('@')[0];
      }
      
      console.log('Checking admin access for user:', username);
      console.log('Current user object:', auth.currentUser);
      console.log('Provider data:', auth.currentUser.providerData);
      
      const isAdminUser = adminUsers.includes(username);
      
      if (!isAdminUser) {
        console.log('User not in admin list. Current user:', username, 'Admin users:', adminUsers);
      }
      
      return isAdminUser;
    } catch (error) {
      console.error('Failed to check admin status:', error);
      
      // If there's an error checking claims, treat authenticated users as admin
      if (auth.currentUser) {
        console.log('Auth error, allowing authenticated user:', auth.currentUser.displayName);
        return true;
      }
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
        
        // Extract module (first 6 digits) and use full examId for sections
        var examId = attempt.examId || 'unknown';
        var moduleMatch = examId.match(/^(\d{6})/);
        var module = moduleMatch ? moduleMatch[1] : 'unknown';
        
        // Log attempt data for debugging
        console.log('Processing attempt:', {
          username: username,
          module: module,
          examId: examId,
          score: attempt.score
        });
        
        if (!userStats[username]) {
          userStats[username] = {
            username: username,
            totalExams: 0,
            modules: new Set(),
            sections: new Set(),
            bestScore: 0,
            totalScore: 0
          };
        }
        
        userStats[username].totalExams++;
        userStats[username].modules.add(module);
        userStats[username].sections.add(examId);
        userStats[username].totalScore += attempt.score;
        
        if (attempt.score > userStats[username].bestScore) {
          userStats[username].bestScore = attempt.score;
        }
      });

      // Convert Sets to counts and calculate averages
      var result = Object.values(userStats).map(function(user) {
        return {
          username: user.username,
          totalExams: user.totalExams,
          modulesAttempted: user.modules.size,
          sectionsAttempted: user.sections.size,
          bestScore: user.bestScore,
          avgScore: Math.round(user.totalScore / user.totalExams)
        };
      });

      console.log('Final userStats:', result);
      return result;
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
      // Convert timestamp to number if it's a string
      var timestampNum = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
      
      console.log('Attempting to delete:', { username, moduleId, examId, timestamp, timestampNum });
      
      // Try multiple query strategies since timestamp format might vary
      var attemptsQuery = query(
        collection(db, 'attempts'),
        where('username', '==', username),
        where('moduleId', '==', moduleId),
        where('examId', '==', examId)
      );
      
      var snapshot = await getDocs(attemptsQuery);
      
      if (snapshot.empty) {
        console.warn('No attempts found for user:', username, 'module:', moduleId, 'exam:', examId);
        return false;
      }
      
      // Filter to find the exact timestamp match (handle both number and string)
      var matchingDocs = [];
      snapshot.forEach(function(docSnap) {
        var data = docSnap.data();
        var docTimestamp = data.timestamp;
        
        // Compare timestamps (handle both string and number formats)
        var docTimestampNum = typeof docTimestamp === 'string' ? parseInt(docTimestamp, 10) : docTimestamp;
        var timestampMatch = docTimestamp === timestamp || 
                            docTimestamp === timestampNum || 
                            docTimestampNum === timestampNum ||
                            String(docTimestamp) === String(timestamp);
        
        if (timestampMatch) {
          matchingDocs.push(docSnap);
        }
      });
      
      if (matchingDocs.length === 0) {
        console.warn('Found attempts but no timestamp match. Looking for:', timestamp, 'Available:');
        snapshot.forEach(function(docSnap) {
          console.log(' -', docSnap.data().timestamp, typeof docSnap.data().timestamp);
        });
        return false;
      }
      
      // Warn if multiple documents match
      if (matchingDocs.length > 1) {
        console.warn('Multiple attempts match deletion criteria. Deleting all ' + matchingDocs.length + ' matching records.');
      }

      // Delete all matching documents
      var deletePromises = [];
      matchingDocs.forEach(function(docSnap) {
        console.log('Deleting attempt document:', docSnap.id);
        deletePromises.push(deleteDoc(doc(db, 'attempts', docSnap.id)));
      });
      
      await Promise.all(deletePromises);
      
      console.log('Successfully deleted ' + matchingDocs.length + ' attempt(s)');
      return true;
    } catch (error) {
      console.error('Failed to delete attempt:', error);
      return false;
    }
  }

  /**
   * Get all attempts from Firestore (admin only)
   * @returns {Promise<Array>} - All attempts
   */
  async function getAllAttempts() {
    if (!await initialize()) {
      throw new Error('Firebase not initialized');
    }

    if (!await isAdmin()) {
      throw new Error('Unauthorized: Admin access required');
    }

    const { collection, query, orderBy, getDocs, limit } = firebaseModules;

    try {
      // Get all attempts ordered by timestamp descending
      // Limit to 1000 to avoid excessive reads
      var attemptsQuery = query(
        collection(db, 'attempts'),
        orderBy('timestamp', 'desc'),
        limit(1000)
      );
      
      var snapshot = await getDocs(attemptsQuery);
      var attempts = [];
      
      snapshot.forEach(function(doc) {
        attempts.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log('Retrieved ' + attempts.length + ' attempts from Firestore');
      return attempts;
    } catch (error) {
      console.error('Failed to get all attempts:', error);
      throw error;
    }
  }

  /**
   * Delete an attempt by document ID (admin only)
   * @param {string} docId - Firestore document ID
   * @returns {Promise<boolean>} - Success status
   */
  async function deleteAttemptById(docId) {
    if (!await initialize()) {
      throw new Error('Firebase not initialized');
    }

    if (!await isAdmin()) {
      throw new Error('Unauthorized: Admin access required');
    }

    const { doc, deleteDoc } = firebaseModules;

    try {
      console.log('Deleting attempt by ID:', docId);
      await deleteDoc(doc(db, 'attempts', docId));
      console.log('Successfully deleted attempt:', docId);
      return true;
    } catch (error) {
      console.error('Failed to delete attempt by ID:', error);
      return false;
    }
  }

  /**
   * Get public user statistics (no auth required)
   * @returns {Promise<Array>} - Array of user statistics
   */
  async function getPublicUserStats() {
    if (!await initialize()) {
      return [];
    }

    const { collection, getDocs } = firebaseModules;

    try {
      var snapshot = await getDocs(collection(db, 'attempts'));

      var userStats = {};
      snapshot.forEach(function(docSnap) {
        var attempt = docSnap.data();
        var username = attempt.username;
        
        // Extract module (first 6 digits) and use full examId for sections
        var examId = attempt.examId || 'unknown';
        var moduleMatch = examId.match(/^(\d{6})/);
        var module = moduleMatch ? moduleMatch[1] : 'unknown';
        
        if (!userStats[username]) {
          userStats[username] = {
            username: username,
            totalExams: 0,
            modules: new Set(),
            sections: new Set(),
            bestScore: 0,
            totalScore: 0
          };
        }
        
        userStats[username].totalExams++;
        userStats[username].modules.add(module);
        userStats[username].sections.add(examId);
        userStats[username].totalScore += attempt.score;
        
        if (attempt.score > userStats[username].bestScore) {
          userStats[username].bestScore = attempt.score;
        }
      });

      // Convert Sets to counts and calculate averages
      var result = Object.values(userStats).map(function(user) {
        return {
          username: user.username,
          totalExams: user.totalExams,
          modulesAttempted: user.modules.size,
          sectionsAttempted: user.sections.size,
          bestScore: user.bestScore,
          avgScore: Math.round(user.totalScore / user.totalExams)
        };
      });

      // Sort by best score descending
      result.sort(function(a, b) { return b.bestScore - a.bestScore; });

      return result;
    } catch (error) {
      console.error('Failed to fetch public user stats:', error);
      return [];
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
    deleteAttempt: deleteAttempt,
    getAllAttempts: getAllAttempts,
    deleteAttemptById: deleteAttemptById,
    getPublicUserStats: getPublicUserStats
  };

})();
