# Setting Up Firebase Admin Custom Claims

## Step 1: Download Service Account Key

1. Go to Firebase Console: https://console.firebase.google.com/project/studywithjesus/settings/serviceaccounts/adminsdk
2. Click "Generate new private key"
3. Save the JSON file as `service-account-key.json` in the `functions/` directory

**⚠️ IMPORTANT: Never commit this file to Git! It's already in .gitignore**

## Step 2: Run the Admin Setup Script

```bash
cd functions
node set-admin.js noahhurstboram@gmail.com
```

This will set the `admin: true` custom claim on your Firebase account.

## Step 3: Sign Out and Sign Back In

After running the script:
1. Sign out of all admin pages
2. Sign back in with GitHub
3. The admin claim will now be active

## What This Fixes

With the admin custom claim set, you'll be able to:
- ✅ Write to `admin_logs` collection (no more permission errors)
- ✅ Full admin access without relying on hardcoded UIDs
- ✅ Proper audit logging of admin actions

## Alternative: Use Firebase CLI

If you prefer, you can also use the Firebase CLI:

```bash
firebase functions:shell
# Then in the shell:
admin.auth().setCustomUserClaims('kdWm2MNPK1eN8GqEt8AOgjWCw8P2', { admin: true })
```
