# Remote Cloud Setup Guide

> **Set up Firebase entirely through web interfaces!** No cloning or command line required.

This guide shows you how to configure Firebase Authentication, Firestore, and Cloud Functions using only your web browser.

## Overview

**What you CAN do remotely (no cloning):**
- ✅ Create Firebase project
- ✅ Configure authentication (GitHub OAuth)
- ✅ Set up Firestore database
- ✅ Configure security rules
- ✅ Add authorized domains
- ✅ Configure hosting settings
- ✅ Most Firebase setup tasks

**What requires ONE-TIME local setup:**
- ⚠️ Deploying Cloud Functions (initial deployment only)
- ⚠️ Creating config files in repository

**Solution:** Use GitHub's web editor for config files, then ask someone with local access to deploy functions once.

---

## Part 1: Create Firebase Project (100% Remote)

### Step 1: Create Project

1. Go to: https://console.firebase.google.com/
2. Click **"Add project"** or **"Create a project"**
3. Enter project name: `studywithjesus`
4. Accept terms and click **"Continue"**
5. **Google Analytics**: Optional (can disable for simplicity)
6. Click **"Create project"**
7. Wait for creation to complete
8. Click **"Continue"**

✅ **Done! Project created remotely.**

### Step 2: Register Web App

1. In Firebase Console, click **Project Overview** (top left)
2. Click the **web icon** (`</>`) to add a web app
3. Fill in:
   - **App nickname**: `StudyWithJesus GitHub Pages`
   - **Firebase Hosting**: Leave unchecked (using GitHub Pages)
