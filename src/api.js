/**
 * API Client
 * Veylora - Connect • Create • Share
 */

import { getAuthToken } from './utils/auth.js';

const API_BASE_URL = window.location.origin;

export async function apiCall(endpoint, options = {}) {
  const method = options.method || 'GET';
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  // Add authentication token if available
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
    ...options
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    // Handle 401 Unauthorized
    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/';
      return null;
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `API Error: ${response.status}`);
    }

    // Handle empty responses
    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error [${method} ${endpoint}]:`, error);
    throw error;
  }
}

// Authentication endpoints
export async function registerUser(data) {
  return apiCall('/api/auth/register', {
    method: 'POST',
    body: data
  });
}

export async function loginUser(data) {
  return apiCall('/api/auth/login', {
    method: 'POST',
    body: data
  });
}

export async function requestOTP(phoneNumber) {
  return apiCall('/api/auth/request-otp', {
    method: 'POST',
    body: { phoneNumber }
  });
}

export async function verifyOTP(phoneNumber, otp) {
  return apiCall('/api/auth/verify-otp', {
    method: 'POST',
    body: { phoneNumber, otp }
  });
}

export async function getCurrentUser() {
  return apiCall('/api/auth/me');
}

// Messaging endpoints
export async function getConversations(page = 1, limit = 20) {
  return apiCall(`/api/messages/conversations?page=${page}&limit=${limit}`);
}

export async function getConversation(conversationId) {
  return apiCall(`/api/messages/conversations/${conversationId}`);
}

export async function getMessages(conversationId, page = 1, limit = 50) {
  return apiCall(`/api/messages/${conversationId}?page=${page}&limit=${limit}`);
}

export async function sendMessage(conversationId, message) {
  return apiCall('/api/messages/send', {
    method: 'POST',
    body: { conversationId, message }
  });
}

// Call endpoints
export async function getIceServers() {
  return apiCall('/api/calls/ice-servers');
}

export async function initiateCall(recipientId, type = 'voice') {
  return apiCall('/api/calls/initiate', {
    method: 'POST',
    body: { recipientId, type }
  });
}

export async function endCall(callId) {
  return apiCall('/api/calls/end', {
    method: 'POST',
    body: { callId }
  });
}

// AI endpoints
export async function generateAIContent(data) {
  return apiCall('/api/ai/generate', {
    method: 'POST',
    body: data
  });
}

export async function getAIUsage() {
  return apiCall('/api/ai/usage');
}

export async function getAIHistory() {
  return apiCall('/api/ai/history');
}

// Premium/Payment endpoints
export async function getPremiumPlans() {
  return apiCall('/api/premium/plans');
}

export async function initializePayment(planId) {
  return apiCall('/api/payments/paystack/initialize', {
    method: 'POST',
    body: { planId }
  });
}

export async function verifyPayment(reference) {
  return apiCall('/api/payments/paystack/verify', {
    method: 'POST',
    body: { reference }
  });
}

export async function getSubscriptionStatus() {
  return apiCall('/api/premium/status');
}

export async function getPaymentHistory() {
  return apiCall('/api/payments/history');
}

// Wallet endpoints
export async function getWalletBalance() {
  return apiCall('/api/wallet/balance');
}

export async function getTransactions() {
  return apiCall('/api/wallet/transactions');
}

// Stories endpoints
export async function createStory(content) {
  return apiCall('/api/stories', {
    method: 'POST',
    body: { content }
  });
}

export async function getStories() {
  return apiCall('/api/stories');
}

export async function viewStory(storyId) {
  return apiCall(`/api/stories/${storyId}/view`, {
    method: 'POST'
  });
}

// Channels endpoints
export async function getChannels(page = 1) {
  return apiCall(`/api/channels?page=${page}`);
}

export async function getChannel(channelId) {
  return apiCall(`/api/channels/${channelId}`);
}

export async function followChannel(channelId) {
  return apiCall(`/api/channels/${channelId}/follow`, {
    method: 'POST'
  });
}

export async function unfollowChannel(channelId) {
  return apiCall(`/api/channels/${channelId}/unfollow`, {
    method: 'POST'
  });
}

// Error handling utility
export function handleApiError(error) {
  if (error.message.includes('API Error: 400')) {
    return 'Invalid request. Please check your input.';
  } else if (error.message.includes('API Error: 401')) {
    return 'Authentication failed. Please login again.';
  } else if (error.message.includes('API Error: 403')) {
    return 'You do not have permission to perform this action.';
  } else if (error.message.includes('API Error: 404')) {
    return 'Resource not found.';
  } else if (error.message.includes('API Error: 429')) {
    return 'Too many requests. Please try again later.';
  } else if (error.message.includes('API Error: 500')) {
    return 'Server error. Please try again later.';
  }
  return error.message || 'An error occurred. Please try again.';
}
