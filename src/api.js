/**
 * API Integration Layer
 * Veylora - Connect • Create • Share
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

let authToken = null;

// Set auth token
export function setAuthToken(token) {
  authToken = token;
  localStorage.setItem('authToken', token);
}

// Get auth token
export function getAuthToken() {
  if (!authToken) {
    authToken = localStorage.getItem('authToken');
  }
  return authToken;
}

// Clear auth token
export function clearAuthToken() {
  authToken = null;
  localStorage.removeItem('authToken');
}

// Base API request handler
async function apiRequest(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearAuthToken();
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
}

// Authentication Endpoints
export async function register(email, password, firstName, lastName, phoneNumber) {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      firstName,
      lastName,
      phoneNumber
    })
  });
}

export async function login(email, password) {
  const response = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  if (response.token) {
    setAuthToken(response.token);
  }

  return response;
}

export async function logout() {
  clearAuthToken();
  return apiRequest('/auth/logout', { method: 'POST' });
}

export async function verifyToken() {
  return apiRequest('/auth/verify', { method: 'GET' });
}

export async function refreshToken() {
  const response = await apiRequest('/auth/refresh', { method: 'POST' });
  if (response.token) {
    setAuthToken(response.token);
  }
  return response;
}

// User Endpoints
export async function getCurrentUser() {
  return apiRequest('/users/me', { method: 'GET' });
}

export async function updateProfile(data) {
  return apiRequest('/users/me', {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function uploadAvatar(file) {
  const formData = new FormData();
  formData.append('avatar', file);

  return fetch(`${API_BASE_URL}/users/me/avatar`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: formData
  }).then(res => res.json());
}

export async function getUser(userId) {
  return apiRequest(`/users/${userId}`, { method: 'GET' });
}

export async function searchUsers(query) {
  return apiRequest(`/users/search?q=${encodeURIComponent(query)}`, { method: 'GET' });
}

export async function blockUser(userId) {
  return apiRequest(`/users/${userId}/block`, { method: 'POST' });
}

export async function unblockUser(userId) {
  return apiRequest(`/users/${userId}/unblock`, { method: 'POST' });
}

// Conversation Endpoints
export async function getConversations(page = 1, limit = 20) {
  return apiRequest(`/conversations?page=${page}&limit=${limit}`, { method: 'GET' });
}

export async function getConversation(conversationId) {
  return apiRequest(`/conversations/${conversationId}`, { method: 'GET' });
}

export async function createConversation(participantIds) {
  return apiRequest('/conversations', {
    method: 'POST',
    body: JSON.stringify({ participantIds })
  });
}

export async function updateConversation(conversationId, data) {
  return apiRequest(`/conversations/${conversationId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function deleteConversation(conversationId) {
  return apiRequest(`/conversations/${conversationId}`, { method: 'DELETE' });
}

export async function archiveConversation(conversationId) {
  return apiRequest(`/conversations/${conversationId}/archive`, { method: 'POST' });
}

export async function muteConversation(conversationId, duration) {
  return apiRequest(`/conversations/${conversationId}/mute`, {
    method: 'POST',
    body: JSON.stringify({ duration })
  });
}

// Message Endpoints
export async function getMessages(conversationId, page = 1, limit = 50) {
  return apiRequest(`/conversations/${conversationId}/messages?page=${page}&limit=${limit}`, {
    method: 'GET'
  });
}

export async function sendMessage(conversationId, message, attachments = []) {
  return apiRequest(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message, attachments })
  });
}

export async function updateMessage(conversationId, messageId, message) {
  return apiRequest(`/conversations/${conversationId}/messages/${messageId}`, {
    method: 'PUT',
    body: JSON.stringify({ message })
  });
}

export async function deleteMessage(conversationId, messageId) {
  return apiRequest(`/conversations/${conversationId}/messages/${messageId}`, {
    method: 'DELETE'
  });
}

export async function reactToMessage(conversationId, messageId, reaction) {
  return apiRequest(`/conversations/${conversationId}/messages/${messageId}/react`, {
    method: 'POST',
    body: JSON.stringify({ reaction })
  });
}

export async function markAsRead(conversationId) {
  return apiRequest(`/conversations/${conversationId}/mark-read`, { method: 'POST' });
}

// Call Endpoints
export async function initiateCall(recipientId, callType = 'video') {
  return apiRequest('/calls', {
    method: 'POST',
    body: JSON.stringify({ recipientId, callType })
  });
}

export async function getCallHistory(page = 1, limit = 20) {
  return apiRequest(`/calls/history?page=${page}&limit=${limit}`, { method: 'GET' });
}

export async function endCall(callId) {
  return apiRequest(`/calls/${callId}/end`, { method: 'POST' });
}

export async function recordCall(callId, enabled) {
  return apiRequest(`/calls/${callId}/record`, {
    method: 'POST',
    body: JSON.stringify({ enabled })
  });
}

// File Upload
export async function uploadFile(file, conversationId) {
  const formData = new FormData();
  formData.append('file', file);

  return fetch(`${API_BASE_URL}/conversations/${conversationId}/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: formData
  }).then(res => res.json());
}

// Notifications
export async function getNotifications(page = 1, limit = 20) {
  return apiRequest(`/notifications?page=${page}&limit=${limit}`, { method: 'GET' });
}

export async function markNotificationAsRead(notificationId) {
  return apiRequest(`/notifications/${notificationId}/read`, { method: 'POST' });
}

export async function deleteNotification(notificationId) {
  return apiRequest(`/notifications/${notificationId}`, { method: 'DELETE' });
}

// Settings
export async function getSettings() {
  return apiRequest('/settings', { method: 'GET' });
}

export async function updateSettings(settings) {
  return apiRequest('/settings', {
    method: 'PUT',
    body: JSON.stringify(settings)
  });
}

export async function changePassword(currentPassword, newPassword) {
  return apiRequest('/users/me/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword })
  });
}

// Two-Factor Authentication
export async function enableTwoFactor() {
  return apiRequest('/auth/2fa/enable', { method: 'POST' });
}

export async function disableTwoFactor(code) {
  return apiRequest('/auth/2fa/disable', {
    method: 'POST',
    body: JSON.stringify({ code })
  });
}

export async function verifyTwoFactorCode(code) {
  return apiRequest('/auth/2fa/verify', {
    method: 'POST',
    body: JSON.stringify({ code })
  });
}
