# Functions - Local / Cloud Dev instructions

This directory contains the Firebase Cloud Functions for the StudyWithJesus site. Cloud Functions must use a supported Node runtime. Google Cloud Functions decommissioned Node 18 on 2025-10-30. We set the project to use Node 20.

## Prerequisites

- Use Node 20 in your dev environment. If you use nvm: `nvm install 20 && nvm use 20`.
- If you're in a devcontainer, ensure the container image uses Node 20 or add `.nvmrc` so the container picks the correct version.
- Firebase Blaze (pay-as-you-go) plan for Cloud Functions (2M invocations/month free)
- GitHub Personal Access Token with `repo` scope (for IP logging)

## Quick Reference: Configure Live Leaderboards & IP Logging

### 1. Install and Authenticate
```bash
# Use Node 20
nvm use 20

# Install dependencies
cd functions
npm run functions:install

# Login to Firebase
firebase login --no-localhost

# Select project
firebase use studywithjesus
```

### 2. Configure IP Logging (logFingerprint function)
```bash
# Set GitHub token for fingerprint logging
firebase functions:config:set github.token="ghp_YOUR_TOKEN_HERE"

# Optional: Set repository (defaults to StudyWithJesus/StudyWithJesus.github.io)
firebase functions:config:set github.repo="StudyWithJesus/StudyWithJesus.github.io"

# View current config
firebase functions:config:get
```

**Get GitHub Token**: Go to https://github.com/settings/tokens → Generate new token (classic) → Select `repo` scope

### 3. Deploy All Functions
```bash
# Deploy all functions (leaderboard + fingerprint logging)
firebase deploy --only functions

# Or deploy individually:
firebase deploy --only functions:updateLeaderboard
firebase deploy --only functions:logFingerprint
```

### 4. Verify Deployment
After deployment, you'll see function URLs like:
```
Function URL (logFingerprint): https://us-central1-studywithjesus.cloudfunctions.net/logFingerprint
```

**Test leaderboards**: Submit a test attempt through the site, check Firestore `leaderboard` collection.

**Test IP logging**: Visit the site, check GitHub issues for new fingerprint entries.

For detailed setup instructions, see [FIREBASE_FINGERPRINT_SETUP.md](../FIREBASE_FINGERPRINT_SETUP.md).

---

## Install dependencies

Run from the repository root or inside functions:

```bash
cd functions
npm run functions:install
```

**Notes:** `functions:install` will cleanly remove node_modules and package-lock.json then run `npm install` to rebuild native modules for Node 20.

## Firebase deploy steps (interactive)

```bash
# Authenticate
firebase login --no-localhost

# Select the project
firebase use studywithjesus

# Deploy only functions
firebase deploy --only functions
```

## Non-interactive deployment (CI)

If you need to run the CLI non-interactively (CI), generate a token with `firebase login:ci` and use:

```bash
npx firebase-tools deploy --only functions --token "$FIREBASE_TOKEN"
```

## GitHub Actions / CI

If CI or GitHub Actions are used, update the runner to use Node 20:

```yaml
- uses: actions/setup-node@v3
  with:
    node-version: '20'
```

---

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

## Configure Environment Variables

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

## Deploy Firestore Rules & Indexes

```bash
# Deploy security rules
firebase deploy --only firestore:rules

# Deploy indexes
firebase deploy --only firestore:indexes
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
