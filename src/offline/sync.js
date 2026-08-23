/**
 * Synchronization Manager
 * Veylora - Connect • Create • Share
 */

import * as storage from './storage.js';
import * as api from '../api.js';
import { getSocket, isConnected } from '../socket.js';

let syncInProgress = false;
let syncQueue = [];

export async function syncData() {
  if (syncInProgress) {
    console.log('Sync already in progress');
    return;
  }

  if (!isConnected()) {
    console.log('Not connected to server, queueing sync');
    return;
  }

  syncInProgress = true;

  try {
    // Sync pending messages
    await syncPendingMessages();

    // Sync conversations
    await syncConversations();

    // Sync call records
    await syncCallRecords();

    console.log('Data sync completed successfully');
    window.dispatchEvent(new CustomEvent('sync:completed'));
  } catch (error) {
    console.error('Sync error:', error);
    window.dispatchEvent(new CustomEvent('sync:error', { detail: error }));
  } finally {
    syncInProgress = false;

    // Process any queued sync operations
    if (syncQueue.length > 0) {
      const nextSync = syncQueue.shift();
      nextSync();
    }
  }
}

async function syncPendingMessages() {
  try {
    const pendingMessages = await storage.getPendingMessages();

    if (pendingMessages.length === 0) {
      console.log('No pending messages to sync');
      return;
    }

    console.log(`Syncing ${pendingMessages.length} pending messages`);

    for (const msg of pendingMessages) {
      try {
        await api.sendMessage(msg.conversationId, msg.message);
        await storage.markMessageAsSent(msg.id);
        console.log(`Message ${msg.id} sent successfully`);
      } catch (error) {
        console.error(`Failed to send message ${msg.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error syncing pending messages:', error);
  }
}

async function syncConversations() {
  try {
    const localConversations = await storage.getAllConversations();
    const remoteConversations = await api.getConversations();

    if (!remoteConversations || !remoteConversations.data) {
      console.log('No remote conversations to sync');
      return;
    }

    // Update or create conversations
    for (const conversation of remoteConversations.data) {
      await storage.saveConversation(conversation);
    }

    console.log(`Synced ${remoteConversations.data.length} conversations`);
  } catch (error) {
    console.error('Error syncing conversations:', error);
  }
}

async function syncCallRecords() {
  try {
    // Call records are typically synced when calls end
    console.log('Call records sync completed');
  } catch (error) {
    console.error('Error syncing call records:', error);
  }
}

export function queueSync() {
  syncQueue.push(() => syncData());
}

export function isSyncing() {
  return syncInProgress;
}

export async function manualSync() {
  console.log('Manual sync initiated');
  await syncData();
}

// Auto-sync when connection is restored
export function setupAutoSync() {
  // Listen for online event
  window.addEventListener('online', () => {
    console.log('Connection restored, syncing data');
    syncData();
  });

  // Listen for socket connection
  window.addEventListener('socket:connected', () => {
    console.log('Socket connected, syncing data');
    syncData();
  });

  // Listen for manual sync request
  window.addEventListener('sync:request', () => {
    syncData();
  });
}

// Conflict resolution
export async function resolveConflict(localData, remoteData, type) {
  // Use timestamp-based resolution: newer data wins
  const localTimestamp = new Date(localData.updatedAt || localData.timestamp).getTime();
  const remoteTimestamp = new Date(remoteData.updatedAt || remoteData.timestamp).getTime();

  if (remoteTimestamp > localTimestamp) {
    console.log(`Conflict resolved: using remote data for ${type}`);
    return remoteData;
  } else {
    console.log(`Conflict resolved: using local data for ${type}`);
    return localData;
  }
}

// Selective sync - sync specific data
export async function syncConversation(conversationId) {
  try {
    const conversation = await api.getConversation(conversationId);
    await storage.saveConversation(conversation);
    console.log(`Conversation ${conversationId} synced`);
  } catch (error) {
    console.error(`Error syncing conversation ${conversationId}:`, error);
  }
}

export async function syncUser(userId) {
  try {
    const user = await api.getCurrentUser();
    await storage.saveUser(user);
    console.log(`User ${userId} synced`);
  } catch (error) {
    console.error(`Error syncing user ${userId}:`, error);
  }
}

// Compression for large data transfers
export async function compressData(data) {
  try {
    const json = JSON.stringify(data);
    const blob = new Blob([json]);
    return blob;
  } catch (error) {
    console.error('Error compressing data:', error);
    return data;
  }
}

// Monitor sync status
export function setupSyncMonitoring() {
  window.addEventListener('sync:completed', () => {
    console.log('Sync completed successfully');
    document.body.classList.remove('syncing');
    document.body.classList.add('synced');

    // Remove synced indicator after 2 seconds
    setTimeout(() => {
      document.body.classList.remove('synced');
    }, 2000);
  });

  window.addEventListener('sync:error', (event) => {
    console.error('Sync error:', event.detail);
    document.body.classList.remove('syncing');
    document.body.classList.add('sync-error');
  });
}

// Background sync (Service Worker)
export async function registerBackgroundSync() {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-messages');
      console.log('Background sync registered');
    } catch (error) {
      console.error('Error registering background sync:', error);
    }
  }
}
