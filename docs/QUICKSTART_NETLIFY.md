# Quick Start: Netlify Deployment with OAuth

This is a quick reference guide for deploying StudyWithJesus with GitHub OAuth admin authentication.

## Prerequisites Checklist

- [ ] GitHub account
- [ ] Netlify account (free tier OK)
- [ ] Repository pushed to GitHub
- [ ] 10 minutes of setup time

## Step 1: Create GitHub OAuth App (5 minutes)

1. Go to: https://github.com/settings/developers
2. Click "OAuth Apps" → "New OAuth App"
3. Fill in:
   - **Application name**: `StudyWithJesus Admin`
   - **Homepage URL**: `https://your-site.netlify.app` (use your actual URL)
   - **Callback URL**: `https://your-site.netlify.app/.netlify/functions/github-oauth`
4. Click "Register application"
5. **Copy Client ID** (starts with `Iv1.`)
6. Click "Generate a new client secret"
7. **Copy Client Secret** (you won't see it again!)

## Step 2: Deploy to Netlify (3 minutes)

1. Go to: https://app.netlify.com/
2. Click "Add new site" → "Import an existing project"
3. Choose "Deploy with GitHub"
4. Select repository: `StudyWithJesus/StudyWithJesus.github.io`
5. Configure:
   - **Branch**: `main`
   - **Build command**: (leave empty)
   - **Publish directory**: `.`
6. Click "Deploy site"
7. **Note your site URL** (e.g., `random-name-123.netlify.app`)

## Step 3: Configure Environment Variables (2 minutes)

In Netlify dashboard → Site configuration → Environment variables:

1. Add `GITHUB_CLIENT_ID`:
   ```
   Key: GITHUB_CLIENT_ID
   Value: Iv1.abc123def456 (your Client ID)
   ```

2. Add `GITHUB_CLIENT_SECRET`:
   ```
   Key: GITHUB_CLIENT_SECRET
   Value: (your 40-character secret)
   ☑ Keep this value secret
   ```

3. Add `ADMIN_GITHUB_USERNAME`:
   ```
   Key: ADMIN_GITHUB_USERNAME
   Value: YourGitHubUsername (e.g., StudyWithJesus)
   ```

4. Click "Save"

## Step 4: Redeploy (1 minute)

1. Go to "Deploys" tab
2. Click "Trigger deploy" → "Deploy site"
3. Wait for deployment to complete

## Step 5: Test (1 minute)

1. Visit: `https://your-site.netlify.app/pages/admin/index.html`
2. Click "Sign in with GitHub"
3. Authorize the app
4. You should see the admin dashboard ✅

## Troubleshooting

### "Configuration Error"
→ Check all 3 environment variables are set in Netlify

### "Access Denied" after login
→ Verify `ADMIN_GITHUB_USERNAME` matches your GitHub username exactly

### OAuth redirect error
→ Update GitHub OAuth app callback URL to match your Netlify URL

### Still having issues?
→ Check Netlify function logs: Site configuration → Functions → Logs

## What's Protected

All admin pages now require your GitHub account:
- ✅ `/pages/admin/index.html` - Admin Hub
- ✅ `/pages/admin/fingerprint-admin.html` - Fingerprint Blocker
- ✅ `/pages/admin/leaderboard.html` - Leaderboard Stats

## Security Summary

✅ **Single Account Access** - Only your GitHub account can access admin pages
✅ **OAuth 2.0 Standard** - Industry-standard authentication
✅ **No Password Storage** - GitHub handles authentication
✅ **24-Hour Sessions** - Automatic timeout
✅ **Secure Secrets** - Client secret never exposed to users

## Next Steps

- [ ] Bookmark admin URLs
- [ ] Test fingerprint blocker functionality
- [ ] Set up custom domain (optional)
- [ ] Configure Firebase for real-time leaderboard (optional)

## Complete Documentation

For detailed information, see:
- [docs/NETLIFY_DEPLOYMENT.md](NETLIFY_DEPLOYMENT.md) - Full deployment guide
- [docs/GITHUB_OAUTH_SETUP.md](GITHUB_OAUTH_SETUP.md) - OAuth details
- [pages/admin/README.md](../pages/admin/README.md) - Admin features

## Support

- Check function logs in Netlify dashboard
- Review error messages in browser console
- Verify all environment variables are set correctly
- Ensure GitHub OAuth app URLs match your deployment URL
