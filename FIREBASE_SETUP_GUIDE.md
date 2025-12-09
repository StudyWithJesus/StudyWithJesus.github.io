# Complete Firebase Setup Guide

This is the **comprehensive step-by-step guide** to set up all Firebase features for StudyWithJesus including authentication, leaderboards, and fingerprint logging.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Part 1: Firebase Project Setup](#part-1-firebase-project-setup)
3. [Part 2: GitHub Authentication](#part-2-github-authentication)
4. [Part 3: Firestore Database & Leaderboards](#part-3-firestore-database--leaderboards)
5. [Part 4: Cloud Functions Deployment](#part-4-cloud-functions-deployment)
6. [Part 5: Fingerprint Logging (Optional)](#part-5-fingerprint-logging-optional)
7. [Part 6: Testing & Verification](#part-6-testing--verification)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, make sure you have:

- ✅ GitHub account (repository owner)
- ✅ Site deployed to GitHub Pages at `https://studywithjesus.github.io`
- ✅ Node.js and npm installed (for Cloud Functions)
- ✅ Command line access (Terminal, PowerShell, or Command Prompt)

---

## Part 1: Firebase Project Setup

### Step 1.1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter project name: `studywithjesus`
4. Accept terms and click **"Continue"**
5. Disable Google Analytics (optional) or configure it
6. Click **"Create project"**
7. Wait for project creation to complete
8. Click **"Continue"** when ready

### Step 1.2: Register Your Web App

1. In Firebase Console, go to Project Overview
2. Click the **web icon** (`</>`) to add a web app
3. Register app:
   - **App nickname**: `StudyWithJesus GitHub Pages`
   - Check **"Also set up Firebase Hosting"** (optional)
4. Click **"Register app"**
5. **Copy the Firebase configuration** (firebaseConfig object)
6. Click **"Continue to console"**

### Step 1.3: Configure Firebase in Your Site

1. In your repository, copy the example config:
   ```bash
   cp config/firebase.config.js.example config/firebase.config.js
   ```

2. Edit `config/firebase.config.js` and paste your Firebase configuration:
   ```javascript
   window.FIREBASE_CONFIG = {
     apiKey: "YOUR_API_KEY",
     authDomain: "studywithjesus.firebaseapp.com",
     projectId: "studywithjesus",
     storageBucket: "studywithjesus.appspot.com",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```

3. **Important**: Make sure `config/firebase.config.js` is in `.gitignore` to keep your credentials private

---

## Part 2: GitHub Authentication

This enables secure admin access using GitHub OAuth.

### Step 2.1: Enable GitHub Provider in Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/project/studywithjesus/authentication/providers)
2. Navigate to **Authentication** → **Sign-in method** tab
3. Click on **"GitHub"** in the providers list
4. Click the **"Enable"** toggle at the top
5. **Copy the Authorization callback URL** (it looks like: `https://studywithjesus.firebaseapp.com/__/auth/handler`)
6. Keep this page open - you'll add credentials here in a moment

### Step 2.2: Create GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **"OAuth Apps"** → **"New OAuth App"**
3. Fill in the form:
   - **Application name**: `StudyWithJesus Firebase Auth`
   - **Homepage URL**: `https://studywithjesus.github.io`
   - **Application description**: (optional) `Authentication for StudyWithJesus admin pages`
   - **Authorization callback URL**: Paste the callback URL from Step 2.1
4. Click **"Register application"**
5. On the next page, **copy the Client ID**
6. Click **"Generate a new client secret"**
7. **Copy the Client Secret immediately** (you won't see it again!)

### Step 2.3: Add OAuth Credentials to Firebase

1. Return to the Firebase Console (from Step 2.1)
2. Paste your **Client ID** in the first field
3. Paste your **Client Secret** in the second field
4. Click **"Save"**

### Step 2.4: Add Authorized Domain

1. Still in Firebase Console, go to **Authentication** → **Settings** → **Authorized domains**
2. Check if `studywithjesus.github.io` is in the list
3. If not present, click **"Add domain"** and add `studywithjesus.github.io`
4. Also add `localhost` for local testing if needed

### Step 2.5: Test Authentication

1. Visit your admin page: `https://studywithjesus.github.io/pages/admin/index.html`
2. You should see a **"Sign in with GitHub"** button
3. Click it - a popup window will appear
4. Authorize the application
5. You should be signed in and see your GitHub avatar

✅ **Authentication is now working!**

---

## Part 3: Firestore Database & Leaderboards

This enables persistent storage for leaderboards and user data.

### Step 3.1: Create Firestore Database

1. Go to [Firebase Console](https://console.firebase.google.com/project/studywithjesus/firestore)
2. Navigate to **Firestore Database** in the left sidebar
3. Click **"Create database"**
4. Select **"Start in production mode"** (we'll configure rules next)
5. Choose a location:
   - For best performance, choose closest to your users
   - Recommended: `us-central` or `us-east1`
6. Click **"Enable"**
7. Wait for database creation to complete

### Step 3.2: Configure Security Rules

1. In Firestore, click the **"Rules"** tab
2. Replace the default rules with these:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Leaderboard - read by anyone, write by Cloud Functions only
    match /leaderboard/{document=**} {
      allow read: if true;
      allow write: if false;
    }
    
    // Attempts - authenticated users can read and write their own
    match /attempts/{attempt} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
                  && request.auth.uid == request.resource.data.userId;
    }
    
    // Admin logs - authenticated users can read
    match /admin_logs/{log} {
      allow read: if request.auth != null;
      allow write: if false;
    }
    
    // Fingerprint logs - stored via Cloud Function only
    match /fingerprint_logs/{log} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

3. Click **"Publish"**

### Step 3.3: Create Firestore Indexes

Some queries require indexes. Create them now:

1. Stay in the Firestore Console
2. Click the **"Indexes"** tab
3. Click **"Add index"**
4. Create these composite indexes:

**Index 1: Leaderboard by module and score**
- Collection ID: `leaderboard`
- Fields:
  - `module` - Ascending
  - `score` - Descending
- Query scope: Collection

**Index 2: Attempts by user and timestamp**
- Collection ID: `attempts`
- Fields:
  - `userId` - Ascending
  - `timestamp` - Descending
- Query scope: Collection

5. Wait for indexes to build (usually takes a few minutes)

✅ **Firestore is now configured!**

---

## Part 4: Cloud Functions Deployment

Cloud Functions automatically update the leaderboard when users submit scores.

### Step 4.1: Install Firebase CLI

1. Open your terminal/command prompt
2. Install Firebase CLI globally:
   ```bash
   npm install -g firebase-tools
   ```

3. Verify installation:
   ```bash
   firebase --version
   ```

### Step 4.2: Login to Firebase

```bash
firebase login
```

- A browser window will open
- Sign in with your Google account (same one used for Firebase)
- Grant permissions when prompted
- Return to terminal when complete

### Step 4.3: Initialize Firebase in Your Project

1. Navigate to your repository directory:
   ```bash
   cd /path/to/StudyWithJesus.github.io
   ```

2. Connect to your Firebase project:
   ```bash
   firebase use studywithjesus
   ```

3. If the project doesn't exist, add it:
   ```bash
   firebase use --add
   # Select "studywithjesus" from the list
   # Press Enter to accept the alias
   ```

### Step 4.4: Deploy Cloud Functions

1. First, install function dependencies:
   ```bash
   cd functions
   npm install
   cd ..
   ```

2. Deploy the functions:
   ```bash
   firebase deploy --only functions
   ```

3. Wait for deployment to complete (may take 2-5 minutes)
4. You should see output like:
   ```
   ✔  functions: Finished running predeploy script.
   ✔  functions[updateLeaderboard(us-central1)]: Successful update operation.
   ✔  functions[logFingerprint(us-central1)]: Successful update operation.
   ```

✅ **Cloud Functions are now deployed!**

---

## Part 5: Fingerprint Logging (Optional)

This feature logs unique device fingerprints to GitHub issues for visitor tracking.

> **Note**: This feature requires the Firebase Blaze (pay-as-you-go) plan. Skip this section if you don't need visitor tracking.

### Step 5.1: Upgrade to Blaze Plan

1. Go to [Firebase Console Overview](https://console.firebase.google.com/project/studywithjesus/overview)
2. Click **"Upgrade"** in the left sidebar (or bottom)
3. Select the **"Blaze"** plan
4. Add payment method (credit/debit card)
5. Click **"Purchase"**

**Free tier limits:**
- 2 million Cloud Function invocations per month
- 125,000 reads and 20,000 writes per day (Firestore)
- Most sites won't exceed these limits

### Step 5.2: Create GitHub Personal Access Token

1. Go to [GitHub Token Settings](https://github.com/settings/tokens)
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Configure the token:
   - **Note**: `Firebase Fingerprint Logger`
   - **Expiration**: Choose 90 days or no expiration
   - **Select scopes**: Check ✅ **`repo`** (Full control of repositories)
4. Click **"Generate token"** at the bottom
5. **COPY THE TOKEN IMMEDIATELY** - you won't see it again!
6. Save it in a secure password manager

### Step 5.3: Configure Cloud Function with GitHub Token

Run these commands in your terminal:

```bash
# Set the GitHub token (replace with your actual token)
firebase functions:config:set github.token="ghp_your_actual_token_here"

# Set the repository (adjust if different)
firebase functions:config:set github.repo="StudyWithJesus/StudyWithJesus.github.io"

# Verify configuration
firebase functions:config:get
```

Expected output:
```json
{
  "github": {
    "token": "ghp_your_actual_token_here",
    "repo": "StudyWithJesus/StudyWithJesus.github.io"
  }
}
```

### Step 5.4: Deploy Fingerprint Function

```bash
firebase deploy --only functions:logFingerprint
```

Wait for deployment to complete.

### Step 5.5: Verify Fingerprint Logging

1. Visit any page on your site: `https://studywithjesus.github.io`
2. Wait 5-10 seconds for the fingerprint to be logged
3. Check GitHub issues: `https://github.com/StudyWithJesus/StudyWithJesus.github.io/issues`
4. You should see a new issue with the label `fingerprint-log`
5. The issue will contain:
   - Device fingerprint hash
   - User agent
   - Timestamp
   - Display name (if set)

✅ **Fingerprint logging is working!**

---

## Part 6: Testing & Verification

### Test 1: Authentication

1. Visit: `https://studywithjesus.github.io/pages/admin/index.html`
2. Click "Sign in with GitHub"
3. Authorize the app in the popup
4. ✅ You should see your GitHub profile

### Test 2: Admin Pages Access

Try accessing these pages:
- **Admin Hub**: `/pages/admin/index.html`
- **Leaderboard Admin**: `/pages/admin/leaderboard.html`
- **Fingerprint Admin**: `/pages/admin/fingerprint-admin.html`

✅ All should load without errors

### Test 3: Leaderboard

1. Visit the main site: `https://studywithjesus.github.io`
2. Complete a practice exam
3. Submit your score
4. Visit the leaderboard: `/pages/leaderboard.html`
5. ✅ Your score should appear

### Test 4: Cloud Functions

Check Firebase Console function logs:

1. Go to [Functions Console](https://console.firebase.google.com/project/studywithjesus/functions)
2. Click on a function name
3. Click **"Logs"** tab
4. ✅ You should see recent executions

### Test 5: Firestore Data

1. Go to [Firestore Console](https://console.firebase.google.com/project/studywithjesus/firestore)
2. Browse the collections:
   - `leaderboard` - should have top scores
   - `attempts` - should have user attempts
   - `fingerprint_logs` - should have device logs (if enabled)
3. ✅ Data should be present and properly structured

---

## Troubleshooting

### Authentication Issues

**Problem**: "Sign in with GitHub" button doesn't work

**Solutions**:
1. Check Firebase Console → Authentication → GitHub provider is enabled
2. Verify the callback URL matches exactly
3. Check browser console (F12) for error messages
4. Make sure `config/firebase.config.js` exists and is loaded
5. Verify GitHub OAuth App is configured correctly

**Problem**: "redirect_uri_mismatch" error

**Solutions**:
1. The callback URL in GitHub OAuth App must match Firebase exactly
2. It should be: `https://studywithjesus.firebaseapp.com/__/auth/handler`
3. Re-check Step 2.2 and 2.3

**Problem**: "Access Denied" after signing in

**Solutions**:
1. Check if username whitelist is configured (not by default)
2. Check browser console for specific error messages
3. Verify Firebase rules allow authenticated access

### Leaderboard Issues

**Problem**: Leaderboard shows "No data" or "Loading..."

**Solutions**:
1. Check if anyone has submitted scores yet
2. Verify Firestore rules are published (Step 3.2)
3. Check Firebase Console → Firestore to see if data exists
4. Check browser console for permission errors

**Problem**: Scores not updating

**Solutions**:
1. Verify Cloud Functions are deployed (Step 4.4)
2. Check function logs in Firebase Console
3. Ensure `updateLeaderboard` function executed successfully
4. Check Firestore indexes are built (Step 3.3)

### Cloud Functions Issues

**Problem**: `firebase deploy` fails

**Solutions**:
1. Make sure you're logged in: `firebase login`
2. Verify you're using the right project: `firebase use studywithjesus`
3. Check that `functions/package.json` has correct dependencies
4. Try: `cd functions && npm install && cd .. && firebase deploy --only functions`

**Problem**: Functions deploy but don't execute

**Solutions**:
1. Check function logs in Firebase Console
2. Verify you're on Blaze plan (required for functions)
3. Check for errors in the logs
4. Test with: `firebase functions:log`

### Fingerprint Logging Issues

**Problem**: No GitHub issues being created

**Solutions**:
1. Verify you're on Firebase Blaze plan (required for external HTTP requests)
2. Check GitHub token is valid and has `repo` scope
3. Verify token is set correctly: `firebase functions:config:get`
4. Check function logs: `firebase functions:log --only logFingerprint`
5. Make sure token hasn't been revoked or expired

**Problem**: Issues created but missing information

**Solutions**:
1. Check the fingerprint logger code in `assets/fingerprint-logger.js`
2. Verify the function in `functions/index.js` is receiving data
3. Check function logs for parsing errors

### General Debugging

**Check Firebase Console Logs:**
```bash
# View all function logs
firebase functions:log

# View specific function
firebase functions:log --only logFingerprint

# Follow logs in real-time
firebase functions:log --follow
```

**Check Local Firebase Configuration:**
```bash
# View current project
firebase use

# View function config
firebase functions:config:get

# Test function locally (if configured)
firebase emulators:start
```

**Browser Console:**
- Press F12 to open Developer Tools
- Check the Console tab for JavaScript errors
- Check the Network tab for failed requests

---

## Summary: What You Have Now

After completing this guide, you have:

✅ **Firebase Project** - Fully configured for your site  
✅ **GitHub Authentication** - Secure admin access  
✅ **Firestore Database** - Persistent data storage  
✅ **Security Rules** - Proper access controls  
✅ **Cloud Functions** - Automated leaderboard updates  
✅ **Leaderboard System** - Real-time score tracking  
✅ **Admin Dashboard** - Manage users and data  
✅ **Fingerprint Logging** (optional) - Visitor tracking  

---

## Quick Reference Links

### Firebase Console
- **Project Overview**: https://console.firebase.google.com/project/studywithjesus
- **Authentication**: https://console.firebase.google.com/project/studywithjesus/authentication
- **Firestore**: https://console.firebase.google.com/project/studywithjesus/firestore
- **Functions**: https://console.firebase.google.com/project/studywithjesus/functions

### GitHub Settings
- **OAuth Apps**: https://github.com/settings/developers
- **Personal Access Tokens**: https://github.com/settings/tokens

### Your Site
- **Main Site**: https://studywithjesus.github.io
- **Admin Hub**: https://studywithjesus.github.io/pages/admin/index.html
- **Leaderboard**: https://studywithjesus.github.io/pages/leaderboard.html

### Command Reference
```bash
# Login to Firebase
firebase login

# Switch project
firebase use studywithjesus

# Deploy everything
firebase deploy

# Deploy only functions
firebase deploy --only functions

# Deploy only hosting
firebase deploy --only hosting

# View logs
firebase functions:log

# View configuration
firebase functions:config:get
```

---

## Next Steps

1. **Restrict Admin Access** (Optional):
   - Edit `assets/js/leaderboard-firebase.js`
   - Add username whitelist in `isAdmin()` function
   - Only specific GitHub users can access admin features

2. **Customize Leaderboard**:
   - Modify `assets/js/leaderboard.js` for display preferences
   - Update `assets/css/leaderboard.css` for styling
   - Configure point values in exam submission logic

3. **Monitor Usage**:
   - Check Firebase Console regularly
   - Review function logs for errors
   - Monitor Firestore usage to stay within free tier

4. **Backup Data**:
   - Export Firestore data periodically
   - Use Firebase CLI: `firebase firestore:export backup/`
   - Store backups securely

---

**Last Updated**: December 2024  
**Firebase Project**: studywithjesus  
**Site**: https://studywithjesus.github.io

For additional help, check the individual documentation files or open a GitHub issue.
