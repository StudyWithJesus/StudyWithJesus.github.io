# Firebase Fingerprint Logger Setup Guide

This guide explains how to set up the fingerprint logging feature using Firebase Cloud Functions to log fingerprints as GitHub issues.

## Overview

The fingerprint logger creates a unique identifier for each visitor and logs it to GitHub issues for tracking purposes. This is useful for:
- Tracking unique visitors
- Identifying devices for access control (if needed)
- Monitoring site usage patterns

## Prerequisites

- Firebase project set up (you already have `studywithjesus`)
- Firebase CLI installed: `npm install -g firebase-tools`
- GitHub Personal Access Token with `repo` scope
- Firebase Blaze plan (pay-as-you-go, but has generous free tier)

## Step 1: Upgrade to Firebase Blaze Plan

Firebase Cloud Functions require the Blaze (pay-as-you-go) plan.

1. Go to [Firebase Console](https://console.firebase.google.com/project/studywithjesus/overview)
2. Click "Upgrade" in the left sidebar
3. Select "Blaze" plan
4. **Note**: You get 2 million function invocations per month for FREE
5. Fingerprint logging typically uses only a few hundred invocations per month

## Step 2: Create GitHub Personal Access Token

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a descriptive name: `Firebase Fingerprint Logger`
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
5. Click "Generate token"
6. **Copy the token immediately** - you won't see it again!

## Step 3: Configure Firebase Functions

Set environment variables for the function using Firebase CLI:

```bash
# Login to Firebase (if not already)
firebase login

# Set GitHub token (replace with your actual token)
firebase functions:config:set github.token="ghp_your_token_here"

# Set GitHub repository (optional - defaults to StudyWithJesus/StudyWithJesus.github.io)
firebase functions:config:set github.repo="StudyWithJesus/StudyWithJesus.github.io"
```

**Alternative: Set via Firebase Console**

1. Go to: https://console.firebase.google.com/project/studywithjesus/functions
2. Click on "..." menu → "Detailed usage stats"
3. Go to the "Configuration" tab
4. Add environment variables:
   - `GITHUB_TOKEN`: Your GitHub Personal Access Token
   - `GITHUB_REPO`: `StudyWithJesus/StudyWithJesus.github.io`

## Step 4: Deploy the Function

```bash
# Navigate to your repository
cd /path/to/StudyWithJesus.github.io

# Deploy only the fingerprint logging function
firebase deploy --only functions:logFingerprint
```

You should see output like:
```
✔  functions[logFingerprint(us-central1)] Successful create operation.
Function URL (logFingerprint(us-central1)): https://us-central1-studywithjesus.cloudfunctions.net/logFingerprint
```

## Step 5: Update Frontend Configuration

The fingerprint logger is already configured to use the Firebase function at:
```
https://us-central1-studywithjesus.cloudfunctions.net/logFingerprint
```

If your function deploys to a different region or you want to use Firebase Hosting rewrites, update `assets/fingerprint-logger.js`:

```javascript
const endpoint = 'https://<your-region>-studywithjesus.cloudfunctions.net/logFingerprint';
```

## Step 6: Test the Setup

1. **Visit your site**: https://studywithjesus.github.io
2. **Check Firebase logs**:
   ```bash
   firebase functions:log --only logFingerprint
   ```
3. **Check GitHub issues**:
   - Go to: https://github.com/StudyWithJesus/StudyWithJesus.github.io/issues
   - Look for issues with label `fingerprint-log`
   - You should see a new issue with fingerprint data

## Optional: Use Firebase Hosting Rewrites (Cleaner URLs)

To use `/api/logFingerprint` instead of the full function URL:

### 1. Update `firebase.json`

Add to the `hosting` section:

```json
{
  "hosting": {
    "public": ".",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "/api/logFingerprint",
        "function": "logFingerprint"
      }
    ]
  }
}
```

### 2. Update `assets/fingerprint-logger.js`

Change the endpoint:

```javascript
const endpoint = '/api/logFingerprint';
```

### 3. Redeploy

```bash
firebase deploy
```

## Monitoring and Costs

### View Function Logs

```bash
# View recent logs
firebase functions:log --only logFingerprint

# Follow logs in real-time
firebase functions:log --only logFingerprint --follow
```

### Check Usage and Costs

1. Go to: https://console.firebase.google.com/project/studywithjesus/usage
2. Check "Cloud Functions" section
3. Monitor invocation count and execution time

**Typical costs**: With the free tier (2M invocations/month), fingerprint logging should be **completely free** for most sites.

## Troubleshooting

### Function returns 500 error

**Check environment variables**:
```bash
firebase functions:config:get
```

Should show:
```json
{
  "github": {
    "token": "ghp_...",
    "repo": "StudyWithJesus/StudyWithJesus.github.io"
  }
}
```

If not set, run Step 3 again.

### GitHub issues not being created

**Check function logs**:
```bash
firebase functions:log --only logFingerprint
```

Common issues:
- ❌ Invalid GitHub token (expired or wrong scope)
- ❌ Repository name format wrong (should be `owner/repo`)
- ❌ GitHub API rate limit exceeded

### CORS errors in browser console

The function is already configured with CORS headers. If you still see errors:

1. Make sure you deployed the latest version
2. Check that the endpoint URL is correct
3. Try accessing the function URL directly in a browser to verify it's working

### Function not found (404 error)

- Make sure you deployed: `firebase deploy --only functions:logFingerprint`
- Check the function exists: `firebase functions:list`
- Verify the region matches the URL (default is `us-central1`)

## Security Considerations

✅ **GitHub Token Security**:
- Token is stored in Firebase Functions environment (server-side only)
- Never exposed to client-side code
- Can be rotated anytime via Firebase config

✅ **Privacy**:
- Fingerprints are one-way hashes (SHA-256)
- IP addresses are logged for info only (not used for blocking)
- Users can view their fingerprint in browser localStorage

✅ **Access Control**:
- Function accepts requests from any origin (CORS enabled)
- This is intentional - fingerprint logging is public
- Abuse prevention: Firebase Functions have built-in DDoS protection

## Alternative: Disable Fingerprint Logging

If you decide not to use fingerprint logging:

1. **Remove the function call** in `assets/fingerprint-logger.js`:
   Comment out the fetch request (lines 134-137)

2. **Keep local logging**: Fingerprints are still stored in browser localStorage for the admin dashboard

3. **No cost**: Without the function call, there are no Firebase costs

## Summary

✅ **After setup, you'll have**:
- Automatic fingerprint logging to GitHub issues
- Viewable in admin dashboard: `/pages/admin/fingerprint-admin.html`
- Free tier covers typical usage
- Can be disabled anytime without breaking the site

✅ **Maintenance**:
- Function runs automatically (no maintenance needed)
- GitHub token can be rotated if compromised
- Logs automatically expire after 30 days

---

**Need Help?**
- Firebase Functions Docs: https://firebase.google.com/docs/functions
- Firebase Console: https://console.firebase.google.com/project/studywithjesus
- GitHub Token Settings: https://github.com/settings/tokens
