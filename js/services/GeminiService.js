/**
 * @file js/services/GeminiService.js
 * @description Handles all interactions with the Gemini API (streaming, cleaning, answering) with auto-retry.
 */

import { eventBus } from '../core/EventBus.js';
import { StorageService } from './StorageService.js';
import { DEFAULT_PROMPTS } from '../prompts.module.js';

export class GeminiService {
    constructor() {
        this.streamAccumulator = {};
        this._handleMessage = this._handleMessage.bind(this);
        chrome.runtime.onMessage.addListener(this._handleMessage);
    }

    /**
     * Call Gemini API with streaming and auto-retry.
     * @param {string} purpose - The purpose key (e.g., 'answer', 'cleaning').
     * @param {string} content - The user content/context.
     * @param {string|null} image - Base64 image data (optional).
     * @param {number} tabId - The active tab ID.
     */
    async call(purpose, content, image = null, tabId) {
        const config = await StorageService.get(null);
        const profile = config.promptProfiles?.[config.activeProfile] || DEFAULT_PROMPTS;
        const systemPrompt = profile[purpose] || DEFAULT_PROMPTS[purpose];

        if (!config.geminiApiKey) {
            eventBus.emit('error', 'API Key is missing. Please check settings.');
            return;
        }

        // Reset accumulator for this purpose
        this.streamAccumulator[purpose] = '';

        // Send message to background script to handle the actual API call
        // The background script handles the fetch and streaming response
        chrome.runtime.sendMessage({
            action: 'callGeminiStream',
            payload: {
                apiKey: config.geminiApiKey,
                model: config.selectedModel || 'gemini-1.5-flash',
                systemPrompt,
                userContent: content,
                base64ImageData: image,
                purpose,
                tabId
            }
        });
    }

    _handleMessage(request) {
        if (request.action === 'geminiStreamUpdate') {
            // Purpose is at the root of the request, not inside payload
            const purpose = request.purpose;
            const { chunk, done, fullText, error, success } = request.payload || {};

            if (error || success === false) {
                const errorMsg = typeof error === 'object' ? error.message : error;
                eventBus.emit('error', `Gemini Error: ${errorMsg || 'Unknown error'}`);
                return;
            }

            // Initialize accumulator if needed
            if (!this.streamAccumulator[purpose]) {
                this.streamAccumulator[purpose] = '';
            }

            // Accumulate
            if (chunk) {
                this.streamAccumulator[purpose] += chunk;
                eventBus.emit('stream:update', { purpose, chunk, fullText: this.streamAccumulator[purpose] });
            }

            // Done
            if (done) {
                const finalText = fullText || this.streamAccumulator[purpose];
                eventBus.emit('stream:done', { purpose, text: finalText });
                delete this.streamAccumulator[purpose];
            }
        }
    }
}

export const geminiService = new GeminiService();
