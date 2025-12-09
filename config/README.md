# Configuration Files

This directory contains configuration files for the StudyWithJesus application.

## Files

### `firebase.config.js`
Configuration for Firebase/Firestore integration used by the leaderboard feature and authentication.

**Setup:**
- Copy from `firebase.config.js.example` and configure with your Firebase project credentials
- See [FIREBASE_SETUP_GUIDE.md](../FIREBASE_SETUP_GUIDE.md) for complete setup instructions

### `github-oauth.config.js`
Configuration for GitHub OAuth authentication used by admin pages (via Firebase).

**Setup Required:**

1. **Create GitHub OAuth App:**
   - Go to: https://github.com/settings/developers
   - Click "OAuth Apps" → "New OAuth App"
   - Fill in details:
     - **Application name:** StudyWithJesus Firebase Auth
     - **Homepage URL:** https://studywithjesus.github.io
     - **Authorization callback URL:** Get from Firebase Console (see setup guide)

2. **Get Client ID:**
   - After creating the app, copy the **Client ID**
   - Edit `github-oauth.config.js` and replace the `clientId` value with your actual Client ID
   - Example: `clientId: 'Iv1.a1b2c3d4e5f6g7h8'`

3. **Configure Firebase:**
   - Add your GitHub OAuth Client ID and Secret to Firebase Console
   - Firebase handles all authentication securely

4. **Deploy:**
   - Commit your changes with the updated `github-oauth.config.js`
   - Push to GitHub
   - GitHub Pages will automatically deploy

**For detailed instructions, see:** [FIREBASE_SETUP_GUIDE.md](../FIREBASE_SETUP_GUIDE.md)

## Security Notes

- ✅ **Client ID is safe to commit** - It's public and only used to initiate OAuth
- ❌ **NEVER commit Client Secret** - Managed securely by Firebase
- ✅ **Config files can be committed** - They only contain public configuration
- ℹ️ **Firebase config is public** - Firebase security is handled by Firestore rules and Firebase Authentication
