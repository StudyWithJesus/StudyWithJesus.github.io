/**
 * GitHub OAuth Authentication Module
 * Handles GitHub-based authentication for admin pages using Firebase Authentication
 * 
 * This module now uses Firebase Authentication with GitHub provider,
 * which works on GitHub Pages without requiring serverless functions.
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

  let firebaseAuth = null;
  let firebaseInitialized = false;
  let currentFirebaseUser = null;
  let authStateReady = null; // Promise that resolves when initial auth state is known
  let authStateUnsubscribe = null; // Unsubscribe function for auth state listener

  const GitHubAuth = {
    /**
     * Initialize Firebase Auth
     */
    initFirebase: async function() {
      if (firebaseInitialized) {
        return true;
      }

      // Check if Firebase is configured
      if (!window.FIREBASE_CONFIG) {
        console.warn('Firebase not configured');
        return false;
      }

      try {
        // Import Firebase modules
        const { initializeApp, getApps, getApp } = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js');
        const { getAuth, signInWithPopup, signOut: firebaseSignOut, onAuthStateChanged, GithubAuthProvider } = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js');

        // Initialize Firebase if not already initialized
        if (getApps().length === 0) {
          initializeApp(window.FIREBASE_CONFIG);
        }

        firebaseAuth = getAuth();
        
        // Create a promise that resolves when initial auth state is known
        // Only set up the listener once
        // Note: authStateUnsubscribe is stored but not called - the auth listener
        // should remain active for the application lifetime to track sign-in/sign-out events
        if (!authStateReady) {
          authStateReady = new Promise((resolve) => {
            // Listen for auth state changes
            authStateUnsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
              currentFirebaseUser = user;
              if (user) {
                console.log('Firebase auth state: signed in as', user.displayName || user.email);
              } else {
                console.log('Firebase auth state: signed out');
              }
              // Resolve the promise on first auth state change (initial state is known)
              resolve(user);
              // Note: We keep listening for future auth state changes, we just resolve once
            });
          });
        }

        firebaseInitialized = true;
        console.info('Firebase Auth initialized successfully');
        return true;
      } catch (error) {
        console.error('Failed to initialize Firebase Auth:', error);
        return false;
      }
    },

    /**
     * Get current authenticated user from Firebase
     */
    getCurrentUser: async function() {
      // Try Firebase Auth first
      if (await this.initFirebase()) {
        // Wait for initial auth state to be known
        if (authStateReady) {
          await authStateReady;
        }
        
        if (currentFirebaseUser) {
          return {
            username: currentFirebaseUser.reloadUserInfo?.screenName || currentFirebaseUser.displayName || 'user',
            name: currentFirebaseUser.displayName || 'User',
            avatar: currentFirebaseUser.photoURL || '',
            email: currentFirebaseUser.email,
            uid: currentFirebaseUser.uid
          };
        }
      }

      // No Firebase user found
      return null;
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated: async function() {
      const user = await this.getCurrentUser();
      return user !== null;
    },

    /**
     * Initiate GitHub sign-in via Firebase
     */
    login: async function() {
      // Try Firebase Auth first
      if (await this.initFirebase()) {
        try {
          const { signInWithPopup, GithubAuthProvider } = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js');
          const provider = new GithubAuthProvider();
          
          // Request additional scopes if needed
          provider.addScope('read:user');
          
          const result = await signInWithPopup(firebaseAuth, provider);
          console.log('Successfully signed in via Firebase:', result.user.displayName);
          
          // Update currentFirebaseUser immediately
          currentFirebaseUser = result.user;
          
          // Trigger a custom event to notify the page that login succeeded
          window.dispatchEvent(new CustomEvent('githubauth:login', { detail: { user: result.user } }));
          
          return;
        } catch (error) {
          console.error('Firebase GitHub sign-in failed:', error);
          
          // If user closed the popup, don't show error
          if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
            console.log('Sign-in cancelled by user');
            return;
          }
          
          alert('Failed to sign in with GitHub: ' + (error.message || 'Unknown error'));
          return;
        }
      }

      // Firebase initialization failed - cannot authenticate
      console.error('GitHub OAuth: Firebase not configured');
      alert('Authentication is not configured. Please configure Firebase Authentication with the GitHub provider. See the FIREBASE_SETUP_GUIDE.md file in the repository root.');
      return;
    },

    /**
     * Logout user
     */
    logout: async function() {
      // Sign out from Firebase if initialized
      if (firebaseInitialized && firebaseAuth && currentFirebaseUser) {
        try {
          const { signOut: firebaseSignOut } = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js');
          await firebaseSignOut(firebaseAuth);
          console.log('Signed out from Firebase');
        } catch (error) {
          console.error('Firebase sign out failed:', error);
        }
      }
      
      // Redirect to home
      window.location.href = '/';
    },

    /**
     * Require authentication - redirect to login if not authenticated
     * Returns Promise that resolves with user object or rejects
     */
    requireAuth: async function() {
      const user = await this.getCurrentUser();
      if (user) {
        return user;
      } else {
        throw new Error('Not authenticated');
      }
    },

    /**
     * Show authentication UI
     */
    showAuthUI: async function(containerId) {
      const container = document.getElementById(containerId);
      if (!container) {
        console.error('Container not found:', containerId);
        return;
      }

      const user = await this.getCurrentUser();
      if (user) {
        // Show authenticated state
        container.innerHTML = `
          <div style="display: flex; align-items: center; gap: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
            <img src="${user.avatar || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2248%22 height=%2248%22><circle cx=%2224%22 cy=%2224%22 r=%2224%22 fill=%22%23ccc%22/></svg>'}" alt="${user.username}" style="width: 48px; height: 48px; border-radius: 50%;">
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
    },


  };

  // Expose to global scope
  window.GitHubAuth = GitHubAuth;

})(window);
