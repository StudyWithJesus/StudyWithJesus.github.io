# Netlify Deployment Guide

This guide provides step-by-step instructions for deploying StudyWithJesus to Netlify with GitHub OAuth authentication for admin pages.

## Quick Start for silly-speculoos-4afae0.netlify.app

If you're deploying to the existing `silly-speculoos-4afae0.netlify.app` site, follow these simplified steps:

### 1. Verify/Update OAuth App
- Go to https://github.com/settings/developers
- Find or create OAuth App: "StudyWithJesus Admin"
- Ensure callback URL is: `https://silly-speculoos-4afae0.netlify.app/.netlify/functions/github-oauth`

### 2. Set Environment Variables in Netlify
1. Go to https://app.netlify.com/sites/silly-speculoos-4afae0/configuration/env
2. Add/verify these variables:
   - `GITHUB_CLIENT_ID` - Your OAuth App Client ID
   - `GITHUB_CLIENT_SECRET` - Your OAuth App Client Secret (keep secret)
   - `ADMIN_GITHUB_USERNAME` - Your GitHub username (e.g., `StudyWithJesus`)
   - `GITHUB_TOKEN` (optional) - For fingerprint logging to GitHub issues

### 3. Deploy
- Push your changes to the connected GitHub repository branch
- Netlify will automatically deploy
- Visit: https://silly-speculoos-4afae0.netlify.app/pages/admin/index.html

### 4. Test Admin Access
- Click "Sign in with GitHub"
- Authorize with your GitHub account
- You should see the admin dashboard
- **Only your GitHub account** will have access!

---

## Full Deployment Guide (New Sites)

## Prerequisites

- GitHub account (for hosting the repository and OAuth)
- Netlify account (free tier is sufficient)
- Repository pushed to GitHub

## Step 1: Create Netlify Site

1. **Log in to Netlify**
   - Go to https://app.netlify.com/
   - Sign in with GitHub (recommended)

2. **Create New Site**
   - Click "Add new site" → "Import an existing project"
   - Choose "Deploy with GitHub"
   - Authorize Netlify to access your GitHub account
   - Select the `StudyWithJesus/StudyWithJesus.github.io` repository

3. **Configure Build Settings**
   - **Branch to deploy**: `main` (or your default branch)
   - **Build command**: (leave empty or use `echo 'Static site'`)
   - **Publish directory**: `.` (root directory)
   - Click "Deploy site"

4. **Note Your Site URL**
   - After deployment, note your site URL (e.g., `random-name-123.netlify.app`)
   - You can customize this later under Site settings → Domain management

## Step 2: Set Up GitHub OAuth App

This is required for restricting admin page access to your GitHub account.

1. **Create OAuth App**
   - Go to https://github.com/settings/developers
   - Click "OAuth Apps" → "New OAuth App"

2. **Configure OAuth App**
   ```
   Application name: StudyWithJesus Admin
   Homepage URL: https://your-site-name.netlify.app
   Authorization callback URL: https://your-site-name.netlify.app/.netlify/functions/github-oauth
   ```
   ⚠️ Replace `your-site-name.netlify.app` with your actual Netlify URL

