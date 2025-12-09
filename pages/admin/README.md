# Admin Hub Documentation

## Overview

The Admin Hub provides centralized access to administrative features for StudyWithJesus, protected by GitHub OAuth authentication.

## Authentication

**🔐 Firebase Authentication with GitHub Provider**

All admin pages now require authentication via Firebase Authentication with GitHub provider. This works on both GitHub Pages and Netlify.

**Setup:** See [FIREBASE_GITHUB_AUTH_SETUP.md](../../FIREBASE_GITHUB_AUTH_SETUP.md) for complete configuration instructions.

**Quick Setup:**
1. Enable Firebase Authentication with GitHub provider
2. Create GitHub OAuth App with Firebase callback URL
3. Configure Firebase in `config/firebase.config.js`
4. Visit `/pages/admin/index.html` and sign in with GitHub

**Note:** Legacy Netlify OAuth setup is deprecated. Use Firebase Authentication for all deployments.

## Admin Pages

### 1. Admin Hub (Index)
**URL:** `/pages/admin/index.html`

Central dashboard with links to all admin features. Bookmark this page for easy access.

**Authentication:** GitHub OAuth required

### 2. Fingerprint Admin
**URL:** `/pages/admin/fingerprint-admin.html`

Manage access control via fingerprint (device/display name) blocking:
- View all logged fingerprints with associated display names and IP addresses
- Toggle block/allow status for each fingerprint
- Export blacklist configuration with fingerprints (IPs shown for info only)
- Search and filter by fingerprint, name, or IP address
- Real-time statistics
- **IP addresses are tracked for information only and NOT used for blocking**

**Authentication:** GitHub OAuth required

**Features:**
- 🔒 Toggle switches to block/unblock individual fingerprints (device IDs)
- 📊 Real-time statistics (Total, Blocked, Allowed)
- 🔍 Search by name, fingerprint hash, or IP address
- 📥 Export blacklist configuration to clipboard
- 🗑️ Clear all blocks with one click
- 💾 Automatic saving to localStorage
- 👤 Shows your GitHub profile in header
- 🌐 IP tracking for information/logging purposes only

**How to Block a User:**
1. Open the Fingerprint Admin page
2. Sign in with your authorized GitHub account
3. Find the user by name, fingerprint hash, or IP address
4. Click the toggle switch to change from "Allowed" to "BLOCKED"
5. Only the fingerprint is blocked (IP is for information only)
6. Click "Export Blacklist" to copy the configuration
7. Paste the exported config into `assets/whitelist-fingerprint.js`
8. Uncomment the blacklist script in your HTML pages

### 3. Leaderboard Admin
**URL:** `/pages/admin/leaderboard.html`

View detailed leaderboard statistics and user data:
- User statistics dashboard
- Per-user exam counts
- Module performance
- Detailed attempt history

**Authentication:** GitHub OAuth required (primary), with fallback to URL fragment or Firebase auth for development/demo

**Access Methods (in priority order):**
1. **GitHub OAuth (Primary - Production):** Sign in with authorized GitHub account
2. **URL Fragment (Fallback - Demo):** `/pages/admin/leaderboard.html#ADMIN_SECRET_KEY`
3. **Firebase Auth (Fallback):** Requires admin custom claim

## Bookmarking Admin Links

For quick access, bookmark these URLs:

```
Admin Hub:
https://your-site.com/pages/admin/index.html

Fingerprint Admin:
https://your-site.com/pages/admin/fingerprint-admin.html

Leaderboard Admin:
https://your-site.com/pages/admin/leaderboard.html
```

## Security Considerations

### GitHub OAuth Authentication
- ✅ **OAuth 2.0 Standard** - Industry-standard authentication protocol
- ✅ **Single Admin Account** - Only specified GitHub user can access
- ✅ **No Password Storage** - No passwords to manage or leak
- ✅ **Firebase Authentication** - Secure token exchange via Firebase
- ✅ **Session Expiration** - Automatic timeout
- ✅ **HTTPS Only** - Secure communication

### Fingerprint Admin
- GitHub OAuth protected
- Session-based authentication (clears on logout)
- No server-side persistence by default
- Uses localStorage for blocked fingerprint list
- Firebase handles all authentication securely

**Best Practices:**
1. Use HTTPS in production (GitHub Pages provides this automatically)
2. Keep the admin URLs private (not linked from public pages)
3. Regularly review GitHub OAuth app access

