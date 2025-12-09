# Quick Answer: What to Put as Homepage in GitHub OAuth App

## TL;DR - Copy These Exact Values

You're getting the "redirect_uri is not associated with this application" error because your GitHub OAuth App settings don't match Firebase.

**This site uses Firebase Authentication with GitHub provider on GitHub Pages.**

### Setting Up Your GitHub OAuth App:

1. Go to: https://github.com/settings/developers
2. Click "OAuth Apps" → "New OAuth App" (or edit existing)
3. Fill in these EXACT values:

```
Application name: StudyWithJesus Firebase Auth
Homepage URL: https://studywithjesus.github.io
Authorization callback URL: [GET THIS FROM FIREBASE - see below]
```

**To get the Authorization callback URL:**
1. Go to [Firebase Console](https://console.firebase.google.com/project/studywithjesus/authentication/providers)
2. Click on "GitHub" in the sign-in providers list
3. If not enabled, enable it - you'll see a callback URL like:
   ```
   https://studywithjesus.firebaseapp.com/__/auth/handler
   ```
4. **Copy that exact URL** and paste it as your Authorization callback URL in GitHub

## After Setting Up GitHub OAuth App

1. Copy the **Client ID** and **Client Secret** from your GitHub OAuth App
2. Go back to [Firebase Console → GitHub provider](https://console.firebase.google.com/project/studywithjesus/authentication/providers)
3. Paste your Client ID and Client Secret
4. Click Save
5. Try signing in at: https://studywithjesus.github.io/pages/admin/index.html

## Common Mistakes to Avoid

❌ **Wrong callback URL**:
- Must be from Firebase Console
- Format should be: `https://studywithjesus.firebaseapp.com/__/auth/handler`

❌ **Wrong homepage URL**:
- Use `https://studywithjesus.github.io`
- Should be `.github.io`

❌ **Extra spaces or characters**:
- Copy-paste carefully from Firebase Console
- No trailing slashes
- Check for typos

❌ **Missing Firebase setup**:
- Make sure GitHub provider is enabled in Firebase Console
- Firebase must be initialized in your config

## Still Having Issues?

### Test Your Configuration:
1. Visit https://studywithjesus.github.io/pages/admin/index.html
2. Click "Sign in with GitHub"
3. Check browser console (F12) for Firebase errors

### Get More Help:
- **Firebase Setup**: See [FIREBASE_SETUP_GUIDE.md](FIREBASE_SETUP_GUIDE.md)
- **Detailed Fix Guide**: See [FIX_REDIRECT_URI_ERROR.md](FIX_REDIRECT_URI_ERROR.md)
- **Troubleshooting**: See [docs/TROUBLESHOOTING_OAUTH.md](docs/TROUBLESHOOTING_OAUTH.md)

## Visual Guide

Your GitHub OAuth App settings should look like this:

```
┌─────────────────────────────────────────────────────────────┐
│ Application name                                            │
│ StudyWithJesus Firebase Auth                                │
├─────────────────────────────────────────────────────────────┤
│ Homepage URL                                                │
│ https://studywithjesus.github.io                           │
├─────────────────────────────────────────────────────────────┤
│ Authorization callback URL                                  │
│ https://studywithjesus.firebaseapp.com/__/auth/handler    │
└─────────────────────────────────────────────────────────────┘
```

**Important**: The callback URL MUST come from your Firebase Console. The example above is typical, but copy the exact URL Firebase shows you.

---

**Last Updated**: December 2024
