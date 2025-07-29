// js/popup.js

/**
 * Manages the entire lifecycle and UI of the popup.
 * This class-based approach encapsulates state, centralizes DOM element access,
 * and provides a structured, scalable way to manage the extension's popup logic.
 */
class PopupApp {
    /**
     * Caches DOM elements, initializes state, and binds event listeners.
     */
    constructor() {
        this.state = {
            tab: null,
            config: {},
            view: 'loading', // 'loading', 'quiz', 'summary', 'error', 'info'
            error: null,
            cleanedContent: null,
            originalUserContent: null,
            answerHTML: null,
            explanationHTML: null,
            totalTokenCount: 0,
            cacheKey: null,
            incorrectAnswer: null,
        };

        this.elements = {};
        this.streamAccumulator = {};

        this._queryElements();
        this._bindEvents();
    }

    /**
     * Queries and caches all necessary DOM elements for performance.
     * @private
     */
    _queryElements() {
        const ids = [
            'settingsButton', 'analyzePageButton', 'rescanButton', 'explanationButton',
            'aiActionsWrapper', 'pageSummaryContainer', 'quizModeContainer',
            'contentDisplayWrapper', 'contentDisplay', 'answerContainer', 'answerDisplay',
            'explanationContainer', 'explanationDisplay', 'messageArea',
            'retryAnswer', 'retryExplanation', 'copyAnswer', 'copyExplanation',
            'feedbackContainer', 'feedbackCorrect', 'feedbackIncorrect',
            'correctionPanel', 'correctionOptions'
        ];
        ids.forEach(id => {
            const key = id.replace(/-([a-z])/g, g => g[1].toUpperCase());
            this.elements[key] = document.getElementById(id);
        });
    }

    /**
     * Centralized method for all event bindings.
     * @private
     */
    _bindEvents() {
        this.elements.settingsButton.addEventListener('click', () => chrome.runtime.openOptionsPage());
        this.elements.analyzePageButton.addEventListener('click', () => this._handlePageAnalysis());
        this.elements.rescanButton.addEventListener('click', () => this._handleRescan());
        this.elements.explanationButton.addEventListener('click', () => this._getExplanation());
        this.elements.retryAnswer.addEventListener('click', () => this._getAnswer());
        this.elements.retryExplanation.addEventListener('click', () => this._getExplanation());
        this.elements.feedbackCorrect.addEventListener('click', () => this._handleFeedbackCorrect());
        this.elements.feedbackIncorrect.addEventListener('click', () => this._handleFeedbackIncorrect());

        this.elements.copyAnswer.addEventListener('click', e => this._copyToClipboard(e.currentTarget));
        this.elements.copyExplanation.addEventListener('click', e => this._copyToClipboard(e.currentTarget));

        chrome.runtime.onMessage.addListener((request) => {
            if (request.action === 'geminiStreamUpdate') {
                this._handleStreamUpdate(request);
            }
        });
    }

