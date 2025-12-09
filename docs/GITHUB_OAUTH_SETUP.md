# GitHub OAuth Setup Guide for Admin Pages

> **⚠️ IMPORTANT:** This project uses Firebase Authentication with GitHub provider. See [FIREBASE_SETUP_GUIDE.md](../FIREBASE_SETUP_GUIDE.md) for the complete setup guide.

## For GitHub Pages: Use Firebase Authentication

GitHub Pages does not support serverless functions, so this site uses Firebase Authentication.

### Quick Setup Steps

1. **Follow the Firebase Setup Guide**: [FIREBASE_SETUP_GUIDE.md](../FIREBASE_SETUP_GUIDE.md)
2. **Create GitHub OAuth App** with Firebase callback URL (from Firebase Console)
3. **Enable GitHub provider** in Firebase Authentication
4. **Configure authorized domains** in Firebase (include your GitHub Pages domain)

That's it! The authentication will work automatically on GitHub Pages.

## Firebase Authentication Benefits

**For all deployments**, use Firebase Authentication as documented in [FIREBASE_SETUP_GUIDE.md](../FIREBASE_SETUP_GUIDE.md). It provides:

- ✅ Works on GitHub Pages
- ✅ Works on any static hosting platform
- ✅ Better security
- ✅ Better user experience
- ✅ No serverless functions needed
- ✅ Managed authentication infrastructure

## Related Documentation

- [FIREBASE_SETUP_GUIDE.md](../FIREBASE_SETUP_GUIDE.md) - **Start here**
- [TROUBLESHOOTING_OAUTH.md](TROUBLESHOOTING_OAUTH.md) - Troubleshooting guide
- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps) - Official GitHub docs
