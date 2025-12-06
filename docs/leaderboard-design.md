# Leaderboard Feature Design Document

This document describes the design and implementation of the leaderboard feature for the StudyWithJesus practice exam site.

## Overview

The leaderboard feature allows visitors to:
- Track their exam scores across modules
- Compete with other students on a public leaderboard
- View their progress over time

Site administrators can:
- View per-user exam counts and statistics
- Review detailed attempt history by module
- Monitor usage patterns (with proper privacy safeguards)

## Architecture

### Client-Side Components

The feature is implemented as a client-first solution that works with or without a backend:

```
pages/
├── leaderboard.html          # Public leaderboard page
└── admin/
    └── leaderboard.html      # Hidden admin view

assets/
├── js/
│   ├── leaderboard.js        # Generic client-side helper
│   └── leaderboard-firebase.js # Firebase integration
├── css/
│   └── leaderboard.css       # Leaderboard styles
└── data/
    └── leaderboard-sample.json # Sample data for demo/testing

config/
└── firebase.config.js.example  # Configuration template
```

### Data Flow

1. **Without Backend (Demo Mode)**
   - Client loads sample data from `assets/data/leaderboard-sample.json`
   - Scores saved to localStorage only
   - No cross-device persistence

2. **With Firebase Backend**
   - Client connects to Firestore for real-time data
   - Attempts submitted to Firestore `attempts` collection
   - Leaderboard read from materialized view or aggregated on-demand
   - Firebase Auth for admin access control

3. **With REST API Backend**
   - Client connects to configured `backendUrl`
   - Standard REST endpoints for CRUD operations
   - Backend handles data persistence and aggregation

## Data Model

### Firestore Collections

#### `users` Collection
```javascript
{
  id: "user_123",           // Auto-generated or from Auth UID
  username: "StudentName",  // Display name (max 30 chars)
  createdAt: Timestamp,     // First activity date
  settings: {
    emailNotifications: false
  }
}
```

#### `attempts` Collection
```javascript
{
  id: "attempt_456",        // Auto-generated
  userId: "user_123",       // Optional: links to users collection
  username: "StudentName",  // Denormalized for queries
  moduleId: "270201",       // Module ID
  examId: "270201a",        // Specific exam ID
  score: 85,                // Score 0-100
  timestamp: "2024-12-01T14:30:00Z",  // ISO 8601
  createdAt: Timestamp      // Server timestamp
}
```

#### `leaderboard` Collection (Materialized View)
Updated by Cloud Functions for efficient reads:
```javascript
{
  id: "270201",             // Module ID
  entries: [
    {
      username: "TopStudent",
      bestScore: 98,
      attemptsCount: 5,
      lastAttempt: "2024-12-01T14:30:00Z"
    },
    // ... more entries
  ],
  updatedAt: Timestamp
}
```

### Firestore Indexes

Create these composite indexes for efficient queries:

```
Collection: attempts
Fields: moduleId (Ascending), score (Descending)

Collection: attempts
Fields: username (Ascending), timestamp (Descending)

Collection: attempts
Fields: moduleId (Ascending), timestamp (Descending)
```

### SQL Schema (PostgreSQL Alternative)

For a server-backed approach without Firebase:

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(30) UNIQUE NOT NULL,
  email VARCHAR(255),
  password_hash VARCHAR(255),
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attempts table
CREATE TABLE attempts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  username VARCHAR(30) NOT NULL,  -- Denormalized
  module_id VARCHAR(10) NOT NULL,
  exam_id VARCHAR(20) NOT NULL,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  ip_hash VARCHAR(64)  -- Hashed for privacy
);

-- Indexes
CREATE INDEX idx_attempts_module_score ON attempts(module_id, score DESC);
CREATE INDEX idx_attempts_username ON attempts(username, timestamp DESC);

-- Leaderboard view (materialized)
CREATE MATERIALIZED VIEW leaderboard AS
SELECT
  module_id,
  username,
  MAX(score) as best_score,
  COUNT(*) as attempts_count,
  MAX(timestamp) as last_attempt
FROM attempts
GROUP BY module_id, username
ORDER BY module_id, best_score DESC;

-- Refresh periodically or via trigger
CREATE INDEX idx_leaderboard ON leaderboard(module_id, best_score DESC);
```

## API Endpoints

### REST API (Node/Express)

#### Public Endpoints

```
GET /api/leaderboard/:moduleId
  Response: Array of leaderboard entries
  
