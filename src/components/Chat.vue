/**
 * Chat Component
 * Veylora - Connect • Create • Share
 */

<template>
  <div class="chat-container">
    <!-- Header -->
    <div class="chat-header">
      <div class="header-info">
        <img :src="conversation?.avatar" :alt="conversation?.name" class="avatar">
        <div class="info">
          <h2>{{ conversation?.name }}</h2>
          <p class="status" :class="{ online: isUserOnline }">
            {{ isUserOnline ? 'Online' : 'Offline' }}
          </p>
        </div>
      </div>
      <div class="header-actions">
        <button @click="startCall" class="call-btn" title="Voice Call">
          <i class="icon-phone"></i>
        </button>
        <button @click="startVideoCall" class="call-btn" title="Video Call">
          <i class="icon-video"></i>
        </button>
        <button @click="openOptions" class="options-btn">
          <i class="icon-more"></i>
        </button>
      </div>
    </div>

    <!-- Messages List -->
    <div class="messages-container" ref="messagesContainer">
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>Loading messages...</p>
      </div>
      <div v-else-if="messages.length === 0" class="empty-state">
        <i class="icon-chat"></i>
        <p>No messages yet. Start a conversation!</p>
      </div>
      <div v-else class="messages-list">
        <div
          v-for="(message, index) in messages"
          :key="message.id"
          class="message-group"
          :class="{ sent: message.senderId === currentUserId }"
        >
          <!-- Date separator -->
          <div
            v-if="shouldShowDateSeparator(index)"
            class="date-separator"
          >
            {{ formatDate(message.timestamp) }}
          </div>

          <!-- Message -->
          <div class="message" @mouseenter="hoveredMessageId = message.id" @mouseleave="hoveredMessageId = null">
            <img
              v-if="message.senderId !== currentUserId"
              :src="message.sender?.avatar"
              :alt="message.sender?.name"
              class="message-avatar"
            >
            <div class="message-content">
              <p v-if="message.senderId !== currentUserId" class="sender-name">
                {{ message.sender?.name }}
              </p>
              <div class="message-bubble" :class="{ edited: message.edited }">
                {{ message.content }}
                <span v-if="message.attachments?.length" class="attachments-indicator">
                  📎 {{ message.attachments.length }}
                </span>
              </div>
              <p class="message-time">{{ formatTime(message.timestamp) }}</p>
            </div>
            <div
              v-if="hoveredMessageId === message.id"
              class="message-actions"
            >
              <button @click="reactToMessage(message.id, '👍')" title="Like">👍</button>
              <button @click="editMessage(message)" title="Edit">✏️</button>
              <button @click="deleteMessage(message.id)" title="Delete">🗑️</button>
            </div>
          </div>

          <!-- Typing indicator -->
          <div v-if="typingUsers.length > 0" class="typing-indicator">
            <span>{{ typingUsers.join(', ') }} {{ typingUsers.length === 1 ? 'is' : 'are' }} typing...</span>
            <div class="dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Input Area -->
    <div class="chat-input-area">
      <div v-if="editingMessage" class="editing-banner">
        <span>Editing: {{ editingMessage.content }}</span>
        <button @click="cancelEdit" class="cancel-btn">Cancel</button>
      </div>

      <div class="input-container">
        <button @click="attachFile" class="attach-btn" title="Attach File">
          <i class="icon-attachment"></i>
        </button>
        <input
          ref="fileInput"
          type="file"
          @change="handleFileSelect"
          style="display: none"
          multiple
        >
        <textarea
          v-model="messageInput"
          @keydown.enter.ctrl="sendMessage"
          @keydown.enter.exact="handleEnter"
          @input="handleTyping"
          placeholder="Type a message..."
          class="message-input"
          rows="1"
        ></textarea>
        <button
          @click="sendMessage"
          :disabled="!messageInput.trim() && selectedFiles.length === 0"
          class="send-btn"
          title="Send Message"
        >
          <i class="icon-send"></i>
        </button>
      </div>

      <!-- Selected files preview -->
      <div v-if="selectedFiles.length > 0" class="files-preview">
        <div v-for="(file, index) in selectedFiles" :key="index" class="file-item">
          <span>{{ file.name }}</span>
          <button @click="removeFile(index)" class="remove-btn">✕</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { formatDate, formatTime } from '@/utils/formatting.js';
