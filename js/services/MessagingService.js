/**
 * @file js/services/MessagingService.js
 * @description Centralized messaging utilities for communicating between popup and content scripts.
 */

export class MessagingService {
    /**
     * Send a message to a tab with a timeout.
     * @param {number} tabId - The tab ID.
     * @param {object} message - The message to send.
     * @param {number} [timeoutMs=5000] - Timeout in milliseconds.
     * @returns {Promise<any>}
     */
    static sendMessage(tabId, message, timeoutMs = 5000) {
        return new Promise((resolve, reject) => {
            let isTimedOut = false;
            const timer = setTimeout(() => {
                isTimedOut = true;
                reject(new Error(`Timeout waiting for content script response (${message.action})`));
            }, timeoutMs);

            chrome.tabs.sendMessage(tabId, message, (response) => {
                clearTimeout(timer);
                if (isTimedOut) return;

                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(response);
                }
            });
        });
    }

    /**
     * Ensure the content script is injected and ready.
     * @param {number} tabId - The tab ID.
     * @returns {Promise<void>}
     */
    static async ensureContentScript(tabId) {
        try {
            await this.sendMessage(tabId, { action: 'ping' }, 1000);
        } catch (e) {
            console.log('Content script not ready, injecting...', e);
            // Inject helpers first (for _escapeHtml), then libraries, then content scripts
            await chrome.scripting.executeScript({
                target: { tabId },
                files: [
                    'js/utils/helpers.js',
                    'js/vendor/mark.min.js',
                    'js/vendor/marked.min.js',
                    'js/vendor/dompurify.min.js',
                    'js/content.js',
                    'js/autoclick.js'
                ]
            });

            // Inject CSS safely
            await chrome.scripting.insertCSS({
                target: { tabId },
                files: ['assets/content.css']
            });

            // Wait a bit for initialization
            await new Promise(r => setTimeout(r, 500));
        }
    }

    /**
     * Send auto-click command to content script.
     * @param {number} tabId - The tab ID.
     * @param {string} answerText - The answer text to auto-click.
     * @returns {Promise<Object>}
     */
    static async autoClickAnswer(tabId, answerText) {
        try {
            return await this.sendMessage(tabId, {
                action: 'auto-click-answer',
                payload: { text: answerText }
            }, 3000);
        } catch (e) {
            console.error('Auto-click failed:', e);
            return { success: false, message: e.message };
        }
    }
}