### Leaderboard Admin
- GitHub OAuth protected (primary authentication)
- Fallback to URL fragment or Firebase auth for development/demo
- Hidden from site navigation
- Admin access attempts logged locally
- See `docs/leaderboard-design.md` for Firebase admin setup

## Integration with Fingerprint Logger

The Fingerprint Admin page works in conjunction with:
- `assets/fingerprint-logger.js` - Generates device fingerprints and logs them to Firebase Cloud Function
- `assets/whitelist-fingerprint.js` - Blocks based on whitelist
- `functions/index.js` - Firebase Cloud Functions (includes logFingerprint)

**Workflow:**
1. Users visit the site → fingerprint is logged to Firebase
2. Admin reviews fingerprints in admin panel
3. Admin blocks unwanted fingerprints
4. Admin exports whitelist configuration
5. Whitelist is deployed to `whitelist-fingerprint.js`
6. Blocked users see "Access Restricted" message

## Linking Display Names to Fingerprints

The system associates fingerprints with display names through:

1. **Automatic Collection:**
   - When fingerprint is generated, the current display name is captured
   - Stored in localStorage under `fingerprint_logs`

2. **Manual Association:**
   - Check GitHub issues created by the logger
   - Issues contain fingerprint hash and metadata
   - Cross-reference with leaderboard usernames

3. **Admin Interface:**
   - Shows fingerprint → name mapping
   - Allows searching by either fingerprint or name
   - Updates when users change display names

## Data Storage

### localStorage Keys

```javascript
// Fingerprint Admin
'fingerprint_admin_auth' // Session auth (sessionStorage)
'fingerprint_blocked_list' // Array of blocked fingerprint hashes
'fingerprint_logs' // Array of fingerprint log entries

// Leaderboard (existing)
'leaderboard_username' // User's display name
'leaderboard_attempts' // User's exam attempts
```

### Log Entry Format

```javascript
{
  id: 1234567890,
  name: "John Doe",
  fingerprint: "a1b2c3d4...", // SHA-256 hash
  timestamp: "2025-01-01T00:00:00.000Z",
  userAgent: "Mozilla/5.0...",
  lastSeen: "2025-01-01T00:00:00.000Z"
}
```

## Exporting Whitelist Configuration

The "Export Whitelist" button generates a ready-to-use configuration:

```javascript
// Whitelist Configuration
// Generated: 2025-01-01T00:00:00.000Z

const allowedFingerprints = [
  'fingerprint-hash-1', // User Name 1
  'fingerprint-hash-2', // User Name 2
];
```

**To deploy:**
1. Click "Export Whitelist" in admin panel
2. Copy the generated configuration
3. Open `assets/whitelist-fingerprint.js`
4. Replace the `allowedFingerprints` array
5. Save and deploy

**Important:** When the array is NOT empty, only listed fingerprints can access the site. To disable blocking, keep the array empty.

## Troubleshooting

### "No fingerprints found"
- Ensure users have visited the site with the logger active
- Check that `assets/fingerprint-logger.js` is included in HTML
- Verify localStorage is enabled in browser

### Changes not taking effect
- Clear browser cache
- Check that whitelist-fingerprint.js is uncommented in HTML
- Verify the exported config was properly pasted
- Ensure fingerprint hashes are exactly 64 hex characters

### Can't access admin pages
- Check that you're using the correct password
- Verify the URLs are correct (case-sensitive)
- Clear sessionStorage and try again
- Check browser console for errors

## Development Notes

### Adding New Admin Features

To add new admin pages:
1. Create page in `/pages/admin/`
2. Add link to `pages/admin/index.html`
3. Implement authentication (password or Firebase)
4. Document in this README

### Customizing Fingerprint Admin

Edit `pages/admin/fingerprint-admin.html`:
- Change `ADMIN_PASSWORD` constant for new password
- Modify `STORAGE_KEY_*` constants for different storage keys
- Customize styling in `<style>` section
- Add additional metadata fields as needed

## Related Documentation

- [Firebase Setup Guide](../../FIREBASE_SETUP_GUIDE.md) - Complete Firebase setup
- [GitHub OAuth Setup Guide](../../docs/GITHUB_OAUTH_SETUP.md) - OAuth configuration
- [Fingerprint Setup Guide](../../docs/FINGERPRINT_SETUP.md)
- [Leaderboard Design](../../docs/leaderboard-design.md)
- [Main README](../../README.md)
