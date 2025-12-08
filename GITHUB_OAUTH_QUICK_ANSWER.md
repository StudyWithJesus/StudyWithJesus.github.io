# Quick Answer: What to Put as Homepage in GitHub OAuth App

## TL;DR - Copy These Exact Values

You're getting the "redirect_uri is not associated with this application" error because your GitHub OAuth App settings don't match your deployment.

### For GitHub Pages Deployment (studywithjesus.github.io)

**Creating/Editing your GitHub OAuth App:**
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

### For Netlify Deployment (silly-speculoos-4afae0.netlify.app)

**Creating/Editing your GitHub OAuth App:**
1. Go to: https://github.com/settings/developers
2. Click "OAuth Apps" → "New OAuth App" (or edit existing)
3. Fill in these EXACT values:

```
Application name: StudyWithJesus Admin
Homepage URL: https://silly-speculoos-4afae0.netlify.app
Authorization callback URL: https://silly-speculoos-4afae0.netlify.app/.netlify/functions/github-oauth
```

## Which One Do I Use?

### Use Firebase Authentication (First Option) If:
- ✅ You deployed to **GitHub Pages** at `studywithjesus.github.io`
- ✅ You want the site to work on GitHub Pages (doesn't support Netlify functions)
- ✅ This is the **RECOMMENDED** approach for GitHub Pages

### Use Netlify OAuth (Second Option) If:
- ✅ You deployed to **Netlify** at `silly-speculoos-4afae0.netlify.app`
- ✅ You need the Netlify-specific OAuth function

### Not Sure Which One You Have?

Check your site URL:
- If you access it at `https://studywithjesus.github.io` → Use Firebase Auth (first option)
- If you access it at `https://silly-speculoos-4afae0.netlify.app` → Use Netlify OAuth (second option)

## After Setting Up GitHub OAuth App

### For Firebase Auth Users:
1. Copy the **Client ID** and **Client Secret** from your GitHub OAuth App
2. Go back to [Firebase Console → GitHub provider](https://console.firebase.google.com/project/studywithjesus/authentication/providers)
3. Paste your Client ID and Client Secret
4. Click Save
5. Try signing in at: https://studywithjesus.github.io/pages/admin/index.html

### For Netlify OAuth Users:
1. Copy the **Client ID** and **Client Secret** from your GitHub OAuth App
2. Make sure `config/github-oauth.config.js` has your Client ID
3. Set environment variables in Netlify (Client Secret, etc.)
4. Redeploy your site
5. Try signing in at: https://silly-speculoos-4afae0.netlify.app/pages/admin/index.html

## Common Mistakes to Avoid

❌ **Wrong domain ending**:
- NOT `.netlifyapp.com` → Should be `.netlify.app`
- NOT `.github.com` → Should be `.github.io`

❌ **Missing path in callback URL**:
- Netlify: MUST include `/.netlify/functions/github-oauth`
- Firebase: MUST be the exact URL from Firebase Console

❌ **Extra spaces or characters**:
- Copy-paste carefully
- No trailing slashes
- Check for typos

❌ **Wrong homepage for deployment**:
- Use GitHub Pages URL if deployed there
- Use Netlify URL if deployed there

## Still Having Issues?

### Test Your Configuration:
- **For Netlify**: Visit https://silly-speculoos-4afae0.netlify.app/pages/admin/oauth-diagnostic.html
- **For GitHub Pages**: Check browser console for Firebase errors

### Get More Help:
- **Firebase Setup**: See [FIREBASE_GITHUB_AUTH_SETUP.md](FIREBASE_GITHUB_AUTH_SETUP.md)
- **Netlify Setup**: See [docs/GITHUB_OAUTH_SETUP.md](docs/GITHUB_OAUTH_SETUP.md)
- **Detailed Troubleshooting**: See [FIX_REDIRECT_URI_ERROR.md](FIX_REDIRECT_URI_ERROR.md)

## Visual Guide

Your GitHub OAuth App settings should look like this:

### For GitHub Pages (Firebase):
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

### For Netlify:
```
┌─────────────────────────────────────────────────────────────┐
│ Application name                                            │
│ StudyWithJesus Admin                                        │
├─────────────────────────────────────────────────────────────┤
│ Homepage URL                                                │
│ https://silly-speculoos-4afae0.netlify.app                 │
├─────────────────────────────────────────────────────────────┤
│ Authorization callback URL                                  │
│ https://silly-speculoos-4afae0.netlify.app/.netlify/       │
│ functions/github-oauth                                      │
└─────────────────────────────────────────────────────────────┘
```

---

**Last Updated**: December 2024
