# Firebase Cloud Functions

This directory contains Firebase Cloud Functions for the StudyWithJesus application.

## Functions

### `updateLeaderboard`
- **Trigger**: Firestore `onCreate` on `attempts/{attemptId}`
- **Description**: Automatically updates the materialized leaderboard when a new attempt is submitted
- **Behavior**: 
  - Updates or creates user entry in leaderboard
  - Tracks best score, attempt count, and last attempt time
  - Keeps top 50 entries per module

### `logAdminAccess`
- **Trigger**: HTTPS Callable
- **Description**: Logs admin access for security auditing
- **Auth**: Requires admin custom claim

### `setAdminClaim`
- **Trigger**: HTTPS Callable  
- **Description**: Allows admins to grant/revoke admin access to other users
- **Auth**: Requires admin custom claim

### `regenerateLeaderboards`
- **Trigger**: HTTPS Callable
- **Description**: Rebuilds all leaderboard data from attempts collection
- **Auth**: Requires admin custom claim

### `logFingerprint`
- **Trigger**: HTTPS Request
- **Description**: Logs browser fingerprints to GitHub issues for visitor tracking
- **Auth**: Public endpoint with CORS enabled
- **Environment Variables**:
  - `GITHUB_TOKEN` (required): GitHub Personal Access Token with `repo` scope
  - `GITHUB_REPO` (optional): Repository in format `owner/repo` (defaults to `StudyWithJesus/StudyWithJesus.github.io`)
- **Setup Guide**: See [FIREBASE_FINGERPRINT_SETUP.md](../FIREBASE_FINGERPRINT_SETUP.md)

## Deployment

### Prerequisites

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize project (if not already done):
   ```bash
   firebase use studywithjesus
   ```

### Deploy Functions

```bash
# Deploy all functions
firebase deploy --only functions

# Deploy a specific function
firebase deploy --only functions:updateLeaderboard
firebase deploy --only functions:logFingerprint
```

### Configure Environment Variables

For the `logFingerprint` function:

```bash
# Set GitHub token
firebase functions:config:set github.token="YOUR_GITHUB_TOKEN"

# Set repository (optional)
firebase functions:config:set github.repo="StudyWithJesus/StudyWithJesus.github.io"

# View current config
firebase functions:config:get

# After setting config, redeploy the function
firebase deploy --only functions:logFingerprint
```

### Deploy Firestore Rules & Indexes

```bash
# Deploy security rules
firebase deploy --only firestore:rules

# Deploy indexes
firebase deploy --only firestore:indexes
```

## Local Development

### Run Emulators

```bash
cd functions
npm install
npm run serve
```

This starts the Firebase emulators for local testing.

### View Logs

```bash
firebase functions:log
```

## Initial Admin Setup

To set the first admin user, use the Firebase Admin SDK in a Node.js script:

```javascript
const admin = require('firebase-admin');
admin.initializeApp();

// Replace with the UID of the user you want to make admin
const uid = 'USER_UID_HERE';

admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => console.log('Admin claim set successfully'))
  .catch(console.error);
```

Or use the Firebase Console:
1. Go to Authentication > Users
2. Find the user and copy their UID
3. Use Cloud Shell or a local script to set the custom claim

## Troubleshooting

### Function not triggering
- Check that the `attempts` collection name is correct
- Verify the function is deployed: `firebase functions:list`
- Check function logs: `firebase functions:log`

### Permission denied errors
- Verify Firestore security rules are deployed
- Check that the user has the correct custom claims
- Admin SDK (used by functions) bypasses security rules

### Leaderboard not updating
- Check Cloud Function logs for errors
- Verify Firestore indexes are created
- Ensure attempt data has all required fields
