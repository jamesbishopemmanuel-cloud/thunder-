/**
 * Offline Storage Manager
 * Veylora - Connect • Create • Share
 */

const DB_NAME = 'veylora_db';
const DB_VERSION = 1;
const STORES = {
  MESSAGES: 'pending_messages',
  CONVERSATIONS: 'conversations',
  USERS: 'users',
  CALLS: 'call_history'
};

let db = null;

export async function initializeDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Database initialization failed');
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('Database initialized successfully');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Create stores if they don't exist
      if (!database.objectStoreNames.contains(STORES.MESSAGES)) {
        const messageStore = database.createObjectStore(STORES.MESSAGES, { keyPath: 'id', autoIncrement: true });
        messageStore.createIndex('conversationId', 'conversationId', { unique: false });
        messageStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!database.objectStoreNames.contains(STORES.CONVERSATIONS)) {
        database.createObjectStore(STORES.CONVERSATIONS, { keyPath: 'id' });
      }

      if (!database.objectStoreNames.contains(STORES.USERS)) {
        database.createObjectStore(STORES.USERS, { keyPath: 'id' });
      }

      if (!database.objectStoreNames.contains(STORES.CALLS)) {
        database.createObjectStore(STORES.CALLS, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

export async function addPendingMessage(conversationId, message) {
  if (!db) await initializeDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.MESSAGES], 'readwrite');
    const store = transaction.objectStore(STORES.MESSAGES);

    const data = {
      conversationId,
      message,
      timestamp: Date.now(),
      sent: false
    };

    const request = store.add(data);

    request.onsuccess = () => {
      console.log('Message stored offline:', request.result);
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getPendingMessages(conversationId = null) {
  if (!db) await initializeDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.MESSAGES], 'readonly');
    const store = transaction.objectStore(STORES.MESSAGES);

    let request;
    if (conversationId) {
      const index = store.index('conversationId');
      request = index.getAll(conversationId);
    } else {
      request = store.getAll();
    }

    request.onsuccess = () => {
      const messages = request.result.filter(msg => !msg.sent);
      resolve(messages);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function removePendingMessage(messageId) {
  if (!db) await initializeDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.MESSAGES], 'readwrite');
    const store = transaction.objectStore(STORES.MESSAGES);
    const request = store.delete(messageId);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function markMessageAsSent(messageId) {
  if (!db) await initializeDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.MESSAGES], 'readwrite');
    const store = transaction.objectStore(STORES.MESSAGES);
    const request = store.get(messageId);

    request.onsuccess = () => {
      const message = request.result;
      message.sent = true;
      const updateRequest = store.put(message);

      updateRequest.onsuccess = () => {
        resolve();
      };

      updateRequest.onerror = () => {
        reject(updateRequest.error);
      };
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function saveConversation(conversation) {
  if (!db) await initializeDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.CONVERSATIONS], 'readwrite');
    const store = transaction.objectStore(STORES.CONVERSATIONS);
    const request = store.put(conversation);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getConversation(conversationId) {
  if (!db) await initializeDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.CONVERSATIONS], 'readonly');
    const store = transaction.objectStore(STORES.CONVERSATIONS);
    const request = store.get(conversationId);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getAllConversations() {
  if (!db) await initializeDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.CONVERSATIONS], 'readonly');
    const store = transaction.objectStore(STORES.CONVERSATIONS);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function saveUser(user) {
  if (!db) await initializeDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.USERS], 'readwrite');
    const store = transaction.objectStore(STORES.USERS);
    const request = store.put(user);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getUser(userId) {
  if (!db) await initializeDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.USERS], 'readonly');
    const store = transaction.objectStore(STORES.USERS);
    const request = store.get(userId);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function saveCallRecord(callData) {
  if (!db) await initializeDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.CALLS], 'readwrite');
    const store = transaction.objectStore(STORES.CALLS);
    const request = store.add(callData);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function clearDatabase() {
  if (!db) await initializeDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      [STORES.MESSAGES, STORES.CONVERSATIONS, STORES.USERS, STORES.CALLS],
      'readwrite'
    );

    for (const storeName of Object.values(STORES)) {
      transaction.objectStore(storeName).clear();
    }

    transaction.oncomplete = () => {
      console.log('Database cleared');
      resolve();
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}

export async function getStorageSize() {
  if (!navigator.storage || !navigator.storage.estimate) {
    return null;
  }

  const estimate = await navigator.storage.estimate();
  return {
    usage: estimate.usage,
    quota: estimate.quota,
    percentUsed: (estimate.usage / estimate.quota) * 100
  };
}
