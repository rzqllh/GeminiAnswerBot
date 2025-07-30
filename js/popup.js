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
            lastView: 'quiz', // The view to persist
            url: null, // The URL associated with the persisted state
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
        this._messageHandler = this._handleMessages.bind(this);

        this._queryElements();
        this._bindEvents();

        window.addEventListener('unload', () => {
            chrome.runtime.onMessage.removeListener(this._messageHandler);
        });
    }

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
    }

    _handleMessages(request) {
        if (request.action === 'geminiStreamUpdate') {
            this._handleStreamUpdate(request);
        }
        if (request.action === 're_initialize_popup') {
            this.init(); // Re-run initialization
        }
    }

    async init() {
        chrome.runtime.onMessage.addListener(this._messageHandler);

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.id) throw new Error('Cannot find the active tab.');
            this.state.tab = tab;

            if (['chrome://', 'https://chrome.google.com/'].some(url => tab.url.startsWith(url))) {
                this.state.view = 'info'; this.render(); return;
            }

            this.state.config = await chrome.storage.sync.get(null);
            if (!this.state.config.geminiApiKey) throw { type: 'INVALID_API_KEY', message: 'API Key not set.' };

            // Ensure content script is ready before proceeding
            await this._pingContentScriptWithRetry(3, 200);

            const contextKey = `context_action_${tab.id}`;
            const contextData = (await chrome.storage.local.get(contextKey))[contextKey];

            if (contextData) {
                await chrome.storage.local.remove(contextKey);
                await this._clearPersistedState();
                this.state.originalUserContent = contextData.selectionText;
                this.state.view = 'quiz';
                this.render();
                this._callGeminiStream(contextData.action, contextData.selectionText);
            } else {
                const persistedState = await this._getPersistedState();
                if (persistedState && persistedState.url === this.state.tab.url) { // URL validation
                    Object.assign(this.state, persistedState);
                    this.state.view = this.state.lastView;
                    this.render();
                } else {
                    this._clearPersistedState(); // Clear state from old URL
                    this.state.view = 'loading';
                    this.render();
                    const response = await this._sendMessageToContentScript({ action: "get_quiz_content" });
                    if (!response || !response.content?.trim()) throw new Error("No readable quiz content found.");

                    this.state.url = this.state.tab.url; // Store the current URL
                    this.state.originalUserContent = response.content;
                    this._callGeminiStream('cleaning', response.content);
                }
            }
        } catch (error) {
            console.error("Initialization failed:", error);
            this.state.view = 'error';
            this.state.error = (error && error.type) ? error : { type: 'INTERNAL_ERROR', message: `Could not establish connection. ${error ? error.message : 'Unknown error'}` };
            this.render();
        }
    }

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
                this._renderPageSummary(this.state.summaryData);
                break;
            case 'quiz':
                this.elements.quizModeContainer.classList.remove('hidden');
                this._renderQuizState();
                break;
        }
    }

    _renderQuizState() {
        this.elements.contentDisplayWrapper.classList.remove('hidden');
        this.elements.answerContainer.classList.remove('hidden');

        if (this.state.cleanedContent) this.elements.contentDisplay.innerHTML = this._formatQuestionContent(this.state.cleanedContent);
        else if (this.state.originalUserContent) this.elements.contentDisplay.innerHTML = `<div class="question-text">${_escapeHtml(this.state.originalUserContent)}</div>`;

        if (this.state.answerHTML) this._handleAnswerResult(this.state.answerHTML, true, this.state.totalTokenCount);
        else if (this.state.cleanedContent) this._getAnswer();

        if (this.state.explanationHTML) this._handleExplanationResult(this.state.explanationHTML, true);
        else this.elements.explanationContainer.classList.add('hidden');
    }

    _renderErrorState() {
        let title = 'An Error Occurred', userMessage = 'Something went wrong.', actionsHtml = `<button id="error-retry-btn" class="button-error">Try Again</button>`;
        const query = this.state.cleanedContent || this.state.originalUserContent || '';
        switch (this.state.error.type) {
            case 'INVALID_API_KEY': title = 'Invalid API Key'; userMessage = 'The provided API key is not valid. Please check your key in the settings.'; actionsHtml = `<button id="error-settings-btn" class="button-error primary">Open Settings</button>`; break;
            case 'QUOTA_EXCEEDED': title = 'API Quota Exceeded'; userMessage = 'You have exceeded your Google AI API quota.'; actionsHtml = `<button id="error-quota-btn" class="button-error">Check Quota</button> <button id="error-retry-btn" class="button-error">Try Again</button>`; break;
            case 'NETWORK_ERROR': title = 'Network Error'; userMessage = 'Could not connect to the API. Check your internet connection.'; break;
            case 'INTERNAL_ERROR': title = 'Connection Failed'; userMessage = 'Could not connect to the current page.'; break;
            case 'API_ERROR': default: title = 'API Error'; userMessage = 'The API returned an error.'; if (query) actionsHtml += ` <button id="error-google-btn" class="button-error">Search on Google</button>`; break;
        }
        this.elements.messageArea.innerHTML = `<div class="error-panel"><div class="error-panel-header">${title}</div><div class="error-panel-body"><p>${userMessage}</p><details class="error-details"><summary>Technical Details</summary><code>${_escapeHtml(this.state.error.message)}</code></details></div><div class="error-panel-actions">${actionsHtml}</div>`;
        document.getElementById('error-retry-btn')?.addEventListener('click', () => this.init());
        document.getElementById('error-settings-btn')?.addEventListener('click', () => chrome.runtime.openOptionsPage());
        document.getElementById('error-quota-btn')?.addEventListener('click', () => chrome.tabs.create({ url: 'https://aistudio.google.com/billing' }));
        document.getElementById('error-google-btn')?.addEventListener('click', () => { if (!query) return; const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`; chrome.tabs.create({ url: searchUrl }); });
    }

    _handleRescan() {
        if (!this.state.tab) return;
        this._clearPersistedState().then(() => {
            this.state = { ...new PopupApp().state, tab: this.state.tab, config: this.state.config };
            this.init();
        });
    }

    async _handlePageAnalysis() {
        this.state.view = 'loading';
        this.render();
        this.elements.messageArea.querySelector('p').textContent = 'Analyzing the entire page...';
        try {
            const response = await this._sendMessageToContentScript({ action: "get_full_page_content" });
            if (!response || !response.content?.trim()) throw new Error("No significant text content for analysis.");
            this.state.url = this.state.tab.url; // Store URL for persistence
            this._callGeminiStream('pageAnalysis', response.content);
        } catch (e) {
            this.state.view = 'error'; this.state.error = e; this.render();
        }
    }

    _handleFeedbackCorrect() { this.elements.feedbackCorrect.disabled = true; this.elements.feedbackIncorrect.disabled = true; this.elements.feedbackCorrect.classList.add('selected-correct'); }
    async _handleFeedbackIncorrect() { this.elements.feedbackIncorrect.disabled = true; this.elements.feedbackCorrect.disabled = true; this.elements.feedbackIncorrect.classList.add('selected-incorrect'); this.elements.aiActionsWrapper.classList.add('hidden'); this.elements.correctionPanel.classList.remove('hidden'); this.elements.correctionOptions.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Fetching options...</p></div>`; try { const response = await this._sendMessageToContentScript({ action: "get_quiz_options" }); if (response?.options?.length > 0) this._renderCorrectionOptions(response.options); else this.elements.correctionOptions.innerHTML = '<p class="text-center">Could not find options on page.</p>'; } catch (e) { this.elements.correctionOptions.innerHTML = `<p class="text-center">Error fetching options: ${e.message}</p>`; } }
    _callGeminiStream(purpose, userContent, base64ImageData = null) { const { promptProfiles, activeProfile, selectedModel, geminiApiKey } = this.state.config; const currentPrompts = (promptProfiles?.[activeProfile]) || DEFAULT_PROMPTS; let systemPrompt = currentPrompts[purpose] || DEFAULT_PROMPTS[purpose]; if (purpose.startsWith('rephrase-')) { const language = purpose.split('-')[1]; systemPrompt = currentPrompts.rephrase || DEFAULT_PROMPTS.rephrase; userContent = `Target Language: ${language}\n\nText to rephrase:\n${userContent}`; } chrome.runtime.sendMessage({ action: 'callGeminiStream', payload: { apiKey: geminiApiKey, model: selectedModel, systemPrompt, userContent, base64ImageData, purpose } }); }
    _getAnswer() { if (!this.state.cleanedContent) return; const fingerprint = this._createQuizFingerprint(this.state.cleanedContent); this.state.cacheKey = fingerprint ? this._simpleHash(fingerprint) : null; if (this.state.cacheKey) { chrome.storage.local.get(this.state.cacheKey).then(cachedResult => { if (cachedResult[this.state.cacheKey]?.answerHTML) { this._handleAnswerResult(cachedResult[this.state.cacheKey].answerHTML, true, cachedResult[this.state.cacheKey].totalTokenCount); return; } this._continueGetAnswer(); }); } else this._continueGetAnswer(); }
    _continueGetAnswer() { this.elements.retryAnswer.disabled = true; this.elements.answerDisplay.innerHTML = `<div class="loading-state" style="min-height: 50px;"><div class="spinner"></div></div>`; this._callGeminiStream('answer', this.state.cleanedContent); }
    _getExplanation() { if (!this.state.cleanedContent) return; this.elements.explanationButton.disabled = true; this.elements.retryExplanation.disabled = true; this.elements.explanationContainer.classList.remove('hidden'); this.elements.explanationDisplay.innerHTML = `<div class="loading-state" style="min-height: 50px;"><div class="spinner"></div></div>`; const contentForExplanation = `${this.state.cleanedContent}\n\nCorrect Answer: ${this.state.incorrectAnswer}`; this._callGeminiStream('explanation', contentForExplanation); }
    _handleStreamUpdate(request) { const { payload, purpose } = request; if (!payload.success) { this.state.view = 'error'; this.state.error = payload.error; this.render(); return; } if (payload.done) { const fullText = payload.fullText || this.streamAccumulator[purpose] || ''; delete this.streamAccumulator[purpose]; const purposeHandlers = { 'cleaning': (text) => this._handleCleaningResult(text), 'answer': (text) => this._handleAnswerResult(text, false, payload.totalTokenCount), 'explanation': (text) => this._handleExplanationResult(text, false), 'correction': (text) => this._handleCorrectionResult(text), 'summarize': (text) => this._handleContextMenuResult(text, purpose), 'pageAnalysis': (text) => this._handlePageAnalysisResult(text), }; if (purposeHandlers[purpose]) purposeHandlers[purpose](fullText); else if (purpose.startsWith('rephrase-')) this._handleContextMenuResult(fullText, purpose); } else if (payload.chunk) { this.streamAccumulator[purpose] = (this.streamAccumulator[purpose] || '') + payload.chunk; } }
    _handlePageAnalysisResult(text) { let parsed = false; try { const jsonMatch = text.match(/{[\s\S]*}/); if (jsonMatch) { const jsonData = JSON.parse(jsonMatch[0]); this._renderPageSummary(jsonData); parsed = true; } } catch (e) { console.warn("JSON parse failed, falling back.", e); } if (!parsed) this._renderPageSummary(text, true); }
    _handleCleaningResult(fullText) { this.state.cleanedContent = fullText; this.state.view = 'quiz'; this.render(); this._saveCurrentViewState(); }
    _handleAnswerResult(fullText, fromCache = false, totalTokenCount = 0) { this.state.answerHTML = fullText; this.state.totalTokenCount = totalTokenCount; const answerMatch = fullText.match(/Answer:(.*?)(Confidence:|Reason:|$)/is); let answerText = (answerMatch ? answerMatch[1].trim() : fullText.trim()).replace(/`/g, ''); this.state.incorrectAnswer = answerText; let formattedHtml = `<p class="answer-highlight">${_escapeHtml(answerText).replace(/\n/g, '<br>')}</p>`; const confidenceMatch = fullText.match(/Confidence:\s*(High|Medium|Low)/i); if (confidenceMatch) { const confidence = confidenceMatch[1].toLowerCase(); const reason = fullText.match(/Reason:(.*)/is)?.[1].trim() || ""; formattedHtml += `<div class="confidence-wrapper"><div class="confidence-level"><span class="confidence-level-label">Confidence ${fromCache ? '<span>⚡️ Cached</span>' : ''}</span><span class="confidence-badge confidence-${confidence}">${confidence[0].toUpperCase() + confidence.slice(1)}</span></div>${reason ? `<div class="confidence-reason">${_escapeHtml(reason)}</div>` : ''}</div>`; } if (totalTokenCount > 0) formattedHtml += `<div class="token-count"><span class="token-count-label">Tokens Used</span><span class="token-count-value">${totalTokenCount}</span></div>`; this.elements.answerDisplay.innerHTML = formattedHtml; this.elements.copyAnswer.dataset.copyText = answerText; this.elements.retryAnswer.disabled = false; this.elements.aiActionsWrapper.classList.remove('hidden'); this.elements.explanationContainer.classList.add('hidden'); this.elements.correctionPanel.classList.add('hidden'); this.elements.feedbackContainer.classList.remove('hidden'); this._resetFeedbackButtons(); if (this.state.config.autoHighlight) this._sendMessageToContentScript({ action: 'highlight-answer', text: [answerText] }); if (!fromCache && this.state.cacheKey) chrome.storage.local.set({ [this.state.cacheKey]: { answerHTML: fullText, totalTokenCount } }); this._saveCurrentViewState(); if (!fromCache) this._saveToHistory({ cleanedContent: this.state.cleanedContent, answerHTML: fullText }, 'quiz'); }
    _handleExplanationResult(fullText, fromCache = false) { this.state.explanationHTML = fullText; this.elements.explanationDisplay.innerHTML = DOMPurify.sanitize(marked.parse(fullText)); this.elements.copyExplanation.dataset.copyText = fullText; this.elements.explanationButton.disabled = false; this.elements.retryExplanation.disabled = false; this.elements.explanationContainer.classList.remove('hidden'); this._saveCurrentViewState(); if (!fromCache) this._saveToHistory({ ...this.state }, 'explanation'); }
    _handleCorrectionResult(fullText) { this._handleExplanationResult(fullText, false); }
    _handleContextMenuResult(fullText, purpose) { this.state.view = 'quiz'; this.state.answerHTML = fullText; this.render(); this.elements.answerDisplay.innerHTML = DOMPurify.sanitize(marked.parse(fullText)); this.elements.copyAnswer.dataset.copyText = fullText; this.elements.aiActionsWrapper.classList.add('hidden'); this.elements.explanationContainer.classList.add('hidden'); this.elements.feedbackContainer.classList.add('hidden'); const historyActionType = purpose.split('-')[0]; this._saveToHistory({ cleanedContent: this.state.originalUserContent, answerHTML: fullText }, historyActionType); this._saveCurrentViewState(); }
    _renderPageSummary(data, isFallback = false) { this.state.view = 'summary'; let summaryHtml; if (isFallback) { this.state.summaryData = data; summaryHtml = `<div class="summary-section"><h3 class="summary-section-title">General Summary</h3><div class="card-body">${DOMPurify.sanitize(marked.parse(data))}</div></div>`; } else { this.state.summaryData = data; const tldrHtml = data.tldr ? `<div class="summary-section summary-tldr"><h3 class="summary-section-title">TL;DR</h3><p>${_escapeHtml(data.tldr)}</p></div>` : ''; const takeawaysHtml = (data.takeaways?.length > 0) ? `<div class="summary-section summary-takeaways"><h3 class="summary-section-title">Key Takeaways</h3><ul>${data.takeaways.map(item => `<li>${_escapeHtml(item)}</li>`).join('')}</ul></div>` : ''; const renderEntities = (entities, label) => (entities?.length > 0) ? `<div class="entity-group"><span class="entity-label">${label}</span><div class="entity-tags">${entities.map(e => `<span class="entity-tag">${_escapeHtml(e)}</span>`).join('')}</div></div>` : ''; const entitiesHtml = (data.entities && (Object.values(data.entities).some(arr => arr.length > 0))) ? `<div class="summary-section summary-entities"><h3 class="summary-section-title">Entities Mentioned</h3>${renderEntities(data.entities.people, 'People')}${renderEntities(data.entities.organizations, 'Organizations')}${renderEntities(data.entities.locations, 'Locations')}</div>` : ''; summaryHtml = tldrHtml + takeawaysHtml + entitiesHtml; } this.elements.pageSummaryContainer.innerHTML = summaryHtml; this.render(); this._saveCurrentViewState(); }
    _renderCorrectionOptions(options) { this.elements.correctionOptions.innerHTML = ''; options.forEach(optionText => { const button = document.createElement('button'); button.className = 'correction-option-button'; button.innerHTML = _escapeHtml(optionText); button.addEventListener('click', () => { const correctionContent = `The original quiz content was:\n${this.state.cleanedContent}\n\nMy previous incorrect answer was: \`${this.state.incorrectAnswer}\`\n\nThe user has indicated the correct answer is: \`${optionText}\``; this.elements.correctionPanel.classList.add('hidden'); this.elements.explanationContainer.classList.remove('hidden'); this.elements.explanationDisplay.innerHTML = `<div class="loading-state" style="min-height: 50px;"><div class="spinner"></div><p>Generating corrected explanation...</p></div>`; this._callGeminiStream('correction', correctionContent); }); this.elements.correctionOptions.appendChild(button); }); }
    _resetFeedbackButtons() { this.elements.feedbackCorrect.disabled = false; this.elements.feedbackIncorrect.disabled = false; this.elements.feedbackCorrect.classList.remove('selected-correct'); this.elements.feedbackIncorrect.classList.remove('selected-incorrect'); }
    _copyToClipboard(button) { const textToCopy = button.dataset.copyText; if (textToCopy) navigator.clipboard.writeText(textToCopy).then(() => { const originalTitle = button.title; button.title = 'Copied!'; button.classList.add('copied'); setTimeout(() => { button.classList.remove('copied'); button.title = originalTitle; }, 1500); }); }
    _getPersistedState() { return this.state.tab ? chrome.storage.local.get(this.state.tab.id.toString()).then(r => r[this.state.tab.id.toString()] || null) : Promise.resolve(null); }
    _clearPersistedState() { return this.state.tab ? chrome.storage.local.remove(this.state.tab.id.toString()) : Promise.resolve(); }
    _saveCurrentViewState() { if (!this.state.tab) return; const key = this.state.tab.id.toString(); chrome.storage.local.set({ [key]: { lastView: this.state.view, url: this.state.url, cleanedContent: this.state.cleanedContent, originalUserContent: this.state.originalUserContent, answerHTML: this.state.answerHTML, explanationHTML: this.state.explanationHTML, summaryData: this.state.summaryData, totalTokenCount: this.state.totalTokenCount, incorrectAnswer: this.state.incorrectAnswer, } }); }
    async _saveToHistory(stateData, actionType) { if (!this.state.tab) return; const { history = [] } = await chrome.storage.local.get('history'); const newEntry = { ...stateData, id: Date.now(), url: this.state.tab.url, title: this.state.tab.title, timestamp: new Date().toISOString(), actionType }; history.unshift(newEntry); if (history.length > 100) history.pop(); await chrome.storage.local.set({ history }); }
    _pingContentScriptWithRetry(retries, delay) { return new Promise((resolve, reject) => { const attempt = (n) => { this._sendMessageToContentScript({ action: "ping_content_script" }, 500).then(resolve).catch(err => { if (n > 0) { setTimeout(() => attempt(n - 1), delay); } else { reject(new Error("Could not communicate with the page. Please reload the page and try again.")); } }); }; attempt(retries); }); }
    _sendMessageToContentScript(message, timeout = 5000) { return new Promise((resolve, reject) => { if (!this.state.tab || this.state.tab.id === undefined) return reject(new Error("Invalid tab ID.")); const timer = setTimeout(() => reject(new Error('Content script timeout.')), timeout); chrome.tabs.sendMessage(this.state.tab.id, message, (response) => { clearTimeout(timer); if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message)); else resolve(response); }); }); }
    _formatQuestionContent(content) { if(!content) return ''; if(!content.toLowerCase().includes('question:') || !content.toLowerCase().includes('options:')) return `<div class="question-text">${_escapeHtml(content)}</div>`; const lines = content.split('\n').filter(line => line.trim() !== ''); if (lines.length === 0) return `<div class="question-text">${_escapeHtml(content)}</div>`; const question = _escapeHtml(lines.shift().replace(/^Question:\s*/i, '')); const optionsHtml = lines.map(option => `<li>${_escapeHtml(option.trim().replace(/^[\*\-•]\s*Options:\s*|^\s*[\*\-]\s*/, ''))}</li>`).join(''); return `<div class="question-text">${question}</div><ul>${optionsHtml}</ul>`;
    }
    _createQuizFingerprint(cleanedContent) { if (!cleanedContent) return null; const lines = cleanedContent.split('\n').map(l => l.trim()).filter(l => l); return lines.length < 2 ? null : lines.map(l => l.toLowerCase().replace(/\s+/g, ' ').trim()).join('\n'); }
    _simpleHash(str) { let hash = 0; for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0; } return 'cache_' + new Uint32Array([hash])[0].toString(16); }
}

document.addEventListener('DOMContentLoaded', () => { new PopupApp().init(); });