# Quick Setup & Debug Guide

This guide helps you get OAuth, fingerprints, and leaderboards up and running quickly, with debug tips for common issues.

## 🚀 Quick Start Checklist

### 1. Firebase Authentication (OAuth) Setup

**What you need:**
- Firebase project created
- GitHub OAuth App configured
- Firebase config file set up

**Steps:**
1. **Create GitHub OAuth App** at https://github.com/settings/developers
   - Application name: `StudyWithJesus Firebase Auth`
   - Homepage URL: `https://studywithjesus.github.io`
   - Authorization callback URL: Get from Firebase Console (see below)

2. **Enable GitHub in Firebase Console**:
   - Go to: https://console.firebase.google.com/
   - Navigate to: Authentication → Sign-in method → GitHub
   - Click Enable
   - Copy the callback URL shown (looks like: `https://YOUR-PROJECT.firebaseapp.com/__/auth/handler`)

3. **Update GitHub OAuth App**:
   - Paste the Firebase callback URL into your GitHub OAuth App settings
   - Copy your GitHub Client ID and Client Secret

4. **Complete Firebase Setup**:
   - Paste Client ID and Secret into Firebase Console → GitHub provider
   - Click Save

5. **Verify config file** exists at `config/firebase.config.js`:
   ```javascript
   window.FIREBASE_CONFIG = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     // ... other config
   };
   ```

**✅ Test:** Visit `/pages/admin/index.html` and click "Sign in with GitHub"

---

### 2. Leaderboard Setup

**What you need:**
- Firebase Firestore enabled
- Firebase config set up (same as above)

**Steps:**
1. **Enable Firestore** in Firebase Console:
   - Go to: Firestore Database → Create database
   - Choose production mode or test mode
   - Select a region

2. **Set Firestore Rules** (allow authenticated users):
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /attempts/{attempt} {
         allow read: if request.auth != null;
         allow write: if request.auth != null;
       }
       match /leaderboard/{module} {
         allow read: if true; // Public read
         allow write: if request.auth != null;
       }
     }
   }
   ```

3. **Deploy Firebase Cloud Functions** (optional, for auto-updating leaderboard):
   ```bash
   cd functions
   npm install
   firebase deploy --only functions:updateLeaderboard
   ```

**✅ Test:** 
- Take a quiz and submit your score
- Visit `/pages/leaderboard.html` to see your score
- Visit `/pages/admin/leaderboard.html` to see admin view (requires authentication)

---

### 3. Fingerprint Logging Setup

**What you need:**
- GitHub Personal Access Token
- Firebase Cloud Function deployed

**Steps:**
1. **Create GitHub Personal Access Token**:
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select scope: `repo` (to create issues)
   - Copy the token

2. **Set Firebase environment variables**:
   ```bash
   firebase functions:config:set github.token="your-github-token"
   firebase functions:config:set github.repo="StudyWithJesus/StudyWithJesus.github.io"
   ```

3. **Update endpoint in `assets/fingerprint-logger.js`**:
   ```javascript
   const endpoint = 'https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net/logFingerprint';
   ```

4. **Deploy the fingerprint function**:
   ```bash
   firebase deploy --only functions:logFingerprint
   ```

**✅ Test:**
- Visit your site
- Check GitHub repository for new issues with label `fingerprint-log`

---

## 🐛 Debug Pages & Testing

### Admin Pages (Require Authentication)

1. **Admin Hub**: `/pages/admin/index.html`
   - Central dashboard with links to all admin features
   - Sign in with GitHub to access

2. **Leaderboard Admin**: `/pages/admin/leaderboard.html`
   - View all leaderboard data
   - See user statistics and scores
   - Shows "Live" data source when working

3. **Fingerprint Admin**: `/pages/admin/fingerprint-admin.html`
   - View logged fingerprints
   - Toggle block/allow status
   - Export whitelist configuration

### Public Pages (No Authentication)

1. **Main Site**: `/index.html`
   - Test fingerprint logging (automatic)
   - Set display name for leaderboard

2. **Quiz Pages**: `/pages/module-*.html`
   - Take quizzes to test score submission
   - Scores should appear on leaderboard

3. **Leaderboard**: `/pages/leaderboard.html`
   - Public view of leaderboard
   - Should show submitted scores

---

## 🔍 Common Issues & Solutions

### Issue: "Sign in with GitHub" button does nothing

**Debug:**
1. Open browser DevTools (F12) → Console
2. Look for errors like:
   - `Firebase not configured`
   - `FIREBASE_CONFIG is not defined`

**Fix:**
- Ensure `config/firebase.config.js` exists and is loaded before other scripts
- Check that Firebase config values are correct

---

### Issue: "redirect_uri_mismatch" error from GitHub

**Debug:**
- GitHub shows error page about redirect URI

**Fix:**
1. Check GitHub OAuth App settings
2. Ensure callback URL is: `https://YOUR-PROJECT.firebaseapp.com/__/auth/handler`
3. NOT: `/.netlify/functions/github-oauth` (old, removed)