POST /api/attempts
  Body: { username, moduleId, examId, score }
  Response: { id, success: true }
```

#### Admin Endpoints (Authenticated)

```
GET /api/admin/users
  Response: Array of user statistics
  
GET /api/admin/attempts?page=1&limit=50&username=&moduleId=
  Response: { attempts: [...], hasMore: boolean }
```

### Example Node.js/Express Implementation

```javascript
const express = require('express');
const app = express();

// Public: Get leaderboard
app.get('/api/leaderboard/:moduleId', async (req, res) => {
  const { moduleId } = req.params;
  const limit = parseInt(req.query.limit) || 10;
  
  const leaderboard = await db.query(`
    SELECT username, best_score, attempts_count, last_attempt
    FROM leaderboard
    WHERE module_id = $1
    ORDER BY best_score DESC
    LIMIT $2
  `, [moduleId, limit]);
  
  res.json(leaderboard.rows);
});

// Public: Submit attempt
app.post('/api/attempts', async (req, res) => {
  const { username, moduleId, examId, score } = req.body;
  
  // Validate
  if (!username || !moduleId || !examId || typeof score !== 'number') {
    return res.status(400).json({ error: 'Invalid attempt data' });
  }
  
  // Sanitize
  const sanitizedUsername = username.substring(0, 30).replace(/[<>'"&]/g, '');
  const sanitizedScore = Math.max(0, Math.min(100, Math.round(score)));
  
  // Optional: Hash IP for rate limiting / fraud detection
  const ipHash = crypto.createHash('sha256')
    .update(req.ip + process.env.IP_SALT)
    .digest('hex');
  
  const result = await db.query(`
    INSERT INTO attempts (username, module_id, exam_id, score, ip_hash)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `, [sanitizedUsername, moduleId, examId, sanitizedScore, ipHash]);
  
  // Refresh materialized view (or do this on a schedule)
  await db.query('REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard');
  
  res.json({ id: result.rows[0].id, success: true });
});

// Admin: Get user stats (requires auth middleware)
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  // Aggregate user statistics
  const stats = await db.query(`
    SELECT 
      username,
      COUNT(*) as total_exams,
      COUNT(DISTINCT module_id) as modules_attempted,
      MAX(score) as best_score,
      AVG(score)::INTEGER as avg_score
    FROM attempts
    GROUP BY username
    ORDER BY total_exams DESC
  `);
  
  res.json(stats.rows);
});
```

## Security

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check admin claim
    function isAdmin() {
      return request.auth != null && request.auth.token.admin == true;
    }
    
    // Attempts collection
    match /attempts/{attemptId} {
      // Anyone can create an attempt (with validation)
      allow create: if 
        request.resource.data.username is string &&
        request.resource.data.username.size() <= 30 &&
        request.resource.data.moduleId is string &&
        request.resource.data.examId is string &&
        request.resource.data.score is number &&
        request.resource.data.score >= 0 &&
        request.resource.data.score <= 100;
      
      // Only admins can read individual attempts
      allow read: if isAdmin();
      
      // No updates or deletes from client
      allow update, delete: if false;
    }
    
    // Leaderboard collection (read-only, updated by Cloud Functions)
    match /leaderboard/{moduleId} {
      // Anyone can read leaderboard
      allow read: if true;
      
      // Only Cloud Functions can write
      allow write: if false;
    }
    
    // Users collection
    match /users/{userId} {
      // Users can read their own data
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // Admins can read all users
      allow read: if isAdmin();
      
      // Only Cloud Functions manage user creation
      allow write: if false;
    }
  }
}
```

