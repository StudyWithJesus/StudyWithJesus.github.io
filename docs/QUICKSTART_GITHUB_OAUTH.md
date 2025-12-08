# Quick Start: GitHub OAuth Configuration

This guide will help you configure GitHub OAuth for admin pages in 5 minutes.

## Prerequisites

- A GitHub account
- A Netlify account (free tier works)
- This repository deployed to Netlify

## Step 1: Create GitHub OAuth App (2 minutes)

1. Go to **GitHub Settings** → **Developer settings** → **OAuth Apps**
   - Direct link: https://github.com/settings/developers

2. Click **"New OAuth App"**

3. Fill in the form:
   ```
   Application name: StudyWithJesus Admin
   Homepage URL: https://your-site.netlify.app
   Authorization callback URL: https://your-site.netlify.app/.netlify/functions/github-oauth
   ```
   
   **Important:** Replace `your-site.netlify.app` with your actual Netlify domain

4. Click **"Register application"**

5. You'll see your **Client ID** - keep this page open!

6. Click **"Generate a new client secret"**

7. Copy both:
   - ✅ Client ID (starts with `Iv1.`)
   - ✅ Client Secret (40-character string)

## Step 2: Configure Repository (1 minute)

1. Edit `config/github-oauth.config.js` in your repository:

   ```javascript
   window.GITHUB_OAUTH_CONFIG = {
     clientId: 'Iv1.YOUR_CLIENT_ID_HERE',  // ← Paste your Client ID here
     debug: false
   };
   ```

2. Save and commit the file:
   ```bash
   git add config/github-oauth.config.js
   git commit -m "Configure GitHub OAuth Client ID"
   git push
   ```

## Step 3: Set Netlify Environment Variables (2 minutes)

1. Go to your **Netlify dashboard**

2. Select your site → **Site settings** → **Environment variables**

3. Click **"Add a variable"** and add these two:

   | Key | Value | Example |
   |-----|-------|---------|
   | `GITHUB_CLIENT_SECRET` | Your OAuth App Client Secret | `a1b2c3d4e5f6...` |
   | `ADMIN_GITHUB_USERNAME` | Your GitHub username | `StudyWithJesus` |

4. Click **"Save"**

## Step 4: Deploy and Test (1 minute)

1. Netlify will automatically deploy when you push to GitHub

2. Once deployed, visit your admin page:
   ```
   https://your-site.netlify.app/pages/admin/index.html
   ```

3. You should see a **"Sign in with GitHub"** button

4. Click it to test the OAuth flow

5. ✅ Success! You're now authenticated with GitHub

## Troubleshooting

### Error: "GitHub OAuth is not configured"

**Cause:** Client ID not set or still has placeholder value

**Fix:** 
- Check `config/github-oauth.config.js` has your actual Client ID
- Make sure you committed and pushed the changes
- Clear browser cache and refresh

### Error: "Configuration Error" on callback

**Cause:** Missing Netlify environment variables

**Fix:**
- Check Netlify dashboard → Environment variables
- Ensure both `GITHUB_CLIENT_SECRET` and `ADMIN_GITHUB_USERNAME` are set
- Trigger a new deploy after adding variables

### Error: "Access Denied" after login

**Cause:** Your GitHub username doesn't match `ADMIN_GITHUB_USERNAME`

**Fix:**
- Check your exact GitHub username at https://github.com/settings/profile
- Update `ADMIN_GITHUB_USERNAME` in Netlify to match exactly (case-insensitive)
- Redeploy

### Error: "Callback URL mismatch"

**Cause:** OAuth App callback URL doesn't match your Netlify domain

**Fix:**
- Go to https://github.com/settings/developers
- Edit your OAuth App
- Update "Authorization callback URL" to match your Netlify URL exactly
- Include `/.netlify/functions/github-oauth` at the end

## Security Notes

✅ **Safe to commit:**
- Client ID (it's public by design)
- The `github-oauth.config.js` file with Client ID

❌ **NEVER commit:**
- Client Secret (keep it in Netlify environment variables only)
- Any files with sensitive credentials

## Next Steps

- See [docs/GITHUB_OAUTH_SETUP.md](GITHUB_OAUTH_SETUP.md) for detailed information
- Configure Firebase for leaderboard features (optional)
- Explore admin pages: fingerprint blocker, leaderboard admin

## Need Help?

- Check browser console for error messages
- Review Netlify function logs (Netlify dashboard → Functions)
- See full documentation in `docs/GITHUB_OAUTH_SETUP.md`
