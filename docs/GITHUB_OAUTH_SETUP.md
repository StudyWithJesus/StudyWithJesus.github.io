# GitHub OAuth Setup Guide for Admin Pages

> **⚠️ IMPORTANT FOR GITHUB PAGES:** This project uses Firebase Authentication with GitHub provider. See [FIREBASE_GITHUB_AUTH_SETUP.md](FIREBASE_GITHUB_AUTH_SETUP.md) for the complete setup guide.

> **📝 Note:** Netlify OAuth instructions below are deprecated for GitHub Pages deployments but may still be used for Netlify-specific deployments if needed.

## For GitHub Pages: Use Firebase Authentication

GitHub Pages does not support serverless functions, so you **must** use Firebase Authentication.

### Quick Setup Steps

1. **Follow the Firebase Setup Guide**: [FIREBASE_GITHUB_AUTH_SETUP.md](../FIREBASE_GITHUB_AUTH_SETUP.md)
2. **Create GitHub OAuth App** with Firebase callback URL (from Firebase Console)
3. **Enable GitHub provider** in Firebase Authentication
4. **Configure authorized domains** in Firebase (include your GitHub Pages domain)

That's it! The authentication will work automatically on GitHub Pages.

## For Netlify Deployments (Optional/Deprecated)

If you're deploying to Netlify and want to use Netlify functions instead of Firebase (not recommended):

### Step 1: Create GitHub OAuth App

1. Go to: https://github.com/settings/developers
2. Click "OAuth Apps" → "New OAuth App"
3. Configure:
   ```
   Application name: StudyWithJesus Admin (Netlify)
   Homepage URL: https://your-site.netlify.app
   Authorization callback URL: https://your-site.netlify.app/.netlify/functions/github-oauth
   ```
4. Copy the Client ID and generate a Client Secret

### Step 2: Set Netlify Environment Variables

Required variables:
- `GITHUB_CLIENT_ID`: Your OAuth App Client ID
- `GITHUB_CLIENT_SECRET`: Your OAuth App Client Secret (keep secret!)
- `ADMIN_GITHUB_USERNAME`: Your GitHub username for access control

### Step 3: Implement Netlify Function

You'll need to create `netlify/functions/github-oauth.js` to handle the OAuth callback.

See legacy implementations for reference (not included in current codebase).

## Recommendation

**For all deployments**, use Firebase Authentication as documented in [FIREBASE_GITHUB_AUTH_SETUP.md](../FIREBASE_GITHUB_AUTH_SETUP.md). It provides:

- ✅ Works on GitHub Pages
- ✅ Works on Netlify
- ✅ Works on any static hosting
- ✅ Better security
- ✅ Better user experience
- ✅ No serverless functions needed

## Related Documentation

- [FIREBASE_GITHUB_AUTH_SETUP.md](../FIREBASE_GITHUB_AUTH_SETUP.md) - **Start here**
- [TROUBLESHOOTING_OAUTH.md](TROUBLESHOOTING_OAUTH.md) - Troubleshooting guide
- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps) - Official GitHub docs
