# FIX: "redirect_uri is not associated with this application"

> **🚀 Quick Answer:** See [GITHUB_OAUTH_QUICK_ANSWER.md](GITHUB_OAUTH_QUICK_ANSWER.md) for exact copy-paste values for your GitHub OAuth App settings.

## The Problem

You're seeing this error from GitHub:
> **The redirect_uri is not associated with this application.**
> 
> The application might be misconfigured or could be trying to redirect you to a website you weren't expecting.

## The Cause

Your GitHub OAuth App's "Authorization callback URL" doesn't match the URL Firebase is using.

## The Solution (2 minutes)

### Step 1: Get Your Exact Callback URL from Firebase

1. **Go to Firebase Console:**
   https://console.firebase.google.com/project/studywithjesus/authentication/providers

2. **Click on "GitHub" provider:**
   - If not already enabled, click "Enable"
   - You'll see the **Authorization callback URL**
   - It should look like: `https://studywithjesus.firebaseapp.com/__/auth/handler`

3. **Copy that exact URL** - you'll need it in the next step

### Step 2: Update Your GitHub OAuth App

1. **Go to your GitHub OAuth Apps:**
   https://github.com/settings/developers

2. **Click on your OAuth App** (should be "StudyWithJesus Firebase Auth" or similar)

3. **Edit the settings:**
   - **Homepage URL:** `https://studywithjesus.github.io`
   - **Authorization callback URL:** Paste the URL from Firebase (Step 1)

4. **Common mistakes to avoid:**
   - ❌ Wrong callback URL (not from Firebase)
   - ❌ Using a custom URL instead of Firebase URL
   - ❌ Extra spaces or trailing slashes
   - ❌ Using `http://` instead of `https://`
   - ❌ Typos in the Firebase URL

5. **Click "Update application"** to save

### Step 3: Add Credentials to Firebase

1. **Back in GitHub OAuth App page**, copy:
   - Client ID
   - Client Secret (generate if needed)

2. **Go back to Firebase Console** (GitHub provider settings)

3. **Paste your Client ID and Client Secret**

4. **Click "Save"**

### Step 4: Test Again

1. Go to: https://studywithjesus.github.io/pages/admin/index.html
2. Click "Sign in with GitHub"
3. You should now be able to authorize successfully!

## Still Not Working?

### Double-Check Everything:

**Your OAuth App should have these settings:**

```
Application name: StudyWithJesus Firebase Auth
Homepage URL: https://studywithjesus.github.io
Authorization callback URL: https://studywithjesus.firebaseapp.com/__/auth/handler
```

**Note**: The callback URL above is typical, but you must use the exact URL shown in your Firebase Console.

### Verify Firebase Is Configured:

1. **Check that Firebase config is loaded:**
   - Open browser console (F12)
   - Type: `window.FIREBASE_CONFIG`
   - Should show your Firebase configuration

2. **Verify GitHub provider is enabled in Firebase:**
   - Go to Firebase Console → Authentication → Sign-in method
   - GitHub should be enabled with your Client ID and Secret

## Why This Happens

GitHub OAuth requires the callback URL to be **pre-registered** in your OAuth App for security. Firebase provides a specific callback URL that must be used exactly. If the URL doesn't match, GitHub rejects the authentication request.

This is a security feature to prevent malicious sites from hijacking your OAuth flow.

## Quick Fix Checklist

- [ ] Go to https://console.firebase.google.com/project/studywithjesus/authentication/providers
- [ ] Copy the GitHub callback URL from Firebase
- [ ] Go to https://github.com/settings/developers
- [ ] Click on your OAuth App
- [ ] Set Homepage URL to: `https://studywithjesus.github.io`
- [ ] Set Authorization callback URL to the URL from Firebase (like `https://studywithjesus.firebaseapp.com/__/auth/handler`)
- [ ] Click "Update application"
- [ ] Go back to Firebase, add your Client ID and Client Secret
- [ ] Try signing in again

That's it! This should fix the issue immediately.

## Screenshot Reference

Your OAuth App settings should look like this:

```
┌─────────────────────────────────────────────────────────────┐
│ Application name                                            │
│ StudyWithJesus Firebase Auth                                │
├─────────────────────────────────────────────────────────────┤
│ Homepage URL                                                │
│ https://studywithjesus.github.io                           │
├─────────────────────────────────────────────────────────────┤
│ Application description (optional)                          │
│ Admin authentication for StudyWithJesus site                │
├─────────────────────────────────────────────────────────────┤
│ Authorization callback URL                                  │
│ https://studywithjesus.firebaseapp.com/__/auth/handler    │
└─────────────────────────────────────────────────────────────┘
```

## After Fixing

Once you update the callback URL and sign in successfully:
- Firebase manages your session automatically
- You'll be redirected to the admin dashboard
- You'll see your GitHub avatar and username
- You can access all admin pages

## Need More Help?

- See the complete Firebase setup guide: [FIREBASE_GITHUB_AUTH_SETUP.md](FIREBASE_GITHUB_AUTH_SETUP.md)
- Check browser console for detailed Firebase error messages
- Verify Firebase project settings at: https://console.firebase.google.com/project/studywithjesus