import { getMessages, sendMessage as apiSendMessage } from '@/api.js';
import { emitMessage, emitTyping } from '@/socket.js';
import * as storage from '@/offline/storage.js';

export default {
  name: 'Chat',
  props: {
    conversationId: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      messages: [],
      messageInput: '',
      loading: false,
      conversation: null,
      currentUserId: null,
      selectedFiles: [],
      hoveredMessageId: null,
      editingMessage: null,
      typingUsers: [],
      isUserOnline: false,
      typingTimeout: null
    };
  },
  computed: {
    sortedMessages() {
      return [...this.messages].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }
  },
  methods: {
    async loadMessages() {
      this.loading = true;
      try {
        const response = await getMessages(this.conversationId, 1, 50);
        this.messages = response.data || [];
        this.$nextTick(() => {
          this.scrollToBottom();
        });
      } catch (error) {
        console.error('Error loading messages:', error);
        // Try to load from offline storage
        const offlineMessages = await storage.getPendingMessages(this.conversationId);
        this.messages = offlineMessages;
      } finally {
        this.loading = false;
      }
    },
    async sendMessage() {
      if (!this.messageInput.trim() && this.selectedFiles.length === 0) return;

      const messageContent = this.messageInput.trim();
      this.messageInput = '';

      try {
        if (this.editingMessage) {
          // Handle edit
          // await updateMessage(this.conversationId, this.editingMessage.id, messageContent);
          this.editingMessage = null;
        } else {
          // Send new message
          const attachments = this.selectedFiles.map(f => ({ name: f.name, size: f.size }));
          
          // Try to send via socket if connected
          emitMessage(this.conversationId, messageContent);
          
          // Also save to API and handle files
          await apiSendMessage(this.conversationId, messageContent, attachments);
          
          // Add to local messages
          this.messages.push({
            id: Date.now().toString(),
            content: messageContent,
            senderId: this.currentUserId,
            timestamp: new Date().toISOString(),
            attachments
          });

          this.selectedFiles = [];
          this.$nextTick(() => {
            this.scrollToBottom();
          });
        }
      } catch (error) {
        console.error('Error sending message:', error);
        // Save to offline storage
        await storage.addPendingMessage(this.conversationId, messageContent);
      }
    },
    handleEnter(event) {
      if (event.shiftKey) {
        // Allow shift+enter for new line
        return;
      } else {
        // Send on enter
        event.preventDefault();
        this.sendMessage();
      }
    },
    handleTyping() {
      emitTyping(this.conversationId);
      
      // Clear previous timeout
      if (this.typingTimeout) {
        clearTimeout(this.typingTimeout);
      }
      
      // Set new timeout to stop typing indicator after 3 seconds
      this.typingTimeout = setTimeout(() => {
        emitTyping(this.conversationId); // Emit stop typing
      }, 3000);
    },
    attachFile() {
      this.$refs.fileInput.click();
    },
    handleFileSelect(event) {
      this.selectedFiles.push(...event.target.files);
    },
    removeFile(index) {
      this.selectedFiles.splice(index, 1);
    },
    async reactToMessage(messageId, reaction) {
      // await reactToMessage(this.conversationId, messageId, reaction);
      console.log('Reacting with:', reaction);
    },
    editMessage(message) {
      this.editingMessage = message;
      this.messageInput = message.content;
    },
    async deleteMessage(messageId) {
      if (confirm('Delete this message?')) {
        // await deleteMessage(this.conversationId, messageId);
        this.messages = this.messages.filter(m => m.id !== messageId);
      }
    },
    cancelEdit() {
      this.editingMessage = null;
      this.messageInput = '';
    },
    startCall() {
      this.$emit('start-call', { type: 'audio' });
    },
    startVideoCall() {
      this.$emit('start-call', { type: 'video' });
    },
    openOptions() {
      this.$emit('open-options');
    },
    scrollToBottom() {
      const container = this.$refs.messagesContainer;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    },
    shouldShowDateSeparator(index) {
      if (index === 0) return true;
      const current = new Date(this.messages[index].timestamp);
      const previous = new Date(this.messages[index - 1].timestamp);
      return current.toDateString() !== previous.toDateString();
    },
    formatDate,
    formatTime
  },
  async mounted() {
    await this.loadMessages();
    
    // Listen for new messages
    window.addEventListener('message:new', (event) => {
      if (event.detail.conversationId === this.conversationId) {
        this.messages.push(event.detail);
        this.$nextTick(() => {
          this.scrollToBottom();
        });
      }
    });

    // Listen for typing
    window.addEventListener('conversation:typing', (event) => {
      if (event.detail.conversationId === this.conversationId) {
        this.typingUsers = event.detail.users || [];
      }
    });

    // Listen for online status
    window.addEventListener('user:online', () => {
      this.isUserOnline = true;
    });

    window.addEventListener('user:offline', () => {
      this.isUserOnline = false;
    });
  }
};
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  background: #f9f9f9;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-info .avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.info h2 {
  margin: 0;
  font-size: 16px;
  color: #000;
}

