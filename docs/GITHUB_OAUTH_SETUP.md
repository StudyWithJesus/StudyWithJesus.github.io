# GitHub OAuth Setup Guide for Admin Pages

This guide explains how to configure GitHub OAuth authentication for the admin pages, restricting access to only your GitHub account.

## Overview

Admin pages (`/pages/admin/*`) now use GitHub OAuth for authentication instead of simple passwords. This ensures only authorized GitHub accounts can access admin features.

## Step 1: Create GitHub OAuth App

1. **Go to GitHub Developer Settings**
   - Visit: https://github.com/settings/developers
   - Click "OAuth Apps"
   - Click "New OAuth App"

2. **Configure OAuth App**
   ```
   Application name: StudyWithJesus Admin
   Homepage URL: https://your-site.netlify.app
   Authorization callback URL: https://your-site.netlify.app/.netlify/functions/github-oauth
   ```

3. **Get Credentials**
   - After creating, note the **Client ID**
   - Click "Generate a new client secret"
   - Copy the **Client Secret** (you won't see it again!)

## Step 2: Configure Netlify Environment Variables

In your Netlify dashboard (Site settings > Environment variables), add:

### Required Variables

**GITHUB_CLIENT_ID**
- Value: Your OAuth App Client ID
- Example: `Iv1.a1b2c3d4e5f6g7h8`

**GITHUB_CLIENT_SECRET**
- Value: Your OAuth App Client Secret
- Example: `a1b2c3d4e5f6...` (40 characters)

**ADMIN_GITHUB_USERNAME**
- Value: Your GitHub username (case-insensitive)
- Example: `StudyWithJesus`
- **IMPORTANT:** Only this username will be allowed admin access

### Existing Variables (from fingerprint logger)

Make sure these are still set:
- `GITHUB_TOKEN` - For creating fingerprint log issues
- `GITHUB_REPO` - (Optional) Target repository

## Step 3: Update HTML Pages (Optional)

If you want to make the Client ID public (it's safe to do so), you can add it directly to your HTML pages instead of using an environment variable.

In `pages/admin/index.html` and `pages/admin/fingerprint-admin.html`, update:

```javascript
<script>
  window.GITHUB_CLIENT_ID = 'Iv1.your-client-id-here';
</script>
```

**Note:** The Client Secret must NEVER be exposed in client-side code. It's only used server-side in the Netlify function.

## Step 4: Deploy and Test

1. **Deploy to Netlify**
   - Push changes to GitHub
   - Netlify will automatically deploy

2. **Test Authentication**
   - Visit `/pages/admin/index.html`
   - You should see "Sign in with GitHub" button
   - Click to authorize with GitHub
   - You'll be redirected to GitHub OAuth page
   - After authorizing, you'll return to admin dashboard

3. **Verify Access Control**
   - Try logging in with your GitHub account ✅ Should work
   - Try with another account ❌ Should be denied

## How It Works

### Authentication Flow

```
1. User visits /pages/admin/index.html
   ↓
2. Page loads github-auth.js
   ↓
3. Checks for existing session
   ↓
4. If not authenticated:
   - Shows "Sign in with GitHub" button
   - User clicks button
   ↓
5. Redirects to GitHub OAuth
   https://github.com/login/oauth/authorize?client_id=...
   ↓
6. User authorizes app on GitHub
   ↓
7. GitHub redirects to callback:
   /.netlify/functions/github-oauth?code=...
   ↓
8. Function exchanges code for access token
   ↓
9. Function fetches user info from GitHub API
   ↓
10. Function checks if username matches ADMIN_GITHUB_USERNAME
    ↓
11. If match:
    - Creates session token
    - Redirects to admin page with session
    - User sees admin dashboard
    ↓
12. If no match:
    - Shows "Access Denied" message
```

### Session Management

- Sessions are stored in sessionStorage and cookies
- Sessions expire after 24 hours
- Logout clears session and redirects to main site
- No server-side session storage needed

## Files Added/Modified

### New Files

1. **`netlify/functions/github-oauth.js`**
   - Handles OAuth callback
   - Exchanges code for token
   - Validates user against ADMIN_GITHUB_USERNAME
   - Creates session tokens

2. **`assets/js/github-auth.js`**
   - Client-side authentication module
   - Manages OAuth flow
   - Stores/validates sessions
   - Provides auth UI components

### Modified Files

3. **`pages/admin/index.html`**
   - Uses GitHub OAuth instead of being publicly accessible
   - Shows user info when authenticated
   - Displays login button when not authenticated

4. **`pages/admin/fingerprint-admin.html`**
   - Removed simple password authentication
   - Uses GitHub OAuth
   - Shows user avatar and username

## Security Features

✅ **OAuth 2.0 Standard** - Industry-standard authentication
✅ **Single Admin Account** - Only specified GitHub user can access
✅ **No Password Storage** - No passwords to manage or leak
✅ **Short-lived Tokens** - Access tokens not stored client-side
✅ **HTTPS Only** - Secure cookie flags (HttpOnly, Secure, SameSite)
✅ **Client Secret Protected** - Never exposed in client code
✅ **Session Expiration** - 24-hour session timeout

## Troubleshooting

### "Configuration Error" message

**Problem:** Missing environment variables

**Solution:** 
- Check Netlify dashboard > Environment variables
- Ensure all three variables are set:
  - GITHUB_CLIENT_ID
  - GITHUB_CLIENT_SECRET
  - ADMIN_GITHUB_USERNAME
- Redeploy after adding variables

### "Access Denied" after logging in

**Problem:** Your GitHub username doesn't match ADMIN_GITHUB_USERNAME

**Solution:**
- Check the exact spelling and case of your GitHub username
- Update ADMIN_GITHUB_USERNAME in Netlify to match exactly
- Redeploy after changing

### Stuck on "Sign in with GitHub" button

**Problem:** GITHUB_CLIENT_ID not set in page

**Solution:** Either:
- Set CLIENT_ID directly in HTML (see Step 3 above)
- Or inject it via Netlify build environment

### Callback URL mismatch error

**Problem:** OAuth app callback URL doesn't match deployment URL

**Solution:**
- Go to https://github.com/settings/developers
- Edit your OAuth app
- Update Authorization callback URL to match your Netlify URL:
  `https://your-actual-site.netlify.app/.netlify/functions/github-oauth`

### Session expired immediately

**Problem:** Cookie not being set (usually local development)

**Solution:**
- Must use HTTPS in production (Netlify provides this)
- For local testing, use Netlify Dev: `netlify dev`
- Sessions use sessionStorage as fallback

## Multiple Admin Users (Advanced)

To allow multiple GitHub users admin access:

**Option 1: Comma-separated list**

Modify `netlify/functions/github-oauth.js`:

```javascript
const adminUsernames = process.env.ADMIN_GITHUB_USERNAME.split(',').map(u => u.trim().toLowerCase());

// In validation:
if (!adminUsernames.includes(user.login.toLowerCase())) {
  // Access denied
}
```

Then set environment variable:
```
ADMIN_GITHUB_USERNAME=User1,User2,User3
```

**Option 2: GitHub Team (requires GitHub Team/Org)**

Would require GitHub Team API access and more complex authorization logic.

## Reverting to Password Auth

If you need to temporarily revert to simple password authentication:

1. In admin pages, comment out GitHub auth:
   ```html
   <!-- <script src="../../assets/js/github-auth.js"></script> -->
   ```

2. Restore the original password-based auth section in the HTML

3. This is NOT recommended for production use

## Related Documentation

- [Admin Hub Documentation](../../pages/admin/README.md)
- [Fingerprint Setup Guide](FINGERPRINT_SETUP.md)
- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)

## Support

If you encounter issues:
1. Check Netlify function logs
2. Check browser console for errors
3. Verify all environment variables are set
4. Test OAuth app settings on GitHub
5. Ensure callback URL matches exactly
