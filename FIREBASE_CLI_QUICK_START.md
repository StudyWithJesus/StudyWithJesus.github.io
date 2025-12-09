# Firebase CLI Quick Start Guide

**Quick answer**: Here are the exact commands you need to run in your terminal to set up Firebase CLI.

## Prerequisites

Make sure you have Node.js installed. Check by running:
```bash
node --version
```

If you don't have Node.js, download it from https://nodejs.org

---

## Step 1: Install Firebase CLI

Open your terminal and run:

```bash
npm install -g firebase-tools
```

Verify it worked:
```bash
firebase --version
```

You should see something like `13.0.0` or higher.

---

## Step 2: Login to Firebase

```bash
firebase login
```

- A browser window will open
- Sign in with your Google account (the one you used for Firebase Console)
- Grant permissions
- Return to terminal when done

---

## Step 3: Navigate to Your Project

```bash
cd /path/to/StudyWithJesus.github.io
```

Replace `/path/to/` with the actual path to your repository.

Example (Windows): `cd C:\Users\YourName\Documents\StudyWithJesus.github.io`
Example (Mac/Linux): `cd ~/Documents/StudyWithJesus.github.io`

---

## Step 4: Connect to Your Firebase Project

```bash
firebase use studywithjesus
```

If you get an error saying the project doesn't exist, run:

```bash
firebase use --add
```

Then:
1. Select your project from the list (use arrow keys)
2. Press Enter
3. Type an alias name (or just press Enter to accept the default)

---

## Step 5: Install Function Dependencies

```bash
cd functions
npm install
cd ..
```

This installs all the packages needed for Cloud Functions.

---

## Step 6: Deploy Functions

```bash
firebase deploy --only functions
```

This will:
- Upload your Cloud Functions to Firebase
- Take 2-5 minutes to complete
- Show ✔ checkmarks when successful

---

## Optional: Configure Fingerprint Logging

If you want to enable fingerprint logging (requires GitHub token):

### Get Your GitHub Token First

1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Name it: `Firebase Fingerprint Logger`
4. Check the `repo` scope
5. Click "Generate token"
6. Copy the token (starts with `ghp_`)

### Set the Token in Firebase

```bash
firebase functions:config:set github.token="ghp_YOUR_TOKEN_HERE"
firebase functions:config:set github.repo="StudyWithJesus/StudyWithJesus.github.io"
```

Replace `ghp_YOUR_TOKEN_HERE` with your actual token.

### Verify Configuration

```bash
firebase functions:config:get
```

You should see your configuration printed out.

### Redeploy Functions

```bash
firebase deploy --only functions
```

---

## Common Commands Reference

### Deploy Everything
```bash
firebase deploy
```

### Deploy Only Functions
```bash
firebase deploy --only functions
```

### Deploy Only Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### View Function Logs
```bash
firebase functions:log
```

### View Logs in Real-Time
```bash
firebase functions:log --follow
```

### View Configuration
```bash
firebase functions:config:get
```

### Check Which Project You're Using
```bash
firebase use
```

### List All Your Projects
```bash
firebase projects:list
```

---

## Troubleshooting

### "firebase: command not found"

**Solution**: The CLI didn't install properly. Try:
```bash
npm install -g firebase-tools --force
```

Then close and reopen your terminal.

### "Not authorized to access project"

**Solution**: Make sure you're logged in with the correct Google account:
```bash
firebase logout
firebase login
```

### "EACCES: permission denied" (Mac/Linux)

**Solution**: You might need sudo for global npm packages:
```bash
sudo npm install -g firebase-tools
```

### Deploy Fails with "Missing Permissions"

**Solution**: Make sure you're using the correct project:
```bash
firebase use studywithjesus
```

### Functions Deploy Takes Forever

**Solution**: This is normal on first deploy. It can take 5-10 minutes. Be patient!

---

## What Each Command Does

| Command | What It Does |
|---------|--------------|
| `firebase login` | Signs you in to Firebase with your Google account |
| `firebase use [project]` | Connects your local repo to a Firebase project |
| `firebase deploy` | Uploads everything (functions, rules, hosting) to Firebase |
| `firebase deploy --only functions` | Uploads only Cloud Functions |
| `firebase functions:log` | Shows recent function execution logs |
| `firebase functions:config:set` | Stores secret configuration (like API keys) |
| `firebase functions:config:get` | Displays stored configuration |

---

## What You Need from Firebase Console

Before running these commands, you need these from Firebase Console:

### 1. Firebase Project Created
- Go to https://console.firebase.google.com/
- Create a project named "studywithjesus"

### 2. Firebase Config (for your website)
- In Firebase Console → Project Settings → Your apps
- Copy the config object
- Paste into `config/firebase.config.js`

### 3. GitHub OAuth Credentials (for authentication)
- In Firebase Console → Authentication → GitHub provider
- Copy the "Authorization callback URL"
- Create a GitHub OAuth App with this URL
- Add Client ID and Secret back to Firebase

See `FIREBASE_SETUP_GUIDE.md` for detailed step-by-step instructions.

---

## Quick Checklist

After running all commands, you should have:

- [x] Firebase CLI installed (`firebase --version` works)
- [x] Logged in to Firebase (`firebase login`)
- [x] Connected to your project (`firebase use studywithjesus`)
- [x] Functions deployed (`firebase deploy --only functions`)
- [x] Configuration set (if using fingerprint logging)

**Test it**: Visit your admin page and try to sign in with GitHub!

---

## Need More Help?

- **Full setup guide**: See `FIREBASE_SETUP_GUIDE.md`
- **Authentication issues**: See `FIREBASE_GITHUB_AUTH_SETUP.md`
- **Fingerprint setup**: See `FIREBASE_FINGERPRINT_SETUP.md`
- **Firebase Docs**: https://firebase.google.com/docs/cli
- **GitHub Issues**: Open an issue in this repository

---

**Last Updated**: December 2024
