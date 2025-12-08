# Admin Hub Documentation

## Overview

The Admin Hub provides centralized access to administrative features for StudyWithJesus.

## Admin Pages

### 1. Admin Hub (Index)
**URL:** `/pages/admin/index.html`

Central dashboard with links to all admin features. Bookmark this page for easy access.

### 2. Fingerprint Admin
**URL:** `/pages/admin/fingerprint-admin.html`

Manage access control via fingerprint blocking:
- View all logged fingerprints with associated display names
- Toggle block/allow status for each fingerprint
- Export whitelist configuration
- Search and filter fingerprints
- Real-time statistics

**Default Password:** `admin123`
- Change the password by editing the `ADMIN_PASSWORD` constant in the page source

**Features:**
- 🔒 Toggle switches to block/unblock individual fingerprints
- 📊 Real-time statistics (Total, Blocked, Allowed)
- 🔍 Search by name or fingerprint hash
- 📥 Export whitelist configuration to clipboard
- 🗑️ Clear all blocks with one click
- 💾 Automatic saving to localStorage

**How to Block a User:**
1. Open the Fingerprint Admin page
2. Enter the admin password (`admin123` by default)
3. Find the user by name or fingerprint hash
4. Click the toggle switch to change from "Allowed" to "BLOCKED"
5. Click "Export Whitelist" to copy the configuration
6. Paste the exported config into `assets/whitelist-fingerprint.js`
7. Uncomment the whitelist script in your HTML pages

### 3. Leaderboard Admin
**URL:** `/pages/admin/leaderboard.html`

View detailed leaderboard statistics and user data:
- User statistics dashboard
- Per-user exam counts
- Module performance
- Detailed attempt history
- Access control via URL fragment or Firebase auth

**Access Methods:**
- **URL Fragment (Demo):** `/pages/admin/leaderboard.html#ADMIN_SECRET_KEY`
- **Firebase Auth:** Requires admin custom claim

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

### Fingerprint Admin
- Password-protected (stored in page source)
- Session-based authentication (clears on logout)
- No server-side persistence by default
- Uses localStorage for blocked fingerprint list

**To enhance security:**
1. Change the default password in the page source
2. Consider hosting behind additional authentication
3. Use HTTPS in production
4. Keep the admin URLs private

### Leaderboard Admin
- Hidden from site navigation
- Requires authentication or secret key
- Admin access attempts logged locally
- See `docs/leaderboard-design.md` for Firebase admin setup

## Integration with Fingerprint Logger

The Fingerprint Admin page works in conjunction with:
- `assets/fingerprint-logger.js` - Logs fingerprints to endpoint
- `assets/whitelist-fingerprint.js` - Blocks based on whitelist
- `netlify/functions/log-fingerprint.js` - Creates GitHub issues

**Workflow:**
1. Users visit the site → fingerprint is logged
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

- [Fingerprint Setup Guide](../../docs/FINGERPRINT_SETUP.md)
- [Leaderboard Design](../../docs/leaderboard-design.md)
- [Main README](../../README.md)
