/**
 * Firebase Cloud Functions for StudyWithJesus Leaderboard
 * 
 * These functions automatically update the leaderboard when new attempts are submitted.
 * 
 * Deploy with: firebase deploy --only functions
 */

const {onRequest} = require('firebase-functions/v2/https');
const {onDocumentCreated} = require('firebase-functions/v2/firestore');
const {onCall, HttpsError} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Update leaderboard when a new attempt is added
 * 
 * This function triggers whenever a new document is created in the 'attempts' collection.
 * It updates the materialized leaderboard view for the corresponding module.
 */
exports.updateLeaderboard = onDocumentCreated('attempts/{attemptId}', async (event) => {
    const snap = event.data;
    if (!snap) {
      return null;
    }
    const attempt = snap.data();
    const { moduleId, username, score, timestamp } = attempt;
    
    // Validate required fields
    if (!moduleId || !username || typeof score !== 'number') {
      console.error('Invalid attempt data:', attempt);
      return null;
    }
    
    const db = admin.firestore();
    const leaderboardRef = db.collection('leaderboard').doc(moduleId);
    
    try {
      await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(leaderboardRef);
        let entries = doc.exists ? doc.data().entries : [];
        
        // Find or create entry for this user
        const existingIndex = entries.findIndex(e => e.username === username);
        
        if (existingIndex >= 0) {
          // Update existing entry
          const existing = entries[existingIndex];
          if (score > existing.bestScore) {
            existing.bestScore = score;
          }
          existing.attemptsCount++;
          existing.lastAttempt = timestamp;
        } else {
          // Add new entry
          entries.push({
            username,
            bestScore: score,
            attemptsCount: 1,
            lastAttempt: timestamp
          });
        }
        
        // Sort by best score (descending) and keep top 50
        entries.sort((a, b) => b.bestScore - a.bestScore);
        entries = entries.slice(0, 50);
        
        transaction.set(leaderboardRef, {
          entries,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });
      
      console.log(`Leaderboard updated for module ${moduleId}, user ${username}, score ${score}`);
      return null;
    } catch (error) {
      console.error('Error updating leaderboard:', error);
      throw error;
    }
  });

/**
 * Admin audit logging
 * 
 * Callable function to log admin access for security auditing.
 * Only users with admin custom claims can call this function.
 */
exports.logAdminAccess = onCall(async (request) => {
  // Verify admin
  if (!request.auth || !request.auth.token.admin) {
    throw new HttpsError('permission-denied', 'Admin access required');
  }
  
  // Log access
  await admin.firestore().collection('admin_logs').add({
    uid: request.auth.uid,
    email: request.auth.token.email,
    action: request.data.action,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    ip: request.rawRequest.ip
  });
  
  console.log(`Admin access logged: ${request.auth.token.email} - ${request.data.action}`);
  return { success: true };
});

/**
 * Set admin custom claim for a user
 * 
 * This is a callable function that allows existing admins to grant admin access to other users.
 * For initial admin setup, use the Firebase Admin SDK directly or Firebase Console.
 */