.status {
  font-size: 12px;
  color: #999;
  margin: 4px 0 0 0;
}

.status.online {
  color: #4caf50;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.call-btn,
.options-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  color: #666;
  padding: 5px 10px;
  border-radius: 50%;
  transition: background 0.2s;
}

.call-btn:hover,
.options-btn:hover {
  background: #eee;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.loading,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: #999;
}

.spinner {
  border: 3px solid #eee;
  border-top-color: #007bff;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.date-separator {
  text-align: center;
  color: #999;
  font-size: 12px;
  margin: 20px 0;
  padding: 0 10px;
}

.message {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  max-width: 80%;
}

.message.sent {
  margin-left: auto;
  flex-direction: row-reverse;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sender-name {
  font-size: 12px;
  font-weight: 600;
  color: #666;
  margin: 0;
}

.message-bubble {
  background: #f0f0f0;
  padding: 10px 14px;
  border-radius: 18px;
  word-wrap: break-word;
  font-size: 14px;
  line-height: 1.4;
}

.message.sent .message-bubble {
  background: #007bff;
  color: white;
}

.message-bubble.edited::after {
  content: ' (edited)';
  font-size: 11px;
  opacity: 0.7;
}

.message-time {
  font-size: 11px;
  color: #999;
  margin: 0;
  padding: 0 10px;
}

.message-actions {
  display: flex;
  gap: 5px;
  opacity: 0.7;
}

.message-actions button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 2px 4px;
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #999;
}

.typing-indicator .dots {
  display: flex;
  gap: 4px;
}

.typing-indicator .dots span {
  width: 6px;
  height: 6px;
  background: #999;
  border-radius: 50%;
  animation: bounce 1.4s infinite;
}

.typing-indicator .dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator .dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes bounce {
  0%, 80%, 100% { opacity: 0.5; }
  40% { opacity: 1; }
}

.chat-input-area {
  border-top: 1px solid #eee;
  padding: 15px 20px;
  background: #f9f9f9;
}

.editing-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff3cd;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 10px;
  font-size: 13px;
}

.cancel-btn {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  font-size: 12px;
}

.input-container {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}

.attach-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  color: #666;
  padding: 5px;
}

.message-input {
  flex: 1;
  border: 1px solid #ddd;
  border-radius: 20px;
  padding: 10px 15px;
  font-size: 14px;
  font-family: inherit;
  resize: none;
  max-height: 100px;
}

.message-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.send-btn {
  background: #007bff;
  border: none;
  color: white;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.send-btn:hover:not(:disabled) {
  background: #0056b3;
}

.send-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.files-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f0f0f0;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
}

.remove-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
  font-size: 14px;
}
</style>
