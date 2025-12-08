# GitHub OAuth Troubleshooting Guide

This guide helps diagnose and fix common issues with GitHub OAuth authentication on the admin pages.

## Quick Diagnostic Checklist

Work through these steps in order:

### 1. ✅ Is the OAuth App Created?

**Check:** https://github.com/settings/developers

- [ ] OAuth App exists for StudyWithJesus Admin
- [ ] Application name: `StudyWithJesus Admin (silly-speculoos)` or similar
- [ ] Homepage URL: `https://silly-speculoos-4afae0.netlify.app`
- [ ] **Authorization callback URL:** `https://silly-speculoos-4afae0.netlify.app/.netlify/functions/github-oauth`

**❌ Not created?**
1. Go to https://github.com/settings/developers
2. Click "OAuth Apps" → "New OAuth App"
3. Fill in the details above
4. Copy the Client ID and generate a Client Secret

### 2. ✅ Are Environment Variables Set?

**Check:** https://app.netlify.com/sites/silly-speculoos-4afae0/configuration/env

Required variables:
- [ ] `GITHUB_CLIENT_ID` - Your OAuth App Client ID (starts with `Ov` or `Iv`)
- [ ] `GITHUB_CLIENT_SECRET` - Your OAuth App Client Secret (40+ characters)
- [ ] `ADMIN_GITHUB_USERNAME` - Your exact GitHub username

**❌ Not set?**
1. Go to Netlify environment variables (link above)
2. Click "Add a variable" for each missing one
3. Scope: Production, Deploy previews, Branch deploys
4. Mark `GITHUB_CLIENT_SECRET` as secret
5. Redeploy your site after adding

### 3. ✅ Does the Callback URL Match Exactly?

**Common mistake:** Typo in the callback URL or wrong domain

Check that the callback URL in your GitHub OAuth App is EXACTLY:
```
https://silly-speculoos-4afae0.netlify.app/.netlify/functions/github-oauth
```

Watch out for:
- ❌ `.netlifyapp.` (wrong - missing dot before `app`)
- ❌ `netlify.com` (wrong - should be `netlify.app`)
- ❌ Missing `/.netlify/functions/github-oauth` path
- ❌ Extra slashes or spaces
- ❌ Wrong site name

**Fix:**
1. Go to https://github.com/settings/developers
2. Click on your OAuth App
3. Click "Update application"
4. Fix the Authorization callback URL
5. Save changes

### 4. ✅ Is the Client ID Configured in the Code?

The Client ID is already configured in `config/github-oauth.config.js` as:
```javascript
clientId: 'Ov23liWrCTAIplgEUl3P'
```

**Verify this matches your actual OAuth App:**
1. Go to https://github.com/settings/developers
2. Click on your OAuth App
3. Compare the Client ID shown with the one in the config file
4. If different, update the config file or create a new OAuth App

### 5. ✅ Has the Site Been Deployed?

**Check:** https://app.netlify.com/sites/silly-speculoos-4afae0/deploys

- [ ] Latest deploy shows "Published" with green checkmark
- [ ] Deploy was after setting environment variables

**❌ Not deployed?**
1. Push your changes to GitHub
2. Or trigger a manual deploy in Netlify
3. Wait for deploy to complete (watch the logs)

### 6. ✅ Are the Netlify Functions Working?

**Check:** https://app.netlify.com/sites/silly-speculoos-4afae0/functions

- [ ] `github-oauth` function is listed
- [ ] Function has no error badge

**Test the function directly:**
Visit: https://silly-speculoos-4afae0.netlify.app/.netlify/functions/github-oauth

You should see an "Authentication Error" page (this is expected - it means the function is working but needs an OAuth code).

**❌ Function not listed or erroring?**
1. Check the deploy logs for function build errors
2. Verify `netlify.toml` exists in repository root
3. Check that `netlify/functions/github-oauth.js` exists

## Common Error Messages and Fixes

### "Server Configuration Error"

**What you see:** HTML page listing missing environment variables

**Cause:** Required environment variables not set in Netlify