---

### Issue: Leaderboard shows no data

**Debug:**
1. Open browser DevTools → Console
2. Check for Firebase errors
3. Visit `/pages/admin/leaderboard.html` - shows "Sample" or "Live" data source

**Fix:**
- If showing "Sample": You're not authenticated or Firebase not configured
- If showing "Live" but no data: Take a quiz and submit a score
- Check Firestore rules allow authenticated reads

---

### Issue: Fingerprints not logged to GitHub

**Debug:**
1. Check browser Console for fetch errors
2. Verify function endpoint URL in `assets/fingerprint-logger.js`
3. Check Firebase Functions logs in Firebase Console

**Fix:**
- Ensure Firebase function is deployed
- Verify GitHub token has `repo` scope
- Check token is set in Firebase config: `firebase functions:config:get`

---

## 🔧 Firebase CLI Commands Reference

### Initial Setup
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project (if not done)
firebase init
```

### Configuration
```bash
# Set environment variables for Cloud Functions
firebase functions:config:set github.token="your-token"
firebase functions:config:set github.repo="owner/repo"

# View current config
firebase functions:config:get

# Remove a config value
firebase functions:config:unset github.token
```

### Deployment
```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:logFingerprint
firebase deploy --only functions:updateLeaderboard

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy everything
firebase deploy
```

### Testing & Debugging
```bash
# View function logs
firebase functions:log

# Run functions locally (emulator)
firebase emulators:start --only functions

# Test a function locally
firebase functions:shell
```

---

## 📋 Verification Checklist

After setup, verify everything works:

### Authentication (OAuth)
- [ ] Can visit `/pages/admin/index.html`
- [ ] "Sign in with GitHub" button appears
- [ ] Clicking button opens GitHub authorization popup
- [ ] After authorization, see your GitHub avatar and username
- [ ] Can access admin features

### Leaderboard
- [ ] Can set display name on main page
- [ ] Can take a quiz and submit score
- [ ] Score appears on `/pages/leaderboard.html`
- [ ] Admin view at `/pages/admin/leaderboard.html` shows "Live" data
- [ ] Can see detailed statistics in admin view

### Fingerprint Logging
- [ ] Visiting site generates fingerprint (check local storage)
- [ ] GitHub issues created with label `fingerprint-log`
- [ ] Issues contain fingerprint hash, user agent, display name
- [ ] Admin page shows logged fingerprints
- [ ] Can toggle block/allow status

---

## 📚 Related Documentation

- **Firebase Auth Setup**: [FIREBASE_GITHUB_AUTH_SETUP.md](FIREBASE_GITHUB_AUTH_SETUP.md)
- **Fingerprint Setup**: [docs/FINGERPRINT_SETUP.md](docs/FINGERPRINT_SETUP.md)
- **Troubleshooting**: [docs/TROUBLESHOOTING_OAUTH.md](docs/TROUBLESHOOTING_OAUTH.md)
- **Admin Pages**: [pages/admin/README.md](pages/admin/README.md)

---

## 💡 Quick Tips

1. **Use Browser DevTools Console**: Most issues show errors in the console
2. **Check Firebase Console Logs**: View function execution logs for debugging
3. **Incognito Mode**: Test authentication in incognito to avoid cache issues
4. **Check Firebase Status**: https://status.firebase.google.com/
5. **Test Functions Locally**: Use Firebase emulators before deploying

---

## 🆘 Still Having Issues?

1. Check the browser console for specific error messages
2. Review Firebase function logs: `firebase functions:log`
3. Verify all environment variables are set: `firebase functions:config:get`
4. Ensure Firestore rules allow your operations
5. Test in incognito mode to rule out cache issues