exports.setAdminClaim = onCall(async (request) => {
  // Verify caller is admin
  if (!request.auth || !request.auth.token.admin) {
    throw new HttpsError('permission-denied', 'Admin access required');
  }
  
  const { uid, isAdmin } = request.data;
  
  if (!uid || typeof isAdmin !== 'boolean') {
    throw new HttpsError('invalid-argument', 'uid and isAdmin are required');
  }
  
  try {
    await admin.auth().setCustomUserClaims(uid, { admin: isAdmin });
    console.log(`Admin claim ${isAdmin ? 'granted' : 'revoked'} for user ${uid} by ${request.auth.token.email}`);
    
    // Log this action
    await admin.firestore().collection('admin_logs').add({
      uid: request.auth.uid,
      email: request.auth.token.email,
      action: `setAdminClaim: ${uid} = ${isAdmin}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error setting admin claim:', error);
    throw new HttpsError('internal', 'Failed to set admin claim');
  }
});

/**
 * Regenerate all leaderboards
 * 
 * This function rebuilds the materialized leaderboard views from scratch.
 * Useful for data recovery or when the leaderboard data becomes inconsistent.
 * Only admins can call this function.
 */
exports.regenerateLeaderboards = onCall(async (request) => {
  // Verify admin
  if (!request.auth || !request.auth.token.admin) {
    throw new HttpsError('permission-denied', 'Admin access required');
  }
  
  const db = admin.firestore();
  const modules = ['270201', '270202', '270203', '270204'];
  
  try {
    for (const moduleId of modules) {
      // Get all attempts for this module
      const attemptsSnapshot = await db.collection('attempts')
        .where('moduleId', '==', moduleId)
        .get();
      
      // Aggregate by username
      const userStats = {};
      attemptsSnapshot.forEach(doc => {
        const attempt = doc.data();
        const { username, score, timestamp } = attempt;
        
        if (!userStats[username]) {
          userStats[username] = {
            username,
            bestScore: score,
            attemptsCount: 0,
            lastAttempt: timestamp
          };
        }
        
        userStats[username].attemptsCount++;
        if (score > userStats[username].bestScore) {
          userStats[username].bestScore = score;
        }
        if (timestamp > userStats[username].lastAttempt) {
          userStats[username].lastAttempt = timestamp;
        }
      });
      
      // Sort and limit to top 50
      let entries = Object.values(userStats);
      entries.sort((a, b) => b.bestScore - a.bestScore);
      entries = entries.slice(0, 50);
      
      // Update leaderboard document
      await db.collection('leaderboard').doc(moduleId).set({
        entries,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`Regenerated leaderboard for module ${moduleId}: ${entries.length} entries`);
    }
    
    // Log this action
    await admin.firestore().collection('admin_logs').add({
      uid: request.auth.uid,
      email: request.auth.token.email,
      action: 'regenerateLeaderboards',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return { success: true, message: 'All leaderboards regenerated' };
  } catch (error) {
    console.error('Error regenerating leaderboards:', error);
    throw new HttpsError('internal', 'Failed to regenerate leaderboards');
  }
});

/**
 * Log Fingerprint - HTTP Function
 * 
 * Receives fingerprint data and creates a GitHub issue for tracking.
 * This is a Firebase Cloud Function for logging device fingerprints.
 * 
 * Required Configuration (set in functions/.env file):
 * - GITHUB_TOKEN: Personal access token with 'repo' scope
 * - GITHUB_REPO: Repository in format 'owner/repo'
 * 
 * Deploy with: firebase deploy --only functions:logFingerprint
 */

// Rate limiting: Track recent requests by fingerprint
const recentFingerprints = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 3;

exports.logFingerprint = onRequest({cors: true}, async (req, res) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  // Validate required fields
  const payload = req.body;
  const requiredFields = ['fp', 'ua', 'lang', 'tz', 'ts', 'url'];
  for (const field of requiredFields) {
    if (!(field in payload)) {
      res.status(400).json({ error: `Missing required field: ${field}` });
      return;
    }
  }

  // Rate limiting: Check if this fingerprint has made too many requests recently
  const now = Date.now();
  const fpKey = payload.fp;
  
  if (recentFingerprints.has(fpKey)) {
    const requests = recentFingerprints.get(fpKey);
    const recentRequests = requests.filter(time => now - time < RATE_LIMIT_WINDOW);
    
    if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
      console.warn(`Rate limit exceeded for fingerprint: ${fpKey.substring(0, 8)}...`);
      res.status(429).json({ 
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000)
      });
      return;
    }
    
    recentRequests.push(now);
    recentFingerprints.set(fpKey, recentRequests);
  } else {
    recentFingerprints.set(fpKey, [now]);
  }
  
  // Clean up old entries (prevent memory leak)
  if (recentFingerprints.size > 1000) {
    const entriesToDelete = [];
    for (const [key, times] of recentFingerprints.entries()) {
      if (times.every(time => now - time > RATE_LIMIT_WINDOW)) {
        entriesToDelete.push(key);
      }
    }
    entriesToDelete.forEach(key => recentFingerprints.delete(key));
  }

  // Get GitHub configuration from environment variables
  const githubToken = process.env.GITHUB_TOKEN;
  const githubRepo = process.env.GITHUB_REPO || 'StudyWithJesus/StudyWithJesus.github.io';

  if (!githubToken) {
    console.error('GITHUB_TOKEN environment variable is not set');
    res.status(500).json({ error: 'Server configuration error. GITHUB_TOKEN not set.' });
    return;
  }

  // Get client IP - handle both IPv4 and IPv6
  let clientIp = req.headers['x-forwarded-for'] || 
                 req.headers['x-real-ip'] || 
                 req.ip || 
                 'unknown';
  
  // If x-forwarded-for contains multiple IPs (comma-separated), take the first one
  if (clientIp.includes(',')) {
    clientIp = clientIp.split(',')[0].trim();
  }
  
  // Extract IPv4 if available (sometimes both IPv4 and IPv6 are present)
  const ipv4Match = clientIp.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
  const ipv6Match = clientIp.match(/([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}/);
  
  // Format IP for display
  const ipInfo = {
    full: clientIp,
    ipv4: ipv4Match ? ipv4Match[0] : null,
    ipv6: ipv6Match ? ipv6Match[0] : null,
    display: ipv4Match ? ipv4Match[0] : clientIp  // Prefer IPv4 for display
  };

  // Log fingerprint details (without creating GitHub issue)
  console.log(`Fingerprint logged: ${payload.fp.substring(0, 8)}... from ${ipInfo.display} - ${payload.name || 'Guest'}`);

  // Return success with IP info (no GitHub issue creation)
  res.status(201).json({
    success: true,
    clientIp: ipInfo.display,
    ipv4: ipInfo.ipv4,
    ipv6: ipInfo.ipv6,
    message: 'Fingerprint logged successfully'
  });
});