**Fix:**
1. Go to https://app.netlify.com/sites/silly-speculoos-4afae0/configuration/env
2. Add all three required variables (see checklist #2)
3. Trigger a new deploy

### "Access Denied - You are logged in as [username]"

**What you see:** Error page showing your GitHub username doesn't match

**Cause:** `ADMIN_GITHUB_USERNAME` doesn't match your actual username

**Fix:**
1. Check your exact GitHub username at https://github.com/[your-username]
2. Update `ADMIN_GITHUB_USERNAME` in Netlify to match exactly
3. Redeploy the site
4. Note: Comparison is case-insensitive, but double-check spelling

### "OAuth Error - No authorization code provided"

**What you see:** Error about missing authorization code

**Causes:**
1. Callback URL mismatch (most common)
2. You clicked "Cancel" on GitHub's authorization page
3. OAuth request expired

**Fix:**
1. Verify callback URL in GitHub OAuth App (see checklist #3)
2. Try signing in again from scratch
3. Clear browser cache/cookies if issue persists

### "redirect_uri_mismatch" from GitHub

**What you see:** GitHub shows an error page about redirect URI

**Cause:** The callback URL in your OAuth App doesn't match the URL being used

**Fix:**
1. Go to https://github.com/settings/developers
2. Edit your OAuth App
3. Update "Authorization callback URL" to exactly:
   ```
   https://silly-speculoos-4afae0.netlify.app/.netlify/functions/github-oauth
   ```
4. Save changes
5. Try signing in again

### "Failed to authenticate with GitHub" (Generic Error)

**What you see:** Error with technical message

**Common causes:**
1. Invalid Client Secret
2. GitHub API is down
3. Network/timeout issues
4. Wrong Client ID

**Fix:**
1. Double-check all environment variables
2. Try regenerating Client Secret in GitHub OAuth App
3. Update the new secret in Netlify
4. Check GitHub Status: https://www.githubstatus.com/
5. Check Netlify function logs for detailed error

## Debug Mode

To see detailed OAuth flow information in browser console:

1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Try signing in to admin page
4. Look for log messages:
   - "Starting OAuth flow with redirect URI: ..."
   - "Client ID: ..."
   - Any error messages

## Testing the Flow Step-by-Step

1. **Visit admin page:**
   https://silly-speculoos-4afae0.netlify.app/pages/admin/index.html

2. **Expected:** See "Sign in with GitHub" button

3. **Click sign in button**
   - Opens GitHub authorization page
   - URL should start with `https://github.com/login/oauth/authorize`
   - Shows your OAuth App name

4. **Click "Authorize" on GitHub**
   - Redirects to `https://silly-speculoos-4afae0.netlify.app/.netlify/functions/github-oauth?code=...`

5. **Expected:** Redirect back to admin page
   - URL: `https://silly-speculoos-4afae0.netlify.app/pages/admin/index.html?session=...`
   - See admin dashboard
   - Your GitHub avatar and username in header

## Still Having Issues?

### Check Netlify Function Logs

https://app.netlify.com/sites/silly-speculoos-4afae0/functions

1. Click on `github-oauth` function
2. Click "Function log" tab
3. Look for recent invocations
4. Check error messages

### Check Browser Console

1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for red error messages
4. Check Network tab for failed requests

### Verify Your OAuth App Status

1. Go to https://github.com/settings/developers
2. Click on your OAuth App
3. Check "Recent Deliveries" or "Recent Requests" if available
4. Look for any error codes

### Try Incognito/Private Mode

Sometimes browser extensions or cached data can interfere:
1. Open incognito/private browsing window
2. Try signing in again
3. If it works, clear cookies/cache in normal mode

### Check Netlify Site Configuration

https://app.netlify.com/sites/silly-speculoos-4afae0/configuration/general

- [ ] Site is not paused
- [ ] Custom domain (if any) is configured correctly
- [ ] HTTPS is enabled

## Need Help?

If you've tried everything and it's still not working:

1. **Gather Information:**
   - What error message do you see exactly?
   - Screenshot of the error
   - Browser console logs
   - Netlify function logs

2. **Double-check:**
   - All 3 environment variables are set
   - Callback URL matches exactly
   - OAuth App Client ID matches config
   - Site has been redeployed after config changes

3. **Try Creating Fresh OAuth App:**
   Sometimes starting from scratch helps:
   - Create a new OAuth App in GitHub
   - Use new Client ID and Secret
   - Update config and environment variables
   - Redeploy

## Prevention Checklist

To avoid issues in the future:

- [ ] Keep OAuth App credentials secure and backed up
- [ ] Document your `ADMIN_GITHUB_USERNAME` in a safe place
- [ ] Test authentication after any configuration changes
- [ ] Regularly check Netlify function logs for issues
- [ ] Keep track of which GitHub account is authorized
- [ ] Monitor GitHub OAuth App for suspicious activity

## Related Documentation

- [GITHUB_OAUTH_SETUP.md](GITHUB_OAUTH_SETUP.md) - Complete setup guide
- [SILLY_SPECULOOS_SETUP.md](SILLY_SPECULOOS_SETUP.md) - Site-specific setup
- [QUICK_START_ADMIN.md](../QUICK_START_ADMIN.md) - Quick reference
- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps) - Official GitHub docs
- [Netlify Functions](https://docs.netlify.com/functions/overview/) - Official Netlify docs
