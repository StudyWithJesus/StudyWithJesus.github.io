/**
 * GitHub OAuth Configuration
 * 
 * This file contains the GitHub OAuth Client ID for admin page authentication.
 * The Client ID is safe to expose publicly as it's used for OAuth flow initiation.
 * 
 * SETUP INSTRUCTIONS FOR GITHUB PAGES:
 * 
 * GitHub Pages deployments MUST use Firebase Authentication with GitHub provider.
 * See FIREBASE_GITHUB_AUTH_SETUP.md for complete setup instructions.
 * 
 * 1. Set up Firebase Authentication:
 *    - Enable GitHub provider in Firebase Console
 *    - Configure Firebase config in config/firebase.config.js
 *    - Set Authorization callback URL to: https://studywithjesus.firebaseapp.com/__/auth/handler
 * 
 * 2. (Optional) For Netlify deployments:
 *    - You can create a separate GitHub OAuth App with Netlify callback
 *    - Authorization callback URL: https://your-site.netlify.app/.netlify/functions/github-oauth
 *    - Set GITHUB_CLIENT_SECRET and ADMIN_GITHUB_USERNAME as environment variables
 * 
 * SECURITY NOTE:
 * - The Client ID below is safe to commit to version control
 * - NEVER commit Client Secrets - use environment variables only
 * 
 * For more details, see: FIREBASE_GITHUB_AUTH_SETUP.md
 */

window.GITHUB_OAUTH_CONFIG = {
  // Replace this with your GitHub OAuth App Client ID
  // Example: 'Iv1.a1b2c3d4e5f6g7h8'
  clientId: 'Ov23liWrCTAIplgEUl3P',
  
  // Optional: Set to true to enable debug logging
  debug: false
};

// Also set as global for compatibility with existing code
window.GITHUB_CLIENT_ID = window.GITHUB_OAUTH_CONFIG.clientId;

// Show helpful error message if not configured
if (!window.GITHUB_CLIENT_ID) {
  console.warn('⚠️ GitHub OAuth Client ID not configured!');
  console.warn('📝 To fix this, edit config/github-oauth.config.js and set your Client ID');
  console.warn('📚 For setup instructions, see: docs/GITHUB_OAUTH_SETUP.md');
  console.warn('🔗 Create OAuth App at: https://github.com/settings/developers');
}
