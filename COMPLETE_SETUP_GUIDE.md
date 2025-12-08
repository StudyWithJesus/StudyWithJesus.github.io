# Complete Setup Guide - GitHub Pages with Firebase

This is the **ONLY guide** you need to set up authentication, admin access, fingerprint logging, and leaderboards for your GitHub Pages site.

## Prerequisites

- GitHub account (you already have this)
- Firebase project created at: https://console.firebase.google.com
- Site deployed to GitHub Pages at: https://studywithjesus.github.io

---

## Part 1: Firebase Authentication Setup (Required for Admin Access)

### Step 1.1: Enable GitHub Provider in Firebase

1. Go to: https://console.firebase.google.com/project/studywithjesus/authentication/providers
2. Click on **"GitHub"** in the sign-in providers list
3. Click **"Enable"** toggle
4. **Copy the Authorization callback URL** shown (looks like: `https://studywithjesus.firebaseapp.com/__/auth/handler`)
5. Keep this page open - you'll paste credentials here later

### Step 1.2: Create GitHub OAuth App

1. Go to: https://github.com/settings/developers
2. Click **"OAuth Apps"** → **"New OAuth App"**
3. Fill in:
   - **Application name**: `StudyWithJesus Firebase Auth`
   - **Homepage URL**: `https://studywithjesus.github.io`
   - **Authorization callback URL**: *Paste the URL from Step 1.1*
4. Click **"Register application"**
5. **Copy the Client ID**
6. Click **"Generate a new client secret"**
7. **Copy the Client Secret immediately** (you won't see it again!)

### Step 1.3: Add Credentials to Firebase

1. Go back to Firebase Console (the page from Step 1.1)
2. Paste your **Client ID** and **Client Secret**
3. Click **"Save"**
4. Done! Firebase Authentication is now configured.

### Step 1.4: Add Authorized Domain

1. Still in Firebase Console, go to: **Authentication** → **Settings** → **Authorized domains**
2. Make sure `studywithjesus.github.io` is in the list
3. If not, click **"Add domain"** and add it

---

## Part 2: Test Admin Access

### Step 2.1: Access the Admin Hub

1. Go to: https://studywithjesus.github.io/pages/admin/index.html
2. You should see a **"Sign in with GitHub"** button
3. Click it - a popup will appear
4. Authorize the app
5. You should now be signed in and see your GitHub avatar

### Step 2.2: Test Admin Pages

Try accessing these pages (all should work now):
- **Admin Hub**: https://studywithjesus.github.io/pages/admin/index.html
- **Fingerprint Admin**: https://studywithjesus.github.io/pages/admin/fingerprint-admin.html
- **Leaderboard Admin**: https://studywithjesus.github.io/pages/admin/leaderboard.html

✅ **If you can see these pages and your GitHub avatar, authentication is working!**

---

## Part 3: Restrict Admin Access (Optional but Recommended)

By default, anyone who signs in with GitHub can access admin pages. To restrict to only your account:

### Step 3.1: Edit the Auth Check

1. Open: `assets/js/leaderboard-firebase.js`
2. Find the `isAdmin()` function (around line 85-95)
3. Uncomment and modify the whitelist:

```javascript
// Restrict admin access to specific GitHub usernames
const adminUsers = ['StudyWithJesus']; // Replace with your GitHub username
const username = auth.currentUser.reloadUserInfo?.screenName || 
                 auth.currentUser.displayName;
return adminUsers.includes(username);
```

4. Commit and push to GitHub
5. Wait for GitHub Pages to deploy (1-2 minutes)

✅ **Now only you can access admin pages!**

---

## Part 4: Set Up Firestore for Leaderboards

### Step 4.1: Enable Firestore

1. Go to: https://console.firebase.google.com/project/studywithjesus/firestore
2. Click **"Create database"**
3. Choose **"Start in production mode"**
4. Select a location (choose closest to you)
5. Click **"Enable"**

### Step 4.2: Set Security Rules

1. In Firestore, go to **"Rules"** tab
2. Replace with these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow anyone to read leaderboard
    match /leaderboard/{document=**} {
      allow read: if true;
      allow write: if false;
    }
    
    // Allow authenticated users to submit attempts
    match /attempts/{attempt} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Admin logs - only readable by authenticated users
    match /admin_logs/{log} {
      allow read: if request.auth != null;
      allow write: if false;
    }
    
    // Fingerprint logs stored locally, not in Firestore
  }
}
```

3. Click **"Publish"**

### Step 4.3: Deploy Cloud Functions (Optional - for auto-updating leaderboard)

1. Install Firebase CLI (if not already):
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. In your repository directory:
   ```bash
   firebase use studywithjesus
   ```

4. Deploy functions:
   ```bash
   firebase deploy --only functions:updateLeaderboard
   ```

✅ **Leaderboard will now update automatically when users submit attempts!**

---

## Part 5: Set Up Fingerprint Logging (Optional)

This logs visitor fingerprints to GitHub issues. **Skip if you don't need this feature.**

### Step 5.1: Upgrade to Firebase Blaze Plan

1. Go to: https://console.firebase.google.com/project/studywithjesus/overview
2. Click **"Upgrade"** in the left sidebar
3. Select **"Blaze"** plan
4. **Note**: You get 2 million function calls FREE per month

### Step 5.2: Create New GitHub Token

**IMPORTANT**: Never share tokens in comments or commits!

1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token (classic)"**
3. Name: `Firebase Fingerprint Logger`
4. Select scope: **`repo`** (full control of repositories)
5. Click **"Generate token"**
6. **Copy the token and save it securely**

### Step 5.3: Configure Firebase Function

```bash
# Set GitHub token (replace with your actual token)
firebase functions:config:set github.token="YOUR_NEW_TOKEN_HERE"

