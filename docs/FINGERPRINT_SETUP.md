# Fingerprint Logger Setup Guide

> **📚 UPDATED GUIDE AVAILABLE:** For complete Firebase setup including fingerprint logging, see [FIREBASE_SETUP_GUIDE.md](../FIREBASE_SETUP_GUIDE.md).

This guide explains how to set up and use the Firebase-based fingerprint logging and whitelist blocking features.

## Overview

The fingerprint logger captures unique device fingerprints from visitors and logs them via Firebase Cloud Functions. **Fingerprints are stored as GitHub Issues** in your repository for easy tracking and management. The optional whitelist blocker can restrict access to only approved fingerprints. An admin dashboard allows you to manage blocked fingerprints with toggle switches.

## Current Implementation

**Firebase-Based Architecture (logs TO GitHub):**
- ✅ Client-side fingerprint generation (`assets/fingerprint-logger.js`)
- ✅ Firebase Cloud Function receives fingerprint data
- ✅ Firebase function creates GitHub Issues for each fingerprint
- ✅ Local storage for admin dashboard (fingerprints cached client-side)
- ✅ Works on GitHub Pages and any static hosting

**Data Flow:**
```
Visitor's Browser → Firebase Cloud Function → GitHub Issue Created
       ↓
  Local Storage (for admin dashboard)
```

## Admin Dashboard

**🔐 Admin Hub:** `/pages/admin/index.html`

The admin hub provides centralized access to:
- **Fingerprint Admin** (`/pages/admin/fingerprint-admin.html`) - Toggle fingerprint blocking (uses local storage)
- **Leaderboard Admin** (`/pages/admin/leaderboard.html`) - View user statistics (Firebase Firestore)

**Quick Access:**
Bookmark the admin hub for easy access to all administrative features. See `pages/admin/README.md` for detailed documentation.

## Files

- `assets/fingerprint-logger.js` - Generates SHA-256 fingerprint and sends to Firebase Cloud Function
- `assets/whitelist-fingerprint.js` - Optional blocker that restricts access to whitelisted fingerprints
- `functions/index.js` - Firebase Cloud Functions (includes `logFingerprint` that creates GitHub issues)
- `_includes/fingerprint-scripts.html` - Documentation and include template
- `pages/admin/index.html` - Admin hub with links to all admin pages
- `pages/admin/fingerprint-admin.html` - Fingerprint management dashboard with toggle controls

## Firebase Setup

### Step 1: Set Firebase Environment Variables

The logFingerprint function needs GitHub credentials to create issues:

```bash
firebase functions:config:set github.token="your-github-personal-access-token"
firebase functions:config:set github.repo="owner/repo"
```

**GitHub Token Requirements:**
- Create at: https://github.com/settings/tokens
- Required scope: `repo` (to create issues)
- Store securely

### Step 2: Deploy Firebase Cloud Function

