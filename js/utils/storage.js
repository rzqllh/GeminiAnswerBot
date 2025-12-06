// === Hafizh Signature Code ===
// Author: Hafizh Rizqullah — GeminiAnswerBot
// File: js/utils/storage.js
// Dual-mode: Works in both ES modules and regular scripts

/**
 * @fileoverview Provides a unified interface for Chrome's storage APIs.
 */

const StorageManager = (() => {
  let _isSyncAvailable = true;
  let hasCheckedSync = false;
  let isDebugMode = false;

  function debug(...args) {
    if (isDebugMode) console.log('[StorageManager]', ...args);
  }

  async function checkSyncAvailability() {
    if (hasCheckedSync) return _isSyncAvailable;
    hasCheckedSync = true;
    try {
      await chrome.storage.sync.get(null);
      _isSyncAvailable = true;
    } catch (e) {
      _isSyncAvailable = false;
      debug('Sync unavailable, using local', e.message);
    }
    return _isSyncAvailable;
  }

  function getStorage() {
    return _isSyncAvailable ? chrome.storage.sync : chrome.storage.local;
  }

  return {
    async get(keys) {
      await checkSyncAvailability();
      return new Promise((resolve) => {
        getStorage().get(keys, (result) => {
          if (chrome.runtime.lastError) {
            debug('Get error:', chrome.runtime.lastError.message);
            resolve({});
          } else {
            resolve(result);
          }
        });
      });
    },

    async set(items) {
      await checkSyncAvailability();
      return new Promise((resolve, reject) => {
        getStorage().set(items, () => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve();
        });
      });
    },

    async remove(keys) {
      await checkSyncAvailability();
      return new Promise((resolve, reject) => {
        getStorage().remove(keys, () => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve();
        });
      });
    },

    async clear() {
      await checkSyncAvailability();
      return new Promise((resolve, reject) => {
        getStorage().clear(() => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve();
        });
      });
    },

    // Local storage accessor (for history data which needs more space)
    local: {
      async get(keys) {
        return new Promise((resolve) => {
          chrome.storage.local.get(keys, (result) => {
            if (chrome.runtime.lastError) {
              debug('Local get error:', chrome.runtime.lastError.message);
              resolve({});
            } else {
              resolve(result);
            }
          });
        });
      },
      async set(items) {
        return new Promise((resolve, reject) => {
          chrome.storage.local.set(items, () => {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else resolve();
          });
        });
      },
      async remove(keys) {
        return new Promise((resolve) => {
          chrome.storage.local.remove(keys, () => resolve());
        });
      },
      async clear() {
        return new Promise((resolve) => {
          chrome.storage.local.clear(() => resolve());
        });
      }
    },

    // Session storage accessor
    session: {
      async get(keys) {
        return new Promise((resolve) => {
          chrome.storage.session.get(keys, (result) => resolve(chrome.runtime.lastError ? {} : result));
        });
      },
      async set(items) {
        return new Promise((resolve, reject) => {
          chrome.storage.session.set(items, () => {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else resolve();
          });
        });
      },
      async remove(keys) {
        return new Promise((resolve) => {
          chrome.storage.session.remove(keys, () => resolve());
        });
      }
    },

    setDebugMode(enabled) { isDebugMode = enabled; },

    // Public method to check sync availability (used by settings.js)
    async isSyncAvailable() {
      return await checkSyncAvailability();
    }
  };
})();

// Make available globally (for regular scripts like options.js)
if (typeof globalThis !== 'undefined') globalThis.StorageManager = StorageManager;
else if (typeof window !== 'undefined') window.StorageManager = StorageManager;
else if (typeof self !== 'undefined') self.StorageManager = StorageManager;