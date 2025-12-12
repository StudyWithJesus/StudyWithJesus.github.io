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
    initialize: async function() {
      if (this.isInitialized) {
        return true;
      }

      // Check if Firebase is configured
      if (typeof window.FirebaseConfig === 'undefined' || !window.FirebaseConfig.enabled) {
        console.warn('Firebase not configured for chat');
        return false;
      }

      try {
        // Wait for Firebase to be loaded
        if (typeof firebase === 'undefined') {
          console.error('Firebase SDK not loaded');
          return false;
        }

        // Initialize Firebase if not already done
        if (!firebase.apps.length) {
          firebase.initializeApp(window.FirebaseConfig);
        }

        this.db = firebase.firestore();
        this.firebaseModules = {
          collection: firebase.firestore.collection,
          addDoc: firebase.firestore.addDoc,
          query: firebase.firestore.query,
          orderBy: firebase.firestore.orderBy,
          limit: firebase.firestore.limit,
          onSnapshot: firebase.firestore.onSnapshot,
          serverTimestamp: firebase.firestore.FieldValue.serverTimestamp
        };

        this.isInitialized = true;

        // Load last read timestamp from localStorage
        var stored = localStorage.getItem('chat_last_read');
        if (stored) {
          this.lastReadTimestamp = new Date(stored);
        }

        return true;
      } catch (error) {
        console.error('Failed to initialize chat:', error);
        return false;
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
    sendMessage: async function(messageText) {
      if (!await this.initialize()) {
        throw new Error('Chat not initialized');
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

      var username = this.getUsername();

      try {
        // Add message to Firestore
        await this.db.collection('messages').add({
          username: username,
          message: messageText,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          createdAt: new Date().toISOString()
        });

        return true;
      } catch (error) {
        console.error('Failed to send message:', error);
        throw error;
      }
    },

    /**
     * Start listening for new messages
     */
    startListening: function(callback) {
      if (!this.isInitialized) {
        console.warn('Chat not initialized, cannot start listening');
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
          console.error('Error listening to messages:', error);
        });
      } catch (error) {
        console.error('Failed to start listening:', error);
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
        console.warn('Failed to save last read timestamp');
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

        html += '<div class="chat-message ' + messageClass + '">';
        html += '<div class="chat-message-header">';
        html += '<span class="chat-message-username">' + this.escapeHtml(msg.username) + '</span>';
        html += '<span class="chat-message-time">' + timeStr + '</span>';
        html += '</div>';
        html += '<div class="chat-message-text">' + this.escapeHtml(msg.message) + '</div>';
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
      var self = this;

      // Create chat HTML if it doesn't exist
      if (!document.getElementById('chat-container')) {
        this.createChatHTML();
      }

      // Set up event listeners
      var chatBubble = document.getElementById('chat-bubble');
      if (chatBubble) {
        chatBubble.addEventListener('click', function() {
          self.toggleChat();
        });
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
      var chatHTML = `
        <div id="chat-container">
          <!-- Chat bubble button -->
          <button id="chat-bubble" class="chat-bubble" aria-label="Open chat">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span id="chat-unread-badge" class="chat-unread-badge">0</span>
          </button>

          <!-- Chat window -->
          <div id="chat-window" class="chat-window">
            <div class="chat-header">
              <h3>Community Chat</h3>
              <button id="chat-close-btn" class="chat-close-btn" aria-label="Close chat">×</button>
            </div>
            <div id="chat-messages" class="chat-messages"></div>
            <div class="chat-input-container">
              <input type="text" id="chat-message-input" class="chat-input" placeholder="Type a message..." maxlength="500" autocomplete="off">
              <button id="chat-send-btn" class="chat-send-btn" aria-label="Send message">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
          </div>
        </div>
      `;

      // Append to body
      var container = document.createElement('div');
      container.innerHTML = chatHTML;
      document.body.appendChild(container.firstElementChild);
    }
  };

  // Initialize chat when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      Chat.initUI();
    });
  } else {
    Chat.initUI();
  }

  // Expose to window
  window.Chat = Chat;

})(window);
