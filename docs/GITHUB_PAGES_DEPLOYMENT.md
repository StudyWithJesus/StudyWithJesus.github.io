# GitHub Pages Deployment Guide

> **📚 UPDATED GUIDE AVAILABLE:** For complete setup instructions, see [FIREBASE_SETUP_GUIDE.md](../FIREBASE_SETUP_GUIDE.md).

## Important: GitHub Pages and Firebase

GitHub Pages is a static hosting platform that works perfectly with Firebase Authentication. This guide provides setup information specific to GitHub Pages deployment.

## Option 1: Client-Side Only (Recommended for GitHub Pages)

### Simple Fingerprint Logging (No Server Required)

The fingerprint logger will work in "local mode" - storing fingerprints in localStorage only. This is useful for:
- Testing and development
- Small sites with few users
- When you don't need centralized logging

**Already included:** The fingerprint logger falls back to localStorage automatically when the serverless endpoint is unavailable.

### How It Works

1. **Fingerprint Logger** - Runs in browser, stores logs locally
2. **Admin Dashboard** - Works entirely client-side, reads from localStorage
3. **Whitelist Blocker** - Works client-side with manual configuration

**No setup required!** Just enable the blocker script when ready.

## Option 2: Using GitHub Actions for Logging

If you want centralized fingerprint logging without Netlify, you can use GitHub Actions with repository dispatch events.

### Setup Steps

1. **Create GitHub Personal Access Token**
   - Go to https://github.com/settings/tokens
   - Generate new token (classic)
   - Select scope: `repo`
   - Copy the token

2. **Update Fingerprint Logger Endpoint**

Edit `assets/fingerprint-logger.js` and change the endpoint:

```javascript
// Change this line:
const endpoint = '/.netlify/functions/log-fingerprint';

// To this (replace with your repository):
const endpoint = 'https://api.github.com/repos/StudyWithJesus/StudyWithJesus.github.io/dispatches';
```

3. **Modify the Logger to Use Repository Dispatch**

Replace the fetch call in `assets/fingerprint-logger.js`:

```javascript
// Instead of POSTing to Netlify function:
fetch(endpoint, {
  method: 'POST',
  headers: {
    'Accept': 'application/vnd.github+json',
    'Authorization': 'Bearer YOUR_GITHUB_TOKEN', // ⚠️ Don't commit this!
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    event_type: 'fingerprint_log',
    client_payload: payload
  })
});
```

**⚠️ Security Warning:** Never commit your GitHub token in client-side code! This approach requires the token to be public, which is a security risk.

## Option 3: Use a Third-Party Webhook Service

### Recommended: Formspree, Zapier, or Make (formerly Integromat)

These services can receive webhook POSTs and forward them to various destinations.

#### Using Formspree (Free Tier Available)

1. Sign up at https://formspree.io
2. Create a new form
3. Copy your form endpoint URL
4. Update `assets/fingerprint-logger.js`:

```javascript
const endpoint = 'https://formspree.io/f/YOUR_FORM_ID';
```

Formspree will email you when fingerprints are logged.

#### Using Webhook.site (For Testing)

1. Visit https://webhook.site
2. Copy your unique URL
3. Update endpoint in `assets/fingerprint-logger.js`
4. View logged fingerprints at webhook.site

## Option 4: Self-Hosted Backend

If you have access to any server or hosting platform that supports server-side code:

### Using Vercel (Free, Similar to Netlify)

Vercel also offers serverless functions and has a generous free tier:

1. Sign up at https://vercel.com
2. Deploy your repository to Vercel
3. The Netlify functions will work with minimal changes on Vercel

**Benefits:**
- Similar to Netlify
- Free tier available
- Serverless functions supported
- Easy GitHub integration

### Using Cloudflare Workers (Free Tier)

1. Sign up at https://workers.cloudflare.com
2. Create a worker with this code:

```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }
  
  const payload = await request.json()
  const clientIP = request.headers.get('CF-Connecting-IP')
  
  // Create GitHub issue
  const issue = await fetch('https://api.github.com/repos/StudyWithJesus/StudyWithJesus.github.io/issues', {
    method: 'POST',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Cloudflare-Worker'
    },
    body: JSON.stringify({
      title: `Fingerprint: ${payload.fp.substring(0, 8)}...`,
      body: `Fingerprint: ${payload.fp}\nIP: ${clientIP}\nUA: ${payload.ua}`,
      labels: ['fingerprint-log']
    })
  })
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
}
```

3. Set environment variable `GITHUB_TOKEN`
4. Update endpoint in fingerprint logger to your worker URL

## Current Setup (No Changes Needed)

Your current implementation will work in "local mode" on GitHub Pages:

✅ **Works:**
- Fingerprint logger (stores locally)
- Whitelist blocker (client-side)
- Admin dashboard (reads localStorage)
- Leaderboard (already using Firebase)

❌ **Doesn't Work Without Server:**
- GitHub OAuth authentication (requires serverless function)
- Centralized fingerprint logging to GitHub issues

## Recommended Approach for GitHub Pages

**Keep it simple:**

1. **Use Local Mode** (default)
   - Fingerprints stored in browser localStorage
   - Admin dashboard works client-side
   - No external dependencies

2. **Manual Whitelist Management**
   - Users visit your site
   - Check localStorage for their fingerprints
   - Manually add to whitelist as needed

3. **Firebase for Leaderboard**
   - Already working ✅
   - No changes needed

## Alternative: Move to Vercel

If you want the full functionality (OAuth admin, centralized logging), consider deploying to Vercel instead of GitHub Pages:

1. Keep GitHub as source repository
2. Connect repository to Vercel
3. Vercel will auto-deploy on commits
4. All Netlify functions will work on Vercel with minimal changes

**Steps:**
1. Go to https://vercel.com
2. Sign in with GitHub
3. Import your repository
4. Set environment variables
5. Deploy

Your GitHub Pages site can redirect to the Vercel deployment if needed.

## Getting Your Fingerprint (Console Method)

To get your own fingerprint for the whitelist, open browser console and run:

```javascript
// Copy this entire block into browser console
(async function() {
  const props = [
    navigator.userAgent || '',
    navigator.language || '',
    navigator.hardwareConcurrency || '',
    navigator.deviceMemory || '',
    navigator.platform || '',
    screen.width + 'x' + screen.height,
    screen.colorDepth || '',
    new Date().getTimezoneOffset(),
    !!window.sessionStorage,
    !!window.localStorage,
    !!window.indexedDB,
    navigator.cookieEnabled
  ].join('|');
  
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(props));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const fp = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  console.log('Your fingerprint:', fp);
  console.log('Copy this to allowedFingerprints array in assets/whitelist-fingerprint.js');
})();
```

Copy the output and add to `assets/whitelist-fingerprint.js`.

## Questions?

- **Q: Can I use the admin dashboard?**
  - A: Yes! It works client-side with localStorage. OAuth login won't work without serverless functions.

- **Q: How do I enable the whitelist blocker?**
  - A: Uncomment the script in your HTML pages and add fingerprints to the array.

- **Q: Can I still track fingerprints?**
  - A: Yes, they're stored in localStorage. Check the admin dashboard to view them.

- **Q: What about the leaderboard?**
  - A: The leaderboard fix works perfectly with Firebase on GitHub Pages!

## Summary

For GitHub Pages, use:
- ✅ Fingerprint logger (local mode)
- ✅ Whitelist blocker (client-side)
- ✅ Admin dashboard (localStorage)
- ✅ Leaderboard (Firebase)
- ❌ OAuth admin (requires serverless)
- ❌ Centralized logging (requires serverless)

For full features, deploy to Vercel instead.
