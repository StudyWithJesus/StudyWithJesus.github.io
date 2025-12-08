# Setup Guide for silly-speculoos-4afae0.netlify.app

Complete setup instructions for the silly-speculoos-4afae0 Netlify site.

## Site Information

- **Site Name**: silly-speculoos-4afae0
- **Site URL**: https://silly-speculoos-4afae0.netlify.app
- **Admin URL**: https://silly-speculoos-4afae0.netlify.app/pages/admin/index.html
- **Netlify Dashboard**: https://app.netlify.com/sites/silly-speculoos-4afae0

## Quick Setup Checklist

- [ ] GitHub OAuth App created and configured
- [ ] Netlify environment variables set
- [ ] Netlify OAuth configured (optional)
- [ ] Site deployed and tested
- [ ] Admin access verified

---

## Step 1: Create GitHub OAuth App

This is required for admin authentication.

1. **Go to GitHub OAuth Apps**
   - Visit: https://github.com/settings/developers
   - Click "OAuth Apps" → "New OAuth App"

2. **Configure the OAuth App**
   ```
   Application name: StudyWithJesus Admin (silly-speculoos)
   Homepage URL: https://silly-speculoos-4afae0.netlify.app
   Application description: Admin authentication for StudyWithJesus
   Authorization callback URL: https://silly-speculoos-4afae0.netlify.app/.netlify/functions/github-oauth
   ```

