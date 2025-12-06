/**
 * @file js/services/StorageService.js
 * @description Wrapper for chrome.storage to handle user settings with v4.0 feature defaults.
 */

// Default settings for v4.0 features
export const DEFAULT_SETTINGS = {
    // Existing settings
    geminiApiKey: '',
    selectedModel: 'gemini-2.5-pro',
    autoHighlight: true,
    preSubmissionCheck: false,
    temperature: 0.4,
    debugMode: false,

    // v4.0 New Features
    autoClickEnabled: false,
    displayMode: 'popup',
    responseLanguage: 'auto',
    enableContextMemory: true,
    contextMemoryLimit: 5,
    batchModeEnabled: false,
    confidenceScoreEnabled: true,
    learningModeEnabled: false,

    // Theme settings
    theme: {
        preset: 'default',
        accentColor: '#1a73e8',
        mode: 'auto'
    }
};

export class StorageService {
    /**
     * Get settings from storage with defaults.
     * @param {string|string[]|null} keys - Keys to retrieve.
     * @returns {Promise<Object>} The retrieved settings.
     */
    static get(keys) {
        return new Promise((resolve) => {
            chrome.storage.sync.get(keys, (items) => {
                if (keys === null) {
                    resolve({ ...DEFAULT_SETTINGS, ...items });
                } else {
                    resolve(items || {});
                }
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

    /**
     * Get a specific setting with default fallback.
     * @param {string} key - The setting key.
     * @returns {Promise<any>} The setting value or default.
     */
    static async getSetting(key) {
        const result = await this.get([key]);
        return result[key] !== undefined ? result[key] : DEFAULT_SETTINGS[key];
    }

    /**
     * Get all v4.0 feature settings.
     * @returns {Promise<Object>} All feature settings.
     */
    static async getFeatureSettings() {
        const keys = [
            'autoClickEnabled',
            'displayMode',
            'responseLanguage',
            'enableContextMemory',
            'contextMemoryLimit',
            'batchModeEnabled',
            'confidenceScoreEnabled',
            'learningModeEnabled',
            'theme'
        ];
        const result = await this.get(keys);
        return {
            autoClickEnabled: result.autoClickEnabled ?? DEFAULT_SETTINGS.autoClickEnabled,
            displayMode: result.displayMode ?? DEFAULT_SETTINGS.displayMode,
            responseLanguage: result.responseLanguage ?? DEFAULT_SETTINGS.responseLanguage,
            enableContextMemory: result.enableContextMemory ?? DEFAULT_SETTINGS.enableContextMemory,
            contextMemoryLimit: result.contextMemoryLimit ?? DEFAULT_SETTINGS.contextMemoryLimit,
            batchModeEnabled: result.batchModeEnabled ?? DEFAULT_SETTINGS.batchModeEnabled,
            confidenceScoreEnabled: result.confidenceScoreEnabled ?? DEFAULT_SETTINGS.confidenceScoreEnabled,
            learningModeEnabled: result.learningModeEnabled ?? DEFAULT_SETTINGS.learningModeEnabled,
            theme: result.theme ?? DEFAULT_SETTINGS.theme
        };
    }

    /**
     * Local storage operations for session data (context memory, learning data).
     */
    static local = {
        get(keys) {
            return new Promise((resolve) => {
                chrome.storage.local.get(keys, (items) => {
                    resolve(items || {});
                });
            });
        },

        set(items) {
            return new Promise((resolve) => {
                chrome.storage.local.set(items, resolve);
            });
        },

        /**
         * Get context memory for current session.
         * @returns {Promise<Array>} Array of {question, answer} objects.
         */
        async getContextMemory() {
            const { contextMemory = [] } = await this.get('contextMemory');
            return contextMemory;
        },

        /**
         * Add to context memory (FIFO with limit).
         * @param {Object} entry - {question, answer} to add.
         * @param {number} limit - Max entries to keep.
         */
        async addToContextMemory(entry, limit = 5) {
            const memory = await this.getContextMemory();
            memory.push(entry);
            const trimmed = memory.slice(-limit);
            await this.set({ contextMemory: trimmed });
        },

        /**
         * Clear context memory (for new quiz session).
         */
        async clearContextMemory() {
            await this.set({ contextMemory: [] });
        },

        /**
         * Get learning data (wrong answers for review).
         * @returns {Promise<Object>} Learning data object.
         */
        async getLearningData() {
            const { learningData = { wrongAnswers: [], reviewList: [] } } = await this.get('learningData');
            return learningData;
        },

        /**
         * Add a wrong answer to learning data.
         * @param {Object} entry - {question, userAnswer, correctAnswer, timestamp, url}
         */
        async addWrongAnswer(entry) {
            const data = await this.getLearningData();
            data.wrongAnswers.push({
                ...entry,
                timestamp: Date.now(),
                reviewed: false
            });
            await this.set({ learningData: data });
        },

        /**
         * Clear learning data.
         */
        async clearLearningData() {
            await this.set({ learningData: { wrongAnswers: [], reviewList: [] } });
        }
    };
}
