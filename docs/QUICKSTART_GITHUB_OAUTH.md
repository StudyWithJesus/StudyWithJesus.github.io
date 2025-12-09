# Quick Start: GitHub OAuth Configuration

> **⚠️ IMPORTANT:** This guide is for legacy Netlify deployments. For GitHub Pages, use [FIREBASE_GITHUB_AUTH_SETUP.md](../FIREBASE_GITHUB_AUTH_SETUP.md) instead.

## For GitHub Pages Deployments

**Use Firebase Authentication** - See [FIREBASE_GITHUB_AUTH_SETUP.md](../FIREBASE_GITHUB_AUTH_SETUP.md)

GitHub Pages does not support serverless functions, so Netlify OAuth cannot be used. Firebase Authentication works on GitHub Pages and provides a better experience.

## For Netlify Deployments (Deprecated)

> **📝 Note:** Firebase Authentication is recommended for all deployments, including Netlify.

If you absolutely need to use Netlify functions:

### Prerequisites

- A GitHub account
- A Netlify account (free tier works)
- This repository deployed to Netlify

### Step 1: Create GitHub OAuth App (2 minutes)

1. Go to **GitHub Settings** → **Developer settings** → **OAuth Apps**
   - Direct link: https://github.com/settings/developers

2. Click **"New OAuth App"**

3. Fill in the form:
   ```
   Application name: StudyWithJesus Admin (Netlify)
   Homepage URL: https://your-site.netlify.app
   Authorization callback URL: https://your-site.netlify.app/.netlify/functions/github-oauth
   ```
   
   **Important:** Replace `your-site.netlify.app` with your actual Netlify domain

4. Click **"Register application"**

5. Copy both Client ID and Client Secret

### Step 2: Set Netlify Environment Variables

1. Go to your **Netlify dashboard**
2. Select your site → **Site settings** → **Environment variables**
3. Add these variables:
   - `GITHUB_CLIENT_SECRET`: Your OAuth App Client Secret
   - `ADMIN_GITHUB_USERNAME`: Your GitHub username

### Step 3: Implement Netlify Function

You'll need to create `netlify/functions/github-oauth.js` to handle OAuth (not included in current codebase).

## Recommended Approach

**Use Firebase Authentication instead** - it's easier, works on GitHub Pages, and provides better security.

See [FIREBASE_GITHUB_AUTH_SETUP.md](../FIREBASE_GITHUB_AUTH_SETUP.md) for complete setup instructions.

## Need Help?

- For GitHub Pages: Follow [FIREBASE_GITHUB_AUTH_SETUP.md](../FIREBASE_GITHUB_AUTH_SETUP.md)
- For troubleshooting: See [TROUBLESHOOTING_OAUTH.md](TROUBLESHOOTING_OAUTH.md)
- For detailed setup: See [GITHUB_OAUTH_SETUP.md](GITHUB_OAUTH_SETUP.md)
