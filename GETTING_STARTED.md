# Quick Start Guide for Developers

> **👉 Just want to use the site?** Visit https://studywithjesus.github.io - no setup needed!

This guide is **only for developers** who want to modify the code or deploy changes. If you just want to take practice exams or view leaderboards, simply visit the live site above.

## Do I Need to Clone the Repository?

**NO, if you want to:**
- Take practice exams
- View leaderboards
- Access admin features (just sign in with GitHub)
- Use any website features

**YES, only if you want to:**
- Modify the code
- Deploy Cloud Functions
- Change Firebase configuration
- Develop new features locally

---

## Developer Setup

This guide helps you get started with the StudyWithJesus repository on your local machine.

## Prerequisites

- Node.js (v18 or later)
- npm (comes with Node.js)
- Firebase CLI (will be installed via npm)
- Git

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/StudyWithJesus/StudyWithJesus.github.io.git
cd StudyWithJesus.github.io
```

### 2. Install Dependencies

```bash
# Install root dependencies (includes Firebase CLI)
npm install

# Install Cloud Functions dependencies
npm run functions:install
```

### 3. Login to Firebase

```bash
firebase login
```

This will open a browser window for you to authenticate with your Google account.

### 4. Verify Firebase Project

```bash
firebase use
```

This should show `studywithjesus` as the active project. If you need to select it manually:

```bash
firebase use studywithjesus
```

## Running Locally

### Start Firebase Emulators

```bash
npm run serve
```

This starts the Firebase emulators for local development (hosting, functions, and Firestore).

### Serve Static Files Only

For a simple local server without Firebase:

```bash
python -m http.server 8000
# or
npx serve
```

Then open http://localhost:8000 in your browser.

## Deployment

### Deploy Everything

```bash
npm run deploy
```

### Deploy Hosting Only

```bash
npm run deploy:hosting
```

### Deploy Functions Only

```bash
npm run deploy:functions
```

## Common Issues

### "firebase use must be run from a Firebase project directory"

This error occurs if the `.firebaserc` file is missing. Make sure you have cloned the repository and are in the correct directory. The repository should contain:
- `.firebaserc` - Firebase project configuration
- `firebase.json` - Firebase hosting/functions configuration
- `package.json` - npm dependencies

### "Cannot find module" errors with Node

Make sure you're using Node.js v18 or later:

```bash
node --version
```

If you're using a node version manager like nvm:

```bash
nvm use 18
```

### "ENOENT: no such file or directory, open 'package.json'"

Make sure you're in the repository directory:

```bash
cd StudyWithJesus.github.io
pwd  # Should show the path to the repository
```

## Next Steps

- **Firebase Setup**: See [FIREBASE_SETUP_GUIDE.md](FIREBASE_SETUP_GUIDE.md) for complete Firebase configuration
- **GitHub OAuth**: See [GITHUB_OAUTH_QUICK_ANSWER.md](GITHUB_OAUTH_QUICK_ANSWER.md) for authentication setup
- **Admin Access**: See [COMPLETE_SETUP_GUIDE.md](COMPLETE_SETUP_GUIDE.md) for admin features

## File Structure

```
StudyWithJesus.github.io/
├── .firebaserc          # Firebase project configuration
├── firebase.json        # Firebase hosting/functions config
├── package.json         # Root npm dependencies
├── functions/           # Cloud Functions
│   ├── package.json     # Functions dependencies
│   └── index.js         # Functions code
├── index.html           # Main exam selection page
├── pages/               # Additional pages
├── assets/              # JavaScript, CSS, data files
└── docs/                # Documentation
```

## Support

For more detailed information, refer to the comprehensive guides in the repository:
- [FIREBASE_SETUP_GUIDE.md](FIREBASE_SETUP_GUIDE.md)
- [COMPLETE_SETUP_GUIDE.md](COMPLETE_SETUP_GUIDE.md)
- [README.md](README.md)
