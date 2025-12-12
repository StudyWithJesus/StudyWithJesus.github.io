/**
 * Avatar Utility - Generate and manage user profile pictures
 */
;(function(window) {
  'use strict';

  var AvatarUtil = {
    // Color palette for generated avatars
    colors: [
      '#667eea', '#764ba2', '#f093fb', '#4facfe',
      '#43e97b', '#fa709a', '#fee140', '#30cfd0',
      '#a8edea', '#fed6e3', '#c471f5', '#17ead9',
      '#6a11cb', '#ff6a00', '#ee0979', '#00c6ff'
    ],

    /**
     * Get avatar URL for a user
     * Returns custom URL or generates one from initials
     */
    getAvatarUrl: function(username) {
      // Check if user has a custom profile picture
      var customUrl = this.getCustomAvatarUrl();
      if (customUrl) {
        return customUrl;
      }

      // Generate avatar from initials
      return this.generateAvatarDataUrl(username);
    },

    /**
     * Get custom avatar URL from localStorage
     */
    getCustomAvatarUrl: function() {
      try {
        return localStorage.getItem('profile_picture_url') || null;
      } catch (e) {
        return null;
      }
    },

    /**
     * Set custom avatar URL in localStorage
     */
    setCustomAvatarUrl: function(url) {
      try {
        if (url && url.trim()) {
          localStorage.setItem('profile_picture_url', url.trim());
          return true;
        } else {
          localStorage.removeItem('profile_picture_url');
          return true;
        }
      } catch (e) {
        console.error('Failed to save profile picture URL:', e);
        return false;
      }
    },

    /**
     * Generate avatar data URL from username initials
     */
    generateAvatarDataUrl: function(username) {
      if (!username) username = 'Anonymous';

      // Get initials (max 2 characters)
      var initials = this.getInitials(username);

      // Get color based on username hash
      var color = this.getColorForUsername(username);

      // Generate SVG avatar
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">' +
                '<rect width="40" height="40" fill="' + color + '"/>' +
                '<text x="50%" y="50%" text-anchor="middle" dy=".35em" fill="white" font-family="Arial, sans-serif" font-size="16" font-weight="bold">' +
                initials +
                '</text>' +
                '</svg>';

      // Convert to data URL
      return 'data:image/svg+xml;base64,' + btoa(svg);
    },

    /**
     * Get initials from username
     */
    getInitials: function(username) {
      if (!username) return '?';

      // Remove special characters and split into words
      var words = username.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/);

      if (words.length === 0) return username.charAt(0).toUpperCase();

      if (words.length === 1) {
        // Single word - take first 2 characters
        return words[0].substring(0, 2).toUpperCase();
      }

      // Multiple words - take first character of first two words
      return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    },

    /**
     * Get consistent color for a username
     */
    getColorForUsername: function(username) {
      if (!username) return this.colors[0];

      // Simple hash function
      var hash = 0;
      for (var i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash; // Convert to 32bit integer
      }

      // Use hash to pick a color
      var index = Math.abs(hash) % this.colors.length;
      return this.colors[index];
    },

    /**
     * Validate image URL
     */
    isValidImageUrl: function(url) {
      if (!url || typeof url !== 'string') return false;

      // Check for data URLs first (they're valid but don't work with URL constructor)
      var isDataUrl = url.startsWith('data:image/');
      if (isDataUrl) return true;

      // Check if it's a valid URL
      try {
        var urlObj = new URL(url);

        // Check for common image extensions or trusted hosts
        var hasImageExtension = /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url);
        var isCommonImageHost = /^https?:\/\/(.*\.)?(imgur\.com|cloudinary\.com|googleusercontent\.com|githubusercontent\.com|gravatar\.com)/i.test(url);

        return hasImageExtension || isCommonImageHost;
      } catch (e) {
        return false;
      }
    },

    /**
     * Create avatar HTML element
     */
    createAvatarElement: function(username, size) {
      size = size || 32;
      var avatarUrl = this.getAvatarUrl(username);

      var img = document.createElement('img');
      img.src = avatarUrl;
      img.alt = username + ' avatar';
      img.className = 'user-avatar';
      img.style.width = size + 'px';
      img.style.height = size + 'px';
      img.style.borderRadius = '50%';
      img.style.objectFit = 'cover';

      // Error handling - fallback to generated avatar
      var self = this;
      img.onerror = function() {
        img.src = self.generateAvatarDataUrl(username);
      };

      return img;
    }
  };

  // Expose to window
  window.AvatarUtil = AvatarUtil;

})(window);
