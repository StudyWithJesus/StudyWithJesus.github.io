const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function regenerateLeaderboards() {
  const db = admin.firestore();
  const modules = ['270201', '270202', '270203', '270204'];
  
  console.log('Regenerating leaderboards for all modules...\n');
  
  for (const moduleId of modules) {
    console.log(`Processing module: ${moduleId}`);
    
    // Get all attempts for this module
    const attemptsSnapshot = await db.collection('attempts')
      .where('moduleId', '==', moduleId)
      .get();
    
    console.log(`  Found ${attemptsSnapshot.size} attempts`);
    
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
      updatedAt: admin.firestore.Timestamp.now()
    });
    
    console.log(`  ✅ Updated leaderboard: ${entries.length} users\n`);
  }
  
  console.log('All leaderboards regenerated successfully!');
  process.exit(0);
}

regenerateLeaderboards().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
