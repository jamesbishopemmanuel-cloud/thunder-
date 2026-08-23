/**
 * Socket.IO Real-time Communication
 * Veylora - Connect • Create • Share
 */

import { io } from 'socket.io-client';

let socket = null;

export function connectSocket(token) {
  const serverUrl = window.location.origin;
  
  socket = io(serverUrl, {
    auth: {
      token: token
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
  });

  // Connection events
  socket.on('connect', () => {
    console.log('Connected to server');
    onSocketConnected();
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
    onSocketDisconnected();
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  // Message events
  socket.on('message:receive', (data) => {
    handleMessageReceived(data);
  });

  socket.on('typing:start', (data) => {
    handleTypingStart(data);
  });

  socket.on('typing:stop', (data) => {
    handleTypingStop(data);
  });

  // Presence events
  socket.on('user:online', (data) => {
    handleUserOnline(data);
  });

  socket.on('user:offline', (data) => {
    handleUserOffline(data);
  });

  // Call events
  socket.on('call:incoming', (data) => {
    handleIncomingCall(data);
  });

  socket.on('call:answer', (data) => {
    handleCallAnswer(data);
  });

  socket.on('call:reject', (data) => {
    handleCallReject(data);
  });

  socket.on('call:end', (data) => {
    handleCallEnd(data);
  });

  socket.on('ice:candidate', (data) => {
    handleIceCandidate(data);
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function emitMessage(conversationId, message) {
  if (!socket) return;
  socket.emit('message:send', {
    conversationId,
    message,
    timestamp: new Date().toISOString()
  });
}

export function emitTyping(conversationId, isTyping) {
  if (!socket) return;
  socket.emit(isTyping ? 'typing:start' : 'typing:stop', {
    conversationId
  });
}

export function emitCallOffer(recipientId, offer) {
  if (!socket) return;
  socket.emit('call:offer', {
    recipientId,
    offer
  });
}

export function emitCallAnswer(callId, answer) {
  if (!socket) return;
  socket.emit('call:answer', {
    callId,
    answer
  });
}

export function emitCallReject(callId) {
  if (!socket) return;
  socket.emit('call:reject', {
    callId
  });
}

export function emitCallEnd(callId) {
  if (!socket) return;
  socket.emit('call:end', {
    callId
  });
}

export function emitIceCandidate(callId, candidate) {
  if (!socket) return;
  socket.emit('ice:candidate', {
    callId,
    candidate
  });
}

// Event handlers
function onSocketConnected() {
  // Dispatch custom event
  window.dispatchEvent(new CustomEvent('socket:connected'));
  
  // Update online status
  document.body.classList.add('online');
  document.body.classList.remove('offline');
  
  // Sync pending messages
  syncPendingMessages();
}

function onSocketDisconnected() {
  // Dispatch custom event
  window.dispatchEvent(new CustomEvent('socket:disconnected'));
  
  // Update offline status
  document.body.classList.remove('online');
  document.body.classList.add('offline');
}

function handleMessageReceived(data) {
  window.dispatchEvent(new CustomEvent('message:received', { detail: data }));
}

function handleTypingStart(data) {
  window.dispatchEvent(new CustomEvent('typing:start', { detail: data }));
}

function handleTypingStop(data) {
  window.dispatchEvent(new CustomEvent('typing:stop', { detail: data }));
}

function handleUserOnline(data) {
  window.dispatchEvent(new CustomEvent('user:online', { detail: data }));
}

function handleUserOffline(data) {
  window.dispatchEvent(new CustomEvent('user:offline', { detail: data }));
}

function handleIncomingCall(data) {
  window.dispatchEvent(new CustomEvent('call:incoming', { detail: data }));
}

function handleCallAnswer(data) {
  window.dispatchEvent(new CustomEvent('call:answer', { detail: data }));
}

function handleCallReject(data) {
  window.dispatchEvent(new CustomEvent('call:reject', { detail: data }));
}

function handleCallEnd(data) {
  window.dispatchEvent(new CustomEvent('call:end', { detail: data }));
}

function handleIceCandidate(data) {
  window.dispatchEvent(new CustomEvent('ice:candidate', { detail: data }));
}

// Offline message synchronization
async function syncPendingMessages() {
  try {
    const db = await import('./offline/storage.js');
    const pending = await db.getPendingMessages();
    
    for (const msg of pending) {
      emitMessage(msg.conversationId, msg.message);
      await db.removePendingMessage(msg.id);
    }
  } catch (error) {
    console.error('Error syncing pending messages:', error);
  }
}

export function isConnected() {
  return socket && socket.connected;
}
