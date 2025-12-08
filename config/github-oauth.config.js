/**
 * GitHub OAuth Configuration
 * 
 * This file contains the GitHub OAuth Client ID for admin page authentication.
 * The Client ID is safe to expose publicly as it's used for OAuth flow initiation.
 * 
 * SETUP INSTRUCTIONS:
 * 
 * 1. Create a GitHub OAuth App:
 *    - Go to: https://github.com/settings/developers
 *    - Click "OAuth Apps" → "New OAuth App"
 *    - Application name: StudyWithJesus Admin
 *    - Homepage URL: https://your-site.netlify.app (or your actual domain)
 *    - Authorization callback URL: https://your-site.netlify.app/.netlify/functions/github-oauth
 * 
 * 2. Get your Client ID:
 *    - After creating the app, copy the Client ID
 *    - Replace 'YOUR_GITHUB_CLIENT_ID_HERE' below with your actual Client ID
 * 
 * 3. Set up Netlify Environment Variables:
 *    - In your Netlify dashboard, set these environment variables:
 *    - GITHUB_CLIENT_SECRET: Your OAuth App Client Secret (NEVER commit this!)
 *    - ADMIN_GITHUB_USERNAME: Your GitHub username (e.g., 'StudyWithJesus')
 * 
 * For more details, see: docs/GITHUB_OAUTH_SETUP.md
 */

window.GITHUB_OAUTH_CONFIG = {
  // Replace this with your GitHub OAuth App Client ID
  // Example: 'Iv1.a1b2c3d4e5f6g7h8'
  clientId: '',
  
  // Optional: Set to true to enable debug logging
  debug: false
};

// Also set as global for compatibility with existing code
window.GITHUB_CLIENT_ID = window.GITHUB_OAUTH_CONFIG.clientId;

// Show helpful error message if not configured
if (!window.GITHUB_CLIENT_ID || window.GITHUB_CLIENT_ID === 'YOUR_GITHUB_CLIENT_ID_HERE') {
  console.warn('⚠️ GitHub OAuth Client ID not configured!');
  console.warn('📝 To fix this, edit config/github-oauth.config.js and set your Client ID');
  console.warn('📚 For setup instructions, see: docs/GITHUB_OAUTH_SETUP.md');
  console.warn('🔗 Create OAuth App at: https://github.com/settings/developers');
}
