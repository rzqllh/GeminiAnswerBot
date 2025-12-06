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

    render(state) {
        // View Switching
        if (state.view) {
            this.renderer.showView(state.view);
        }

        // Analyzing Status (hide when done)
        if (this.elements.contentDisplayWrapper) {
            if (state.isAnalyzing === false && state.answer) {
                // Hide analyzing status when we have an answer
                this.elements.contentDisplayWrapper.classList.add('hidden');
            } else if (state.isAnalyzing) {
                this.elements.contentDisplayWrapper.classList.remove('hidden');
            }
        }

        // Content Updates (Question Card)
        if (state.content) {
            this.renderer.renderContent(state.content);
            // Show Question card
            if (this.elements.questionContainer) {
                this.elements.questionContainer.classList.remove('hidden');
            }
            if (this.elements.questionDisplay) {
                // Use textContent to display raw text safely
                this.elements.questionDisplay.textContent = state.content;
            }
        }

        // Answer Updates
        if (state.answer) {
            if (this.elements.answerContainer) this.elements.answerContainer.classList.remove('hidden');
            if (this.elements.answerDisplay) {
                // Use textContent to avoid HTML parsing issues
                this.elements.answerDisplay.textContent = state.answer;
            }
        }

        // Explanation Updates
        if (state.explanation) {
            if (this.elements.explanationContainer) this.elements.explanationContainer.classList.remove('hidden');
            if (this.elements.explanationDisplay) {
                // Explanation can use markdown since it's prose
                const cleanHtml = DOMPurify.sanitize(marked.parse(state.explanation));
                this.elements.explanationDisplay.innerHTML = cleanHtml;
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
