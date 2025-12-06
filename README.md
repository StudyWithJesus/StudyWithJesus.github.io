# StudyWithJesus Practice Exams

Practice exams for Parts Technician Second Period modules (270201, 270202, 270203, 270204). Built as a static GitHub Pages site with exam-style practice questions.

## Features

- **Module-based practice exams** - Questions organized by ILM (Individual Learning Module)
- **Auto-save** - Your answers are automatically saved as you work
- **Review mode** - After submitting, see which questions you got right/wrong
- **Score tracking** - Last scores saved per exam
- **Question scrambling** - Questions and answers are shuffled on each retake
- **Leaderboard** - Optional feature to track and compare scores (see below)

## Getting Started

1. Open `index.html` in a browser, or visit the hosted GitHub Pages site
2. Select a module (270201, 270202, 270203, or 270204)
3. Choose an ILM exam to practice
4. Answer questions and submit when ready
5. Review your results and retake to improve

## Leaderboard Feature

The leaderboard feature allows students to compete and track their progress across modules.

### Pages

- **Public Leaderboard** (`/pages/leaderboard.html`) - View top scores per module
- **Admin Dashboard** (`/pages/admin/leaderboard.html`) - Hidden admin view for detailed statistics

### Demo Mode (Default)

By default, the leaderboard loads sample data for preview purposes. No backend configuration is required. Scores are saved locally in the browser.

### Enabling Real Backend

To enable real-time leaderboards with data persistence:

#### Option 1: Firebase/Firestore

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Firestore Database
   - Enable Authentication (Email/Password)

2. **Configure Security Rules**
   - Copy the rules from `docs/leaderboard-design.md`
   - Apply them in Firestore > Rules

3. **Create Config File**
   ```bash
   cp config/firebase.config.js.example config/firebase.config.js
   ```
   - Edit with your Firebase credentials
   - Add `config/firebase.config.js` to `.gitignore`

4. **Enable in HTML**
   - In `pages/leaderboard.html` and `pages/admin/leaderboard.html`
   - Uncomment the Firebase SDK script tags
   - Uncomment the config script tag

5. **Deploy Cloud Functions** (Optional)
   - For automatic leaderboard updates, deploy the Cloud Function from `docs/leaderboard-design.md`

#### Option 2: Custom REST API

1. **Implement Backend**
   - See `docs/leaderboard-design.md` for API specification
   - Example Node.js/Express implementation included
   - PostgreSQL schema provided

2. **Configure Endpoint**
   ```javascript
   window.LEADERBOARD_CONFIG = {
     backendUrl: 'https://your-api.com/api',
     firebaseEnabled: false
   };
   ```

### Admin Access

The admin page is hidden from site navigation and requires authentication:

#### Method 1: URL Fragment (Demo)
Access via: `/pages/admin/leaderboard.html#ADMIN_SECRET_KEY`

To change the key, edit the `DEMO_ADMIN_KEY` variable in the admin page.

#### Method 2: Firebase Auth (Recommended)
1. Set up Firebase Authentication
2. Create admin user
3. Set admin custom claim via Firebase Admin SDK:
   ```javascript
   admin.auth().setCustomUserClaims(uid, { admin: true });
   ```

### Security Considerations

- **No secrets in repo** - All credentials are in gitignored config files
- **Firestore rules** - Restrict writes and admin reads
- **Admin audit logging** - Access attempts are logged locally
- **IP hashing** - If storing IPs, use one-way hashing
- **Data deletion** - See design doc for user data removal procedures

## Project Structure

```
/
├── index.html                 # Main module selection page
├── style.css                  # Global styles
├── script.js                  # Global exam functionality
├── 270201-test/               # Module 270201 exams
├── 270202-test/               # Module 270202 exams
├── 270203-test/               # Module 270203 exams
├── 270204-test/               # Module 270204 exams
├── pages/
│   ├── leaderboard.html       # Public leaderboard
│   └── admin/
│       └── leaderboard.html   # Admin dashboard
├── assets/
│   ├── js/
│   │   ├── leaderboard.js           # Client-side leaderboard helper
│   │   └── leaderboard-firebase.js  # Firebase integration
│   ├── css/
│   │   └── leaderboard.css          # Leaderboard styles
│   └── data/
│       └── leaderboard-sample.json  # Sample data
├── config/
│   └── firebase.config.js.example   # Firebase config template
└── docs/
    └── leaderboard-design.md        # Design documentation
```

## Development

This is a static HTML/CSS/JS site. No build step required.

1. Clone the repository
2. Open `index.html` in a browser
3. For local server: `python -m http.server 8000` or `npx serve`

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## License

Built for Parts Technician training - Wolf Pack Training.