4. Click **"Register app"**
5. **COPY the Firebase configuration** that appears (you'll need this next):
   ```javascript
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "studywithjesus.firebaseapp.com",
     projectId: "studywithjesus",
     storageBucket: "studywithjesus.appspot.com",
     messagingSenderId: "123...",
     appId: "1:123..."
   };
   ```
6. Click **"Continue to console"**

✅ **Done! Web app registered.**

### Step 3: Add Firebase Config to Repository (Remote)

**Option A: Use GitHub Web Editor**

1. Go to: https://github.com/StudyWithJesus/StudyWithJesus.github.io
2. Navigate to: `config/firebase.config.js.example`
3. Click the file to view it
4. Copy the content
5. Navigate back to `config/` folder
6. Click **"Add file"** → **"Create new file"**
7. Name it: `firebase.config.js`
8. Paste the content and update with your Firebase config:
   ```javascript
   window.FIREBASE_CONFIG = {
     apiKey: "YOUR_API_KEY_HERE",
     authDomain: "studywithjesus.firebaseapp.com",
     projectId: "studywithjesus",
     storageBucket: "studywithjesus.appspot.com",
     messagingSenderId: "YOUR_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```
9. Scroll down and click **"Commit changes"**

**Option B: Use GitHub VS Code Web**

1. Go to: https://github.com/StudyWithJesus/StudyWithJesus.github.io
2. Press `.` (period key) to open VS Code for Web
3. Wait for editor to load
4. Navigate to `config/firebase.config.js.example`
5. Copy the file to `config/firebase.config.js`
6. Update with your Firebase config values
7. Use Source Control panel to commit and push

✅ **Done! Config file added remotely.**

---

## Part 2: GitHub Authentication (100% Remote)

### Step 1: Enable GitHub Provider in Firebase

1. Go to: https://console.firebase.google.com/project/studywithjesus/authentication/providers
2. Click **"Get started"** (if first time)
3. Click on **"GitHub"** in the providers list
4. Toggle **"Enable"** switch at the top
5. **COPY the Authorization callback URL** that appears:
   - Example: `https://studywithjesus.firebaseapp.com/__/auth/handler`
6. Keep this tab open (you'll add credentials in a moment)

### Step 2: Create GitHub OAuth App

1. Open new tab: https://github.com/settings/developers
2. Click **"OAuth Apps"** in left sidebar
3. Click **"New OAuth App"** button
4. Fill in the form:
   - **Application name**: `StudyWithJesus Firebase Auth`
   - **Homepage URL**: `https://studywithjesus.github.io`
   - **Application description**: `Admin authentication for StudyWithJesus`
   - **Authorization callback URL**: Paste the URL from Step 1
5. Click **"Register application"**
6. **COPY the Client ID** shown
7. Click **"Generate a new client secret"**
8. **COPY the Client Secret** (save it now - you can't see it again!)

### Step 3: Connect GitHub to Firebase

1. Go back to Firebase Console tab
2. Paste **Client ID** into the field
3. Paste **Client Secret** into the field
4. Click **"Save"**

✅ **Done! GitHub authentication configured remotely.**

### Step 4: Add Authorized Domains

1. In Firebase Console, go to: https://console.firebase.google.com/project/studywithjesus/authentication/settings
2. Click **"Settings"** tab
3. Scroll to **"Authorized domains"**
4. Click **"Add domain"**
5. Add: `studywithjesus.github.io`
6. Click **"Add"**

✅ **Done! Domain authorized.**

---

## Part 3: Firestore Database (100% Remote)

### Step 1: Create Firestore Database

1. Go to: https://console.firebase.google.com/project/studywithjesus/firestore
2. Click **"Create database"**
3. Choose **"Start in production mode"** (we'll add rules next)
4. Select location: **us-central** (or closest to your users)
5. Click **"Enable"**
6. Wait for database creation (takes ~1 minute)

✅ **Done! Database created remotely.**

### Step 2: Set Security Rules

1. In Firestore, click **"Rules"** tab
2. Replace the default rules with these (copy-paste entire content):

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
      
      // Only Cloud Functions can write (admin SDK bypasses rules)
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
    
    // Admin logs collection (write from Cloud Functions only)
    match /admin_logs/{logId} {
      // Only admins can read logs
      allow read: if isAdmin();
      
      // No client writes
      allow write: if false;
    }
  }
}
```

3. Click **"Publish"**
4. Confirm by clicking **"Publish"** again

✅ **Done! Security rules configured remotely.**

### Step 3: Create Initial Collections (Optional)

1. In Firestore, click **"Data"** tab
2. Click **"Start collection"**
3. Collection ID: `leaderboard`
4. Click **"Next"**
5. For first document:
   - Document ID: `270201` (auto-ID is fine too)
   - Add field: `entries` (type: array)
   - Value: `[]` (empty array)
6. Click **"Save"**

Repeat for collections: `attempts`, `users`, `admin_logs` (optional)

✅ **Done! Collections created remotely.**

---

## Part 4: Cloud Functions (Requires One-Time Help)

Cloud Functions need to be deployed from command line, but you can prepare everything remotely first.

### What Functions Do

- **Automatically update leaderboard** when users submit exam scores
- **Log admin access attempts** for security auditing
- **Process fingerprint data** and create GitHub issues with visitor info
- **Capture IP addresses** server-side (browsers can't see their own public IP)

### Why IP Shows "N/A (local)"

When you see IP addresses showing as "N/A (local)" in the fingerprint admin:
- ✅ Fingerprint hashing works (browser-side)
- ✅ User data is captured (name, browser, timezone)
- ❌ IP address is missing (requires server-side capture)

**Solution:** Deploy the `logFingerprint` Cloud Function once. This function:
1. Receives fingerprint data from the browser
2. Captures the visitor's IP address from the HTTP request
3. Creates a GitHub issue with complete data including IP
4. Stores data in Firestore (optional)

**Without Cloud Functions:**
- Site works perfectly
- Fingerprints are captured locally
- Leaderboard uses sample data
- IPs show as "N/A (local)"

**With Cloud Functions:**
- Automatic leaderboard updates
- Real IP addresses captured
- GitHub issues created for fingerprints
- Admin audit logging works

### Option A: Ask Someone with Local Access

Send them this message:
```
Hi! Can you help deploy Cloud Functions for our Firebase project?
This will enable IP address tracking in fingerprint logs.

1. Clone the repo: git clone https://github.com/StudyWithJesus/StudyWithJesus.github.io.git
2. cd StudyWithJesus.github.io
3. npm install
4. npm run functions:install
5. firebase login (use account: YOUR_EMAIL_HERE)
6. firebase use studywithjesus
7. firebase deploy --only functions

This only needs to be done once! After that, everything works remotely.
```

**What this enables:**
- ✅ IP addresses in fingerprint logs (no more "N/A (local)")
- ✅ Automatic leaderboard updates
- ✅ GitHub issues created for fingerprints
- ✅ Admin audit logging

### Option B: Use GitHub Codespaces (Cloud Development Environment)

**No local installation required!** Use GitHub's cloud development environment:

1. Go to: https://github.com/StudyWithJesus/StudyWithJesus.github.io
2. Click **"Code"** → **"Codespaces"** tab
3. Click **"Create codespace on main"**
4. Wait for environment to load (~1-2 minutes)
5. In the terminal at bottom, run:
   ```bash
   npm install
   npm run functions:install
   firebase login --no-localhost
   firebase use studywithjesus
   firebase deploy --only functions
   ```
6. Follow the login prompts in the terminal
7. Wait for deployment to complete (~2-3 minutes)

**Benefits:**
- ✅ No Node.js installation on your machine
- ✅ Free for GitHub users (60 hours/month)
- ✅ Works from any browser
- ✅ Delete codespace after deployment (no cost)

**After deployment:**
- Fingerprint logs will show real IP addresses
- GitHub issues will include IP information
- Leaderboard updates automatically

### Option C: Temporarily Skip Functions

The site works without Cloud Functions! Leaderboard updates just won't be automatic:
- ✅ Users can still take exams
- ✅ Scores are saved locally
- ✅ Fingerprints are captured (without IP addresses)
- ✅ Authentication works
- ✅ Everything else works fine
- ❌ IP addresses show "N/A (local)"
- ❌ Leaderboard doesn't update automatically

You can deploy functions later when convenient or when you need IP tracking.

---

## Part 5: Verify Setup (100% Remote)

### Test Authentication

1. Visit: https://studywithjesus.github.io/pages/admin/index.html
2. Click **"Sign in with GitHub"**
3. Authorize the app
4. You should see your GitHub profile

✅ If you see your profile = **Authentication works!**

### Test Firestore

1. Visit: https://studywithjesus.github.io
2. Take any practice exam
3. Submit your answers
4. Go to: https://console.firebase.google.com/project/studywithjesus/firestore/data
5. Check `attempts` collection for your submission

✅ If you see your attempt = **Firestore works!**

### Test Leaderboard

1. Visit: https://studywithjesus.github.io/pages/leaderboard.html
2. You should see leaderboard data

✅ If you see data = **Leaderboard works!**

### Check Admin Access

1. Visit: https://studywithjesus.github.io/pages/admin/leaderboard.html
2. Sign in with GitHub
3. You should see detailed statistics

✅ If you see stats = **Admin access works!**

---

## Summary: What's Remote vs. Local

### ✅ 100% Remote (No Cloning)
- Create Firebase project
- Register web app
- Enable GitHub authentication
- Create GitHub OAuth app
- Configure security rules
- Create Firestore collections
- Add authorized domains
- Test everything
- Manage data through console
- View admin dashboards

### ⚠️ Needs Local Setup (One-Time)
- Deploy Cloud Functions
- Update functions code

### 💡 Workaround
- Use GitHub Codespaces (cloud development environment)
- Or ask someone with Node.js installed to deploy once
- Functions deployment is optional - site works without it!

---

## Quick Links

**Firebase Console:**
- Project Overview: https://console.firebase.google.com/project/studywithjesus
- Authentication: https://console.firebase.google.com/project/studywithjesus/authentication
- Firestore: https://console.firebase.google.com/project/studywithjesus/firestore
- Functions: https://console.firebase.google.com/project/studywithjesus/functions

**GitHub:**
- Repository: https://github.com/StudyWithJesus/StudyWithJesus.github.io
- OAuth Apps: https://github.com/settings/developers

**Live Site:**
- Main Site: https://studywithjesus.github.io
- Admin Hub: https://studywithjesus.github.io/pages/admin/index.html
- Leaderboard: https://studywithjesus.github.io/pages/leaderboard.html

---

## Need Help?

- **Firebase Console Issues**: Check [FIREBASE_SETUP_GUIDE.md](FIREBASE_SETUP_GUIDE.md)
- **Authentication Issues**: See [GITHUB_OAUTH_QUICK_ANSWER.md](GITHUB_OAUTH_QUICK_ANSWER.md)
- **Managing Data**: See [REMOTE_MANAGEMENT.md](REMOTE_MANAGEMENT.md)

---

## Troubleshooting

### IP Addresses Show "N/A (local)"

**Problem:** Fingerprint admin shows IP as "N/A (local)" instead of real IP addresses.

**Cause:** Cloud Functions are not deployed yet. Browsers cannot see their own public IP address - only a server can capture it.

**Solution:**
1. Deploy Cloud Functions using Option A or B above (one-time setup)
2. After deployment, new fingerprint logs will include real IP addresses
3. Existing logs with "N/A (local)" won't retroactively get IPs (that's normal)

**Quick Check:**
- Go to: https://console.firebase.google.com/project/studywithjesus/functions
- If you see `logFingerprint` function listed → Functions are deployed ✅
- If page says "Get started by deploying your first function" → Functions not deployed ❌

### Can't Deploy Functions Locally

**Problem:** Don't have Node.js or can't install Firebase CLI locally.

**Solution:** Use GitHub Codespaces (Option B above) - it's a cloud development environment that requires no local installation.

### GitHub OAuth Not Working

**Problem:** Can't sign in to admin pages.

**Solution:**
1. Check authorized domains: https://console.firebase.google.com/project/studywithjesus/authentication/settings
2. Verify `studywithjesus.github.io` is in the list
3. Check GitHub OAuth app callback URL matches Firebase
4. See [GITHUB_OAUTH_QUICK_ANSWER.md](GITHUB_OAUTH_QUICK_ANSWER.md) for details
