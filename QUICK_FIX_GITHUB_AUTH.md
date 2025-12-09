# Quick Fix: GitHub Sign-In and Admin Leaderboard Data

> **📚 UPDATED GUIDE AVAILABLE:** Please use [FIREBASE_SETUP_GUIDE.md](FIREBASE_SETUP_GUIDE.md) for complete step-by-step instructions.  
> **🚀 New User? Start Here:** [GITHUB_OAUTH_QUICK_ANSWER.md](GITHUB_OAUTH_QUICK_ANSWER.md) - Get exact values for your GitHub OAuth App settings.

This document is kept for reference but the new comprehensive guide is recommended.

---

## Problem 1: Cannot Sign In with GitHub on Admin Pages

**Issue**: The "Sign in with GitHub" button on https://studywithjesus.github.io/pages/admin/index.html doesn't work or shows errors.

**Root Cause**: The site was using Netlify OAuth functions that don't work on GitHub Pages.

**Solution**: The site now uses Firebase Authentication with GitHub provider, which works on GitHub Pages.

### Quick Setup (5 minutes):

1. **Enable GitHub in Firebase Console**:
   - Go to: https://console.firebase.google.com/project/studywithjesus/authentication/providers
   - Click "GitHub" and enable it
   - You'll see a callback URL like: `https://studywithjesus.firebaseapp.com/__/auth/handler`

2. **Create/Update GitHub OAuth App**:
   - Go to: https://github.com/settings/developers
   - If you don't have an OAuth App, create one with:
     - Name: `StudyWithJesus Firebase Auth`
     - Homepage: `https://studywithjesus.github.io`
     - Callback URL: (paste the Firebase callback URL from step 1)
   - Copy the Client ID and generate a Client Secret

3. **Add Credentials to Firebase**:
   - Back in Firebase Console (GitHub provider settings)
   - Paste your Client ID and Client Secret
   - Click Save

4. **Test**:
   - Go to: https://studywithjesus.github.io/pages/admin/index.html
   - Click "Sign in with GitHub"
   - A popup should appear - authorize the app
   - You should be logged in!

## Problem 2: Admin Leaderboard Shows Only Sample Data

**Issue**: The admin leaderboard at https://studywithjesus.github.io/pages/admin/leaderboard.html shows "Data Source: Sample" instead of "Data Source: Live" with real Firestore data.

**Root Cause**: The admin check was looking for Firebase custom claims that weren't set up. Without authentication, it fell back to sample data.

**Solution**: Once you're signed in with GitHub (after completing Problem 1 fix), the leaderboard will:
- Show "Data Source: Live"
- Load actual data from Firestore
- Display real user statistics and attempt history

### Verify It's Working:

1. **Sign in first**: Complete Problem 1 setup above
2. **Go to admin leaderboard**: https://studywithjesus.github.io/pages/admin/leaderboard.html
3. **Check the Data Source badge**: Should say "Live" not "Sample"
4. **Check user info**: Your GitHub avatar and username should appear at the top
5. **Check the data**: If you have attempts in Firestore, they'll show. If not, you'll see "No data available"

## Expected Behavior After Fix

### Admin Index (Hub) Page
- ✅ Shows "Sign in with GitHub" button when not logged in
- ✅ GitHub popup appears when clicking sign in
- ✅ After authorization, shows your avatar and username
- ✅ Displays links to Fingerprint Admin and Leaderboard Admin
- ✅ "Logout" button works

### Admin Leaderboard Page
- ✅ Shows GitHub sign-in if not logged in
- ✅ After login, displays your user info at top
- ✅ Data Source shows "Live" (not "Sample")
- ✅ Loads real statistics from Firestore
- ✅ Shows actual attempt history if data exists
- ✅ If no data in Firestore yet, shows "No data available" (this is normal if no one has submitted attempts yet)

## Common Issues

### "Popup was blocked"
- **Fix**: Allow popups for studywithjesus.github.io in your browser settings
- Try again after allowing popups

### "Firebase not configured"
- **Check**: Make sure `config/firebase.config.js` is loaded
- **Check**: Open browser console and verify no errors loading Firebase

### Still showing "Sample" data
- **Check**: Are you signed in? You should see your avatar/username at the top
- **Check**: Does Firestore have data? Go to Firebase Console → Firestore Database
- **Check**: Browser console for any Firebase errors

### "Authorization callback URL mismatch"
- **Fix**: Make sure the callback URL in your GitHub OAuth App matches the one from Firebase exactly
- The Firebase callback URL should look like: `https://studywithjesus.firebaseapp.com/__/auth/handler`

## Testing with No Data Yet

If you haven't submitted any exam attempts yet:
- The leaderboard will correctly show "No data available"
- This is **not** the same as showing sample data
- The "Data Source" badge should still say "Live"
- Once users start taking exams and submitting scores, real data will appear

## Need More Help?

See the detailed guide: [FIREBASE_GITHUB_AUTH_SETUP.md](FIREBASE_GITHUB_AUTH_SETUP.md)

## What Was Changed

Files modified:
1. `assets/js/github-auth.js` - Now uses Firebase Auth with GitHub provider
2. `assets/js/leaderboard-firebase.js` - Simplified admin check to work without custom claims
3. `pages/admin/index.html` - Updated to use async auth
4. `pages/admin/leaderboard.html` - Updated to use async auth

The changes are backward compatible with Netlify deployments while adding support for GitHub Pages.
