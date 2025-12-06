/**
 * @file js/ui/UIManager.js
 * @description Main UI controller. Subscribes to the Store and orchestrates view changes.
 */

import { ViewRenderer } from './ViewRenderer.js';
import { eventBus } from '../core/EventBus.js';
import { notificationService } from '../services/NotificationService.js';

export class UIManager {
    constructor(store) {
        this.store = store;
        this.elements = this._queryElements();
        this.renderer = new ViewRenderer(this.elements);

        // Subscribe to store
        this.store.subscribe(this.render.bind(this));

        // Bind events
        this._bindEvents();

        // Listen for global errors
        eventBus.on('error', (msg) => notificationService.error(msg));
    }

    _queryElements() {
        const ids = [
            'visualSolveButton', 'analyzePageButton', 'rescanButton', 'settingsButton',
            'onboardingContainer', 'onboardingGoToSettings',
            'generalTaskContainer', 'generalTaskDisplay',
            'quizModeContainer', 'imagePreviewContainer', 'imagePreview', 'imageStatusText',
            'contentDisplayWrapper', 'contentDisplay',
            'questionContainer', 'questionDisplay',
            'answerContainer', 'answerDisplay',
            'showReasoningButton', 'copyAnswer', 'retryAnswer',
            'verifyButton', 'feedbackCorrect', 'feedbackIncorrect',
            'reasoningDisplay',
            'explanationContainer', 'explanationDisplay', 'explanationButton',
            'errorContainer', 'errorTitle', 'errorMessage'
        ];

        const elements = {};
        ids.forEach(id => {
            elements[id] = document.getElementById(id);
        });
        return elements;
    }

    _bindEvents() {
        // Header
        this.elements.settingsButton?.addEventListener('click', () => chrome.runtime.openOptionsPage());
        this.elements.rescanButton?.addEventListener('click', () => eventBus.emit('ui:rescan'));
        this.elements.visualSolveButton?.addEventListener('click', () => eventBus.emit('ui:visualSolve'));
        this.elements.analyzePageButton?.addEventListener('click', () => eventBus.emit('ui:analyzePage'));

        // Content Toggle (Status Bar)
        this.elements.contentDisplayWrapper?.querySelector('.toggle-header')?.addEventListener('click', () => {
            const current = this.store.getState().isCollapsed;
            this.store.setState({ isCollapsed: !current });
        });

        // Actions
        this.elements.copyAnswer?.addEventListener('click', () => {
            const text = this.store.getState().answer;
            if (text) {
                navigator.clipboard.writeText(text);
                notificationService.show('Answer copied!', 'success');
            }
        });

        this.elements.retryAnswer?.addEventListener('click', () => eventBus.emit('ui:retryAnswer'));
        this.elements.explanationButton?.addEventListener('click', () => eventBus.emit('ui:explain'));
    }

    /**
     * Parse markdown to HTML safely
     * Uses marked.js directly - backticks become <code> tags which are styled
     */
    _parseMarkdown(text) {
        if (!text) return '';
        // Just use marked directly - it handles code blocks properly
        const html = marked.parse(text);
        return DOMPurify.sanitize(html);
    }

    render(state) {
        // View Switching
        if (state.view) {
            this.renderer.showView(state.view);
        }

        // Analyzing Status (hide when done)
        if (this.elements.contentDisplayWrapper) {
            if (state.isAnalyzing === false && state.answer) {
                this.elements.contentDisplayWrapper.classList.add('hidden');
            } else if (state.isAnalyzing) {
                this.elements.contentDisplayWrapper.classList.remove('hidden');
            }
        }

        // Content Updates (Question Card)
        if (state.content) {
            this.renderer.renderContent(state.content);
            if (this.elements.questionContainer) {
                this.elements.questionContainer.classList.remove('hidden');
            }
            if (this.elements.questionDisplay) {
                // Parse markdown for proper formatting
                this.elements.questionDisplay.innerHTML = this._parseMarkdown(state.content);
            }
        }

        // Answer Updates
        if (state.answer) {
            if (this.elements.answerContainer) this.elements.answerContainer.classList.remove('hidden');
            if (this.elements.answerDisplay) {
                // Parse markdown for answer
                this.elements.answerDisplay.innerHTML = this._parseMarkdown(state.answer);
            }
        }

        // Explanation Updates
        if (state.explanation) {
            if (this.elements.explanationContainer) this.elements.explanationContainer.classList.remove('hidden');
            if (this.elements.explanationDisplay) {
                this.elements.explanationDisplay.innerHTML = this._parseMarkdown(state.explanation);
            }
        }

        // Collapse State
        this.renderer.toggleCollapse(state.isCollapsed);

        // Image Mode
        if (state.isImageMode) {
            if (this.elements.imagePreviewContainer) this.elements.imagePreviewContainer.classList.remove('hidden');
            if (this.elements.imagePreview) this.elements.imagePreview.src = state.imageUrl;
            this.renderer.updateImageStatus(state.imageStep === 'ocr' ? 'Reading text...' : 'Analyzed');
        } else {
            if (this.elements.imagePreviewContainer) this.elements.imagePreviewContainer.classList.add('hidden');
        }
    }
}