# Set repository
firebase functions:config:set github.repo="StudyWithJesus/StudyWithJesus.github.io"

# View config to verify
firebase functions:config:get
```

### Step 5.4: Deploy Fingerprint Function

```bash
firebase deploy --only functions:logFingerprint
```

### Step 5.5: Verify It Works

1. Visit any page on your site: https://studywithjesus.github.io
2. Wait a few seconds
3. Check GitHub issues: https://github.com/StudyWithJesus/StudyWithJesus.github.io/issues
4. You should see a new issue with label `fingerprint-log`

✅ **Fingerprint logging is working!**

---

## Summary: What You Have Now

✅ **Admin Authentication**: Only you can access admin pages  
✅ **Leaderboard**: Users can submit scores, view top scores  
✅ **Firestore**: Data is stored securely in Firebase  
✅ **Auto-updating**: Cloud Functions update leaderboard automatically  
✅ **Fingerprint Logging** (if you set it up): Visitor tracking to GitHub issues  

---

## Troubleshooting

### "Sign in with GitHub" doesn't work

1. Check Firebase Console → Authentication → GitHub provider is enabled
2. Verify callback URL matches exactly
3. Check browser console (F12) for errors

### "Access Denied" after signing in

1. You may need to add username whitelist (see Part 3)
2. Check browser console for error messages

### Leaderboard shows "No data"

1. This is normal if no one has submitted scores yet
2. Try submitting a test score from the main site
3. Check Firestore Console to see if data exists

### Fingerprint function not working

1. Verify you're on Firebase Blaze plan
2. Check function logs: `firebase functions:log --only logFingerprint`
3. Verify GitHub token has `repo` scope
4. Make sure token hasn't been revoked

---

## Need Help?

1. **Firebase Console**: https://console.firebase.google.com/project/studywithjesus
2. **GitHub Settings**: https://github.com/settings/developers
3. **Admin Hub**: https://studywithjesus.github.io/pages/admin/index.html

---

**Last Updated**: December 2024  
**Site**: https://studywithjesus.github.io  
**Firebase Project**: studywithjesus