3. **Save the Credentials**
   - After creating, copy the **Client ID** (starts with `Iv1.` or `Ov`)
   - Click "Generate a new client secret"
   - **Copy the Client Secret immediately** (you won't see it again!)
   - Keep both in a secure location

---

## Step 2: Configure Netlify Environment Variables

Environment variables are required for OAuth and fingerprint logging to work.

1. **Go to Environment Variables**
   - Visit: https://app.netlify.com/sites/silly-speculoos-4afae0/configuration/env
   - Or: Netlify Dashboard → Site configuration → Environment variables

2. **Add Required Variables**

   Click "Add a variable" for each:

   ### GITHUB_CLIENT_ID (Required)
   ```
   Key: GITHUB_CLIENT_ID
   Value: [Your OAuth App Client ID from Step 1]
   Scopes: Production, Deploy previews, Branch deploys
   ```

   ### GITHUB_CLIENT_SECRET (Required)
   ```
   Key: GITHUB_CLIENT_SECRET
   Value: [Your OAuth App Client Secret from Step 1]
   Options: ✓ Keep this value secret
   Scopes: Production, Deploy previews, Branch deploys
   ```

   ### ADMIN_GITHUB_USERNAME (Required)
   ```
   Key: ADMIN_GITHUB_USERNAME
   Value: [Your GitHub username, e.g., "StudyWithJesus"]
   Scopes: Production, Deploy previews, Branch deploys
   ```
   ⚠️ **IMPORTANT**: Only this GitHub username will have admin access!

3. **Add Optional Variables** (for fingerprint logging)

   ### GITHUB_TOKEN (Optional)
   ```
   Key: GITHUB_TOKEN
   Value: [Personal access token with 'repo' scope]
   Options: ✓ Keep this value secret
   Scopes: Production, Deploy previews, Branch deploys
   ```
   - Create token at: https://github.com/settings/tokens
   - Required scope: `repo` (Full control of private repositories)
   - Used to create GitHub issues when fingerprints are logged

   ### GITHUB_REPO (Optional)
   ```
   Key: GITHUB_REPO
   Value: StudyWithJesus/StudyWithJesus.github.io
   Scopes: Production, Deploy previews, Branch deploys
   ```
   - Defaults to `StudyWithJesus/StudyWithJesus.github.io` if not set
   - Repository where fingerprint logs are created as issues

---

## Step 3: Configure Netlify OAuth (Optional)

Netlify also has built-in OAuth providers that can be used for additional features.

1. **Go to OAuth Settings**
   - Visit: https://app.netlify.com/sites/silly-speculoos-4afae0/configuration/access#oauth
   - Or: Netlify Dashboard → Site configuration → Access & security → OAuth

2. **Install GitHub Provider** (if using Netlify OAuth)
   - Click "Install provider" under GitHub
   - This is **optional** and separate from the GitHub OAuth App
   - Only needed if you want to use Netlify's OAuth features
   - **Not required for admin authentication** (we use custom OAuth function)

---

## Step 4: Deploy the Site

1. **Push Changes to GitHub**
   ```bash
   git add .
   git commit -m "Configure admin authentication"
   git push origin main
   ```

2. **Trigger Deploy**
   - Go to: https://app.netlify.com/sites/silly-speculoos-4afae0/deploys
   - Netlify will automatically deploy when you push
   - Or click "Trigger deploy" → "Deploy site"

3. **Wait for Deployment**
   - Watch the deploy logs
   - Should complete in 1-2 minutes
   - Green checkmark = success

4. **Check Functions**
   - Go to: https://app.netlify.com/sites/silly-speculoos-4afae0/functions
   - Verify `github-oauth` function is listed
   - Verify `log-fingerprint` function is listed

---

## Step 5: Test Admin Access

1. **Visit Admin Hub**
   - Go to: https://silly-speculoos-4afae0.netlify.app/pages/admin/index.html

2. **Sign In with GitHub**
   - Click "Sign in with GitHub" button
   - Authorize the OAuth app
   - You should be redirected back to admin hub

3. **Verify Access**
   - ✅ If logged in as your GitHub account → Admin dashboard appears
   - ❌ If logged in as different account → "Access Denied" message

4. **Test Admin Pages**
   - Fingerprint Admin: https://silly-speculoos-4afae0.netlify.app/pages/admin/fingerprint-admin.html
   - Leaderboard Admin: https://silly-speculoos-4afae0.netlify.app/pages/admin/leaderboard.html

---

## Bookmark These URLs

Save these for quick access:

```
Main Site:
https://silly-speculoos-4afae0.netlify.app

Admin Hub:
https://silly-speculoos-4afae0.netlify.app/pages/admin/index.html

Fingerprint Admin:
https://silly-speculoos-4afae0.netlify.app/pages/admin/fingerprint-admin.html

Leaderboard Admin:
https://silly-speculoos-4afae0.netlify.app/pages/admin/leaderboard.html

Netlify Dashboard:
https://app.netlify.com/sites/silly-speculoos-4afae0
```

---

## Troubleshooting

### "Configuration Error" when accessing admin

**Problem**: Environment variables not set

**Solution**:
1. Go to: https://app.netlify.com/sites/silly-speculoos-4afae0/configuration/env
2. Verify all three required variables are set:
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - `ADMIN_GITHUB_USERNAME`
3. Click "Trigger deploy" to redeploy

### "Access Denied" after GitHub login

**Problem**: Wrong GitHub username in `ADMIN_GITHUB_USERNAME`

**Solution**:
1. Check your exact GitHub username at: https://github.com/[your-username]
2. Update `ADMIN_GITHUB_USERNAME` to match exactly (case-insensitive)
3. Redeploy the site

### OAuth redirect error

**Problem**: Callback URL mismatch

**Solution**:
1. Go to: https://github.com/settings/developers
2. Edit your OAuth app
3. Verify "Authorization callback URL" is exactly:
   ```
   https://silly-speculoos-4afae0.netlify.app/.netlify/functions/github-oauth
   ```
4. Save changes

### Functions not working

**Problem**: Netlify functions not deploying

**Solution**:
1. Check deploy logs: https://app.netlify.com/sites/silly-speculoos-4afae0/deploys
2. Look for function build errors
3. Verify `netlify.toml` exists in repository root
4. Check function logs: https://app.netlify.com/sites/silly-speculoos-4afae0/functions

### Session expires immediately

**Problem**: Cookie issues

**Solution**:
1. Ensure you're using HTTPS (Netlify provides this)
2. Clear browser cookies and cache
3. Try incognito/private browsing
4. Check browser console for errors

---

## Security Notes

1. **Never commit secrets**
   - Don't hardcode `GITHUB_CLIENT_SECRET` in code
   - Use environment variables only
   - Keep secrets in Netlify dashboard

2. **Protect admin URLs**
   - Don't link to admin pages from public pages
   - Bookmark admin URLs privately
   - Only share with authorized users

3. **Monitor access**
   - Check function logs for unauthorized attempts
   - Review GitHub OAuth app access regularly
   - Revoke compromised tokens immediately

4. **IP tracking**
   - IPs are logged for information only
   - IPs are NOT used for blocking
   - Only fingerprints (device IDs) control access

---

## Features Summary

### Admin Authentication
- ✅ GitHub OAuth required (no local/demo access)
- ✅ Single authorized GitHub account only
- ✅ No password storage or management
- ✅ 24-hour session timeout
- ✅ Secure HTTPS-only cookies

### Fingerprint Admin
- ✅ View all fingerprints with display names
- ✅ Track IP addresses (information only)
- ✅ Block/unblock by fingerprint (device ID)
- ✅ Search by name, fingerprint, or IP
- ✅ Export blacklist configuration
- ✅ Real-time statistics

### Leaderboard Admin
- ✅ View user statistics
- ✅ Exam attempt history
- ✅ Module performance tracking
- ✅ Real-time or sample data

---

## Next Steps

After setup is complete:

1. **Configure Firebase** (optional)
   - For live leaderboard data
   - See: `docs/leaderboard-design.md`

2. **Set up fingerprint logging**
   - Enable in HTML pages
   - See: `docs/FINGERPRINT_SETUP.md`

3. **Customize admin pages**
   - Adjust styling as needed
   - Add additional features

4. **Monitor usage**
   - Check Netlify analytics
   - Review function logs
   - Monitor GitHub issues (fingerprint logs)

---

## Support

For issues or questions:
- Check Netlify function logs
- Review GitHub OAuth app settings
- Verify environment variables
- Check browser console for errors
- Review deploy logs for build errors