3. **Save Credentials**
   - After creating, note the **Client ID** (starts with `Iv1.`)
   - Click "Generate a new client secret"
   - **Copy the Client Secret immediately** (you won't see it again!)
   - Store both securely (you'll need them in the next step)

## Step 3: Configure Netlify Environment Variables

Environment variables are used to configure OAuth and other features securely.

1. **Go to Site Settings**
   - In Netlify dashboard, click your site
   - Go to "Site configuration" → "Environment variables"

2. **Add Required Variables**

   Click "Add a variable" for each of the following:

   **GITHUB_CLIENT_ID**
   - Key: `GITHUB_CLIENT_ID`
   - Value: Your OAuth App Client ID (e.g., `Iv1.abc123def456`)
   - Options: Leave all defaults
   - Scopes: Production, Deploy previews, Branch deploys

   **GITHUB_CLIENT_SECRET**
   - Key: `GITHUB_CLIENT_SECRET`
   - Value: Your OAuth App Client Secret (40-character string)
   - Options: Check "Keep this value secret"
   - Scopes: Production, Deploy previews, Branch deploys

   **ADMIN_GITHUB_USERNAME**
   - Key: `ADMIN_GITHUB_USERNAME`
   - Value: Your GitHub username (e.g., `StudyWithJesus`)
   - Options: Leave defaults
   - Scopes: Production, Deploy previews, Branch deploys
   - ⚠️ **IMPORTANT**: Only this username will have admin access!

3. **Add Optional Variables** (for fingerprint logger)

   **GITHUB_TOKEN**
   - Key: `GITHUB_TOKEN`
   - Value: Personal access token with `repo` scope
   - Create at: https://github.com/settings/tokens
   - Options: Check "Keep this value secret"
   - Used by fingerprint logger to create GitHub issues

   **GITHUB_REPO** (optional)
   - Key: `GITHUB_REPO`
   - Value: `StudyWithJesus/StudyWithJesus.github.io` (or your repo)
   - Default if not set: Same repository

## Step 4: Deploy and Verify

1. **Trigger Deployment**
   - Go to "Deploys" tab
   - Click "Trigger deploy" → "Deploy site"
   - Wait for deployment to complete (usually 1-2 minutes)

2. **Verify Admin Pages**
   - Visit: `https://your-site.netlify.app/pages/admin/index.html`
   - You should see "Sign in with GitHub" button
   - Click to start OAuth flow
   - Authorize the app on GitHub
   - You should be redirected back and see the admin dashboard

3. **Test Access Control**
   - If you're logged in as your GitHub account → ✅ Access granted
   - If someone else tries to log in → ❌ "Access Denied" message

## Step 5: Custom Domain (Optional)

1. **Add Custom Domain**
   - Go to "Domain management"
   - Click "Add domain"
   - Enter your domain (e.g., `studywithjesus.com`)
   - Follow instructions to configure DNS

2. **Update OAuth App**
   - Go back to https://github.com/settings/developers
   - Edit your OAuth app
   - Update URLs to use custom domain:
     - Homepage URL: `https://studywithjesus.com`
     - Callback URL: `https://studywithjesus.com/.netlify/functions/github-oauth`

3. **Update Environment Variables** (if needed)
   - If you hardcoded any URLs, update them to use the new domain

## Troubleshooting

### "Configuration Error" when accessing admin

**Problem**: Missing environment variables

**Solution**:
1. Check Netlify dashboard → Site configuration → Environment variables
2. Ensure all three required variables are set:
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - `ADMIN_GITHUB_USERNAME`
3. Trigger a new deploy after adding variables

### "Access Denied" after GitHub login

**Problem**: Your GitHub username doesn't match `ADMIN_GITHUB_USERNAME`

**Solution**:
1. Verify your exact GitHub username at https://github.com/[username]
2. Update `ADMIN_GITHUB_USERNAME` to match exactly (case-insensitive)
3. Trigger a new deploy

### OAuth redirect error

**Problem**: Callback URL mismatch

**Solution**:
1. Go to https://github.com/settings/developers
2. Edit your OAuth app
3. Verify "Authorization callback URL" matches exactly:
   `https://your-actual-site.netlify.app/.netlify/functions/github-oauth`
4. Must include `.netlify.app` or your custom domain
5. Must include `/.netlify/functions/github-oauth` path

### Functions not working

**Problem**: Netlify functions not deploying

**Solution**:
1. Check deploy logs for function build errors
2. Verify `netlify.toml` has correct functions directory:
   ```toml
   [functions]
     directory = "netlify/functions"
   ```
3. Ensure `netlify/functions/github-oauth.js` exists
4. Check function logs: Site configuration → Functions → Function logs

### Session expires immediately

**Problem**: Cookies not being set

**Solution**:
1. Ensure site uses HTTPS (Netlify provides this automatically)
2. Clear browser cookies and cache
3. Try in incognito/private browsing mode
4. Check browser console for cookie errors

## Security Best Practices

1. **Never commit secrets**
   - Use environment variables for all secrets
   - Never hardcode `GITHUB_CLIENT_SECRET` in code
   - Add sensitive files to `.gitignore`

2. **Restrict admin access**
   - Only set `ADMIN_GITHUB_USERNAME` to your GitHub account
   - Don't share admin URLs publicly
   - Use strong GitHub account security (2FA recommended)

3. **Monitor access**
   - Check Netlify function logs regularly
   - Review GitHub OAuth app authorized users
   - Revoke unused OAuth tokens

4. **Keep dependencies updated**
   - Regularly check for security updates
   - Monitor Netlify security advisories

## Adding Multiple Admin Users (Advanced)

If you need to allow multiple GitHub users admin access:

1. **Modify the OAuth Function**
   - Edit `netlify/functions/github-oauth.js`
   - Locate the username validation section (around line 186)
   - Replace the single username check with array handling:
   ```javascript
   // Replace this:
   // if (user.login.toLowerCase() !== adminUsername.toLowerCase()) {
   
   // With this:
   const adminUsernames = process.env.ADMIN_GITHUB_USERNAME
     .split(',')
     .map(u => u.trim().toLowerCase());
   
   // Check if user is authorized admin
   if (!adminUsernames.includes(user.login.toLowerCase())) {
     return {
       statusCode: 403,
       // ... rest of access denied response
     };
   }
   ```

2. **Update Environment Variable**
   - In Netlify, set `ADMIN_GITHUB_USERNAME` to comma-separated list:
   ```
   ADMIN_GITHUB_USERNAME=User1,User2,User3
   ```

3. **Deploy Changes**
   - Push code changes to GitHub
   - Netlify will auto-deploy

## Monitoring and Maintenance

### Check Function Logs
- Site configuration → Functions → Function logs
- View OAuth authentication attempts
- Debug access issues

### Monitor Build Logs
- Deploys tab → Click on a deploy → View logs
- Check for build/deploy errors

### Update Credentials
- If you need to rotate secrets:
  1. Generate new GitHub OAuth credentials
  2. Update environment variables
  3. Old credentials stop working immediately

## Support Resources

- **Netlify Documentation**: https://docs.netlify.com/
- **Netlify Functions**: https://docs.netlify.com/functions/overview/
- **GitHub OAuth**: https://docs.github.com/en/developers/apps/building-oauth-apps
- **This Repository**: See `docs/GITHUB_OAUTH_SETUP.md` for detailed OAuth setup

## Next Steps

After successful deployment:

1. ✅ Test all admin pages:
   - `/pages/admin/index.html` - Admin hub
   - `/pages/admin/fingerprint-admin.html` - Fingerprint blocker
   - `/pages/admin/leaderboard.html` - Leaderboard stats

2. ✅ Bookmark admin URLs for quick access

3. ✅ Set up fingerprint logger (if needed):
   - Add `GITHUB_TOKEN` environment variable
   - Configure in admin pages

4. ✅ Configure Firebase (optional):
   - For real-time leaderboard
   - See `docs/leaderboard-design.md`

5. ✅ Set up custom domain (optional)
   - Better branding
   - More professional URLs