### Cloud Function for Leaderboard Updates

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Update leaderboard when new attempt is added
exports.updateLeaderboard = functions.firestore
  .document('attempts/{attemptId}')
  .onCreate(async (snap, context) => {
    const attempt = snap.data();
    const { moduleId, username, score, timestamp } = attempt;
    
    const db = admin.firestore();
    const leaderboardRef = db.collection('leaderboard').doc(moduleId);
    
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
      
      // Sort by best score and keep top 50
      entries.sort((a, b) => b.bestScore - a.bestScore);
      entries = entries.slice(0, 50);
      
      transaction.set(leaderboardRef, {
        entries,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
  });

// Admin audit logging
exports.logAdminAccess = functions.https.onCall(async (data, context) => {
  // Verify admin
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Admin only');
  }
  
  // Log access
  await admin.firestore().collection('admin_logs').add({
    uid: context.auth.uid,
    email: context.auth.token.email,
    action: data.action,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    ip: context.rawRequest.ip
  });
  
  return { success: true };
});
```

### Setting Admin Custom Claims

Use Firebase Admin SDK (in a Cloud Function or admin script):

```javascript
const admin = require('firebase-admin');

// Set admin claim for a user
async function setAdminClaim(uid) {
  await admin.auth().setCustomUserClaims(uid, { admin: true });
  console.log(`Admin claim set for user ${uid}`);
}

// Call this with the UID of the user you want to make admin
// setAdminClaim('user_uid_here');
```

## Privacy Considerations

### Data Collection

1. **Username**: User-provided display name (not PII)
2. **Scores**: Exam performance data
3. **Timestamps**: When attempts were made
4. **IP Addresses**: If collected, should be hashed

### Privacy Best Practices

1. **IP Hashing**
   ```javascript
   const crypto = require('crypto');
   const hashedIP = crypto.createHash('sha256')
     .update(ip + SECRET_SALT)
     .digest('hex');
   ```

2. **Data Retention**
   - Keep detailed attempt data for 1 year
   - Archive/delete older data
   - Implement automated cleanup

3. **User Data Deletion**
   ```javascript
   async function deleteUserData(username) {
     // Delete all attempts by username
     const batch = db.batch();
     const attempts = await db.collection('attempts')
       .where('username', '==', username)
       .get();
     
     attempts.forEach(doc => batch.delete(doc.ref));
     await batch.commit();
     
     // Regenerate leaderboards
     await regenerateLeaderboards();
   }
   ```

4. **Opt-Out Instructions**
   - Users can clear localStorage to remove local tracking
   - Contact admin to request server-side data deletion
   - Provide clear privacy notice on leaderboard page

## Enabling the Feature

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Firestore Database
4. Enable Authentication (Email/Password)
5. Create a web app and copy the config

### Step 2: Configure Security Rules

1. In Firestore, go to Rules
2. Paste the security rules from this document
3. Publish the rules

### Step 3: Set Up Config File

1. Copy `config/firebase.config.js.example` to `config/firebase.config.js`
2. Replace placeholder values with your Firebase config
3. Add `config/firebase.config.js` to `.gitignore`

### Step 4: Enable in HTML

In `pages/leaderboard.html` and `pages/admin/leaderboard.html`:

1. Uncomment the Firebase SDK script tags
2. Uncomment the config and firebase module script tags

### Step 5: Deploy Cloud Functions

1. Initialize Firebase Functions in your project
2. Deploy the leaderboard update function
3. Set up admin custom claims for your admin user

### Step 6: Test

1. Open the public leaderboard page
2. Submit a test attempt
3. Verify data appears in Firestore
4. Access admin page with admin credentials
5. Verify all features work

## Testing Checklist

- [ ] Leaderboard page loads sample data when no backend configured
- [ ] Username input saves to localStorage
- [ ] Module tabs filter correctly
- [ ] Admin page is not discoverable via site navigation
- [ ] Admin page requires authentication
- [ ] Admin access is logged
- [ ] Firebase integration works (if enabled)
- [ ] Security rules prevent unauthorized access
- [ ] Mobile responsive layout works

## Troubleshooting

### Common Issues

1. **"Firebase not loaded" error**
   - Ensure Firebase SDK scripts are uncommented
   - Check for script loading order

2. **"Permission denied" in Firestore**
   - Verify security rules are published
   - Check that user has correct permissions/claims

3. **Leaderboard not updating**
   - Check Cloud Function logs
   - Verify Firestore indexes are created

4. **Admin page shows access denied**
   - Verify URL fragment matches configured key
   - Or verify Firebase Auth admin claim is set

## Future Enhancements

1. **Real-time updates** - Use Firestore listeners for live leaderboard
2. **Achievements** - Badges for milestones (100% score, 10 exams, etc.)
3. **Weekly/Monthly rankings** - Time-based leaderboards
4. **Export functionality** - Download data as CSV
5. **Email notifications** - Notify users of rank changes
