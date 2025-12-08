# FIX: "redirect_uri is not associated with this application"

## The Problem

You're seeing this error from GitHub:
> **The redirect_uri is not associated with this application.**
> 
> The application might be misconfigured or could be trying to redirect you to a website you weren't expecting.

## The Cause

Your GitHub OAuth App's "Authorization callback URL" doesn't match the URL your site is trying to use.

## The Solution (2 minutes)

### Step 1: Get Your Exact Callback URL

**Visit the diagnostic tool:**
https://silly-speculoos-4afae0.netlify.app/pages/admin/oauth-diagnostic.html

It will show your exact callback URL. It should be:
```
https://silly-speculoos-4afae0.netlify.app/.netlify/functions/github-oauth
```

**Or check your browser console:**
1. Open Developer Tools (F12)
2. Go to Console tab
3. Try signing in
4. Look for: "Starting OAuth flow with redirect URI: ..."

### Step 2: Update Your GitHub OAuth App

1. **Go to your GitHub OAuth Apps:**
   https://github.com/settings/developers

2. **Click on your OAuth App** (should be "StudyWithJesus Admin" or similar)

3. **Edit the "Authorization callback URL":**
   - Click "Update application" or edit button
   - Change the URL to EXACTLY:
     ```
     https://silly-speculoos-4afae0.netlify.app/.netlify/functions/github-oauth
     ```

4. **Common mistakes to avoid:**
   - ❌ `https://silly-speculoos-4afae0.netlifyapp.com` (wrong domain)
   - ❌ `https://silly-speculoos-4afae0.netlify.com` (wrong domain)
   - ❌ Missing `/.netlify/functions/github-oauth` path
   - ❌ Extra spaces or trailing slashes
   - ❌ Using `http://` instead of `https://`

5. **Click "Update application"** to save

### Step 3: Test Again

1. Go back to: https://silly-speculoos-4afae0.netlify.app/pages/admin/index.html
2. Click "Sign in with GitHub"
3. You should now be able to authorize successfully!

## Still Not Working?

### Double-Check Everything:

**Your OAuth App should have these EXACT settings:**

```
Application name: StudyWithJesus Admin (or any name you want)
Homepage URL: https://silly-speculoos-4afae0.netlify.app
Authorization callback URL: https://silly-speculoos-4afae0.netlify.app/.netlify/functions/github-oauth
```

**Copy-paste template:**
```
https://silly-speculoos-4afae0.netlify.app/.netlify/functions/github-oauth
```

### Verify Client ID Matches:

The Client ID in your GitHub OAuth App should match the one in `config/github-oauth.config.js`:
```javascript
clientId: 'Ov23liWrCTAIplgEUl3P'
```

If they don't match, either:
- **Option A:** Update the config file with the correct Client ID
- **Option B:** Create a new OAuth App and use that Client ID

## Why This Happens

GitHub OAuth requires the callback URL to be **pre-registered** in your OAuth App for security. If the URL doesn't match EXACTLY (including protocol, domain, port, and path), GitHub rejects the authentication request.

This is a security feature to prevent malicious sites from hijacking your OAuth flow.

## Quick Fix Checklist

- [ ] Go to https://github.com/settings/developers
- [ ] Click on your OAuth App
- [ ] Set Authorization callback URL to: `https://silly-speculoos-4afae0.netlify.app/.netlify/functions/github-oauth`
- [ ] Click "Update application"
- [ ] Try signing in again

That's it! This should fix the issue immediately.

## Screenshot Reference

Your OAuth App settings should look like this:

```
┌─────────────────────────────────────────────────────────────┐
│ Application name                                            │
│ StudyWithJesus Admin                                        │
├─────────────────────────────────────────────────────────────┤
│ Homepage URL                                                │
│ https://silly-speculoos-4afae0.netlify.app                 │
├─────────────────────────────────────────────────────────────┤
│ Application description (optional)                          │
│ Admin authentication for StudyWithJesus site                │
├─────────────────────────────────────────────────────────────┤
│ Authorization callback URL                                  │
│ https://silly-speculoos-4afae0.netlify.app/.netlify/       │
│ functions/github-oauth                                      │
└─────────────────────────────────────────────────────────────┘
```

## After Fixing

Once you update the callback URL and sign in successfully:
- Session lasts 24 hours
- You'll be redirected to the admin dashboard
- You'll see your GitHub avatar and username
- You can access all admin pages

## Need More Help?

- Run the diagnostic tool: https://silly-speculoos-4afae0.netlify.app/pages/admin/oauth-diagnostic.html
- See full troubleshooting guide: `docs/TROUBLESHOOTING_OAUTH.md`
- Check Netlify function logs: https://app.netlify.com/sites/silly-speculoos-4afae0/functions
