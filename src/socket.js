/**
 * Socket Connection Manager
 * Veylora - Connect • Create • Share
 */

import { io } from 'socket.io-client';
import * as sync from './offline/sync.js';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
const RECONNECTION_ATTEMPTS = 5;
const RECONNECTION_DELAY = 1000;

let socket = null;
let isConnectedStatus = false;
let reconnectAttempts = 0;
let heartbeatInterval = null;

export function initializeSocket(token) {
  return new Promise((resolve, reject) => {
    try {
      socket = io(SOCKET_URL, {
        auth: {
          token: token
        },
        reconnection: true,
        reconnectionDelay: RECONNECTION_DELAY,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: RECONNECTION_ATTEMPTS,
        transports: ['websocket', 'polling']
      });

      // Connection events
      socket.on('connect', () => {
        isConnectedStatus = true;
        reconnectAttempts = 0;
        console.log('Socket connected:', socket.id);
        window.dispatchEvent(new CustomEvent('socket:connected'));
        startHeartbeat();
        sync.syncData(); // Sync data when connected
        resolve(socket);
      });

      socket.on('disconnect', (reason) => {
        isConnectedStatus = false;
        console.log('Socket disconnected:', reason);
        stopHeartbeat();
        window.dispatchEvent(new CustomEvent('socket:disconnected', { detail: reason }));
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        window.dispatchEvent(new CustomEvent('socket:error', { detail: error }));
      });

      socket.on('reconnect_attempt', () => {
        reconnectAttempts++;
        console.log(`Reconnection attempt ${reconnectAttempts}`);
      });

      // Message events
      socket.on('message:new', (data) => {
        console.log('New message received:', data);
        window.dispatchEvent(new CustomEvent('message:new', { detail: data }));
      });

      socket.on('message:updated', (data) => {
        console.log('Message updated:', data);
        window.dispatchEvent(new CustomEvent('message:updated', { detail: data }));
      });

      socket.on('message:deleted', (data) => {
        console.log('Message deleted:', data);
        window.dispatchEvent(new CustomEvent('message:deleted', { detail: data }));
      });

      // Conversation events
      socket.on('conversation:new', (data) => {
        console.log('New conversation:', data);
        window.dispatchEvent(new CustomEvent('conversation:new', { detail: data }));
      });

      socket.on('conversation:updated', (data) => {
        console.log('Conversation updated:', data);
        window.dispatchEvent(new CustomEvent('conversation:updated', { detail: data }));
      });

      socket.on('conversation:typing', (data) => {
        console.log('User typing:', data);
        window.dispatchEvent(new CustomEvent('conversation:typing', { detail: data }));
      });

      // Call events
      socket.on('call:incoming', (data) => {
        console.log('Incoming call:', data);
        window.dispatchEvent(new CustomEvent('call:incoming', { detail: data }));
      });

      socket.on('call:accepted', (data) => {
        console.log('Call accepted:', data);
        window.dispatchEvent(new CustomEvent('call:accepted', { detail: data }));
      });

      socket.on('call:rejected', (data) => {
        console.log('Call rejected:', data);
        window.dispatchEvent(new CustomEvent('call:rejected', { detail: data }));
      });

      socket.on('call:ended', (data) => {
        console.log('Call ended:', data);
        window.dispatchEvent(new CustomEvent('call:ended', { detail: data }));
      });

      // User events
      socket.on('user:online', (data) => {
        console.log('User online:', data);
        window.dispatchEvent(new CustomEvent('user:online', { detail: data }));
      });

      socket.on('user:offline', (data) => {
        console.log('User offline:', data);
        window.dispatchEvent(new CustomEvent('user:offline', { detail: data }));
      });

      socket.on('user:profile:updated', (data) => {
        console.log('User profile updated:', data);
        window.dispatchEvent(new CustomEvent('user:profile:updated', { detail: data }));
      });

      // Error handling
      socket.on('error', (error) => {
        console.error('Socket error:', error);
        window.dispatchEvent(new CustomEvent('socket:error', { detail: error }));
      });

    } catch (error) {
      console.error('Error initializing socket:', error);
      reject(error);
    }
  });
}

export function getSocket() {
  return socket;
}

export function isConnected() {
  return isConnectedStatus && socket && socket.connected;
}

export function disconnect() {
  if (socket) {
    socket.disconnect();
    stopHeartbeat();
  }
}

// Emit events
export function emitMessage(conversationId, message) {
  if (isConnected()) {
    socket.emit('message:send', { conversationId, message }, (response) => {
      console.log('Message sent:', response);
      window.dispatchEvent(new CustomEvent('message:sent', { detail: response }));
    });
  }
}

export function emitTyping(conversationId) {
  if (isConnected()) {
    socket.emit('conversation:typing', { conversationId });
  }
}

export function emitCallInitiate(userId) {
  if (isConnected()) {
    socket.emit('call:initiate', { recipientId: userId }, (response) => {
      console.log('Call initiated:', response);
      window.dispatchEvent(new CustomEvent('call:initiated', { detail: response }));
    });
  }
}

export function emitCallAccept(callId) {
  if (isConnected()) {
    socket.emit('call:accept', { callId });
  }
}

export function emitCallReject(callId) {
  if (isConnected()) {
    socket.emit('call:reject', { callId });
  }
}

export function emitCallEnd(callId) {
  if (isConnected()) {
    socket.emit('call:end', { callId });
  }
}

export function emitUserStatus(status) {
  if (isConnected()) {
    socket.emit('user:status', { status });
  }
}

// Heartbeat to keep connection alive
function startHeartbeat() {
  heartbeatInterval = setInterval(() => {
    if (isConnected()) {
      socket.emit('heartbeat', {}, (response) => {
        console.log('Heartbeat acknowledged');
      });
    }
  }, 30000); // Every 30 seconds
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// Listen for socket events
export function onSocketEvent(eventName, callback) {
  if (socket) {
    socket.on(eventName, callback);
  }
}

export function offSocketEvent(eventName, callback) {
  if (socket) {
    socket.off(eventName, callback);
  }
}

// Room management
export function joinRoom(roomId) {
  if (isConnected()) {
    socket.emit('room:join', { roomId });
  }
}

export function leaveRoom(roomId) {
  if (isConnected()) {
    socket.emit('room:leave', { roomId });
  }
}
