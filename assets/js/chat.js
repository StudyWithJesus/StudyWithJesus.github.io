/**
 * Chat Module - Real-time chat functionality using Firebase
 * Displays a chat bubble icon in the bottom left with notification badge
 */
;(function(window) {
  'use strict';

  var Chat = {
    db: null,
    firebaseModules: null,
    isInitialized: false,
    unsubscribe: null,
    unsubscribeProfiles: null,
    unreadCount: 0,
    lastReadTimestamp: null,
    isOpen: false,
    messageLimit: 50, // Show last 50 messages
    isAdmin: false,
    userProfiles: {}, // Cache of user profile photos
    replyingTo: null, // Message being replied to

    /**
     * Initialize Firebase for chat
     */
    initialize: function() {
      if (this.isInitialized) {
        console.log('Chat: Already initialized');
        return Promise.resolve(true);
      }

      console.log('Chat: Starting initialization...');

      // Check if Firebase is configured (try both FIREBASE_CONFIG and FirebaseConfig)
      var firebaseConfig = window.FIREBASE_CONFIG || window.FirebaseConfig;
      if (!firebaseConfig) {
        console.error('Chat: Firebase config not found (checked FIREBASE_CONFIG and FirebaseConfig)');
        return Promise.resolve(false);
      }

      // Check if Firebase is enabled
      var isEnabled = window.LEADERBOARD_CONFIG && window.LEADERBOARD_CONFIG.firebaseEnabled;
      if (!isEnabled) {
        console.warn('Chat: Firebase not enabled in LEADERBOARD_CONFIG');
        return Promise.resolve(false);
      }

      // Check if Firebase SDK is loaded
      if (typeof firebase === 'undefined') {
        console.error('Chat: Firebase SDK not loaded. Make sure firebase scripts are included before chat.js');
        return Promise.resolve(false);
      }

      console.log('Chat: Firebase SDK found, apps.length =', firebase.apps.length);

      try {
        // Get or initialize Firebase app
        var app;
        if (firebase.apps.length) {
          app = firebase.app();
          console.log('Chat: Using existing Firebase app');
        } else {
          console.log('Chat: Initializing new Firebase app with config:', firebaseConfig);
          app = firebase.initializeApp(firebaseConfig);
        }

        // Get Firestore instance
        this.db = firebase.firestore();
        console.log('Chat: Firestore instance obtained');

        this.isInitialized = true;

        // Load last read timestamp from localStorage
        try {
          var stored = localStorage.getItem('chat_last_read');
          if (stored) {
            this.lastReadTimestamp = new Date(stored);
          }
        } catch (e) {
          console.warn('Chat: Could not load last read timestamp');
        }

        console.log('Chat: Firebase initialized successfully');

        // Check admin status
        this.checkAdminStatus();

        // Start listening to user profiles
        this.startProfilesListener();

        return Promise.resolve(true);
      } catch (error) {
        console.error('Chat: Failed to initialize Firebase:', error);
        console.error('Chat: Error details:', error.message, error.stack);
        return Promise.resolve(false);
      }
    },

    /**
     * Check if current user is admin
     */
    checkAdminStatus: async function() {
      var self = this;
      try {
        if (window.LeaderboardFirebase && typeof window.LeaderboardFirebase.isAdmin === 'function') {
          this.isAdmin = await window.LeaderboardFirebase.isAdmin();
          console.log('Chat: Admin status:', this.isAdmin);
          // Re-render messages to show/hide delete buttons
          if (this.isAdmin && this.currentMessages) {
            this.renderMessages(this.currentMessages);
          }
        }
      } catch (e) {
        console.warn('Chat: Could not check admin status:', e);
        this.isAdmin = false;
      }
    },

    /**
     * Start listening to user profiles for photos
     */
    startProfilesListener: function() {
      var self = this;

      if (!this.db) return;

      // Stop previous listener if exists
      if (this.unsubscribeProfiles) {
        this.unsubscribeProfiles();
      }

      try {
        this.unsubscribeProfiles = this.db.collection('user_profiles')
          .onSnapshot(function(snapshot) {
            snapshot.forEach(function(doc) {
              var data = doc.data();
              if (data.username && data.photoUrl) {
                self.userProfiles[data.username] = data.photoUrl;
              }
            });
            console.log('Chat: Loaded', Object.keys(self.userProfiles).length, 'user profiles');
            // Re-render messages to update photos
            if (self.isOpen && self.currentMessages) {
              self.renderMessages(self.currentMessages);
            }
          }, function(error) {
            console.warn('Chat: Error listening to profiles:', error);
          });
      } catch (e) {
        console.warn('Chat: Could not start profiles listener:', e);
      }
    },

    /**
     * Save user profile photo to Firebase
     */
    saveProfilePhoto: function(photoUrl) {
      var self = this;
      var username = this.getUsername();

      if (!this.db || !username || username === 'Anonymous') {
        return Promise.reject(new Error('Please set a username first'));
      }

      return this.db.collection('user_profiles').doc(username).set({
        username: username,
        photoUrl: photoUrl,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true }).then(function() {
        self.userProfiles[username] = photoUrl;
        console.log('Chat: Profile photo saved');
        return true;
      });
    },

    /**
     * Get profile photo URL for a user
     */
    getProfilePhoto: function(username) {
      // Check Firebase synced profiles first (only for this specific username)
      if (this.userProfiles && this.userProfiles[username]) {
        return this.userProfiles[username];
      }

      // Fallback to AvatarUtil or generated avatar
      if (typeof window.AvatarUtil !== 'undefined') {
        return window.AvatarUtil.getAvatarUrl(username);
      }

      // Generate unique avatar based on username with unique color
      var colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7', '#fa709a', '#fee140'];
      var colorIndex = 0;
      if (username) {
        for (var i = 0; i < username.length; i++) {
          colorIndex += username.charCodeAt(i);
        }
      }
      var bgColor = colors[colorIndex % colors.length];
      var initial = username ? username.charAt(0).toUpperCase() : '?';

      return 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="' + bgColor + '"/><text x="50%" y="50%" text-anchor="middle" dy=".35em" fill="white" font-family="Arial" font-size="14" font-weight="bold">' + initial + '</text></svg>');
    },

    /**
     * Get current username from localStorage
     */
    getUsername: function() {
      try {
        return localStorage.getItem('leaderboard_username') || 'Anonymous';
      } catch {
        return 'Anonymous';
      }
    },

    /**
     * Send a chat message
     */
    sendMessage: function(messageText) {
      var self = this;

      // First ensure we're initialized
      return this.initialize().then(function(initialized) {
        if (!initialized) {
          console.error('Chat: Cannot send message - initialization failed');
          throw new Error('Chat not initialized. Please refresh the page and try again.');
        }

        if (!messageText || typeof messageText !== 'string') {
          throw new Error('Invalid message');
        }

        messageText = messageText.trim();
        if (messageText.length === 0) {
          throw new Error('Message cannot be empty');
        }

        if (messageText.length > 500) {
          throw new Error('Message too long (max 500 characters)');
        }

        var username = self.getUsername();

        console.log('Chat: Sending message from', username);

        // Build message object
        var messageObj = {
          username: username,
          message: messageText,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          createdAt: new Date().toISOString()
        };

        // Add reply info if replying to a message
        if (self.replyingTo) {
          messageObj.replyTo = {
            id: self.replyingTo.id,
            username: self.replyingTo.username,
            message: self.replyingTo.message.substring(0, 100) // Preview
          };
          self.replyingTo = null;
          self.hideReplyPreview();
        }

        // Add message to Firestore
        return self.db.collection('messages').add(messageObj).then(function() {
          console.log('Chat: Message sent successfully');
          return true;
        });
      }).catch(function(error) {
        console.error('Chat: Failed to send message:', error);
        throw error;
      });
    },

    /**
     * Start listening for new messages
     */
    startListening: function(callback) {
      if (!this.isInitialized) {
        console.warn('Chat: Not initialized, cannot start listening');
        return;
      }

      // Stop previous listener if exists
      if (this.unsubscribe) {
        this.unsubscribe();
      }

      try {
        // Query last N messages ordered by timestamp
        var messagesRef = this.db.collection('messages');
        var q = messagesRef
          .orderBy('timestamp', 'desc')
          .limit(this.messageLimit);

        // Listen for real-time updates
        this.unsubscribe = q.onSnapshot(function(snapshot) {
          var messages = [];
          var newUnreadCount = 0;

          snapshot.forEach(function(doc) {
            var data = doc.data();
            var message = {
              id: doc.id,
              username: data.username,
              message: data.message,
              timestamp: data.timestamp ? data.timestamp.toDate() : new Date(data.createdAt),
              createdAt: data.createdAt,
              replyTo: data.replyTo || null
            };
            messages.push(message);

            // Count unread messages (newer than last read timestamp)
            if (Chat.lastReadTimestamp && message.timestamp > Chat.lastReadTimestamp && !Chat.isOpen) {
              newUnreadCount++;
            }
          });

          // Reverse to show oldest first
          messages.reverse();

          // Update unread count
          Chat.unreadCount = newUnreadCount;
          Chat.updateUnreadBadge();

          // Call callback with messages
          if (typeof callback === 'function') {
            callback(messages);
          }
        }, function(error) {
          console.error('Chat: Error listening to messages:', error);
        });
      } catch (error) {
        console.error('Chat: Failed to start listening:', error);
      }
    },

    /**
     * Stop listening for messages
     */
    stopListening: function() {
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }
    },

    /**
     * Delete a chat message (admin only)
     */
    deleteMessage: function(messageId) {
      var self = this;

      if (!this.isAdmin) {
        return Promise.reject(new Error('Admin access required'));
      }

      if (!confirm('⛔ Are you sure you want to delete this message?')) {
        return Promise.resolve(false);
      }

      return this.db.collection('messages').doc(messageId).delete()
        .then(function() {
          console.log('Chat: Message deleted:', messageId);
          return true;
        })
        .catch(function(error) {
          console.error('Chat: Failed to delete message:', error);
          throw error;
        });
    },

    /**
     * Set reply target for @mention
     */
    setReplyTo: function(message) {
      this.replyingTo = message;
      this.showReplyPreview(message);

      // Focus on input
      var input = document.getElementById('chat-message-input');
      if (input) {
        input.focus();
      }
    },

    /**
     * Show reply preview above input
     */
    showReplyPreview: function(message) {
      var preview = document.getElementById('chat-reply-preview');
      if (!preview) return;

      var previewText = document.getElementById('chat-reply-preview-text');
      if (previewText) {
        previewText.textContent = '@' + message.username + ': ' + message.message.substring(0, 50) + (message.message.length > 50 ? '...' : '');
      }

      preview.style.display = 'flex';
    },

    /**
     * Hide reply preview
     */
    hideReplyPreview: function() {
      this.replyingTo = null;
      var preview = document.getElementById('chat-reply-preview');
      if (preview) {
        preview.style.display = 'none';
      }
    },

    /**
     * Open settings modal
     */
    openSettings: function() {
      var modal = document.getElementById('chat-settings-modal');
      if (modal) {
        modal.style.display = 'flex';

        // Show current photo if exists
        var username = this.getUsername();
        var currentPhoto = this.getProfilePhoto(username);
        var previewImg = document.getElementById('chat-settings-photo-preview');
        if (previewImg) {
          previewImg.src = currentPhoto;
        }
      }
    },

    /**
     * Close settings modal
     */
    closeSettings: function() {
      var modal = document.getElementById('chat-settings-modal');
      if (modal) {
        modal.style.display = 'none';
      }
    },

    /**
     * Handle profile photo URL input
     */
    handlePhotoUrlSave: function() {
      var self = this;
      var input = document.getElementById('chat-settings-photo-url');
      if (!input) return;

      var photoUrl = input.value.trim();
      if (!photoUrl) {
        alert('Please enter a photo URL');
        return;
      }

      // Basic URL validation
      if (!photoUrl.startsWith('http://') && !photoUrl.startsWith('https://') && !photoUrl.startsWith('data:')) {
        alert('Please enter a valid URL starting with http:// or https://');
        return;
      }

      this.saveProfilePhoto(photoUrl)
        .then(function() {
          alert('✅ Profile photo saved!');
          self.closeSettings();
          // Update preview
          var previewImg = document.getElementById('chat-settings-photo-preview');
          if (previewImg) {
            previewImg.src = photoUrl;
          }
          // Re-render messages to show new photo
          if (self.currentMessages) {
            self.renderMessages(self.currentMessages);
          }
        })
        .catch(function(error) {
          alert('❌ Failed to save photo: ' + error.message);
        });
    },

    /**
     * Handle file upload for profile photo
     */
    handlePhotoUpload: function(file) {
      var self = this;

      if (!file) return;

      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Check file size (max 500KB for Firestore)
      if (file.size > 500000) {
        alert('Image too large. Please select an image under 500KB.');
        return;
      }

      var reader = new FileReader();
      reader.onload = function(e) {
        var base64 = e.target.result;

        // Update preview immediately
        var previewImg = document.getElementById('chat-settings-photo-preview');
        if (previewImg) {
          previewImg.src = base64;
        }

        // Also put in URL input
        var urlInput = document.getElementById('chat-settings-photo-url');
        if (urlInput) {
          urlInput.value = base64;
        }

        // Save to Firebase
        self.saveProfilePhoto(base64)
          .then(function() {
            alert('✅ Profile photo uploaded!');
            self.closeSettings();
            // Re-render messages to show new photo
            if (self.currentMessages) {
              self.renderMessages(self.currentMessages);
            }
          })
          .catch(function(error) {
            alert('❌ Failed to save photo: ' + error.message);
          });
      };
      reader.readAsDataURL(file);
    },

    /**
     * Mark all messages as read
     */
    markAsRead: function() {
      this.lastReadTimestamp = new Date();
      this.unreadCount = 0;
      try {
        localStorage.setItem('chat_last_read', this.lastReadTimestamp.toISOString());
      } catch (e) {
        console.warn('Chat: Failed to save last read timestamp');
      }
      this.updateUnreadBadge();
    },

    /**
     * Update unread badge on chat bubble
     */
    updateUnreadBadge: function() {
      var badge = document.getElementById('chat-unread-badge');
      if (badge) {
        if (this.unreadCount > 0) {
          badge.textContent = this.unreadCount > 9 ? '9+' : this.unreadCount;
          badge.style.display = 'flex';
        } else {
          badge.style.display = 'none';
        }
      }
    },

    /**
     * Toggle chat window open/closed
     */
    toggleChat: function() {
      var chatWindow = document.getElementById('chat-window');
      if (!chatWindow) return;

      if (this.isOpen) {
        this.closeChat();
      } else {
        this.openChat();
      }
    },

    /**
     * Open chat window
     */
    openChat: function() {
      var chatWindow = document.getElementById('chat-window');
      if (!chatWindow) return;

      chatWindow.classList.add('open');
      this.isOpen = true;
      this.markAsRead();

      // Re-check admin status when chat opens (in case auth wasn't ready at init)
      this.checkAdminStatus();

      // Focus on input
      var input = document.getElementById('chat-message-input');
      if (input) {
        setTimeout(function() {
          input.focus();
        }, 100);
      }

      // Scroll to bottom
      this.scrollToBottom();
    },

    /**
     * Close chat window
     */
    closeChat: function() {
      var chatWindow = document.getElementById('chat-window');
      if (!chatWindow) return;

      chatWindow.classList.remove('open');
      this.isOpen = false;
    },

    /**
     * Scroll chat messages to bottom
     */
    scrollToBottom: function() {
      var messagesContainer = document.getElementById('chat-messages');
      if (messagesContainer) {
        setTimeout(function() {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
      }
    },

    /**
     * Render messages in the chat window
     */
    renderMessages: function(messages) {
      var container = document.getElementById('chat-messages');
      if (!container) return;

      // Store messages for re-rendering when profiles update
      this.currentMessages = messages;

      var html = '';
      var currentUsername = this.getUsername();

      for (var i = 0; i < messages.length; i++) {
        var msg = messages[i];
        var isOwnMessage = msg.username === currentUsername;
        var messageClass = isOwnMessage ? 'chat-message-own' : 'chat-message-other';

        var timeStr = this.formatTimestamp(msg.timestamp);

        // Get avatar URL from Firebase-synced profiles
        var avatarUrl = this.getProfilePhoto(msg.username);

        html += '<div class="chat-message ' + messageClass + '" data-message-id="' + msg.id + '">';

        // Avatar
        html += '<img src="' + avatarUrl + '" alt="' + this.escapeHtml(msg.username) + '" class="chat-message-avatar" onerror="this.style.display=\'none\'">';

        // Message content
        html += '<div class="chat-message-content">';
        html += '<div class="chat-message-header">';
        html += '<span class="chat-message-username">' + this.escapeHtml(msg.username) + '</span>';
        html += '<span class="chat-message-time">' + timeStr + '</span>';

        // Action buttons
        html += '<span class="chat-message-actions">';
        // Reply button
        html += '<button class="chat-action-btn chat-reply-btn" data-msg-id="' + msg.id + '" data-msg-username="' + this.escapeHtml(msg.username) + '" data-msg-text="' + this.escapeHtml(msg.message) + '" title="Reply">↩</button>';
        // Admin delete button
        if (this.isAdmin) {
          html += '<button class="chat-action-btn chat-delete-btn" data-msg-id="' + msg.id + '" title="Delete message">⛔</button>';
        }
        html += '</span>';

        html += '</div>';

        // Reply preview if this is a reply
        if (msg.replyTo) {
          html += '<div class="chat-reply-quote">';
          html += '<span class="chat-reply-mention">@' + this.escapeHtml(msg.replyTo.username) + '</span> ';
          html += '<span class="chat-reply-text">' + this.escapeHtml(msg.replyTo.message) + '</span>';
          html += '</div>';
        }

        html += '<div class="chat-message-text">' + this.escapeHtml(msg.message) + '</div>';
        html += '</div>';

        html += '</div>';
      }

      if (html === '') {
        html = '<div class="chat-empty">No messages yet. Start the conversation!</div>';
      }

      container.innerHTML = html;

      // Add event listeners for action buttons
      this.attachMessageEventListeners();

      // Scroll to bottom if chat is open
      if (this.isOpen) {
        this.scrollToBottom();
      }
    },

    /**
     * Attach event listeners to message action buttons
     */
    attachMessageEventListeners: function() {
      var self = this;

      // Reply buttons
      var replyBtns = document.querySelectorAll('.chat-reply-btn');
      for (var i = 0; i < replyBtns.length; i++) {
        replyBtns[i].addEventListener('click', function(e) {
          e.stopPropagation();
          var btn = e.target;
          var msg = {
            id: btn.getAttribute('data-msg-id'),
            username: btn.getAttribute('data-msg-username'),
            message: btn.getAttribute('data-msg-text')
          };
          self.setReplyTo(msg);
        });
      }

      // Delete buttons (admin only)
      if (this.isAdmin) {
        var deleteBtns = document.querySelectorAll('.chat-delete-btn');
        for (var j = 0; j < deleteBtns.length; j++) {
          deleteBtns[j].addEventListener('click', function(e) {
            e.stopPropagation();
            var msgId = e.target.getAttribute('data-msg-id');
            self.deleteMessage(msgId).catch(function(error) {
              alert('❌ ' + error.message);
            });
          });
        }
      }
    },

    /**
     * Format timestamp for display
     */
    formatTimestamp: function(timestamp) {
      if (!timestamp) return '';

      var now = new Date();
      var diff = now - timestamp;

      // Less than 1 minute
      if (diff < 60000) {
        return 'Just now';
      }

      // Less than 1 hour
      if (diff < 3600000) {
        var mins = Math.floor(diff / 60000);
        return mins + 'm ago';
      }

      // Less than 24 hours
      if (diff < 86400000) {
        var hours = Math.floor(diff / 3600000);
        return hours + 'h ago';
      }

      // Less than 7 days
      if (diff < 604800000) {
        var days = Math.floor(diff / 86400000);
        return days + 'd ago';
      }

      // Format as date
      var month = timestamp.getMonth() + 1;
      var day = timestamp.getDate();
      return month + '/' + day;
    },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml: function(text) {
      var div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    /**
     * Initialize chat UI
     */
    initUI: function() {
      console.log('Chat: Initializing UI...');
      var self = this;

      // Create chat HTML if it doesn't exist
      if (!document.getElementById('chat-container')) {
        console.log('Chat: Creating chat HTML elements');
        this.createChatHTML();
      }

      // Set up event listeners
      var chatBubble = document.getElementById('chat-bubble');
      if (chatBubble) {
        console.log('Chat: Setting up event listeners');
        chatBubble.addEventListener('click', function() {
          self.toggleChat();
        });
      } else {
        console.error('Chat: Could not find chat-bubble element');
      }

      var closeBtn = document.getElementById('chat-close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', function() {
          self.closeChat();
        });
      }

      // Settings button
      var settingsBtn = document.getElementById('chat-settings-btn');
      if (settingsBtn) {
        settingsBtn.addEventListener('click', function() {
          self.openSettings();
        });
      }

      // Settings modal close
      var settingsClose = document.getElementById('chat-settings-close');
      if (settingsClose) {
        settingsClose.addEventListener('click', function() {
          self.closeSettings();
        });
      }

      // Settings save button
      var settingsSave = document.getElementById('chat-settings-save');
      if (settingsSave) {
        settingsSave.addEventListener('click', function() {
          self.handlePhotoUrlSave();
        });
      }

      // File upload input
      var fileInput = document.getElementById('chat-settings-photo-file');
      if (fileInput) {
        fileInput.addEventListener('change', function(e) {
          if (e.target.files && e.target.files[0]) {
            self.handlePhotoUpload(e.target.files[0]);
          }
        });
      }

      // Settings modal backdrop click
      var settingsModal = document.getElementById('chat-settings-modal');
      if (settingsModal) {
        settingsModal.addEventListener('click', function(e) {
          if (e.target === settingsModal) {
            self.closeSettings();
          }
        });
      }

      // Reply cancel button
      var replyCancel = document.getElementById('chat-reply-cancel');
      if (replyCancel) {
        replyCancel.addEventListener('click', function() {
          self.hideReplyPreview();
        });
      }

      var sendBtn = document.getElementById('chat-send-btn');
      var messageInput = document.getElementById('chat-message-input');

      if (sendBtn && messageInput) {
        sendBtn.addEventListener('click', function() {
          self.handleSendMessage();
        });

        messageInput.addEventListener('keypress', function(e) {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            self.handleSendMessage();
          }
        });
      }

      // Initialize Firebase and start listening
      this.initialize().then(function(success) {
        if (success) {
          console.log('Chat: Starting message listener');
          self.startListening(function(messages) {
            self.renderMessages(messages);
          });
        }
      });
    },

    /**
     * Handle sending a message
     */
    handleSendMessage: function() {
      var input = document.getElementById('chat-message-input');
      if (!input) return;

      var messageText = input.value.trim();
      if (!messageText) return;

      var self = this;
      this.sendMessage(messageText)
        .then(function() {
          input.value = '';
          self.scrollToBottom();
        })
        .catch(function(error) {
          alert('Failed to send message: ' + error.message);
        });
    },

    /**
     * Create chat HTML elements
     */
    createChatHTML: function() {
      var chatHTML = '';

      // Start container
      chatHTML += '<div id="chat-container">';

      // Chat bubble button
      chatHTML += '<button id="chat-bubble" class="chat-bubble" aria-label="Open chat">';
      chatHTML += '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
      chatHTML += '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>';
      chatHTML += '</svg>';
      chatHTML += '<span id="chat-unread-badge" class="chat-unread-badge">0</span>';
      chatHTML += '</button>';

      // Chat window
      chatHTML += '<div id="chat-window" class="chat-window">';

      // Chat header
      chatHTML += '<div class="chat-header">';
      chatHTML += '<h3>Community Chat</h3>';
      chatHTML += '<div class="chat-header-actions">';
      chatHTML += '<button id="chat-settings-btn" class="chat-settings-btn" aria-label="Settings" title="Profile Settings">⚙️</button>';
      chatHTML += '<button id="chat-close-btn" class="chat-close-btn" aria-label="Close chat">&times;</button>';
      chatHTML += '</div>';
      chatHTML += '</div>';

      // Messages container
      chatHTML += '<div id="chat-messages" class="chat-messages"></div>';

      // Reply preview (hidden by default)
      chatHTML += '<div id="chat-reply-preview" class="chat-reply-preview" style="display: none;">';
      chatHTML += '<span id="chat-reply-preview-text"></span>';
      chatHTML += '<button id="chat-reply-cancel" class="chat-reply-cancel" aria-label="Cancel reply">&times;</button>';
      chatHTML += '</div>';

      // Input container
      chatHTML += '<div class="chat-input-container">';
      chatHTML += '<input type="text" id="chat-message-input" class="chat-input" placeholder="Type a message..." maxlength="500" autocomplete="off">';
      chatHTML += '<button id="chat-send-btn" class="chat-send-btn" aria-label="Send message">';
      chatHTML += '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
      chatHTML += '<line x1="22" y1="2" x2="11" y2="13"></line>';
      chatHTML += '<polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>';
      chatHTML += '</svg>';
      chatHTML += '</button>';
      chatHTML += '</div>';

      // Close chat window
      chatHTML += '</div>';

      // Close container
      chatHTML += '</div>';

      // Settings modal
      chatHTML += '<div id="chat-settings-modal" class="chat-settings-modal">';
      chatHTML += '<div class="chat-settings-content">';
      chatHTML += '<div class="chat-settings-header">';
      chatHTML += '<h3>⚙️ Profile Settings</h3>';
      chatHTML += '<button id="chat-settings-close" class="chat-settings-close">&times;</button>';
      chatHTML += '</div>';
      chatHTML += '<div class="chat-settings-body">';
      chatHTML += '<div class="chat-settings-photo-section">';
      chatHTML += '<label>Profile Photo</label>';
      chatHTML += '<img id="chat-settings-photo-preview" class="chat-settings-photo-preview" src="" alt="Profile preview">';
      chatHTML += '<div class="chat-settings-upload-section">';
      chatHTML += '<label class="chat-settings-upload-btn">';
      chatHTML += '<input type="file" id="chat-settings-photo-file" accept="image/*" style="display: none;">';
      chatHTML += '📷 Upload Photo';
      chatHTML += '</label>';
      chatHTML += '<span class="chat-settings-or">or</span>';
      chatHTML += '</div>';
      chatHTML += '<input type="text" id="chat-settings-photo-url" class="chat-settings-input" placeholder="Enter image URL (https://...)">';
      chatHTML += '<p class="chat-settings-hint">Upload a photo (max 500KB) or paste an image URL</p>';
      chatHTML += '<button id="chat-settings-save" class="chat-settings-save">Save URL</button>';
      chatHTML += '</div>';
      chatHTML += '</div>';
      chatHTML += '</div>';
      chatHTML += '</div>';

      // Create a temporary container and set innerHTML
      var tempContainer = document.createElement('div');
      tempContainer.innerHTML = chatHTML;

      // Append ALL children to body (chat-container and settings modal)
      while (tempContainer.firstChild) {
        document.body.appendChild(tempContainer.firstChild);
      }

      console.log('Chat: HTML elements created and appended to body');
    }
  };

  // Helper function to wait for Firebase to load
  function waitForFirebase(callback, attempts) {
    attempts = attempts || 0;
    var maxAttempts = 20; // Try for up to 2 seconds (20 * 100ms)

    if (typeof firebase !== 'undefined') {
      console.log('Chat: Firebase SDK is ready');
      callback();
    } else if (attempts < maxAttempts) {
      console.log('Chat: Waiting for Firebase SDK... attempt', attempts + 1);
      setTimeout(function() {
        waitForFirebase(callback, attempts + 1);
      }, 100);
    } else {
      console.error('Chat: Firebase SDK did not load after', maxAttempts, 'attempts');
      // Still initialize UI so the bubble appears, even if Firebase isn't available
      callback();
    }
  }

  // Initialize chat when DOM is ready and Firebase is loaded
  function initializeChat() {
    console.log('Chat: Starting initialization sequence...');
    waitForFirebase(function() {
      Chat.initUI();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      console.log('Chat: DOM loaded, waiting for Firebase...');
      initializeChat();
    });
  } else {
    console.log('Chat: DOM already loaded, waiting for Firebase...');
    // Add a small delay to ensure all scripts have had time to execute
    setTimeout(initializeChat, 100);
  }

  // Expose to window
  window.Chat = Chat;

})(window);
