# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

- **Leaderboard Feature** - New leaderboard system for tracking and comparing scores
  - Public leaderboard page (`/pages/leaderboard.html`) showing top scores per module
  - Username input for score attribution
  - Module filtering with tab navigation
  - Sample data for demo mode when no backend is configured

- **Admin Dashboard** - Hidden admin view for site administrators
  - Located at `/pages/admin/leaderboard.html` (not linked from navigation)
  - Per-user exam counts and statistics
  - Detailed attempt history with timestamps
  - Authentication required (URL fragment or Firebase Auth)
  - Local audit logging of admin access attempts

- **Firebase Integration** - Optional Firebase/Firestore backend support
  - `assets/js/leaderboard-firebase.js` - Firebase integration module
  - `config/firebase.config.js.example` - Configuration template
  - Firestore security rules and Cloud Function examples in design doc

- **Documentation**
  - `docs/leaderboard-design.md` - Comprehensive design documentation
  - Data model specifications (Firestore and PostgreSQL)
  - API endpoint definitions
  - Security rules and best practices
  - Privacy considerations and data deletion procedures

- **Client-Side Leaderboard Module**
  - `assets/js/leaderboard.js` - Generic leaderboard helper
  - Works offline with sample data
  - Supports both Firebase and REST API backends
  - Username management with localStorage

### Security

- No secrets or API keys committed to repository
- Firebase configuration stored in gitignored files
- Firestore security rules provided for production deployment
- Admin access protected by authentication
- IP address hashing recommended for privacy
- Audit logging for admin access attempts

### Notes for Site Owners

To enable the leaderboard feature:
1. The pages are added but not linked in main navigation
2. To add navigation links, update `index.html` with links to `/pages/leaderboard.html`
3. For real-time data, configure Firebase per README instructions
4. Review security rules before production deployment
