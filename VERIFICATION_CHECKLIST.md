# Firebase Setup Verification Checklist

Use this checklist to verify that your Firebase setup is working correctly.

## Pre-requisites

Before testing, make sure you've completed:
- ✅ [FIREBASE_SETUP_GUIDE.md](FIREBASE_SETUP_GUIDE.md) - Follow all steps
- ✅ Firebase project created
- ✅ GitHub OAuth App created and configured
- ✅ Firebase config file created (`config/firebase.config.js`)

---

## Test 1: Firebase Configuration

**Test**: Verify Firebase is configured correctly

1. Open your browser's Developer Tools (F12)
2. Visit: `https://studywithjesus.github.io`
3. Check the Console tab
4. Look for Firebase initialization messages

**Expected Result**:
- ✅ No Firebase configuration errors
- ✅ No "FIREBASE_CONFIG not found" warnings

**If Failed**:
- Check that `config/firebase.config.js` exists and is loaded
- Verify the Firebase configuration values are correct
- See [Troubleshooting](FIREBASE_SETUP_GUIDE.md#troubleshooting) section

---

## Test 2: Admin Page Access

**Test**: Verify admin pages are accessible

1. Visit: `https://studywithjesus.github.io/pages/admin/index.html`
2. Check that the page loads without errors

**Expected Result**:
- ✅ Page loads successfully
- ✅ "Sign in with GitHub" button is visible
- ✅ No JavaScript errors in console

**If Failed**:
- Check browser console for errors
- Verify `assets/js/github-auth.js` is loading
- Verify `config/firebase.config.js` is loading

---

## Test 3: GitHub Authentication

**Test**: Verify GitHub OAuth sign-in works

1. Visit: `https://studywithjesus.github.io/pages/admin/index.html`
2. Click **"Sign in with GitHub"**
3. A popup should appear with GitHub OAuth
4. Authorize the application
5. Popup should close automatically

**Expected Result**:
- ✅ OAuth popup opens
- ✅ GitHub authorization page loads
- ✅ After authorizing, popup closes
- ✅ Your GitHub avatar and username appear on the page
- ✅ No redirect_uri errors

**If Failed**:
- **redirect_uri_mismatch error**: See [GITHUB_OAUTH_QUICK_ANSWER.md](GITHUB_OAUTH_QUICK_ANSWER.md)
- **Popup blocked**: Enable popups for your site
- **Popup doesn't close**: Check browser console for errors
- **No authorization page**: Verify GitHub OAuth App is configured correctly

---

## Test 4: Admin Pages Navigation

**Test**: Verify all admin pages are accessible after sign-in

After signing in (Test 3), visit these pages:

1. **Admin Hub**: `/pages/admin/index.html`
2. **Leaderboard Admin**: `/pages/admin/leaderboard.html`
3. **Fingerprint Admin**: `/pages/admin/fingerprint-admin.html`

**Expected Result**:
- ✅ All pages load successfully
- ✅ Your GitHub profile is shown on each page
- ✅ No authentication errors
- ✅ No "Access Denied" messages

**If Failed**:
- Sign out and sign in again
- Check browser console for errors
- Verify you're still authenticated (check session)

---

## Test 5: Firestore Connection

**Test**: Verify Firestore database is accessible

1. Sign in to admin page (Test 3)
2. Visit: `https://studywithjesus.github.io/pages/admin/leaderboard.html`
3. Open browser console (F12)
4. Look for Firestore connection messages

**Expected Result**:
- ✅ No Firestore permission errors
- ✅ Page shows "No data" or actual leaderboard data
- ✅ No "Failed to load leaderboard" errors

**If Failed**:
- Verify Firestore is enabled in Firebase Console
- Check Firestore security rules are configured correctly
- See [FIREBASE_SETUP_GUIDE.md](FIREBASE_SETUP_GUIDE.md#step-32-configure-security-rules)

---

## Test 6: Submit Score (Optional)

**Test**: Verify score submission works

1. Visit: `https://studywithjesus.github.io`
2. Select a module (e.g., 270201)
3. Take a practice exam
4. Submit your score
5. Visit the leaderboard: `/pages/leaderboard.html`

**Expected Result**:
- ✅ Score submits successfully
- ✅ Your score appears on the leaderboard
- ✅ No submission errors

**If Failed**:
- Check browser console for errors
- Verify Firestore rules allow writes
- Check Cloud Functions logs in Firebase Console

---

## Test 7: Cloud Functions (Optional)

**Test**: Verify Cloud Functions are deployed and working

1. Go to [Firebase Console Functions](https://console.firebase.google.com/project/studywithjesus/functions)
2. Check function status

**Expected Result**:
- ✅ Functions are deployed and active
- ✅ `updateLeaderboard` function exists
- ✅ `logFingerprint` function exists (if enabled)
- ✅ No deployment errors

**If Failed**:
- Redeploy functions: `firebase deploy --only functions`
- Check function logs: `firebase functions:log`
- See [FIREBASE_SETUP_GUIDE.md](FIREBASE_SETUP_GUIDE.md#step-44-deploy-cloud-functions)

---

## Test 8: Fingerprint Logging (Optional)

**Test**: Verify fingerprint logging works (if enabled)

1. Visit: `https://studywithjesus.github.io`
2. Wait 10 seconds
3. Check GitHub issues: `https://github.com/StudyWithJesus/StudyWithJesus.github.io/issues`

**Expected Result**:
- ✅ New issue created with label `fingerprint-log`
- ✅ Issue contains device fingerprint hash
- ✅ Issue contains timestamp and user agent

**If Failed**:
- Verify you're on Firebase Blaze plan
- Check GitHub token is configured: `firebase functions:config:get`
- Check function logs: `firebase functions:log --only logFingerprint`
- See [FIREBASE_SETUP_GUIDE.md](FIREBASE_SETUP_GUIDE.md#part-5-fingerprint-logging-optional)

---

## All Tests Passed?

If all tests passed, your Firebase setup is complete and working correctly! 🎉

### Next Steps

1. **Customize Admin Access** (Optional):
   - Edit `assets/js/leaderboard-firebase.js`
   - Add username whitelist to restrict admin access
   - See [FIREBASE_SETUP_GUIDE.md](FIREBASE_SETUP_GUIDE.md#next-steps)

2. **Monitor Usage**:
   - Check Firebase Console regularly
   - Monitor function execution logs
   - Track Firestore usage

3. **Backup Data**:
   - Export Firestore data periodically
   - Store backups securely

---

## Need Help?

If any tests failed, see:
- [FIREBASE_SETUP_GUIDE.md](FIREBASE_SETUP_GUIDE.md) - Complete setup guide with troubleshooting
- [Troubleshooting Section](FIREBASE_SETUP_GUIDE.md#troubleshooting) - Common issues and solutions
- GitHub Issues - Report bugs or ask questions

---

**Last Updated**: December 2024  
**Firebase Project**: studywithjesus  
**Site**: https://studywithjesus.github.io
