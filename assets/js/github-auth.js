/**
 * GitHub OAuth Authentication Module
 * Handles GitHub-based authentication for admin pages
 * 
 * Usage:
 * <script src="/assets/js/github-auth.js"></script>
 * <script>
 *   GitHubAuth.requireAuth().then(user => {
 *     console.log('Authenticated as:', user.username);
 *     // Show admin content
 *   }).catch(err => {
 *     console.error('Auth failed:', err);
 *   });
 * </script>
 */

(function(window) {
  'use strict';

  const GitHubAuth = {
    /**
     * Configuration
     * Set GITHUB_CLIENT_ID in your HTML before loading this script:
     * <script>window.GITHUB_CLIENT_ID = 'your_client_id';</script>
     */
    getClientId: function() {
      return window.GITHUB_CLIENT_ID || '';
    },

    /**
     * Parse session token from URL or cookie
     */
    getSessionToken: function() {
      // Check URL parameter first
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('session');
      if (urlToken) {
        // Store in sessionStorage and clean URL
        sessionStorage.setItem('github_auth_session', urlToken);
        window.history.replaceState({}, document.title, window.location.pathname);
        return urlToken;
      }

      // Check sessionStorage
      const storedToken = sessionStorage.getItem('github_auth_session');
      if (storedToken) {
        return storedToken;
      }

      // Check cookie
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.startsWith('admin_session=')) {
          const token = cookie.substring('admin_session='.length);
          sessionStorage.setItem('github_auth_session', token);
          return token;
        }
      }

      return null;
    },

    /**
     * Decode and validate session token
     */
    decodeSession: function(token) {
      try {
        const decoded = JSON.parse(atob(token));
        
        // Check expiration
        if (decoded.expiresAt && decoded.expiresAt < Date.now()) {
          return null;
        }

        return {
          username: decoded.username,
          name: decoded.name,
          avatar: decoded.avatar,
          timestamp: decoded.timestamp
        };
      } catch (err) {
        console.error('Failed to decode session token:', err);
        return null;
      }
    },

    /**
     * Get current authenticated user
     */
    getCurrentUser: function() {
      const token = this.getSessionToken();
      if (!token) {
        return null;
      }
      return this.decodeSession(token);
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated: function() {
      return this.getCurrentUser() !== null;
    },

    /**
     * Initiate GitHub OAuth flow
     */
    login: function() {
      const clientId = this.getClientId();
      if (!clientId) {
        console.error('GitHub OAuth Client ID not configured');
        alert('GitHub OAuth is not configured. Please set GITHUB_CLIENT_ID.');
        return;
      }

      // Build OAuth URL
      const returnTo = encodeURIComponent(window.location.pathname);
      const redirectUri = `${window.location.origin}/.netlify/functions/github-oauth`;
      const state = Math.random().toString(36).substring(7);
      
      // Store state for CSRF protection
      sessionStorage.setItem('github_oauth_state', state);

      // Store callback URL for debugging
      sessionStorage.setItem('github_oauth_redirect_uri', redirectUri);

      const authUrl = `https://github.com/login/oauth/authorize?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=read:user&` +
        `state=${state}&` +
        `return_to=${returnTo}`;

      console.log('Starting OAuth flow with redirect URI:', redirectUri);
      console.log('Client ID:', clientId);
      
      window.location.href = authUrl;
    },

    /**
     * Logout user
     */
    logout: function() {
      sessionStorage.removeItem('github_auth_session');
      sessionStorage.removeItem('github_oauth_state');
      // Clear cookie
      document.cookie = 'admin_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      window.location.href = '/';
    },

    /**
     * Require authentication - redirect to login if not authenticated
     * Returns Promise that resolves with user object or rejects
     */
    requireAuth: function() {
      return new Promise((resolve, reject) => {
        const user = this.getCurrentUser();
        if (user) {
          resolve(user);
        } else {
          reject(new Error('Not authenticated'));
        }
      });
    },

    /**
     * Show authentication UI
     */
    showAuthUI: function(containerId) {
      const container = document.getElementById(containerId);
      if (!container) {
        console.error('Container not found:', containerId);
        return;
      }

      const user = this.getCurrentUser();
      if (user) {
        // Show authenticated state
        container.innerHTML = `
          <div style="display: flex; align-items: center; gap: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
            <img src="${user.avatar}" alt="${user.username}" style="width: 48px; height: 48px; border-radius: 50%;">
            <div style="flex: 1;">
              <div style="font-weight: 600; color: #333;">${user.name}</div>
              <div style="font-size: 0.9rem; color: #666;">@${user.username}</div>
            </div>
            <button onclick="GitHubAuth.logout()" style="padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer;">
              Logout
            </button>
          </div>
        `;
      } else {
        // Show login button
        container.innerHTML = `
          <div style="text-align: center; padding: 40px;">
            <h2>Admin Authentication Required</h2>
            <p style="color: #666; margin: 20px 0;">Please sign in with your GitHub account to access admin features.</p>
            <button onclick="GitHubAuth.login()" style="display: inline-flex; align-items: center; gap: 10px; padding: 12px 24px; background: #24292e; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">
              <svg width="20" height="20" viewBox="0 0 16 16" fill="white">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              Sign in with GitHub
            </button>
            <p style="font-size: 0.85rem; color: #999; margin-top: 20px;">
              Only authorized accounts can access admin features.
            </p>
          </div>
        `;
      }
    }
  };

  // Expose to global scope
  window.GitHubAuth = GitHubAuth;

})(window);
