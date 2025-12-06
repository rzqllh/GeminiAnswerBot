/**
 * @file js/services/StorageService.js
 * @description Wrapper for chrome.storage to handle user settings.
 */

export class StorageService {
    /**
     * Get settings from storage.
     * @param {string|string[]|null} keys - Keys to retrieve.
     * @returns {Promise<Object>} The retrieved settings.
     */
    static get(keys) {
        return new Promise((resolve) => {
            chrome.storage.sync.get(keys, (items) => {
                resolve(items || {});
            });
        });
    }

    /**
     * Save settings to storage.
     * @param {Object} items - Key-value pairs to save.
     * @returns {Promise<void>}
     */
    static set(items) {
        return new Promise((resolve) => {
            chrome.storage.sync.set(items, () => {
                resolve();
            });
        });
    }

    /**
     * Get the API Key.
     * @returns {Promise<string>} The API Key.
     */
    static async getApiKey() {
        const { geminiApiKey } = await this.get('geminiApiKey');
        return geminiApiKey;
    }
}