The fingerprint logger sends data to a Firebase Cloud Function which then creates GitHub issues:

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Navigate to functions directory**:
   ```bash
   cd functions
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Deploy the function**:
   ```bash
   firebase deploy --only functions:logFingerprint
   ```

5. **Note the function URL** after deployment:
   ```
   https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net/logFingerprint
   ```

### Step 3: Configure Function Endpoint

Update the endpoint in `assets/fingerprint-logger.js` to match your Firebase project:

```javascript
const endpoint = 'https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net/logFingerprint';
```

If you're using Firebase Hosting rewrites, you can use a cleaner URL:
```javascript
const endpoint = '/api/logFingerprint';
```

And add this to your `firebase.json`:
```json
{
  "hosting": {
    "rewrites": [
      {
        "source": "/api/logFingerprint",
        "function": "logFingerprint"
      }
    ]
  }
}
```

### Step 4: Verify Setup

After deploying:

1. **Visit your site** - Fingerprints will be generated automatically
2. **Check GitHub Repository** - Look for new issues with label `fingerprint-log`
3. **Verify Issue Content** - Should contain:
   - Fingerprint hash (SHA-256)
   - User agent, language, timezone
   - Display name (if set)
   - Client IP (for information only)
   - Instructions for blocking

**Example Issue Title:**
```
Fingerprint Log: a1b2c3d4... (John Doe) at 12/9/2024, 12:00:00 AM
```

## How It Works

### Data Flow

1. **Client Side** (`assets/fingerprint-logger.js`):
   - Collects browser properties (user agent, screen size, timezone, etc.)
   - Generates SHA-256 hash as fingerprint
   - Stores fingerprint in local storage (for admin dashboard)
   - Sends fingerprint data to Firebase Cloud Function

2. **Firebase Cloud Function** (`functions/index.js` - `logFingerprint`):
   - Receives POST request with fingerprint data
   - Validates required fields
   - Creates GitHub issue using GitHub REST API
   - Issue includes fingerprint hash, metadata, and blocking instructions

3. **GitHub Repository**:
   - Stores fingerprint logs as issues with label `fingerprint-log`
   - Provides permanent audit trail
   - Easy to search and review

4. **Admin Dashboard** (`pages/admin/fingerprint-admin.html`):
   - Reads fingerprints from local storage
   - Allows toggling block/allow status
   - Exports whitelist configuration
   - Does NOT query GitHub issues (uses local cache only)

## Using the Whitelist Blocker (Optional)

**Required:**
- `GITHUB_TOKEN` - Personal access token with `repo` scope
  - Create at: https://github.com/settings/tokens
  - Select "Generate new token (classic)"
  - Check the `repo` scope
  - Copy the token and add it to Netlify

**Optional:**
- `GITHUB_REPO` - Repository in format `owner/repo`
  - Default: `StudyWithJesus/StudyWithJesus.github.io`
  - Only set if you want to log to a different repository

### Step 2: Deploy to Netlify

1. Connect your GitHub repository to Netlify
2. The site will build automatically (no build step needed for static site)
3. The serverless function will be available at `/.netlify/functions/log-fingerprint`

### Step 3: Verify Setup

1. Visit your deployed site
2. Check your GitHub repository for a new issue with label `fingerprint-log`
3. The issue will contain the fingerprint hash and metadata

## Using the Whitelist Blocker (Optional)

By default, the whitelist blocker is **disabled**. To enable it:

### Method A: Using Admin Dashboard (Recommended)

1. **Access Admin Dashboard:**
   - Navigate to `/pages/admin/fingerprint-admin.html`
   - Enter admin password (default: `admin123`)

2. **Block Fingerprints:**
   - View all logged fingerprints with associated display names
   - Click the toggle switch next to a user to block them
   - Status changes from "Allowed" to "BLOCKED"

3. **Export Configuration:**
   - Click "Export Whitelist" button
   - Configuration is copied to clipboard
   - Paste into `assets/whitelist-fingerprint.js`

4. **Enable Blocker:**
   - Uncomment the whitelist script in your HTML:
   ```html
   <script src="assets/whitelist-fingerprint.js"></script>
   ```

### Method B: Manual Configuration

### Step 1: Enable the Script

In `index.html` (or other pages), add:
```html
<script src="assets/whitelist-fingerprint.js"></script>
```

### Step 2: Collect Fingerprints

1. Let authorized users visit the site
2. Check GitHub issues for their fingerprint hashes
3. Copy the SHA-256 hash from the issue

### Step 3: Add to Whitelist

Edit `assets/whitelist-fingerprint.js`:
```javascript
const allowedFingerprints = [
  'a1b2c3d4e5f6...', // User 1
  'f6e5d4c3b2a1...', // User 2
];
```

### Step 4: Test

- Whitelisted devices can access the site normally
- Non-whitelisted devices see "Access Restricted" message
- Empty array disables blocking (default)

## Admin Dashboard Features

### Fingerprint Admin (`/pages/admin/fingerprint-admin.html`)

**Features:**
- 🔒 Toggle switches to block/unblock individual fingerprints
- 👤 View fingerprints associated with display names
- 📊 Real-time statistics (Total, Blocked, Allowed)
- 🔍 Search by name or fingerprint hash
- 📥 Export whitelist configuration to clipboard
- 🗑️ Clear all blocks with one click
- 💾 Automatic saving to localStorage

**Access:**
- Default password: `admin123`
- Change password by editing `ADMIN_PASSWORD` in page source
- Session-based authentication

**Bookmarking:**
Save these URLs for quick access:
- Admin Hub: `/pages/admin/index.html`
- Fingerprint Admin: `/pages/admin/fingerprint-admin.html`
- Leaderboard Admin: `/pages/admin/leaderboard.html`

For detailed admin documentation, see `pages/admin/README.md`.

## Using a Custom Webhook

To send fingerprints to a different endpoint instead of the Netlify function:

1. Edit `assets/fingerprint-logger.js`
2. Change the endpoint:
   ```javascript
   const endpoint = 'https://your-webhook-url.com/log';
   ```
3. Your webhook should accept POST with this JSON payload:
   ```json
   {
     "fp": "sha256-hash",
     "ua": "user-agent",
     "lang": "language-code",
     "tz": 480,
     "ts": "2025-01-01T00:00:00.000Z",
     "url": "https://example.com/page"
   }
   ```

## Security Considerations

- **No secrets in client code** - The GITHUB_TOKEN is only in server-side environment variables
- **Silent failures** - Logging errors don't disrupt the user experience
- **Fail open** - If whitelist check errors, access is allowed to prevent false positives
- **Rate limiting** - Consider adding rate limiting to the serverless function if needed

## Troubleshooting

### Fingerprints not logging

1. Check Netlify function logs (Netlify dashboard > Functions)
2. Verify GITHUB_TOKEN is set and has `repo` scope
3. Check browser console for errors (open DevTools > Console)
4. Verify the function endpoint is accessible: `/.netlify/functions/log-fingerprint`

### Whitelist blocker not working

1. Verify the script is loaded in the HTML
2. Check that fingerprint hashes are exactly 64 hex characters
3. Ensure the hash collection logic matches between logger and blocker
4. Test with browser DevTools > Console open to see any errors

### Different fingerprint on different visits

This can happen if:
- Browser extensions change between visits
- Browser is in incognito/private mode
- User changes browser settings (language, timezone)
- Screen resolution changes

Use the logger to capture the current fingerprint for each device.

## License

Built for StudyWithJesus Practice Exams
