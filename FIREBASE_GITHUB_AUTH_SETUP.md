# Firebase Authentication with GitHub Setup Guide

This guide explains how to set up GitHub authentication for the admin pages using Firebase Authentication, which works on both GitHub Pages and Netlify deployments.

## Overview

The admin pages now use **Firebase Authentication with GitHub provider** instead of relying solely on Netlify serverless functions. This allows the site to work properly on GitHub Pages (https://studywithjesus.github.io) where serverless functions are not available.

## What Changed

### Authentication Flow
- **Before**: Used Netlify OAuth functions (`.netlify/functions/github-oauth`) which only work on Netlify
- **After**: Uses Firebase Authentication with GitHub provider, which works on any static hosting including GitHub Pages

### Admin Access
- **Before**: Required custom claims configured via Cloud Functions
- **After**: Any authenticated GitHub user has admin access (you can add a whitelist if needed)

### Data Loading
- **Before**: Showed sample data when custom claims weren't configured
- **After**: Loads real Firebase data once authenticated

## Setup Instructions

### Step 1: Create Firebase Project (if not already done)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Your project should already exist: `studywithjesus`
3. If not, create a new project

### Step 2: Enable GitHub Authentication in Firebase

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Click on **GitHub** in the providers list
3. Click **Enable**
4. You'll need to provide:
   - **GitHub Client ID**
   - **GitHub Client Secret**

### Step 3: Create GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **OAuth Apps** → **New OAuth App**
3. Fill in the details:
   - **Application name**: `StudyWithJesus Firebase Auth`
   - **Homepage URL**: `https://studywithjesus.github.io`
   - **Authorization callback URL**: Get this from Firebase (see Step 4)
4. Click **Register application**
5. Copy the **Client ID**
6. Generate a **Client Secret** and copy it

### Step 4: Get Firebase Callback URL

1. Back in Firebase Console (Authentication → Sign-in method → GitHub)
2. Copy the **Authorization callback URL** shown in the GitHub provider setup
3. It should look like: `https://studywithjesus.firebaseapp.com/__/auth/handler`

### Step 5: Update GitHub OAuth App

1. Return to your GitHub OAuth App settings
2. Paste the Firebase callback URL in the **Authorization callback URL** field
3. Save the application

### Step 6: Complete Firebase GitHub Setup

1. Back in Firebase Console
2. Paste your **GitHub Client ID** and **Client Secret** into the Firebase GitHub provider settings
3. Click **Save**

### Step 7: Add Authorized Domains (if needed)

1. In Firebase Console, go to **Authentication** → **Settings** → **Authorized domains**
2. Make sure these domains are authorized:
   - `studywithjesus.github.io` (for GitHub Pages)
   - Your Netlify domain (if using Netlify)
   - `localhost` (for local testing)

## Testing the Setup

### Test Admin Login

1. Go to: https://studywithjesus.github.io/pages/admin/index.html
2. Click **"Sign in with GitHub"**
3. A popup should appear asking you to authorize the app
4. Click **"Authorize"**
5. You should be redirected back to the admin page, now logged in
6. You should see your GitHub avatar and username

### Test Admin Leaderboard

1. Go to: https://studywithjesus.github.io/pages/admin/leaderboard.html
2. If you're logged in, you should see:
   - Your user info at the top
   - **Data Source**: Should show "Live" instead of "Sample"
   - Real data from Firestore (if any exists)

## Troubleshooting

### "Authentication module is not loaded"
- Check that `firebase.config.js` and `github-auth.js` are loaded before the page scripts
- Check browser console for any loading errors

### "Sign in with GitHub" button doesn't work
- Check browser console for errors
- Make sure popup blockers aren't preventing the sign-in popup
- Verify Firebase configuration is correct in `config/firebase.config.js`

### "Firebase not configured"
- Ensure `window.FIREBASE_CONFIG` is set in `config/firebase.config.js`
- Check that Firebase is initialized properly

### Still showing sample data
- Make sure you're signed in (check for user info at top of page)
- Verify Firestore has data in the `attempts` collection
- Check browser console for any Firebase errors
- Ensure Firestore security rules allow authenticated reads

### Popup closes immediately
- This might be a popup blocker
- Try allowing popups for your site
- You can also use redirect-based auth instead (would require code changes)

## Security Considerations

### Admin Access Control

By default, any authenticated GitHub user is treated as an admin. To restrict access to specific users:

1. Edit `assets/js/leaderboard-firebase.js`
2. In the `isAdmin()` function, uncomment and modify the whitelist:

```javascript
// Fallback: Any authenticated GitHub user has admin access
// In production, you can add a whitelist here:
const adminUsers = ['your-github-username', 'another-admin'];
const username = auth.currentUser.reloadUserInfo?.screenName || auth.currentUser.displayName;
return adminUsers.includes(username);
```

### Firestore Security Rules

Make sure your Firestore security rules allow authenticated users to read admin data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read attempts for admin view
    match /attempts/{attempt} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Add other collection rules as needed
  }
}
```

## Fallback Support

The authentication system has fallback support for Netlify deployments:

1. First, it tries to use Firebase Authentication (works everywhere)
2. If Firebase is not configured, it falls back to Netlify OAuth functions (only works on Netlify)

This means the site will work on:
- ✅ GitHub Pages (using Firebase Auth)
- ✅ Netlify (using Firebase Auth or Netlify functions)
- ✅ Any static hosting (using Firebase Auth)

## Benefits of This Approach

1. **Works on GitHub Pages**: No serverless functions required
2. **Better User Experience**: Popup-based auth is faster than redirects
3. **Persistent Sessions**: Firebase handles session management automatically
4. **Secure**: All authentication handled by Firebase/GitHub
5. **Free**: Firebase Authentication is free for most use cases

## Next Steps

After setting up authentication:

1. **Add Data to Firestore**: Start submitting exam attempts to populate the leaderboard
2. **Set Up Security Rules**: Ensure proper Firestore rules are in place
3. **Optional - Add Custom Claims**: For more granular admin control via Cloud Functions
4. **Optional - Add User Whitelist**: Restrict admin access to specific GitHub users

## Support

If you encounter issues:

1. Check browser console for errors
2. Verify all setup steps were completed
3. Check Firebase Console for authentication logs
4. Review Firestore security rules
5. Ensure you're using a modern browser with popups enabled

---

**Last Updated**: December 2024
