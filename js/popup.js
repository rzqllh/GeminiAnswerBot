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
            isAnalyzing: true,
            confidenceScore: null
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
            this.tabTitle = tab.title;

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
                // Don't auto-highlight for cached - user may have scrolled
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
            if (!state.answer) {
                notificationService.error('No answer to explain yet.');
                return;
            }
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

        eventBus.on('stream:done', ({ purpose, text, confidenceScore }) => {
            if (purpose === 'image-quiz') {
                this.store.setState({ content: text, imageStep: 'cleaning' });
                geminiService.call('cleaning', text, null, this.tabId);
            } else if (purpose === 'cleaning') {
                this.store.setState({ content: text });
                geminiService.call('answer', text, null, this.tabId);
            } else if (purpose === 'answer') {
                this.store.setState({
                    answer: text,
                    imageStep: 'done',
                    isAnalyzing: false,
                    confidenceScore: confidenceScore ?? null
                });
                this._cacheState(text);
                this._saveToHistory(text);
                this._triggerAutoHighlight(text);
                this._saveToContextMemory(text);
            } else if (purpose === 'quiz_explanation') {
                // Explanation done - nothing extra needed, UI updates automatically
                console.log('Explanation complete');
            }
        });

        // v5.0: Save to Study Mode
        eventBus.on('ui:saveToStudy', async () => {
            const state = this.store.getState();
            if (!state.answer) {
                notificationService.error('No answer to save yet.');
                return;
            }
            try {
                const data = await chrome.storage.local.get('studyItems');
                const studyItems = data.studyItems || [];
                studyItems.unshift({
                    id: Date.now(),
                    question: state.content?.substring(0, 300) || 'Unknown',
                    correctAnswer: state.answer?.substring(0, 200) || 'Unknown',
                    savedAt: new Date().toISOString(),
                    learned: false,
                    reviewCount: 0
                });
                await chrome.storage.local.set({ studyItems });
                notificationService.success('Saved to Study Mode!');
            } catch (e) {
                notificationService.error('Failed to save.');
            }
        });

        // v5.0: Verify Answer
        eventBus.on('ui:verifyAnswer', async () => {
            const state = this.store.getState();
            if (!state.answer) {
                notificationService.error('No answer to verify.');
                return;
            }
            notificationService.info('Verifying answer...');
            geminiService.call('verification', `Verify: ${state.content}\nAnswer: ${state.answer}`, null, this.tabId);
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
                    isAnalyzing: true,
                    confidenceScore: null
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
            isAnalyzing: true,
            confidenceScore: null
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
     * Save interaction to history
     */
    async _saveToHistory(answerText) {
        try {
            const state = this.store.getState();
            const historyItem = {
                timestamp: Date.now(),
                url: this.tabUrl,
                title: this.tabTitle || 'Unknown Page',
                cleanedContent: state.content,
                answerHTML: answerText
            };

            // Get existing history
            const data = await chrome.storage.local.get('history');
            const history = data.history || [];

            // Add new item at beginning
            history.unshift(historyItem);

            // Keep only last 100 items
            if (history.length > 100) {
                history.length = 100;
            }

            // Save back
            await chrome.storage.local.set({ history });
            console.log('History saved:', historyItem.title);
        } catch (e) {
            console.warn('Failed to save history:', e.message);
        }
    }

    /**
     * Extract ONLY the correct answer text for highlighting
     * Returns single target, not all backticks
     */
    _extractHighlightTarget(answerText) {
        // 1. First try: Get content after "Answer:" and inside backticks
        // Pattern: **Answer:** `<h1>` (Option C)
        const answerWithBacktick = answerText.match(/\*?\*?Answer:?\*?\*?\s*`([^`]+)`/i);
        if (answerWithBacktick) {
            return answerWithBacktick[1].trim();
        }

        // 2. Second try: Get content after "Answer:" before parenthesis or newline
        const answerMatch = answerText.match(/\*?\*?Answer:?\*?\*?\s*([^(\n]+)/i);
        if (answerMatch) {
            let answer = answerMatch[1].trim();
            // Remove backticks if present
            answer = answer.replace(/`/g, '').trim();
            // Remove markdown formatting
            answer = answer.replace(/\*\*/g, '').trim();
            if (answer.length > 0 && answer.length < 100) {
                return answer;
            }
        }

        return null;
    }


    /**
     * v4.0: Save current Q&A to context memory for session continuity
     */
    async _saveToContextMemory(answerText) {
        try {
            const settings = await StorageService.get(['enableContextMemory', 'contextMemoryLimit']);
            if (settings.enableContextMemory === false) return;

            const state = this.store.getState();
            const question = state.content?.substring(0, 500) || '';
            const answer = answerText?.substring(0, 500) || '';

            if (question && answer) {
                await StorageService.local.addToContextMemory(
                    { question, answer },
                    settings.contextMemoryLimit || 5
                );
                console.log('Saved to context memory');
            }
        } catch (e) {
            console.warn('Failed to save context memory:', e);
        }
    }

    async _triggerAutoHighlight(answerText) {
        try {
            const settings = await StorageService.get(['autoHighlightAnswer', 'preSubmissionCheck', 'autoClickEnabled']);
            if (settings.autoHighlightAnswer === false) {
                return; // Auto-highlight disabled
            }

            // Extract the correct answer text
            const target = this._extractHighlightTarget(answerText);

            if (target) {
                console.log('Highlight target:', target);

                // First ensure content script is ready
                try {
                    await MessagingService.ensureContentScript(this.tabId);
                } catch (e) {
                    console.warn('Content script injection failed, skipping highlight');
                    return;
                }

                // Send highlight command with presubmission check option
                await MessagingService.sendMessage(this.tabId, {
                    action: 'highlight-answer',
                    payload: {
                        text: [target],
                        preSubmissionCheck: settings.preSubmissionCheck !== false
                    }
                }, 3000);

                // v4.0: Auto-click the answer if enabled
                if (settings.autoClickEnabled === true) {
                    console.log('Auto-click enabled, attempting to click answer...');
                    const clickResult = await MessagingService.autoClickAnswer(this.tabId, target);
                    if (clickResult.success) {
                        console.log('Auto-click successful:', clickResult.message);
                    } else {
                        console.warn('Auto-click failed:', clickResult.message);
                    }
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
