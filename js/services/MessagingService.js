/**
 * @file js/services/MessagingService.js
 * @description Manages communication with the content script (ping, extraction, highlighting).
 */

export class MessagingService {
    /**
     * Send a message to a specific tab with a timeout.
     * @param {number} tabId - The tab ID.
     * @param {Object} message - The message payload.
     * @param {number} timeoutMs - Timeout in milliseconds.
     * @returns {Promise<any>} The response from the content script.
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
            // Inject Mark.js first (required for highlighting)
            await chrome.scripting.executeScript({
                target: { tabId },
                files: ['js/vendor/mark.min.js', 'js/vendor/marked.min.js', 'js/vendor/dompurify.min.js', 'js/content.js']
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
}