    /**
     * Main entry point. Orchestrates the initial loading and logic flow.
     */
    async init() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.id) throw new Error('Cannot find the active tab.');
            this.state.tab = tab;

            const protectedUrls = ['chrome://', 'https://chrome.google.com/'];
            if (protectedUrls.some(url => tab.url.startsWith(url))) {
                this.state.view = 'info';
                this.render();
                return;
            }

            this.state.config = await chrome.storage.sync.get(null);
            if (!this.state.config.geminiApiKey) {
                throw { type: 'INVALID_API_KEY', message: 'API Key not set. Please go to the options page to set it up.' };
            }

            await this._injectScripts();
            
            const contextKey = `context_action_${tab.id}`;
            const contextData = (await chrome.storage.local.get(contextKey))[contextKey];

            if (contextData?.action && contextData?.selectionText) {
                await chrome.storage.local.remove(contextKey);
                this.state.originalUserContent = contextData.selectionText;
                this.state.view = 'quiz';
                this.render();
                this._callGeminiStream(contextData.action, contextData.selectionText, contextData.selectionText);
            } else {
                const persistedState = await this._getPersistedState();
                Object.assign(this.state, persistedState);

                if (this.state.cleanedContent) {
                    this.state.view = 'quiz';
                    this.render();
                } else {
                    this.state.view = 'loading';
                    this.render();
                    const response = await this._sendMessageToContentScript({ action: "get_page_content" });
                    if (!response || !response.content?.trim()) {
                        throw new Error("No readable content found on this page.");
                    }
                    this.state.originalUserContent = response.content;
                    this._callGeminiStream('cleaning', response.content);
                }
            }
        } catch (error) {
            console.error("Initialization failed:", error);
            this.state.view = 'error';
            this.state.error = error.type ? error : { type: 'INTERNAL_ERROR', message: `Could not establish connection. ${error.message}` };
            this.render();
        }
    }
    
    /**
     * Centralized UI render function based on the current state view.
     */
    render() {
        this.elements.messageArea.classList.add('hidden');
        this.elements.quizModeContainer.classList.add('hidden');
        this.elements.pageSummaryContainer.classList.add('hidden');

        switch (this.state.view) {
            case 'loading':
                this.elements.messageArea.classList.remove('hidden');
                this.elements.messageArea.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Scanning for quiz...</p></div>`;
                break;

            case 'info':
                this.elements.messageArea.classList.remove('hidden');
                this.elements.messageArea.innerHTML = `<div class="info-panel"><div class="info-panel-header">Page Not Supported</div><div class="info-panel-body"><p>For your security, Chrome extensions cannot run on this special page.</p></div></div>`;
                break;

            case 'error':
                this.elements.messageArea.classList.remove('hidden');
                this._renderErrorState();
                break;
                
            case 'summary':
                this.elements.pageSummaryContainer.classList.remove('hidden');
                break;

            case 'quiz':
                this.elements.quizModeContainer.classList.remove('hidden');
                this._renderQuizState();
                break;
        }
    }
    
    /**
     * Renders the UI for the 'quiz' view based on the current state.
     * @private
     */
    _renderQuizState() {
        this.elements.contentDisplayWrapper.classList.remove('hidden');
        this.elements.answerContainer.classList.remove('hidden');

        if (this.state.cleanedContent) {
            this.elements.contentDisplay.innerHTML = this._formatQuestionContent(this.state.cleanedContent);
        } else if (this.state.originalUserContent) {
            this.elements.contentDisplay.innerHTML = `<div class="question-text">${this._escapeHtml(this.state.originalUserContent)}</div>`;
        }

        if (this.state.answerHTML) {
            this._handleAnswerResult(this.state.answerHTML, false, this.state.totalTokenCount);
        } else if (this.state.cleanedContent) {
             this._getAnswer();
        }

        if (this.state.explanationHTML) {
            this._handleExplanationResult(this.state.explanationHTML);
        } else {
            this.elements.explanationContainer.classList.add('hidden');
        }
    }

    /**
     * Renders the detailed error panel.
     * @private
     */
    _renderErrorState() {
        let title = 'An Error Occurred';
        let userMessage = 'Something went wrong. Please try again.';
        let actionsHtml = `<button id="error-retry-btn" class="button-error">Try Again</button>`;
        const query = this.state.cleanedContent || this.state.originalUserContent || '';

        switch (this.state.error.type) {
            case 'INVALID_API_KEY': title = 'Invalid API Key'; userMessage = 'The provided API key is not valid or has been revoked. Please check your key in the settings.'; actionsHtml = `<button id="error-settings-btn" class="button-error primary">Open Settings</button>`; break;
            case 'QUOTA_EXCEEDED': title = 'API Quota Exceeded'; userMessage = 'You have exceeded your Google AI API quota. Please check your usage and billing in the Google AI Studio.'; actionsHtml = `<button id="error-quota-btn" class="button-error">Check Quota</button> <button id="error-retry-btn" class="button-error">Try Again</button>`; break;
            case 'NETWORK_ERROR': title = 'Network Error'; userMessage = 'Could not connect to the API. Please check your internet connection.'; break;
            case 'INTERNAL_ERROR': title = 'Connection Failed'; userMessage = 'Could not connect to the current page. Some pages may not be compatible.'; break;
            case 'API_ERROR': default: title = 'API Error'; userMessage = 'The API returned an error. See details below.'; if (query) actionsHtml += ` <button id="error-google-btn" class="button-error">Search on Google</button>`; break;
        }

        this.elements.messageArea.innerHTML = `<div class="error-panel"><div class="error-panel-header">${title}</div><div class="error-panel-body"><p>${userMessage}</p><details class="error-details"><summary>Technical Details</summary><code>${this._escapeHtml(this.state.error.message)}</code></details></div><div class="error-panel-actions">${actionsHtml}</div></div>`;
        
        document.getElementById('error-retry-btn')?.addEventListener('click', () => this.init());
        document.getElementById('error-settings-btn')?.addEventListener('click', () => chrome.runtime.openOptionsPage());
        document.getElementById('error-quota-btn')?.addEventListener('click', () => chrome.tabs.create({ url: 'https://aistudio.google.com/billing' }));
        document.getElementById('error-google-btn')?.addEventListener('click', () => { if (!query) return; const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`; chrome.tabs.create({ url: searchUrl }); });
    }

    _handleRescan() {
        if (!this.state.tab) return;
        chrome.storage.local.remove(this.state.tab.id.toString());
        Object.assign(this.state, {
            view: 'loading', error: null, cleanedContent: null, answerHTML: null,
            explanationHTML: null, originalUserContent: null, totalTokenCount: 0
        });
        this.init();
    }
    
    async _handlePageAnalysis() {
        this.state.view = 'loading';
        this.render();
        this.elements.messageArea.querySelector('p').textContent = 'Analyzing the entire page...';
        
        try {
            const response = await this._sendMessageToContentScript({ action: "get_page_content" });
            if (!response || !response.content?.trim()) {
                throw new Error("No readable content found on this page.");
            }
            this._callGeminiStream('pageAnalysis', response.content);
        } catch (e) {
            this.state.view = 'error';
            this.state.error = e;
            this.render();
        }
    }

    _handleFeedbackCorrect() {
        this.elements.feedbackCorrect.disabled = true;
        this.elements.feedbackIncorrect.disabled = true;
        this.elements.feedbackCorrect.classList.add('selected-correct');
    }

    async _handleFeedbackIncorrect() {
        this.elements.feedbackIncorrect.disabled = true;
        this.elements.feedbackCorrect.disabled = true;
        this.elements.feedbackIncorrect.classList.add('selected-incorrect');

        this.elements.aiActionsWrapper.classList.add('hidden');
        this.elements.correctionPanel.classList.remove('hidden');
        this.elements.correctionOptions.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Fetching options...</p></div>`;

        try {
            const response = await this._sendMessageToContentScript({ action: "get_quiz_options" });
            if (response?.options?.length > 0) {
                this._renderCorrectionOptions(response.options);
            } else {
                this.elements.correctionOptions.innerHTML = '<p class="text-center">Could not automatically find options on the page.</p>';
            }
        } catch (e) {
            this.elements.correctionOptions.innerHTML = `<p class="text-center">Error fetching options: ${e.message}</p>`;
        }
    }

    _callGeminiStream(purpose, contentText, originalUserContent = '') {
        const { promptProfiles, activeProfile, selectedModel, geminiApiKey } = this.state.config;
        const currentPrompts = (promptProfiles?.[activeProfile]) || DEFAULT_PROMPTS;
        
        let systemPrompt = '';
        let userContent = contentText;

        const promptMap = {
            'cleaning': currentPrompts.cleaning, 'answer': currentPrompts.answer,
            'explanation': currentPrompts.explanation, 'correction': currentPrompts.correction,
            'pageAnalysis': currentPrompts.pageAnalysis, 'summarize': currentPrompts.summarize,
            'explain': currentPrompts.explanation, 'translate': currentPrompts.translate,
        };

        if (promptMap[purpose]) {
            systemPrompt = promptMap[purpose] || DEFAULT_PROMPTS[purpose];
        } else if (purpose.startsWith('rephrase-')) {
            const language = purpose.split('-')[1];
            systemPrompt = currentPrompts.rephrase || DEFAULT_PROMPTS.rephrase;
            userContent = `Target Language: ${language}\n\nText to rephrase:\n${contentText}`;
        }
        
        chrome.runtime.sendMessage({
            action: 'callGeminiStream',
            payload: { apiKey: geminiApiKey, model: selectedModel, systemPrompt, userContent, generationConfig: {}, originalUserContent, purpose }
        });
    }

    _getAnswer() {
        if (!this.state.cleanedContent) return;

        const fingerprint = this._createQuizFingerprint(this.state.cleanedContent);
        this.state.cacheKey = fingerprint ? this._simpleHash(fingerprint) : null;

        if (this.state.cacheKey) {
            chrome.storage.local.get(this.state.cacheKey).then(cachedResult => {
                 const cacheData = cachedResult[this.state.cacheKey];
                 const lines = this.state.cleanedContent.split('\n').map(l => l.trim()).filter(l => l);
                 const rawQuestion = lines.length > 0 ? lines[0] : '';
                 if (cacheData?.answerHTML && cacheData.rawQuestion === rawQuestion) {
                     this._handleAnswerResult(cacheData.answerHTML, true, cacheData.totalTokenCount);
                     return;
                 }
                 this._continueGetAnswer();
            });
        } else {
            this._continueGetAnswer();
        }
    }

    _continueGetAnswer() {
        this.elements.retryAnswer.disabled = true;
        this.elements.answerDisplay.innerHTML = `<div class="loading-state" style="min-height: 50px;"><div class="spinner"></div></div>`;
        this._callGeminiStream('answer', this.state.cleanedContent);
    }

    _getExplanation() {
        if (!this.state.cleanedContent && !this.state.answerHTML) return;
        this.elements.explanationButton.disabled = true;
        this.elements.retryExplanation.disabled = true;
        this.elements.explanationContainer.classList.remove('hidden');
        this.elements.explanationDisplay.innerHTML = `<div class="loading-state" style="min-height: 50px;"><div class="spinner"></div></div>`;
        const contentForExplanation = `${this.state.cleanedContent}\n\nAnswer: ${this.state.incorrectAnswer}`;
        this._callGeminiStream('explanation', contentForExplanation);
    }

    _handleStreamUpdate(request) {
        const { payload, purpose } = request;
        if (!payload.success) {
            this.state.view = 'error';
            this.state.error = payload.error;
            this.render();
            return;
        }

        if (payload.done) {
            const fullText = payload.fullText || this.streamAccumulator[purpose] || '';
            delete this.streamAccumulator[purpose];

            const handlePageAnalysis = (text) => {
                const cleanJsonText = text.replace(/```json|```/g, '').trim();
                try {
                    const jsonData = JSON.parse(cleanJsonText);
                    this._renderPageSummary(jsonData);
                } catch (e) {
                    // Graceful fallback for non-JSON response
                    console.warn("Failed to parse JSON, rendering as fallback.", e);
                    this._renderPageSummary(text, true);
                }
            };
            
            const purposeHandlers = {
                'cleaning': (text) => this._handleCleaningResult(text),
                'answer': (text) => this._handleAnswerResult(text, false, payload.totalTokenCount),
                'explanation': (text) => this._handleExplanationResult(text),
                'correction': (text) => this._handleCorrectionResult(text),
                'summarize': (text) => this._handleContextMenuResult(text, payload.originalUserContent, purpose),
                'explain': (text) => this._handleContextMenuResult(text, payload.originalUserContent, purpose),
                'translate': (text) => this._handleContextMenuResult(text, payload.originalUserContent, purpose),
                'pageAnalysis': handlePageAnalysis,
            };
            
            if (purposeHandlers[purpose]) {
                purposeHandlers[purpose](fullText);
            } else if (purpose.startsWith('rephrase-')) {
                this._handleContextMenuResult(fullText, payload.originalUserContent, purpose);
            }
        
        } else if (payload.chunk) {
            this.streamAccumulator[purpose] = (this.streamAccumulator[purpose] || '') + payload.chunk;
            if (purpose === 'pageAnalysis') {
                this.state.view = 'loading';
                this.render();
                this.elements.messageArea.querySelector('p').textContent = 'Receiving analysis...';
            }
        }
    }

    _handleCleaningResult(fullText) {
        this.state.cleanedContent = fullText;
        this.state.view = 'quiz';
        this.render();
        this._savePersistedState({ cleanedContent: fullText });
    }

    _handleAnswerResult(fullText, fromCache = false, totalTokenCount = 0) {
        this.state.answerHTML = fullText;
        this.state.totalTokenCount = totalTokenCount;

        const answerMatch = fullText.match(/Answer:(.*?)(Confidence:|Reason:|$)/is);
        const confidenceMatch = fullText.match(/Confidence:\s*(High|Medium|Low)/i);
        const reasonMatch = fullText.match(/Reason:(.*)/is);
        let answerText = (answerMatch ? answerMatch[1].trim() : fullText.trim()).replace(/`/g, '');
        
        let formattedHtml = `<p class="answer-highlight">${this._escapeHtml(answerText).replace(/\n/g, '<br>')}</p>`;
        let confidenceWrapperHtml = '';
        if (confidenceMatch) {
            const confidence = confidenceMatch[1].toLowerCase();
            const reason = reasonMatch ? reasonMatch[1].trim() : "";
            confidenceWrapperHtml += `<div class="confidence-level"><span class="confidence-level-label">Confidence ${fromCache ? '<span>⚡️ Cached</span>' : ''}</span><span class="confidence-badge confidence-${confidence}">${confidence.charAt(0).toUpperCase() + confidence.slice(1)}</span></div>${reason ? `<div class="confidence-reason">${this._escapeHtml(reason)}</div>` : ''}`;
        }
        if (totalTokenCount > 0) {
            confidenceWrapperHtml += `<div class="token-count"><span class="token-count-label">Tokens Used</span><span class="token-count-value">${totalTokenCount}</span></div>`;
        }
        if (confidenceWrapperHtml) formattedHtml += `<div class="confidence-wrapper">${confidenceWrapperHtml}</div>`;

        this.elements.answerDisplay.innerHTML = formattedHtml;
        this.elements.copyAnswer.dataset.copyText = answerText;
        this.elements.retryAnswer.disabled = false;
        this.elements.aiActionsWrapper.classList.remove('hidden');
        this.elements.explanationContainer.classList.add('hidden');
        this.elements.correctionPanel.classList.add('hidden');
        this.elements.feedbackContainer.classList.remove('hidden');
        this._resetFeedbackButtons();
        this.state.incorrectAnswer = answerText;

        if (this.state.config.autoHighlight) this._sendMessageToContentScript({ action: 'highlight-answer', text: [answerText] });
        
        if (!fromCache && this.state.cacheKey) {
            const lines = this.state.cleanedContent.split('\n').map(l => l.trim()).filter(l => l);
            const rawQuestion = lines.length > 0 ? lines[0] : '';
            chrome.storage.local.set({ [this.state.cacheKey]: { answerHTML: fullText, totalTokenCount, rawQuestion } });
        }

        this._savePersistedState({ answerHTML: fullText, totalTokenCount });
        if (!fromCache) this._saveToHistory({ cleanedContent: this.state.cleanedContent, answerHTML: fullText }, 'quiz');
    }

    _handleExplanationResult(fullText) {
        this.state.explanationHTML = fullText;
        this.elements.explanationDisplay.innerHTML = marked.parse(fullText);
        this.elements.copyExplanation.dataset.copyText = fullText;
        this.elements.explanationButton.disabled = false;
        this.elements.retryExplanation.disabled = false;
        this.elements.explanationContainer.classList.remove('hidden');
        this._saveToHistory({ ...this.state }, 'explanation');
    }

    _handleCorrectionResult(fullText) {
        this._handleExplanationResult(fullText);
    }

    _handleContextMenuResult(fullText, originalUserContent, purpose) {
        this.state.view = 'quiz';
        this.state.originalUserContent = originalUserContent;
        this.state.answerHTML = fullText;
        
        this.render();
        
        this.elements.answerDisplay.innerHTML = marked.parse(fullText);
        this.elements.copyAnswer.dataset.copyText = fullText;
        this.elements.aiActionsWrapper.classList.add('hidden');
        this.elements.explanationContainer.classList.add('hidden');
        this.elements.feedbackContainer.classList.add('hidden');
        
        const historyActionType = purpose.split('-')[0];
        this._saveToHistory({ cleanedContent: originalUserContent, answerHTML: fullText }, historyActionType);
    }
    
    _renderPageSummary(data, isFallback = false) {
        this.state.view = 'summary';
        let summaryHtml;

        if (isFallback) {
            // Render non-JSON response as a general summary.
            summaryHtml = `<div class="summary-section">
                <h3 class="summary-section-title">General Summary</h3>
                <div class="card-body">${marked.parse(data)}</div>
            </div>`;
        } else {
            // Render the structured JSON data.
            const tldrHtml = data.tldr ? `<div class="summary-section summary-tldr"><h3 class="summary-section-title">TL;DR</h3><p>${this._escapeHtml(data.tldr)}</p></div>` : '';
            const takeawaysHtml = (data.takeaways?.length > 0) ? `<div class="summary-section summary-takeaways"><h3 class="summary-section-title">Key Takeaways</h3><ul>${data.takeaways.map(item => `<li>${this._escapeHtml(item)}</li>`).join('')}</ul></div>` : '';
            const renderEntities = (entities, label) => (entities?.length > 0) ? `<div class="entity-group"><span class="entity-label">${label}</span><div class="entity-tags">${entities.map(e => `<span class="entity-tag">${this._escapeHtml(e)}</span>`).join('')}</div></div>` : '';
            const entitiesHtml = (data.entities && (data.entities.people?.length || data.entities.organizations?.length || data.entities.locations?.length)) ? `<div class="summary-section summary-entities"><h3 class="summary-section-title">Entities Mentioned</h3>${renderEntities(data.entities.people, 'People')}${renderEntities(data.entities.organizations, 'Organizations')}${renderEntities(data.entities.locations, 'Locations')}</div>` : '';
            summaryHtml = tldrHtml + takeawaysHtml + entitiesHtml;
        }
        
        this.elements.pageSummaryContainer.innerHTML = summaryHtml;
        this.render();
    }

    _renderCorrectionOptions(options) {
        this.elements.correctionOptions.innerHTML = '';
        options.forEach(optionText => {
            const button = document.createElement('button');
            button.className = 'correction-option-button';
            button.innerHTML = this._escapeHtml(optionText);

            button.addEventListener('click', () => {
                const userCorrectAnswer = optionText;
                const correctionContent = `The original quiz content was:\n${this.state.cleanedContent}\n\nMy previous incorrect answer was: \`${this.state.incorrectAnswer}\`\n\nThe user has indicated the correct answer is: \`${userCorrectAnswer}\``;
                this.elements.correctionPanel.classList.add('hidden');
                this.elements.explanationContainer.classList.remove('hidden');
                this.elements.explanationDisplay.innerHTML = `<div class="loading-state" style="min-height: 50px;"><div class="spinner"></div><p>Generating corrected explanation...</p></div>`;
                this._callGeminiStream('correction', correctionContent);
            });
            this.elements.correctionOptions.appendChild(button);
        });
    }

    _resetFeedbackButtons() {
        this.elements.feedbackCorrect.disabled = false;
        this.elements.feedbackIncorrect.disabled = false;
        this.elements.feedbackCorrect.classList.remove('selected-correct');
        this.elements.feedbackIncorrect.classList.remove('selected-incorrect');
    }
    
    _copyToClipboard(button) {
        const textToCopy = button.dataset.copyText;
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalTitle = button.title;
                button.title = 'Copied!';
                button.classList.add('copied');
                setTimeout(() => {
                    button.classList.remove('copied');
                    button.title = originalTitle;
                }, 1500);
            });
        }
    }

    async _getPersistedState() {
        if (!this.state.tab) return {};
        const key = this.state.tab.id.toString();
        return (await chrome.storage.local.get(key))[key] || {};
    }

    async _savePersistedState(data) {
        if (!this.state.tab) return;
        const key = this.state.tab.id.toString();
        const currentState = await this._getPersistedState();
        const newState = { ...currentState, ...data };
        await chrome.storage.local.set({ [key]: newState });
    }

    async _saveToHistory(stateData, actionType) {
        const { history = [] } = await chrome.storage.local.get('history');
        const newEntry = { ...stateData, id: Date.now(), url: this.state.tab.url, title: this.state.tab.title, timestamp: new Date().toISOString(), actionType };
        history.unshift(newEntry);
        if (history.length > 100) history.pop();
        await chrome.storage.local.set({ history });
    }
    
    async _injectScripts() {
        await chrome.scripting.executeScript({
            target: { tabId: this.state.tab.id },
            files: ['js/vendor/marked.min.js', 'js/mark.min.js', 'js/content.js']
        });
        await this._sendMessageToContentScript({ action: "ping_content_script" });
    }

    _sendMessageToContentScript(message, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Content script did not respond in time.')), timeout);
            chrome.tabs.sendMessage(this.state.tab.id, message, (response) => {
                clearTimeout(timer);
                chrome.runtime.lastError ? reject(new Error(chrome.runtime.lastError.message || 'Failed to communicate.')) : resolve(response);
            });
        });
    }

    _escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return '';
        return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }
    
    _formatQuestionContent(content) {
        if (!content) return '';
        const lines = content.split('\n').filter(line => line.trim() !== '');
        if (lines.length === 0) return '';
        const question = this._escapeHtml(lines.shift().replace(/^Question:\s*/i, ''));
        const optionsHtml = lines.map(option => `<li>${this._escapeHtml(option.trim().replace(/^[\*\-•]\s*|\d+\.\s*|[a-zA-Z]\)\s*/, ''))}</li>`).join('');
        return `<div class="question-text">${question}</div><ul>${optionsHtml}</ul>`;
    }

    _createQuizFingerprint(cleanedContent) {
        if (!cleanedContent) return null;
        const lines = cleanedContent.split('\n').map(l => l.trim()).filter(l => l);
        return lines.length < 2 ? null : lines.map(l => l.toLowerCase().replace(/\s+/g, ' ').trim()).join('\n');
    }
    
    _simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return 'cache_' + new Uint32Array([hash])[0].toString(16);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof marked !== 'undefined') {
        marked.setOptions({ sanitize: true });
    }
    
    const app = new PopupApp();
    app.init();
});