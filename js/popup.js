/**
 * @file js/popup.js
 * @description Main entry point. Bootstraps the application with caching and auto-highlight support.
 */

import { Store } from './core/Store.js';
import { eventBus } from './core/EventBus.js';
import { UIManager } from './ui/UIManager.js';
import { StorageService } from './services/StorageService.js';
import { MessagingService } from './services/MessagingService.js';
import { geminiService } from './services/GeminiService.js';
import { notificationService } from './services/NotificationService.js';

const CACHE_KEY = 'lastQuizState';

class App {
    constructor() {
        this.store = new Store({
            view: 'loading',
            content: null,
            answer: null,
            explanation: null,
            isImageMode: false,
            imageUrl: null,
            imageStep: 'idle',
            isCollapsed: true,
            isAnalyzing: true  // Track analyzing state
        });

        this.ui = new UIManager(this.store);
        this._bindGlobalEvents();
    }

    async init() {
        try {
            // Check API Key
            const apiKey = await StorageService.getApiKey();
            if (!apiKey) {
                this.store.setState({ view: 'onboarding' });
                return;
            }

            // Get Active Tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            this.tabId = tab.id;
            this.tabUrl = tab.url;

            // Check for Context Menu Action (from background)
            const bgResponse = await chrome.runtime.sendMessage({ action: 'popupReady' });
            if (bgResponse) {
                this._handleContextAction(bgResponse);
                return;
            }

            // Check for cached state for this tab
            const cached = await this._getCachedState();
            if (cached && cached.tabUrl === this.tabUrl && cached.answer) {
                console.log('Restoring cached state');
                this.store.setState({
                    view: 'quiz',
                    content: cached.content,
                    answer: cached.answer,
                    isImageMode: false,
                    isAnalyzing: false  // Not analyzing when loading from cache
                });
                // Re-trigger highlight with cached answer
                this._triggerAutoHighlight(cached.answer);
                return;
            }

            // Default: Scan Page
            this._startScan();

        } catch (e) {
            console.error(e);
            this.store.setState({ view: 'error' });
            notificationService.error(e.message);
        }
    }

    _bindGlobalEvents() {
        // UI Events -> Logic
        eventBus.on('ui:rescan', () => {
            this._clearCache();
            this._startScan();
        });

        eventBus.on('ui:visualSolve', () => {
            this.store.setState({ view: 'loading', isAnalyzing: true });
            chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
                if (chrome.runtime.lastError) {
                    notificationService.error(chrome.runtime.lastError.message);
                    this.store.setState({ view: 'error' });
                    return;
                }
                this._handleImageAnalysis(dataUrl);
            });
        });

        eventBus.on('ui:analyzePage', async () => {
            this.store.setState({ view: 'loading', isAnalyzing: true });
            try {
                const res = await MessagingService.sendMessage(this.tabId, { action: 'get_full_page_content' });
                this.store.setState({ view: 'general' });
                geminiService.call('pageAnalysis', res.content, null, this.tabId);
            } catch (e) {
                notificationService.error(e.message);
                this.store.setState({ view: 'error' });
            }
        });

        eventBus.on('ui:retryAnswer', () => {
            const state = this.store.getState();
            if (state.content) {
                this.store.setState({ answer: null, isAnalyzing: true });
                geminiService.call('answer', state.content, null, this.tabId);
            }
        });

        eventBus.on('ui:explain', () => {
            const state = this.store.getState();
            this.store.setState({ explanation: 'Loading explanation...' });
            geminiService.call('quiz_explanation', `${state.content}\n\nAnswer: ${state.answer}`, null, this.tabId);
        });

        // Stream Events -> State Updates
        eventBus.on('stream:update', ({ purpose, fullText }) => {
            if (purpose === 'answer') {
                this.store.setState({ answer: fullText });
            } else if (purpose === 'cleaning') {
                this.store.setState({ content: fullText });
            } else if (purpose === 'quiz_explanation') {
                this.store.setState({ explanation: fullText });
            }
        });

        eventBus.on('stream:done', ({ purpose, text }) => {
            if (purpose === 'image-quiz') {
                // OCR Done -> Start Cleaning
                this.store.setState({ content: text, imageStep: 'cleaning' });
                geminiService.call('cleaning', text, null, this.tabId);
            } else if (purpose === 'cleaning') {
                // Cleaning Done -> Start Answering
                this.store.setState({ content: text });
                geminiService.call('answer', text, null, this.tabId);
            } else if (purpose === 'answer') {
                // Answer Done -> Stop analyzing
                this.store.setState({ answer: text, imageStep: 'done', isAnalyzing: false });
                // Cache the result
                this._cacheState(text);
                // Auto-highlight the answer
                this._triggerAutoHighlight(text);
            }
        });
    }

    async _startScan() {
        this.store.setState({ view: 'loading', isAnalyzing: true });
        try {
            await MessagingService.ensureContentScript(this.tabId);
            const res = await MessagingService.sendMessage(this.tabId, { action: 'get_quiz_content' });

            if (res && res.content) {
                this.store.setState({
                    view: 'quiz',
                    content: 'Scanning and cleaning content...',
                    isImageMode: false,
                    isAnalyzing: true
                });
                geminiService.call('cleaning', res.content, null, this.tabId);
            } else {
                this.store.setState({ view: 'error' });
                notificationService.error('No quiz content found. Try "Visual Solve".');
            }
        } catch (e) {
            console.error(e);
            this.store.setState({ view: 'error' });
            notificationService.error(e.message);
        }
    }

    _handleImageAnalysis(dataUrl) {
        this.store.setState({
            view: 'quiz',
            isImageMode: true,
            imageUrl: dataUrl,
            imageStep: 'ocr',
            content: 'Extracting text from image...',
            isAnalyzing: true
        });
        geminiService.call('image-quiz', '', dataUrl, this.tabId);
    }

    _handleContextAction(data) {
        if (data.action.startsWith('image-')) {
            this._handleImageAnalysis(data.srcUrl || data.base64ImageData);
        } else {
            this.store.setState({ view: 'general' });
            geminiService.call(data.action, data.selectionText, null, this.tabId);
        }
    }

    // --- Caching Methods ---
    async _cacheState(answer) {
        const state = this.store.getState();
        const cacheData = {
            tabUrl: this.tabUrl,
            content: state.content,
            answer: answer,
            timestamp: Date.now()
        };
        await chrome.storage.session.set({ [CACHE_KEY]: cacheData });
    }

    async _getCachedState() {
        const result = await chrome.storage.session.get(CACHE_KEY);
        return result[CACHE_KEY] || null;
    }

    async _clearCache() {
        await chrome.storage.session.remove(CACHE_KEY);
    }

    // --- Auto-Highlight ---
    async _triggerAutoHighlight(answerText) {
        try {
            const settings = await StorageService.get(['autoHighlightAnswer']);
            if (settings.autoHighlightAnswer !== false) { // Default to true
                await MessagingService.sendMessage(this.tabId, {
                    action: 'highlight-answer',  // Fixed: Use hyphen to match content.js
                    payload: { text: [answerText] }  // Fixed: Use 'text' array as expected by content.js
                }, 3000);
            }
        } catch (e) {
            console.warn('Auto-highlight failed:', e.message);
        }
    }
}

// Start
const app = new App();
document.addEventListener('DOMContentLoaded', () => app.init());