/**
 * Firebase Cloud Functions for StudyWithJesus Leaderboard
 * 
 * These functions automatically update the leaderboard when new attempts are submitted.
 * 
 * Deploy with: firebase deploy --only functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Update leaderboard when a new attempt is added
 * 
 * This function triggers whenever a new document is created in the 'attempts' collection.
 * It updates the materialized leaderboard view for the corresponding module.
 */
exports.updateLeaderboard = functions.firestore
  .document('attempts/{attemptId}')
  .onCreate(async (snap, _context) => {
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
exports.logAdminAccess = functions.https.onCall(async (data, context) => {
  // Verify admin
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }
  
  // Log access
  await admin.firestore().collection('admin_logs').add({
    uid: context.auth.uid,
    email: context.auth.token.email,
    action: data.action,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    ip: context.rawRequest.ip
  });
  
  console.log(`Admin access logged: ${context.auth.token.email} - ${data.action}`);
  return { success: true };
});

/**
 * Set admin custom claim for a user
 * 
 * This is a callable function that allows existing admins to grant admin access to other users.
 * For initial admin setup, use the Firebase Admin SDK directly or Firebase Console.
 */
exports.setAdminClaim = functions.https.onCall(async (data, context) => {
  // Verify caller is admin
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }
  
  const { uid, isAdmin } = data;
  
  if (!uid || typeof isAdmin !== 'boolean') {
    throw new functions.https.HttpsError('invalid-argument', 'uid and isAdmin are required');
  }
  
  try {
    await admin.auth().setCustomUserClaims(uid, { admin: isAdmin });
    console.log(`Admin claim ${isAdmin ? 'granted' : 'revoked'} for user ${uid} by ${context.auth.token.email}`);
    
    // Log this action
    await admin.firestore().collection('admin_logs').add({
      uid: context.auth.uid,
      email: context.auth.token.email,
      action: `setAdminClaim: ${uid} = ${isAdmin}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error setting admin claim:', error);
    throw new functions.https.HttpsError('internal', 'Failed to set admin claim');
  }
});

/**
 * Regenerate all leaderboards
 * 
 * This function rebuilds the materialized leaderboard views from scratch.
 * Useful for data recovery or when the leaderboard data becomes inconsistent.
 * Only admins can call this function.
 */
exports.regenerateLeaderboards = functions.https.onCall(async (data, context) => {
  // Verify admin
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
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
      uid: context.auth.uid,
      email: context.auth.token.email,
      action: 'regenerateLeaderboards',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return { success: true, message: 'All leaderboards regenerated' };
  } catch (error) {
    console.error('Error regenerating leaderboards:', error);
    throw new functions.https.HttpsError('internal', 'Failed to regenerate leaderboards');
  }
});
