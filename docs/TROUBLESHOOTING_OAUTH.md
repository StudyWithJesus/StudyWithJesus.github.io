# GitHub OAuth Troubleshooting Guide

> **⚠️ IMPORTANT:** GitHub Pages deployments use Firebase Authentication. See [FIREBASE_GITHUB_AUTH_SETUP.md](../FIREBASE_GITHUB_AUTH_SETUP.md) for setup instructions.

> **📝 Note:** Netlify-specific OAuth instructions have been deprecated for GitHub Pages. If deploying to Netlify, you may still use Netlify functions, but Firebase Authentication is recommended for all deployments.

This guide helps diagnose and fix common issues with GitHub OAuth authentication on the admin pages.

## For GitHub Pages Deployments

### Quick Diagnostic Checklist

Work through these steps in order:

### 1. ✅ Is Firebase Authentication Configured?

**Check Firebase Console:** https://console.firebase.google.com/

- [ ] Firebase project exists (e.g., `studywithjesus`)
- [ ] Authentication is enabled
- [ ] GitHub provider is enabled
- [ ] Firebase config is set in `config/firebase.config.js`

**❌ Not configured?**
See [FIREBASE_GITHUB_AUTH_SETUP.md](../FIREBASE_GITHUB_AUTH_SETUP.md) for complete setup instructions.

### 2. ✅ Is the GitHub OAuth App Created with Firebase Callback?

**Check:** https://github.com/settings/developers

- [ ] OAuth App exists for your Firebase project
- [ ] Application name: `StudyWithJesus Firebase Auth` or similar
- [ ] Homepage URL: `https://studywithjesus.github.io`
- [ ] **Authorization callback URL:** `https://studywithjesus.firebaseapp.com/__/auth/handler`

**❌ Not created?**
1. Go to https://github.com/settings/developers
2. Click "OAuth Apps" → "New OAuth App"
3. Get the callback URL from Firebase Console (Authentication → Sign-in method → GitHub)
4. Use that URL as the Authorization callback URL
5. Copy the Client ID and Client Secret to Firebase Console

### 3. ✅ Does the Callback URL Match Firebase?

**Common mistake:** Using Netlify callback URL instead of Firebase callback URL

The callback URL in your GitHub OAuth App should be:
```
https://studywithjesus.firebaseapp.com/__/auth/handler
```
(or your project's Firebase Auth handler URL)

**❌ Wrong callback URL?**
- Using `/.netlify/functions/github-oauth` will NOT work on GitHub Pages
- Update your GitHub OAuth App to use the Firebase callback URL
- Get the correct URL from Firebase Console → Authentication → Sign-in method → GitHub

### 4. ✅ Are Authorized Domains Configured in Firebase?

**Check:** Firebase Console → Authentication → Settings → Authorized domains

Required domains:
- [ ] `studywithjesus.github.io` (your GitHub Pages domain)
- [ ] `localhost` (for local testing)

**❌ Not authorized?**
1. Go to Firebase Console → Authentication → Settings
2. Click "Authorized domains"
3. Add your GitHub Pages domain
4. Save changes

## Common Error Messages and Fixes

### "Firebase not configured for this site"

**What you see:** Alert saying Firebase is not configured and GitHub Pages cannot use Netlify functions

**Cause:** Firebase Authentication is not properly set up

**Fix:**
1. Follow [FIREBASE_GITHUB_AUTH_SETUP.md](../FIREBASE_GITHUB_AUTH_SETUP.md)
2. Ensure `config/firebase.config.js` has correct Firebase config
3. Enable GitHub provider in Firebase Console
4. Clear browser cache and try again

### "redirect_uri_mismatch" from GitHub

**What you see:** GitHub shows an error page about redirect URI

**Cause:** The callback URL in your OAuth App doesn't match the Firebase callback URL

**Fix:**
1. Go to https://github.com/settings/developers
2. Edit your OAuth App
3. Update "Authorization callback URL" to match Firebase:
   - Get the exact URL from Firebase Console → Authentication → GitHub provider
   - Example: `https://studywithjesus.firebaseapp.com/__/auth/handler`
4. Save changes
5. Try signing in again

### "Authentication is not configured"

**What you see:** Alert saying authentication is not configured

**Cause:** Missing Firebase configuration or GitHub OAuth Client ID

**Fix:**
1. Check `config/firebase.config.js` exists and has valid config
2. Check `config/github-oauth.config.js` has a Client ID (optional fallback)
3. Follow the complete setup guide in FIREBASE_GITHUB_AUTH_SETUP.md

### Popup closes immediately or is blocked

**What you see:** Sign-in popup doesn't appear or closes right away

**Cause:** Browser popup blocker

**Fix:**
1. Allow popups for your site in browser settings
2. Try signing in again
3. Check browser console for errors

## Debug Mode

To see detailed authentication information in browser console:

1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Try signing in to admin page
4. Look for log messages:
   - "Firebase Auth initialized successfully"
   - "Firebase auth state: signed in as ..."
   - Any error messages

## Testing the Flow Step-by-Step

1. **Visit admin page:**
   https://studywithjesus.github.io/pages/admin/index.html

2. **Expected:** See "Sign in with GitHub" button

3. **Click sign in button**
   - Opens Firebase authentication popup
   - Shows GitHub authorization page
   - Shows your OAuth App name

4. **Click "Authorize" on GitHub**
   - Popup closes
   - Page reloads showing admin dashboard
   - Your GitHub avatar and username appear

5. **Expected:** Admin page shows your user info and data

## For Legacy Netlify Deployments (Deprecated)

> **⚠️ Netlify OAuth is deprecated for this project.** Use Firebase Authentication instead.

If you absolutely must use Netlify functions:

1. Create a separate GitHub OAuth App with Netlify callback URL
2. Set `GITHUB_CLIENT_SECRET` and `ADMIN_GITHUB_USERNAME` environment variables in Netlify
3. Implement the `github-oauth.js` serverless function
4. See legacy documentation for details (not recommended)

## Still Having Issues?

### Check Browser Console

1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for error messages related to Firebase or authentication
4. Check Network tab for failed requests

### Verify Firebase Configuration

1. Check `config/firebase.config.js` has valid configuration
2. Verify Firebase project is active in Firebase Console
3. Confirm GitHub provider is enabled in Firebase Authentication
4. Check authorized domains include your deployment domain

### Try Incognito/Private Mode

Sometimes browser extensions or cached data can interfere:
1. Open incognito/private browsing window
2. Try signing in again
3. If it works, clear cookies/cache in normal mode

## Need Help?

If you've tried everything and it's still not working:

1. **Gather Information:**
   - What error message do you see exactly?
   - Screenshot of the error
   - Browser console logs
   - Firebase Console authentication logs

2. **Double-check:**
   - Firebase is properly configured
   - GitHub OAuth App callback URL matches Firebase
   - Authorized domains are configured
   - Browser allows popups

3. **Try Creating Fresh OAuth App:**
   Sometimes starting from scratch helps:
   - Create a new OAuth App in GitHub
   - Use Firebase callback URL from Firebase Console
   - Add Client ID and Secret to Firebase
   - Test authentication

## Related Documentation

- [FIREBASE_GITHUB_AUTH_SETUP.md](../FIREBASE_GITHUB_AUTH_SETUP.md) - Complete Firebase setup guide
- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps) - Official GitHub docs
- [Firebase Authentication](https://firebase.google.com/docs/auth) - Official Firebase docs
