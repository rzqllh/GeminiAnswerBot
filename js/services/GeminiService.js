/**
 * @file js/services/GeminiService.js
 * @description Handles all interactions with the Gemini API (streaming, cleaning, answering) with v4.0 features.
 */

import { eventBus } from '../core/EventBus.js';
import { StorageService } from './StorageService.js';
import { DEFAULT_PROMPTS } from '../prompts.module.js';

// Language code to full name map
const LANGUAGE_NAMES = {
    'auto': null,
    'en': 'English',
    'id': 'Indonesian',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'ko': 'Korean',
    'ar': 'Arabic'
};

export class GeminiService {
    constructor() {
        this.streamAccumulator = {};
        this._handleMessage = this._handleMessage.bind(this);
        chrome.runtime.onMessage.addListener(this._handleMessage);
    }

    /**
     * Call Gemini API with streaming, context memory, and language support.
     * @param {string} purpose - The purpose key (e.g., 'answer', 'cleaning').
     * @param {string} content - The user content/context.
     * @param {string|null} image - Base64 image data (optional).
     * @param {number} tabId - The active tab ID.
     */
    async call(purpose, content, image = null, tabId) {
        const config = await StorageService.get(null);
        const profile = config.promptProfiles?.[config.activeProfile] || DEFAULT_PROMPTS;
        let systemPrompt = profile[purpose] || DEFAULT_PROMPTS[purpose];

        if (!config.geminiApiKey) {
            eventBus.emit('error', 'API Key is missing. Please check settings.');
            return;
        }

        // v4.0: Language support
        const responseLanguage = config.responseLanguage ?? 'auto';
        if (responseLanguage !== 'auto' && LANGUAGE_NAMES[responseLanguage]) {
            systemPrompt += `\n\nIMPORTANT: Respond ONLY in ${LANGUAGE_NAMES[responseLanguage]}.`;
        }

        // v4.0: Confidence score enhancement for answer purpose
        if (purpose === 'answer' && config.confidenceScoreEnabled !== false) {
            if (!systemPrompt.includes('Confidence:')) {
                systemPrompt += '\n\n**Confidence:** [0-100]% - Provide a numerical confidence score.';
            }
        }

        // v4.0: Context memory - inject previous Q&A for better context
        let enrichedContent = content;
        if (purpose === 'answer' && config.enableContextMemory !== false) {
            try {
                const contextMemory = await StorageService.local.getContextMemory();
                if (contextMemory.length > 0) {
                    const contextStr = contextMemory
                        .map((item, i) => `Previous Q${i + 1}: ${item.question}\nAnswer${i + 1}: ${item.answer}`)
                        .join('\n\n');
                    enrichedContent = `[Context from previous questions in this quiz session]\n${contextStr}\n\n[Current Question]\n${content}`;
                }
            } catch (e) {
                console.warn('Failed to load context memory:', e);
            }
        }

        // Reset accumulator for this purpose
        this.streamAccumulator[purpose] = '';

        // Send message to background script to handle the actual API call
        chrome.runtime.sendMessage({
            action: 'callGeminiStream',
            payload: {
                apiKey: config.geminiApiKey,
                model: config.selectedModel || 'gemini-1.5-flash',
                systemPrompt,
                userContent: enrichedContent,
                base64ImageData: image,
                purpose,
                tabId
            }
        });
    }

    _handleMessage(request) {
        if (request.action === 'geminiStreamUpdate') {
            const purpose = request.purpose;
            const { chunk, done, fullText, error, success } = request.payload || {};

            if (error || success === false) {
                const errorMsg = typeof error === 'object' ? error.message : error;
                eventBus.emit('error', `Gemini Error: ${errorMsg || 'Unknown error'}`);
                return;
            }

            if (!this.streamAccumulator[purpose]) {
                this.streamAccumulator[purpose] = '';
            }

            if (chunk) {
                this.streamAccumulator[purpose] += chunk;
                eventBus.emit('stream:update', { purpose, chunk, fullText: this.streamAccumulator[purpose] });
            }

            if (done) {
                const finalText = fullText || this.streamAccumulator[purpose];

                // v4.0: Parse confidence score if present
                const confidenceMatch = finalText.match(/\*\*Confidence:\*\*\s*(?:(\d+)%|(\w+))/i);
                let confidenceScore = null;
                if (confidenceMatch) {
                    if (confidenceMatch[1]) {
                        confidenceScore = parseInt(confidenceMatch[1], 10);
                    } else if (confidenceMatch[2]) {
                        const level = confidenceMatch[2].toLowerCase();
                        confidenceScore = level === 'high' ? 90 : level === 'medium' ? 70 : level === 'low' ? 40 : null;
                    }
                }

                eventBus.emit('stream:done', { purpose, text: finalText, confidenceScore });
                delete this.streamAccumulator[purpose];
            }
        }
    }
}

export const geminiService = new GeminiService();
