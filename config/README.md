# Configuration Files

This directory contains configuration files for the StudyWithJesus application.

## Files

### `firebase.config.js`
Configuration for Firebase/Firestore integration used by the leaderboard feature.

**Setup:**
- Created and already configured with project credentials
- Leaderboard feature is enabled by default
- See `docs/leaderboard-design.md` for details

### `github-oauth.config.js`
Configuration for GitHub OAuth authentication used by admin pages.

**Setup Required:**

1. **Create GitHub OAuth App:**
   - Go to: https://github.com/settings/developers
   - Click "OAuth Apps" → "New OAuth App"
   - Fill in details:
     - **Application name:** StudyWithJesus Admin
     - **Homepage URL:** https://your-site.netlify.app (your actual domain)
     - **Authorization callback URL:** https://your-site.netlify.app/.netlify/functions/github-oauth

2. **Get Client ID:**
   - After creating the app, copy the **Client ID**
   - Edit `github-oauth.config.js` and replace the empty `clientId` value with your actual Client ID
   - Example: `clientId: 'Iv1.a1b2c3d4e5f6g7h8'`

3. **Set Netlify Environment Variables:**
   In your Netlify dashboard (Site settings → Environment variables), add:
   - `GITHUB_CLIENT_SECRET`: Your OAuth App Client Secret (from GitHub)
   - `ADMIN_GITHUB_USERNAME`: Your GitHub username (e.g., 'StudyWithJesus')

4. **Deploy:**
   - Commit your changes with the updated `github-oauth.config.js`
   - Push to GitHub
   - Netlify will automatically deploy

**For detailed instructions, see:** [`docs/GITHUB_OAUTH_SETUP.md`](../docs/GITHUB_OAUTH_SETUP.md)

## Security Notes

- ✅ **Client ID is safe to commit** - It's public and only used to initiate OAuth
- ❌ **NEVER commit Client Secret** - Keep it in Netlify environment variables only
- ✅ **Config files can be committed** - They only contain public configuration
- ℹ️ **Firebase config is public** - Firebase security is handled by Firestore rules
