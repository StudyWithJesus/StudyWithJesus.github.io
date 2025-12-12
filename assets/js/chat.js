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
    unreadCount: 0,
    lastReadTimestamp: null,
    isOpen: false,
    messageLimit: 50, // Show last 50 messages

    /**
     * Initialize Firebase for chat
     */
    initialize: function() {
      if (this.isInitialized) {
        console.log('Chat: Already initialized');
        return Promise.resolve(true);
      }

      console.log('Chat: Starting initialization...');

      // Check if Firebase is configured
      if (typeof window.FirebaseConfig === 'undefined') {
        console.error('Chat: FirebaseConfig not found');
        return Promise.resolve(false);
      }

      if (!window.FirebaseConfig.enabled) {
        console.warn('Chat: Firebase not enabled in config');
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
          console.log('Chat: Initializing new Firebase app with config:', window.FirebaseConfig);
          app = firebase.initializeApp(window.FirebaseConfig);
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
        return Promise.resolve(true);
      } catch (error) {
        console.error('Chat: Failed to initialize Firebase:', error);
        console.error('Chat: Error details:', error.message, error.stack);
        return Promise.resolve(false);
      }
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

        // Add message to Firestore
        return self.db.collection('messages').add({
          username: username,
          message: messageText,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          createdAt: new Date().toISOString()
        }).then(function() {
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
              createdAt: data.createdAt
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

      var html = '';
      var currentUsername = this.getUsername();

      for (var i = 0; i < messages.length; i++) {
        var msg = messages[i];
        var isOwnMessage = msg.username === currentUsername;
        var messageClass = isOwnMessage ? 'chat-message-own' : 'chat-message-other';

        var timeStr = this.formatTimestamp(msg.timestamp);

        // Get avatar URL (uses AvatarUtil if available)
        var avatarUrl;
        if (typeof window.AvatarUtil !== 'undefined') {
          avatarUrl = window.AvatarUtil.getAvatarUrl(msg.username);
        } else {
          // Fallback: generate simple data URL
          avatarUrl = 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#667eea"/><text x="50%" y="50%" text-anchor="middle" dy=".35em" fill="white" font-family="Arial" font-size="14" font-weight="bold">' + msg.username.charAt(0).toUpperCase() + '</text></svg>');
        }

        html += '<div class="chat-message ' + messageClass + '">';

        // Avatar
        html += '<img src="' + avatarUrl + '" alt="' + this.escapeHtml(msg.username) + '" class="chat-message-avatar" onerror="this.style.display=\'none\'">';

        // Message content
        html += '<div class="chat-message-content">';
        html += '<div class="chat-message-header">';
        html += '<span class="chat-message-username">' + this.escapeHtml(msg.username) + '</span>';
        html += '<span class="chat-message-time">' + timeStr + '</span>';
        html += '</div>';
        html += '<div class="chat-message-text">' + this.escapeHtml(msg.message) + '</div>';
        html += '</div>';

        html += '</div>';
      }

      if (html === '') {
        html = '<div class="chat-empty">No messages yet. Start the conversation!</div>';
      }

      container.innerHTML = html;

      // Scroll to bottom if chat is open
      if (this.isOpen) {
        this.scrollToBottom();
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
      chatHTML += '<button id="chat-close-btn" class="chat-close-btn" aria-label="Close chat">&times;</button>';
      chatHTML += '</div>';

      // Messages container
      chatHTML += '<div id="chat-messages" class="chat-messages"></div>';

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

      // Create a temporary container and set innerHTML
      var tempContainer = document.createElement('div');
      tempContainer.innerHTML = chatHTML;

      // Append the first child (chat-container) to body
      var chatContainer = tempContainer.firstChild;
      document.body.appendChild(chatContainer);

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
