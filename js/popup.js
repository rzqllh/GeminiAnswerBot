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
            isAnalyzing: true
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
                    isAnalyzing: false
                });
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
                this.store.setState({ content: text, imageStep: 'cleaning' });
                geminiService.call('cleaning', text, null, this.tabId);
            } else if (purpose === 'cleaning') {
                this.store.setState({ content: text });
                geminiService.call('answer', text, null, this.tabId);
            } else if (purpose === 'answer') {
                this.store.setState({ answer: text, imageStep: 'done', isAnalyzing: false });
                this._cacheState(text);
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

    /**
     * Extract highlight targets from AI answer
     * Handles multiple formats: `<h1>`, Option C, (C), etc.
     */
    _extractHighlightTargets(answerText) {
        const targets = [];

        // 1. Extract content inside backticks (like `<h1>`)
        const backtickMatches = answerText.match(/`([^`]+)`/g);
        if (backtickMatches) {
            backtickMatches.forEach(match => {
                const content = match.replace(/`/g, '').trim();
                if (content) targets.push(content);
            });
        }

        // 2. Extract option letter patterns: (A), (B), Option A, etc.
        const optionMatch = answerText.match(/(?:\(([A-D])\)|Option\s*([A-D]))/i);
        if (optionMatch) {
            const letter = optionMatch[1] || optionMatch[2];
            if (letter) targets.push(letter);
        }

        // 3. Extract text after "Answer:" (fallback)
        const answerMatch = answerText.match(/\*?\*?Answer:?\*?\*?\s*(.+?)(?:\s*\(|$|\n)/i);
        if (answerMatch && answerMatch[1]) {
            const extracted = answerMatch[1].replace(/`/g, '').trim();
            if (extracted && !targets.includes(extracted)) {
                targets.push(extracted);
            }
        }

        // Remove duplicates and empty strings
        return [...new Set(targets.filter(t => t && t.length > 0))];
    }

    async _triggerAutoHighlight(answerText) {
        try {
            const settings = await StorageService.get(['autoHighlightAnswer']);
            if (settings.autoHighlightAnswer !== false) {
                // Extract multiple possible highlight targets
                const targets = this._extractHighlightTargets(answerText);

                if (targets.length > 0) {
                    console.log('Highlight targets:', targets);
                    await MessagingService.sendMessage(this.tabId, {
                        action: 'highlight-answer',
                        payload: { text: targets }
                    }, 3000);
                }
            }
        } catch (e) {
            console.warn('Auto-highlight failed:', e.message);
        }
    }
}

// Start
const app = new App();
document.addEventListener('DOMContentLoaded', () => app.init());