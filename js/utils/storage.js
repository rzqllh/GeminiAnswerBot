// === Hafizh Rizqullah | GeminiAnswerBot ===
// 🔒 Created by Hafizh Rizqullah || Refine by AI Assistant
// 📄 js/utils/storage.js
// 🕓 Created: 2025-08-01 00:28:37
// 🧠 Modular | DRY | SOLID | Apple HIG Compliant

/**
 * @module StorageManager
 * @description A resilient wrapper for chrome.storage API.
 * It attempts to use `sync` storage first and gracefully falls back to `local` storage
 * if `sync` is unavailable (e.g., due to browser policies or disabled third-party cookies).
 * It also provides a mechanism to check the availability of sync storage.
 */
const StorageManager = (() => {
  let isSyncAvailable = true;
  let hasCheckedSync = false;

  /**
   * Checks if chrome.storage.sync is available and writable.
   * Caches the result to avoid repeated checks.
   * @returns {Promise<boolean>} True if sync is available, false otherwise.
   */
  async function checkSyncAvailability() {
    if (hasCheckedSync) {
      return isSyncAvailable;
    }

    return new Promise((resolve) => {
      const testKey = `__sync_test_${Date.now()}`;
      chrome.storage.sync.set({ [testKey]: true }, () => {
        if (chrome.runtime.lastError) {
          console.warn(
            'StorageManager: chrome.storage.sync is unavailable. Falling back to local. Error:',
            chrome.runtime.lastError.message
          );
          isSyncAvailable = false;
        } else {
          chrome.storage.sync.remove(testKey);
          isSyncAvailable = true;
        }
        hasCheckedSync = true;
        resolve(isSyncAvailable);
      });
    });
  }

  /**
   * Awaits the initial sync availability check.
   * @private
   */
  const ready = checkSyncAvailability();

  /**
   * Gets the appropriate storage area (sync or local).
   * @private
   * @returns {chrome.storage.StorageArea}
   */
  function getStorageArea() {
    return isSyncAvailable ? chrome.storage.sync : chrome.storage.local;
  }

  /**
   * Retrieves items from storage.
   * @param {string|string[]|Object|null} keys - A key, an array of keys, or an object with default values.
   * @returns {Promise<Object>} A promise that resolves with the retrieved items.
   */
  async function get(keys) {
    await ready; // Ensure the initial check is complete
    return new Promise((resolve, reject) => {
      getStorageArea().get(keys, (result) => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }
        resolve(result);
      });
    });
  }

  /**
   * Sets items in storage.
   * @param {Object} items - An object with key/value pairs to set.
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
   */
  async function set(items) {
    await ready;
    return new Promise((resolve, reject) => {
      getStorageArea().set(items, () => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }
        resolve();
      });
    });
  }

  /**
   * Removes items from storage.
   * @param {string|string[]} keys - A key or an array of keys to remove.
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
   */
  async function remove(keys) {
    await ready;
    return new Promise((resolve, reject) => {
      getStorageArea().remove(keys, () => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }
        resolve();
      });
    });
  }

  /**
   * Clears all items from storage.
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
   */
  async function clear() {
    await ready;
    return new Promise((resolve, reject) => {
      getStorageArea().clear(() => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }
        resolve();
      });
    });
  }

  return {
    get,
    set,
    remove,
    clear,
    isSyncAvailable: () => ready.then(() => isSyncAvailable),
    // Exposing local and sync directly for specific cases like history (local) vs settings (sync)
    local: chrome.storage.local,
    sync: chrome.storage.sync,
  };
})();